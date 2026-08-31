importScripts(
  './lib/firebase-app-compat.js',
  './lib/firebase-firestore-compat.js'
);

const firebaseConfig = {
  apiKey: "AIzaSyB36kz_wcYL0d8BEVgbAk3Qa6EBc_T8IPI",
  authDomain: "vaulty-sync-data.firebaseapp.com",
  projectId: "vaulty-sync-data",
  storageBucket: "vaulty-sync-data.firebasestorage.app",
  messagingSenderId: "777342013270",
  appId: "1:777342013270:web:8ff43899c6a736f40d50f7",
  measurementId: "G-FMNMSVQ476"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let activeListenerUnsubscribe = null;

function attachRealtimeListener(userId) {
  if (!userId) return;
  if (activeListenerUnsubscribe) activeListenerUnsubscribe();

  // Listen with metadata changes to avoid premature reverts from local cache
  activeListenerUnsubscribe = db.collection("vaults").doc(userId).onSnapshot((docSnap) => {
    if (docSnap.exists) {
      const cloudHistory = docSnap.data().clipboardHistory || [];
      chrome.storage.local.set({ clipboardHistory: cloudHistory });
    }
  });
}

function detachListener() {
  if (activeListenerUnsubscribe) {
    activeListenerUnsubscribe();
    activeListenerUnsubscribe = null;
  }
}

chrome.storage.local.get({ vaultyUserId: null }, (res = {}) => {
  if (res && res.vaultyUserId) {
    attachRealtimeListener(res.vaultyUserId);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_LOGGED_IN') {
    const userId = message.userId;
    
    chrome.storage.local.get({ clipboardHistory: [] }, (res = {}) => {
      const localHistory = res.clipboardHistory || [];
      
      db.collection("vaults").doc(userId).get().then((docSnap) => {
        let cloudHistory = docSnap.exists ? (docSnap.data().clipboardHistory || []) : [];
        
        localHistory.forEach(localItem => {
          const localText = typeof localItem === 'string' ? localItem : localItem.text;
          const exists = cloudHistory.some(c => (typeof c === 'string' ? c : c.text) === localText);
          if (!exists) cloudHistory.unshift(localItem);
        });

        return db.collection("vaults").doc(userId).set({
          clipboardHistory: cloudHistory,
          lastUpdated: new Date().toISOString()
        }).then(() => cloudHistory);
      }).then((finalHistory) => {
        chrome.storage.local.set({ clipboardHistory: finalHistory }, () => {
          attachRealtimeListener(userId);
          sendResponse({ status: 'ok' });
        });
      }).catch((err) => {
        attachRealtimeListener(userId);
        sendResponse({ status: 'error', error: err.message });
      });
    });

    return true;
  }

  if (message.type === 'USER_LOGGED_OUT') {
    detachListener();
    chrome.storage.local.remove(['vaultyUserId', 'userEmail'], () => {
      sendResponse({ status: 'logged_out' });
    });
    return true;
  }

  if (message.type === 'UPDATE_CLOUD_HISTORY') {
    chrome.storage.local.get({ vaultyUserId: null }, (res = {}) => {
      if (res.vaultyUserId) {
        // Full overwrite (without merge: true) to ensure deleted array items are permanently removed from Firestore
        db.collection("vaults").doc(res.vaultyUserId).set({
          clipboardHistory: message.history,
          lastUpdated: new Date().toISOString()
        }).then(() => {
          sendResponse({ status: 'updated' });
        });
      } else {
        sendResponse({ status: 'offline' });
      }
    });
    return true;
  }

  if (message.type === 'MANUAL_CLOUD_SYNC') {
    chrome.storage.local.get({ vaultyUserId: null, clipboardHistory: [] }, (res = {}) => {
      if (!res.vaultyUserId) {
        sendResponse({ status: 'not_logged_in' });
        return;
      }

      db.collection("vaults").doc(res.vaultyUserId).get({ source: 'server' }).then((docSnap) => {
        if (docSnap.exists) {
          const cloudHistory = docSnap.data().clipboardHistory || [];
          chrome.storage.local.set({ clipboardHistory: cloudHistory }, () => {
            sendResponse({ status: 'synced' });
          });
        }
      }).catch(() => {
        sendResponse({ status: 'error' });
      });
    });

    return true;
  }

  if (message.type === 'ADD_CLIPBOARD_ITEM') {
    const newItem = message.data;

    chrome.storage.local.get({ clipboardHistory: [], vaultyUserId: null }, (result = {}) => {
      let history = result.clipboardHistory || [];

      history = history.filter(item => {
        const itemText = typeof item === 'string' ? item : item.text;
        return itemText !== newItem.text;
      });

      history.unshift(newItem);

      chrome.storage.local.set({ clipboardHistory: history }, () => {
        sendResponse({ status: 'success' });
      });

      if (result.vaultyUserId) {
        db.collection("vaults").doc(result.vaultyUserId).set({
          clipboardHistory: history,
          lastUpdated: new Date().toISOString()
        });
      }
    });

    return true;
  }
});