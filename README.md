# GymOS SASS Setup Guide

Welcome to the GymOS repository! 

## ⚠️ Important Note on Security & Credentials

For security reasons, several files have been intentionally excluded from this repository and must be created manually on your local server.

### 1. Google OAuth Credentials
The `server/credentials.json` file is **NOT** included in this repository. GitHub's Secret Scanning automatically blocks this file to protect your Google Cloud account from being compromised. 
**To set up the server:**
- Create a `credentials.json` file inside the `server/` directory.
- Paste your Google OAuth 2.0 Client ID and Client Secret into this file.

### 2. WhatsApp Agent Installer (`.exe`)
The compiled `GymOS Agent Setup 1.0.0.exe` is **NOT** included in this repository. 

**Why isn't it here?**
The installer packages a full Node.js runtime, the Electron engine, and heavy WhatsApp cryptographic libraries, resulting in a file size of **~102 MB**. GitHub has a strict **100 MB file limit** for source code, so it cannot be pushed here.

**How to build and distribute the agent `.exe`:**
Any time you need to generate a fresh installer for a client, run these commands in your terminal:
```bash
cd agent
npm install
npm run build
```
Once the compilation finishes (it takes a few minutes), you will find the `GymOS Agent Setup 1.0.0.exe` inside the `agent/dist/` folder. 
You can then share that `.exe` with your gym clients via Google Drive or by uploading it manually to the **GitHub Releases** tab on this repository.

---

## Architecture Overview

GymOS operates on a hybrid architecture to maximize both flexibility and security:

1. **Cloud Backend (`server/`)**: Manages the database, business logic, billing, and scheduling.
2. **Web Dashboard (`client/`)**: The React frontend where Gym Admins manage their software.
3. **Local WhatsApp Agent (`agent/`)**: A standalone, background `.exe` application that runs on the gym owner's physical computer. It securely polls the Cloud Backend for automated messages and sends them through a local WhatsApp session. This ensures cryptographic session keys never touch the cloud server and are saved locally in the user's `C:\` drive (`AppData/Roaming/gymos-whatsapp-agent`).
