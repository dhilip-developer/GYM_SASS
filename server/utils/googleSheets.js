const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../config/token.json');
const SHEET_INFO_PATH = path.join(__dirname, '../config/sheet_info.json');

// Ensure config dir exists
if (!fs.existsSync(path.join(__dirname, '../config'))) {
  fs.mkdirSync(path.join(__dirname, '../config'), { recursive: true });
}

let oAuth2Client = null;

function initAuth() {
  if (oAuth2Client) return oAuth2Client;
  
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.warn('[GOOGLE SHEETS] credentials.json not found. Backup disabled.');
    return null;
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, auth_uri, token_uri } = credentials.web;
  
  // Assuming frontend/backend runs on localhost. Make sure this matches Google Console exactly!
  const redirect_uris = ['http://localhost:5000/api/sheets/callback'];

  oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Load token if it exists
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oAuth2Client.setCredentials(token);
      console.log('[GOOGLE SHEETS] Token loaded. Backup is active.');
    } catch(e) {
      console.error('[GOOGLE SHEETS] Error reading token.json', e.message);
    }
  } else {
    console.warn('[GOOGLE SHEETS] No token.json found. Please authenticate via the Super Admin UI.');
  }

  return oAuth2Client;
}

const getAuthUrl = () => {
  const client = initAuth();
  if (!client) return null;
  
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent' // Force to get refresh token
  });
};

const handleCallback = async (code) => {
  const client = initAuth();
  if (!client) throw new Error('OAuth client not initialized');

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  
  // Save the token to disk for future executions
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('[GOOGLE SHEETS] Token successfully acquired and saved.');
  
  return tokens;
};

const getSpreadsheetId = async (sheetsApi) => {
  if (fs.existsSync(SHEET_INFO_PATH)) {
    const info = JSON.parse(fs.readFileSync(SHEET_INFO_PATH));
    return info.spreadsheetId;
  }

  // If we don't have one, create it.
  console.log('[GOOGLE SHEETS] Creating new GymOS Backup Spreadsheet...');
  const resource = {
    properties: {
      title: 'GymOS Database Backup',
    },
  };
  const spreadsheet = await sheetsApi.spreadsheets.create({
    resource,
    fields: 'spreadsheetId',
  });
  
  const spreadsheetId = spreadsheet.data.spreadsheetId;
  fs.writeFileSync(SHEET_INFO_PATH, JSON.stringify({ spreadsheetId }, null, 2));
  console.log(`[GOOGLE SHEETS] Created new spreadsheet with ID: ${spreadsheetId}`);
  
  return spreadsheetId;
};

// Main function to sync the db.json data to Google Sheets
const syncDatabaseToSheets = async (dbData) => {
  const client = initAuth();
  if (!client || !fs.existsSync(TOKEN_PATH)) {
    // Cannot sync without auth
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = await getSpreadsheetId(sheets);

    // 1. Get existing sheets (tabs)
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheetInfo.data.sheets.map(s => s.properties.title);

    // 2. Iterate through db.json collections (users, gyms, members, etc)
    const collections = Object.keys(dbData);

    for (const collectionName of collections) {
      const dataRows = dbData[collectionName];
      if (!Array.isArray(dataRows)) continue;

      // Ensure tab exists
      if (!existingSheets.includes(collectionName)) {
        console.log(`[GOOGLE SHEETS] Creating missing tab for: ${collectionName}`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              addSheet: { properties: { title: collectionName } }
            }]
          }
        });
      }

      // Convert array of objects to array of arrays for sheets
      const values = [];
      if (dataRows.length > 0) {
        // Build header row from the first object
        const headers = Object.keys(dataRows[0]);
        values.push(headers);
        
        // Build data rows
        dataRows.forEach(row => {
          values.push(headers.map(header => {
            let val = row[header];
            if (typeof val === 'object') {
               // stringify arrays or objects so they fit in a single cell
               return JSON.stringify(val);
            }
            return val;
          }));
        });
      } else {
         values.push(["(Empty Table)"]);
      }

      // 3. Clear existing data and overwrite
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${collectionName}`
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${collectionName}!A1`,
        valueInputOption: 'RAW',
        resource: { values }
      });
    }

    console.log(`[GOOGLE SHEETS] Successfully synchronized ${collections.length} tables to Spreadsheet.`);
  } catch (err) {
    console.error('[GOOGLE SHEETS] Sync failed:', err.message);
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  syncDatabaseToSheets
};
