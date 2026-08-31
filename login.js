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

const auth = firebase.auth();

const loggedOutView = document.getElementById('loggedOutView');
const resetView = document.getElementById('resetView');
const loggedInView = document.getElementById('loggedInView');
const userEmailDisplay = document.getElementById('userEmailDisplay');

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const resetEmailInput = document.getElementById('resetEmailInput');

const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const closeTabBtn = document.getElementById('closeTabBtn');

const showForgotBtn = document.getElementById('showForgotBtn');
const sendResetBtn = document.getElementById('sendResetBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const statusMsg = document.getElementById('statusMsg');

function syncSessionUI() {
  chrome.storage.local.get(['userEmail', 'vaultyUserId'], (res = {}) => {
    resetView.style.display = 'none';
    if (res && res.userEmail && res.vaultyUserId) {
      loggedOutView.style.display = 'none';
      loggedInView.style.display = 'block';
      userEmailDisplay.textContent = res.userEmail;
    } else {
      loggedOutView.style.display = 'block';
      loggedInView.style.display = 'none';
      userEmailDisplay.textContent = '';
    }
  });
}

// Show Reset Password View
showForgotBtn.addEventListener('click', () => {
  loggedOutView.style.display = 'none';
  resetView.style.display = 'block';
  statusMsg.textContent = '';
  // Auto fill email if already typed in main form
  if (emailInput.value.trim()) {
    resetEmailInput.value = emailInput.value.trim();
  }
});

// Back to Login View
backToLoginBtn.addEventListener('click', () => {
  resetView.style.display = 'none';
  loggedOutView.style.display = 'block';
  statusMsg.textContent = '';
});

// Send Password Reset Link
sendResetBtn.addEventListener('click', () => {
  const email = resetEmailInput.value.trim();

  if (!email) {
    statusMsg.style.color = '#ff3b30';
    statusMsg.textContent = 'Please enter your email address.';
    return;
  }

  statusMsg.style.color = '#007aff';
  statusMsg.textContent = 'Sending reset email...';

  auth.sendPasswordResetEmail(email)
    .then(() => {
      statusMsg.style.color = '#28a745';
      statusMsg.textContent = 'Password reset email sent! Check your inbox.';
      setTimeout(() => {
        resetView.style.display = 'none';
        loggedOutView.style.display = 'block';
        statusMsg.textContent = '';
      }, 3000);
    })
    .catch((err) => {
      statusMsg.style.color = '#ff3b30';
      statusMsg.textContent = err.message;
    });
});

loginBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    statusMsg.style.color = '#ff3b30';
    statusMsg.textContent = 'Please enter both email and password.';
    return;
  }

  statusMsg.style.color = '#007aff';
  statusMsg.textContent = 'Logging in...';

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const userId = userCredential.user.uid;
      
      chrome.storage.local.set({ vaultyUserId: userId, userEmail: email }, () => {
        chrome.runtime.sendMessage({ type: 'USER_LOGGED_IN', userId: userId }, () => {
          statusMsg.style.color = '#28a745';
          statusMsg.textContent = 'Login successful!';
          syncSessionUI();
          setTimeout(() => { statusMsg.textContent = ''; }, 1500);
        });
      });
    })
    .catch((err) => {
      statusMsg.style.color = '#ff3b30';
      statusMsg.textContent = err.message;
    });
});

signupBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    statusMsg.style.color = '#ff3b30';
    statusMsg.textContent = 'Please enter both email and password.';
    return;
  }

  statusMsg.style.color = '#007aff';
  statusMsg.textContent = 'Creating account...';

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const userId = userCredential.user.uid;

      chrome.storage.local.set({ vaultyUserId: userId, userEmail: email }, () => {
        chrome.runtime.sendMessage({ type: 'USER_LOGGED_IN', userId: userId }, () => {
          statusMsg.style.color = '#28a745';
          statusMsg.textContent = 'Account created!';
          syncSessionUI();
          setTimeout(() => { statusMsg.textContent = ''; }, 1500);
        });
      });
    })
    .catch((err) => {
      statusMsg.style.color = '#ff3b30';
      statusMsg.textContent = err.message;
    });
});

logoutBtn.addEventListener('click', () => {
  auth.signOut().then(() => {
    chrome.runtime.sendMessage({ type: 'USER_LOGGED_OUT' }, () => {
      emailInput.value = '';
      passwordInput.value = '';
      statusMsg.style.color = '#ff9500';
      statusMsg.textContent = 'Switched to local offline mode.';
      syncSessionUI();
      setTimeout(() => { statusMsg.textContent = ''; }, 1500);
    });
  });
});

closeTabBtn.addEventListener('click', () => {
  window.close();
});

syncSessionUI();