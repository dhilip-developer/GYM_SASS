const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const BASE_SESSION_DIR = path.join(app.getPath('userData'), 'wweb_session');

class WhatsAppSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionDir = path.join(BASE_SESSION_DIR, sessionId);
    this.sock = null;
    this.connectionState = 'disconnected';
    this.qrCode = null;
    this.userInfo = null;
    this.error = null;
    
    // Auto start if session already exists and is valid
    if (fs.existsSync(this.sessionDir)) {
      const credsFile = path.join(this.sessionDir, 'creds.json');
      let isValid = false;
      try {
        if (fs.existsSync(credsFile)) {
          const content = fs.readFileSync(credsFile, 'utf8').trim();
          if (content.length > 0 && content.startsWith('{')) {
            isValid = true;
          }
        }
      } catch (e) {}

      if (!isValid) {
        console.warn(`[WHATSAPP ${this.sessionId}] Credentials folder found but empty. Cleaning up...`);
        this.cleanSessionDirectory();
      } else {
        console.log(`[WHATSAPP ${this.sessionId}] Credentials found, auto-connecting...`);
        this.startSession().catch(err => {
          console.error(`[WHATSAPP ${this.sessionId}] Auto-connect failed:`, err);
        });
      }
    }
  }

  async startSession() {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return;
    }

    this.connectionState = 'connecting';
    this.qrCode = null;
    this.userInfo = null;
    this.error = null;

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.connectionState = 'qr_ready';
          try {
            this.qrCode = await QRCode.toDataURL(qr);
          } catch (err) {
            console.error(`[WHATSAPP ${this.sessionId}] Failed to generate QR data URL:`, err);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log(`[WHATSAPP ${this.sessionId}] Connection closed. Code: ${statusCode}. Reconnect: ${shouldReconnect}`);
          
          this.connectionState = 'disconnected';
          this.qrCode = null;
          this.sock = null;
          this.userInfo = null;

          if (shouldReconnect) {
            this.startSession().catch(err => {
              console.error(`[WHATSAPP ${this.sessionId}] Reconnection failed:`, err);
            });
          } else {
            this.cleanSessionDirectory();
          }
        } else if (connection === 'open') {
          console.log(`[WHATSAPP ${this.sessionId}] Connected successfully!`);
          this.connectionState = 'connected';
          this.qrCode = null;
          
          const userJid = this.sock.user.id;
          const num = userJid.split(':')[0] || userJid.split('@')[0];
          this.userInfo = {
            id: userJid,
            number: num,
            name: this.sock.user.name || 'Owner'
          };
        }
      });
    } catch (err) {
      this.connectionState = 'disconnected';
      this.error = err.message;
      console.error(`[WHATSAPP ${this.sessionId}] Error starting session:`, err);
      throw err;
    }
  }

  async stopSession() {
    this.connectionState = 'disconnected';
    this.qrCode = null;
    this.userInfo = null;

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (err) {
        console.error(`[WHATSAPP ${this.sessionId}] Error during logout:`, err);
      }
      this.sock = null;
    }
    
    this.cleanSessionDirectory();
  }

  cleanSessionDirectory() {
    try {
      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
        console.log(`[WHATSAPP ${this.sessionId}] Session credentials deleted.`);
      }
    } catch (err) {
      console.error(`[WHATSAPP ${this.sessionId}] Error deleting creds:`, err);
    }
  }

  async sendMessage(phone, text, media = null) {
    if (this.connectionState !== 'connected' || !this.sock) {
      throw new Error(`WhatsApp session ${this.sessionId} is not connected`);
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    console.log(`[WHATSAPP SENDER ${this.sessionId}] Sending to ${jid}: "${text}" ${media ? 'with document' : ''}`);
    
    try {
      let response;
      if (media && media.base64) {
        const buffer = Buffer.from(media.base64, 'base64');
        response = await this.sock.sendMessage(jid, { 
          document: buffer, 
          mimetype: media.mimetype || 'application/pdf', 
          fileName: media.fileName || 'Document.pdf',
          caption: text 
        });
      } else {
        response = await this.sock.sendMessage(jid, { text: text });
      }
      return { success: true, messageId: response.key.id };
    } catch (err) {
      console.error(`[WHATSAPP SENDER ERROR ${this.sessionId}] Failed to send message:`, err);
      throw err;
    }
  }

  getStatus() {
    return {
      status: this.connectionState,
      qr: this.qrCode,
      user: this.userInfo,
      error: this.error
    };
  }
}

class WhatsAppManager {
  constructor() {
    this.sessions = new Map();
    
    // Auto-init existing sessions on boot
    if (fs.existsSync(BASE_SESSION_DIR)) {
      const dirs = fs.readdirSync(BASE_SESSION_DIR);
      dirs.forEach(sessionId => {
        const stat = fs.statSync(path.join(BASE_SESSION_DIR, sessionId));
        if (stat.isDirectory()) {
          this.getSession(sessionId);
        }
      });
    }
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new WhatsAppSession(sessionId));
    }
    return this.sessions.get(sessionId);
  }

  // Graceful shutdown helper
  async closeAll() {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.sock) {
        try {
          await session.sock.ws.close();
        } catch(e) {}
      }
    }
  }
}

const manager = new WhatsAppManager();
module.exports = manager;
