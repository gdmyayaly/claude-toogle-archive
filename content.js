class ArchiveToggle {
  constructor() {
    this.isVisible = true;
    this.toggle = null;
    this.archivedElements = [];
    this.position = { x: 20, y: 20, right: null, bottom: null };
    
    this.waitForPageLoad();
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'updatePosition') {
        this.position = request.position;
        this.updateTogglePosition();
        sendResponse({ success: true });
      }
    });
  }

  waitForPageLoad() {
    const checkReady = () => {
      if (document.readyState === 'complete' && document.body) {
        setTimeout(() => this.init(), 500);
      } else {
        setTimeout(checkReady, 500);
      }
    };
    
    checkReady();
  }

  findArchivedProjects() {
    const archivedProjects = [];
    
    const projectContainers = document.querySelectorAll('div.h-full');
    
    projectContainers.forEach(container => {
      try {
        const hasArchivedText = Array.from(container.querySelectorAll('div, span')).some(el => 
          el.textContent && el.textContent.trim() === 'Archivé.e.s'
        );
        
        if (hasArchivedText) {
          const projectLink = container.querySelector('a[href*="/project/"]');
          
          if (projectLink) {
            archivedProjects.push({
              container: container,
              projectLink: projectLink
            });
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'analyse d'un conteneur:", error);
      }
    });
    
    return archivedProjects;
  }

  async init() {
    await this.loadSettings();
    this.createToggle();
    this.setupEventListeners();
    this.observePageChanges();
    this.findAndToggleArchived();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['togglePosition', 'archiveVisible']);
      this.isVisible = result.archiveVisible !== false;
      
      if (result.togglePosition) {
        this.position = result.togglePosition;
      }
    } catch (error) {
      console.log("Erreur lors du chargement des paramètres:", error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        togglePosition: this.position,
        archiveVisible: this.isVisible
      });
    } catch (error) {
      console.log("Erreur lors de la sauvegarde des paramètres:", error);
    }
  }

  createToggle() {
    const existingToggle = document.getElementById('archive-toggle');
    if (existingToggle) {
      existingToggle.remove();
    }

    this.toggle = document.createElement('div');
    this.toggle.id = 'archive-toggle';
    this.toggle.innerHTML = `
      <div class="toggle-content">
        <span class="toggle-icon">📁</span>
        <span class="toggle-text">${this.isVisible ? 'Hide' : 'Show'} archived</span>
        <span class="toggle-count"></span>
      </div>
    `;

    this.updateTogglePosition();
    
    this.toggle.style.cssText += `
      position: fixed !important;
      z-index: 999999 !important;
      background: ${this.isVisible 
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
        : 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)'} !important;
      color: white !important;
      border: none !important;
      border-radius: 20px !important;
      padding: 8px 14px !important;
      cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      transition: all 0.3s ease !important;
      user-select: none !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      min-width: 120px !important;
      text-align: center !important;
      opacity: 0.9 !important;
    `;

    this.toggle.addEventListener('mouseenter', () => {
      this.toggle.style.transform = 'scale(1.05)';
      this.toggle.style.opacity = '1';
    });

    this.toggle.addEventListener('mouseleave', () => {
      this.toggle.style.transform = 'scale(1)';
      this.toggle.style.opacity = '0.9';
    });

    const content = this.toggle.querySelector('.toggle-content');
    content.style.cssText = `
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
    `;

    document.body.appendChild(this.toggle);
  }

  updateTogglePosition() {
    if (!this.toggle) return;
    
    let positionStyles = '';
    
    if (this.position.right !== null && this.position.right !== undefined) {
      positionStyles += `right: ${this.position.right}px !important; left: auto !important;`;
    } else {
      positionStyles += `left: ${this.position.x || 20}px !important; right: auto !important;`;
    }
    
    if (this.position.bottom !== null && this.position.bottom !== undefined) {
      positionStyles += `bottom: ${this.position.bottom}px !important; top: auto !important;`;
    } else {
      positionStyles += `top: ${this.position.y || 20}px !important; bottom: auto !important;`;
    }
    
    this.toggle.style.cssText = this.toggle.style.cssText.replace(
      /(?:left|right|top|bottom):\s*[^;]*!important;\s*/g, ''
    ) + positionStyles;
  }

  setupEventListeners() {
    if (!this.toggle) return;

    this.toggle.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleToggleClick();
    });
  }

  async handleToggleClick() {
    this.isVisible = !this.isVisible;
    this.updateToggleAppearance();
    this.findAndToggleArchived();
    await this.saveSettings();
  }

  updateToggleAppearance() {
    const textElement = this.toggle.querySelector('.toggle-text');
    if (textElement) {
      textElement.textContent = this.isVisible ? 'Masquer archivés' : 'Afficher archivés';
    }
    
    const newBackground = this.isVisible 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)';
    
    this.toggle.style.background = newBackground;
  }

  findAndToggleArchived() {
    try {
      this.archivedElements = this.findArchivedProjects();
      
      this.archivedElements.forEach((item) => {
        if (!item || !item.container) return;
        
        const { container } = item;
        
        container.style.transition = 'all 0.3s ease';
        
        if (this.isVisible) {
          container.style.display = '';
          container.style.opacity = '1';
          container.style.transform = 'scale(1)';
          container.style.height = '';
          container.style.overflow = '';
        } else {
          container.style.opacity = '0';
          container.style.transform = 'scale(0.95)';
          
          setTimeout(() => {
            if (!this.isVisible && container) {
              container.style.display = 'none';
            }
          }, 300);
        }
      });
      
      this.updateToggleCounter();
    } catch (error) {
      console.error("Erreur dans findAndToggleArchived:", error);
    }
  }

  updateToggleCounter() {
    if (!this.toggle) return;
    
    const countElement = this.toggle.querySelector('.toggle-count');
    if (countElement && this.archivedElements.length > 0) {
      countElement.textContent = `(${this.archivedElements.length})`;
      countElement.style.cssText = `
        font-size: 10px !important;
        opacity: 0.8 !important;
        margin-left: 2px !important;
      `;
    }
  }

  observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              try {
                if (node.textContent && node.textContent.includes('Archivé.e.s')) {
                  shouldRecheck = true;
                  break;
                }
                
                if (node.querySelector && node.querySelector('div.h-full')) {
                  shouldRecheck = true;
                  break;
                }
              } catch (error) {
                console.error("Erreur lors de l'analyse d'une mutation:", error);
              }
            }
          }
          if (shouldRecheck) break;
        }
      }

      if (shouldRecheck) {
        setTimeout(() => {
          this.findAndToggleArchived();
        }, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

function initializeArchiveToggle() {
  if (!window.location.href.includes('claude.ai/projects')) {
    return;
  }
  
  if (window.archiveToggleInstance) {
    const existingToggle = document.getElementById('archive-toggle');
    if (existingToggle) existingToggle.remove();
  }
  
  window.archiveToggleInstance = new ArchiveToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeArchiveToggle);
} else {
  initializeArchiveToggle();
}

let currentUrl = location.href;
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    if (location.pathname.includes('/projects')) {
      setTimeout(initializeArchiveToggle, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });