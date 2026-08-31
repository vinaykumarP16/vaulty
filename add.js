document.addEventListener('DOMContentLoaded', () => {
  const itemInput = document.getElementById('itemInput');
  const saveBtn = document.getElementById('saveBtn');
  const saveCloseBtn = document.getElementById('saveCloseBtn');
  const fullHistoryList = document.getElementById('fullHistoryList');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importInput = document.getElementById('importInput');
  const dashboardSearchInput = document.getElementById('dashboardSearchInput');

  function renderFullList() {
    const query = dashboardSearchInput.value.toLowerCase().trim();

    chrome.storage.local.get({ clipboardHistory: [] }, (result) => {
      fullHistoryList.innerHTML = '';
      const history = result.clipboardHistory;

      const filteredHistory = history.filter(item => {
        const text = (typeof item === 'string' ? item : item.text).toLowerCase();
        const url = (typeof item === 'object' && item.url ? item.url : '').toLowerCase();
        return text.includes(query) || url.includes(query);
      });

      if (filteredHistory.length === 0) {
        fullHistoryList.innerHTML = `<div class="empty-state">${query ? 'No matching items found' : 'No items in your vault yet'}</div>`;
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
            sourceSpan.style.cssText = 'display: block; font-size: 10px; color: var(--empty-color, #8e8e93); text-decoration: none; margin-top: 4px; pointer-events: none;';
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
        fullHistoryList.appendChild(li);
      });
    });
  }

  function saveItem(closeTabAfterSave) {
    const text = itemInput.value.trim();
    if (!text) return;

    chrome.runtime.sendMessage({
      type: 'ADD_CLIPBOARD_ITEM',
      data: { text: text, url: 'Manual Entry', timestamp: new Date().toISOString() }
    });

    itemInput.value = '';
    if (closeTabAfterSave) {
      window.close();
    } else {
      renderFullList();
    }
  }

  function deleteSingleItem(indexToDelete) {
    chrome.storage.local.get({ clipboardHistory: [] }, (result) => {
      const history = result.clipboardHistory;
      history.splice(indexToDelete, 1);
      chrome.storage.local.set({ clipboardHistory: history }, renderFullList);
    });
  }

  dashboardSearchInput.addEventListener('input', renderFullList);

  exportBtn.addEventListener('click', () => {
    chrome.storage.local.get({ clipboardHistory: [] }, (result) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.clipboardHistory, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `vaulty_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  });

  importBtn.addEventListener('click', () => importInput.click());

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedItems = JSON.parse(event.target.result);
        if (Array.isArray(importedItems)) {
          chrome.storage.local.get({ clipboardHistory: [] }, (result) => {
            let history = result.clipboardHistory;
            importedItems.forEach(item => {
              const textToCompare = typeof item === 'string' ? item : item.text;
              const exists = history.some(existing => (typeof existing === 'string' ? existing : existing.text) === textToCompare);
              if (!exists) history.unshift(item);
            });
            chrome.storage.local.set({ clipboardHistory: history }, renderFullList);
          });
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.clipboardHistory) {
      renderFullList();
    }
  });

  saveBtn.addEventListener('click', () => saveItem(false));
  saveCloseBtn.addEventListener('click', () => saveItem(true));

  renderFullList();
});