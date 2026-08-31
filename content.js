document.addEventListener('copy', () => {
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText) {
    const payload = {
      text: selectedText,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Safely check if extension runtime context is valid before sending message
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'ADD_CLIPBOARD_ITEM', data: payload }, (response) => {
        // Catch runtime disconnect errors silently (e.g. if extension reloaded while tab was open)
        if (chrome.runtime.lastError) {
          console.warn("Vaulty listener reloaded:", chrome.runtime.lastError.message);
        }
      });
    }

    showToast();
  }
});

function showToast() {
  let toast = document.getElementById('vaulty-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'vaulty-toast';
    toast.textContent = 'Copied to Vaulty!';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 122, 255, 0.95);
      color: #ffffff;
      padding: 8px 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      z-index: 9999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 1500);
}