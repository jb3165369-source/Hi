const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const adminPassword = 'jacobbutler1211';
const stateFile = path.join(__dirname, '.site-state.json');

app.use(express.json());

app.use('/api', (request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (request.method === 'OPTIONS') {
    return response.sendStatus(204);
  }
  next();
});

function loadState() {
  try {
    const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (['public', 'private', 'shutdown'].includes(savedState.mode)) {
      return { ...savedState, redirectUrl: '' };
    }
  } catch (error) {
    // Start in public mode when no state has been saved yet.
  }

  return { mode: 'public', redirectUrl: '' };
}


let siteState = loadState();

  function isAdmin(request) {
  return request.get('x-admin-password') === adminPassword;
}

function protectsGamesPage(request) {
  return request.path === '/gamespage.html' || request.path.startsWith('/games/');
}

app.get('/api/site-state', (request, response) => {
  response.json({ ...siteState, isAdmin: isAdmin(request) });
});

app.post('/api/site-state', (request, response) => {
  if (!isAdmin(request)) {
    return response.status(401).json({ error: 'Invalid admin password.' });
  }

  const { mode } = request.body || {};
  if (!['public', 'private', 'shutdown'].includes(mode)) {
    return response.status(400).json({ error: 'Mode must be public, private, or shutdown.' });
  }

  siteState = { ...siteState, mode };
  fs.writeFileSync(stateFile, JSON.stringify(siteState, null, 2));
  return response.json(siteState);
});

app.post('/api/site-redirect', (request, response) => {
  if (!isAdmin(request)) {
    return response.status(401).json({ error: 'Invalid admin password.' });
  }

  const redirectUrl = String(request.body?.redirectUrl || '').trim();
  try {
    const parsedUrl = new URL(redirectUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch (error) {
    return response.status(400).json({ error: 'Enter a valid http or https URL.' });
  }

  siteState = { ...siteState, redirectUrl };
  fs.writeFileSync(stateFile, JSON.stringify(siteState, null, 2));
  return response.json(siteState);
});

app.use((request, response, next) => {
  if (!protectsGamesPage(request) || isAdmin(request) || siteState.mode === 'public') {
    return next();
  }

  if (siteState.mode === 'private') {
    return response.status(403).send('<h1>Matrix Games is private</h1><p>The games page is currently private.</p>');
  }

  return response.status(503).send('<h1>Matrix Games is offline</h1><p>The games page is temporarily shut down.</p>');
});

app.use(express.static(__dirname));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Admin password is configured.');
});