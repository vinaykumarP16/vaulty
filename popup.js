document.addEventListener('DOMContentLoaded', () => {
  const historyList = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearBtn');
  const addItemBtn = document.getElementById('addItemBtn');
  const searchInput = document.getElementById('searchInput');
  const loginBtnHeader = document.getElementById('loginBtnHeader');
  const syncBtnHeader = document.getElementById('syncBtnHeader');
  const copyVaultWebBtn = document.getElementById('copyVaultWebBtn');
  const copyTag = document.getElementById('copyTag');

  if (copyVaultWebBtn) {
    copyVaultWebBtn.addEventListener('click', () => {
      const webVaultUrl = 'https://vaulty-web.netlify.app/';

      navigator.clipboard.writeText(webVaultUrl).then(() => {
        copyTag.textContent = 'Site URL Copied!';
        copyTag.style.background = '#28a745';
        copyTag.style.color = '#ffffff';
        copyTag.style.borderColor = '#28a745';

        setTimeout(() => {
          copyTag.textContent = 'Click to Copy';
          copyTag.style.background = 'var(--card-bg)';
          copyTag.style.color = 'var(--accent-color)';
          copyTag.style.borderColor = 'var(--accent-color)';
        }, 1200);
      });
    });
  }

  function updateHeaderState() {
    chrome.storage.local.get(['userEmail'], (res = {}) => {
      if (res && res.userEmail) {
        loginBtnHeader.textContent = 'Account';
        loginBtnHeader.title = `Logged in as: ${res.userEmail}`;
        if (syncBtnHeader) syncBtnHeader.style.display = 'inline-block';
      } else {
        loginBtnHeader.textContent = 'Log In';
        loginBtnHeader.title = 'Offline Mode Active';
        if (syncBtnHeader) syncBtnHeader.style.display = 'none';
      }
    });
  }

  loginBtnHeader.addEventListener('click', () => {
    chrome.tabs.create({ url: 'login.html' });
  });

  if (syncBtnHeader) {
    syncBtnHeader.addEventListener('click', () => {
      syncBtnHeader.textContent = ' Syncing...';
      chrome.runtime.sendMessage({ type: 'MANUAL_CLOUD_SYNC' }, (response) => {
        if (response && response.status === 'synced') {
          syncBtnHeader.textContent = ' Synced!';
          renderList();
          setTimeout(() => { syncBtnHeader.textContent = '↻ Sync'; }, 1200);
        } else {
          syncBtnHeader.textContent = '↻ Sync';
        }
      });
    });
  }

  addItemBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'add.html' });
  });

  function renderList() {
    const query = searchInput.value.toLowerCase().trim();

    chrome.storage.local.get({ clipboardHistory: [] }, (result = {}) => {
      historyList.innerHTML = '';
      const history = result.clipboardHistory || [];

      const filteredHistory = history.filter(item => {
        const text = (typeof item === 'string' ? item : item.text).toLowerCase();
        const url = (typeof item === 'object' && item.url ? item.url : '').toLowerCase();
        return text.includes(query) || url.includes(query);
      });

      if (filteredHistory.length === 0) {
        historyList.innerHTML = `<div class="empty-state">${query ? 'No matching items found' : 'Vault is empty'}</div>`;
        return;
      }

      filteredHistory.forEach((item) => {
        const originalIndex = history.indexOf(item);
        const text = typeof item === 'string' ? item : item.text;
        const sourceUrl = typeof item === 'object' ? item.url : null;

        const li = document.createElement('li');
        li.style.cursor = 'pointer';

        li.onclick = (e) => {
          if (e.target.tagName === 'A' || e.target.classList.contains('btn-delete')) return;

          navigator.clipboard.writeText(text).then(() => {
            const originalBg = li.style.background;
            li.style.background = '#eafaf1';

            const toast = document.createElement('span');
            toast.textContent = ' Copied!';
            toast.style.cssText = 'color: #28a745; font-size: 10px; font-weight: 600; margin-left: 6px;';
            textSpan.appendChild(toast);

            setTimeout(() => {
              li.style.background = originalBg;
              toast.remove();
            }, 1000);
          });
        };

        const contentContainer = document.createElement('div');
        contentContainer.style.flex = '1';

        const textSpan = document.createElement('div');
        textSpan.className = 'text';
        textSpan.textContent = text;
        contentContainer.appendChild(textSpan);

        if (sourceUrl) {
          if (sourceUrl === 'Manual Entry') {
            const sourceSpan = document.createElement('span');
            sourceSpan.className = 'source-link';
            sourceSpan.style.cssText = 'display: block; font-size: 10px; color: #8e8e93; text-decoration: none; margin-top: 4px; pointer-events: none;';
            sourceSpan.textContent = 'Source: Manual Entry';
            contentContainer.appendChild(sourceSpan);
          } else {
            const urlAnchor = document.createElement('a');
            urlAnchor.href = sourceUrl;
            urlAnchor.target = '_blank';
            urlAnchor.className = 'source-link';
            urlAnchor.textContent = `Source: ${sourceUrl}`;
            contentContainer.appendChild(urlAnchor);
          }
        }

        const actionContainer = document.createElement('div');
        actionContainer.className = 'actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerHTML = '&#215;';
        deleteBtn.title = 'Delete item';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteSingleItem(originalIndex);
        };

        actionContainer.appendChild(deleteBtn);
        li.appendChild(contentContainer);
        li.appendChild(actionContainer);
        historyList.appendChild(li);
      });
    });
  }

  function deleteSingleItem(indexToDelete) {
    chrome.storage.local.get({ clipboardHistory: [] }, (result = {}) => {
      let history = result.clipboardHistory || [];
      history.splice(indexToDelete, 1);

      // Save locally and delay UI update until Cloud Firestore write finishes
      chrome.storage.local.set({ clipboardHistory: history }, () => {
        renderList();
        chrome.runtime.sendMessage({ type: 'UPDATE_CLOUD_HISTORY', history: history });
      });
    });
  }

  searchInput.addEventListener('input', renderList);

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.clipboardHistory) renderList();
      if (changes.userEmail) updateHeaderState();
    }
  });

  clearBtn.addEventListener('click', () => {
    chrome.storage.local.set({ clipboardHistory: [] }, () => {
      renderList();
      chrome.runtime.sendMessage({ type: 'UPDATE_CLOUD_HISTORY', history: [] });
    });
  });

  updateHeaderState();
  renderList();
});