// Charger les paramètres actuels
async function loadCurrentSettings() {
  try {
    const result = await chrome.storage.local.get(['togglePosition']);
    if (result.togglePosition) {
      const pos = result.togglePosition;
      
      // Convertir les coordonnées x,y en left,top,right,bottom
      if (pos.x !== undefined) document.getElementById('leftInput').value = pos.x;
      if (pos.y !== undefined) document.getElementById('topInput').value = pos.y;
    }
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
  }
}

// Afficher un message de statut
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
  
  setTimeout(() => {
    status.style.opacity = '0';
  }, 2000);
}

// Appliquer la position
async function applyPosition() {
  try {
    const left = parseInt(document.getElementById('leftInput').value) || 0;
    const top = parseInt(document.getElementById('topInput').value) || 0;
    const right = parseInt(document.getElementById('rightInput').value) || null;
    const bottom = parseInt(document.getElementById('bottomInput').value) || null;
    
    const position = { 
      x: left, 
      y: top,
      right: right,
      bottom: bottom
    };
    
    await chrome.storage.local.set({ togglePosition: position });
    
    // Envoyer un message au content script pour mettre à jour la position
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url.includes('claude.ai')) {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'updatePosition', 
        position: position 
      });
    }
    
    showStatus('Position mise à jour !');
  } catch (error) {
    console.error('Erreur:', error);
    showStatus('Erreur lors de la mise à jour', true);
  }
}

// Positions prédéfinies
const presetPositions = {
  'top-left': { x: 20, y: 20, right: null, bottom: null },
  'top-right': { x: null, y: 20, right: 20, bottom: null },
  'bottom-left': { x: 20, y: null, right: null, bottom: 20 },
  'bottom-right': { x: null, y: null, right: 20, bottom: 20 }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentSettings();
  
  // Bouton appliquer
  document.getElementById('applyBtn').addEventListener('click', applyPosition);
  
  // Boutons de position prédéfinie
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const position = btn.dataset.position;
      const preset = presetPositions[position];
      
      document.getElementById('leftInput').value = preset.x || '';
      document.getElementById('topInput').value = preset.y || '';
      document.getElementById('rightInput').value = preset.right || '';
      document.getElementById('bottomInput').value = preset.bottom || '';
      
      applyPosition();
    });
  });
  
  // Appliquer en temps réel quand on tape
  ['leftInput', 'topInput', 'rightInput', 'bottomInput'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(window.inputTimeout);
      window.inputTimeout = setTimeout(applyPosition, 500);
    });
  });
});