const passwordInput = document.querySelector('#adminPassword');
const statusText = document.querySelector('#status');
const redirectInput = document.querySelector('#redirectUrl');
const redirectButton = document.querySelector('#redirectButton');
const apiUrl = window.location.protocol === 'file:'
  ? 'http://localhost:3000/api/site-state'
  : '/api/site-state';
const redirectApiUrl = window.location.protocol === 'file:'
  ? 'http://localhost:3000/api/site-redirect'
  : '/api/site-redirect';

function requestHeaders() {
  return { 'Content-Type': 'application/json', 'x-admin-password': passwordInput.value };
}

async function refreshStatus() {
  const response = await fetch(apiUrl, { headers: requestHeaders() });
  const state = await response.json();
  statusText.textContent = `Current status: ${state.mode}`;
  if (redirectInput) {
    redirectInput.value = state.redirectUrl || 'https://www.youtube.com/';
    redirectButton.textContent = state.redirectUrl ? 'Clear' : 'Enable';
  }
}

async function setRedirect() {
  statusText.textContent = 'Updating redirect...';
  const redirectUrl = redirectInput.value.trim();
  const response = await fetch(redirectApiUrl, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ redirectUrl })
  });
  const result = await response.json();
  if (response.ok) {
    redirectInput.value = result.redirectUrl || '';
    redirectButton.textContent = result.redirectUrl ? 'Clear' : 'Enable';
    statusText.textContent = result.redirectUrl ? `Redirecting visitors to ${result.redirectUrl}` : `Current status: ${result.mode}`;
  } else {
    statusText.textContent = result.error;
  }
}

async function setMode(mode) {
  statusText.textContent = 'Updating...';
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ mode })
  });
  const result = await response.json();
  statusText.textContent = response.ok ? `Current status: ${result.mode}` : result.error;
}

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    setMode(button.dataset.mode).catch(() => {
      statusText.textContent = 'Unable to connect to the server. Start index.js first.';
    });
  });
});

passwordInput.addEventListener('change', refreshStatus);
if (redirectButton) {
  redirectButton.addEventListener('click', () => {
    if (redirectInput.value.trim() && redirectButton.textContent === 'Enable') {
      setRedirect().catch(() => {
        statusText.textContent = 'Unable to connect to the server. Start index.js first.';
      });
      return;
    }

    redirectInput.value = '';
    setRedirect().catch(() => {
      statusText.textContent = 'Unable to connect to the server. Start index.js first.';
    });
  });
}
refreshStatus().catch(() => {
  statusText.textContent = 'Unable to connect to the server.';
});