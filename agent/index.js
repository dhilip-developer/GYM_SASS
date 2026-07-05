require('dotenv').config();
const { app: electronApp, Tray, Menu, nativeImage, shell } = require('electron');
const express = require('express');
const cors = require('cors');
const path = require('path');
const whatsappManager = require('./whatsapp');
const axios = require('axios');

const app = express();
const PORT = 4000;

// Prevent multiple instances
const gotTheLock = electronApp.requestSingleInstanceLock();
if (!gotTheLock) {
  electronApp.quit();
}

let tray = null;

// Configuration
// We'll read the cloud URL from env, or default to localhost for testing
const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:5000';
// The gym ID this agent is responsible for. 
// In a real deployed app, the user would configure this in a local settings file or UI.
// For now, we'll default it to 'g-1' and 'super_admin' to test.
const GYM_ID = process.env.GYM_ID || 'g-1';

app.use(cors({
  origin: '*', // Allow the web app to hit this local server
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API: Get WhatsApp Status (Used by local Web UI)
app.get('/api/whatsapp/status', (req, res) => {
  // Try to get status for the configured gym ID, fallback to super_admin if requested
  const reqGymId = req.query.gym_id || GYM_ID;
  const session = whatsappManager.getSession(reqGymId);
  res.json(session.getStatus());
});

// API: Start WhatsApp Session
app.post('/api/whatsapp/start', async (req, res) => {
  const reqGymId = req.query.gym_id || GYM_ID;
  const session = whatsappManager.getSession(reqGymId);
  try {
    if (session.getStatus().status !== 'connected') {
      await session.startSession();
    }
    res.json({ message: 'Session started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Stop WhatsApp Session
app.post('/api/whatsapp/stop', async (req, res) => {
  const reqGymId = req.query.gym_id || GYM_ID;
  const session = whatsappManager.getSession(reqGymId);
  try {
    await session.stopSession();
    res.json({ message: 'Session stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Send manual message (for invoices, etc. when triggered directly by the web UI)
app.post('/api/whatsapp/send', async (req, res) => {
  const reqGymId = req.body.gym_id || GYM_ID;
  const { phone, message } = req.body;
  const session = whatsappManager.getSession(reqGymId);
  
  if (session.getStatus().status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp is not connected on the local agent' });
  }

  try {
    await session.sendMessage(phone, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Polling Engine: Pull pending messages from the cloud and send them
const startPollingEngine = () => {
  console.log('[AGENT] Starting background polling engine...');
  
  setInterval(async () => {
    try {
      // 1. Fetch pending messages
      const res = await axios.get(`${CLOUD_URL}/api/messages/pending?gym_id=${GYM_ID}`);
      const pendingMessages = res.data;

      if (pendingMessages && pendingMessages.length > 0) {
        console.log(`[AGENT] Found ${pendingMessages.length} pending messages to send.`);
        const session = whatsappManager.getSession(GYM_ID);

        if (session.getStatus().status === 'connected') {
          for (const msg of pendingMessages) {
            try {
              // 2. Send the message locally
              let media = null;
              if (msg.media_base64) {
                media = {
                  base64: msg.media_base64,
                  fileName: msg.media_name || 'Document.pdf',
                  mimetype: 'application/pdf'
                };
              }
              await session.sendMessage(msg.phone, msg.message, media);
              console.log(`[AGENT] Sent message to ${msg.phone} ${media ? 'with media' : ''}`);
              
              // 3. Mark as complete in the cloud
              await axios.post(`${CLOUD_URL}/api/messages/complete`, {
                id: msg.id,
                status: 'sent'
              });
            } catch (err) {
              console.error(`[AGENT] Failed to send message to ${msg.phone}:`, err.message);
              // Mark as failed in the cloud
              await axios.post(`${CLOUD_URL}/api/messages/complete`, {
                id: msg.id,
                status: 'failed',
                error: err.message
              });
            }
          }
        } else {
          console.log('[AGENT] Warning: WhatsApp is not connected. Pending messages are waiting.');
        }
      }
    } catch (err) {
      if (err.code !== 'ECONNREFUSED') {
         console.error('[AGENT] Polling error:', err.message);
      }
    }
  }, 10000); // Check every 10 seconds for rapid testing
};

// Electron App Lifecycle
electronApp.whenReady().then(() => {
  console.log('[AGENT] Electron app ready, starting services...');

  // 1. Setup System Tray
  // We'll use a placeholder icon if the generated one isn't available yet, but electron-builder will inject it for the .exe
  let iconPath = path.join(__dirname, 'icon.png');
  // Fallback to empty native image if no icon file exists yet in dev mode
  let icon = nativeImage.createEmpty();
  try {
    icon = nativeImage.createFromPath(iconPath);
    icon = icon.resize({ width: 16, height: 16 });
  } catch (e) {}

  tray = new Tray(icon);
  tray.setToolTip('GymOS WhatsApp Agent');

  const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';

  const contextMenu = Menu.buildFromTemplate([
    { label: 'GymOS WhatsApp Agent', enabled: false },
    { type: 'separator' },
    { 
      label: 'Open Dashboard', 
      click: () => {
        shell.openExternal(WEB_APP_URL);
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        electronApp.quit();
      } 
    }
  ]);
  
  tray.setContextMenu(contextMenu);

  // Allow double click on tray to open dashboard
  tray.on('double-click', () => {
    shell.openExternal(WEB_APP_URL);
  });

  // 2. Start Local Express Server
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[AGENT] Local Agent Server running on http://127.0.0.1:${PORT}`);
    
    // 3. Start Background Polling
    startPollingEngine();

    // 4. Automatically open dashboard on startup
    console.log(`[AGENT] Opening web application: ${WEB_APP_URL}`);
    shell.openExternal(WEB_APP_URL);
  });
});

// Hide the dock icon on macOS (since it's a tray app)
if (process.platform === 'darwin') {
  electronApp.dock.hide();
}

electronApp.on('window-all-closed', () => {
  // Overriding default behavior to not quit when all windows are closed, since this is a tray app
});
