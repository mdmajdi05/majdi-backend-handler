// import express from 'express';
// import cors from 'cors';
// import fs from 'fs/promises';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const app = express();
// const PORT = 5000;

// app.use(cors());
// app.use(express.json());

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const messagesDir = path.join(__dirname, 'messages');
// const masterFile = path.join(messagesDir, 'websites.json');

// // Helper: read JSON
// async function readJSON(file) {
//   try {
//     const data = await fs.readFile(file, 'utf8');
//     return JSON.parse(data);
//   } catch (err) {
//     return null;
//   }
// }

// // Helper: write JSON
// async function writeJSON(file, data) {
//   await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
// }

// // Get all APIs / websites
// app.get('/api/list', async (req, res) => {
//   const websites = await readJSON(masterFile) || [];
//   res.json(websites);
// });

// // Create new API
// app.post('/api/create', async (req, res) => {
//   const { site } = req.body;
//   if (!site) return res.status(400).json({ error: "Site name required" });

//   const filePath = path.join(messagesDir, `${site}.json`);
//   const websites = await readJSON(masterFile) || [];

//   // Check if site already exists
//   if (websites.find(w => w.site === site)) {
//     return res.status(400).json({ error: "API already exists" });
//   }

//   // Create JSON file for site
//   await writeJSON(filePath, { message: "" });

//   // Add to master
//   websites.push({
//     site,
//     api: `/api/${site}`,
//     createdAt: new Date().toISOString(),
//     lastUpdated: new Date().toISOString(),
//     messagePresent: false
//   });
//   await writeJSON(masterFile, websites);

//   res.json({ success: true, site });
// });

// // Update message for a site
// app.post('/api/:site', async (req, res) => {
//   const { site } = req.params;
//   const { message } = req.body;
//   if (!message) return res.status(400).json({ error: "Message required" });

//   const filePath = path.join(messagesDir, `${site}.json`);
//   await writeJSON(filePath, { message });

//   // Update master
//   const websites = await readJSON(masterFile) || [];
//   const siteData = websites.find(w => w.site === site);
//   if (siteData) {
//     siteData.lastUpdated = new Date().toISOString();
//     siteData.messagePresent = message.trim() !== "";
//     await writeJSON(masterFile, websites);
//   }

//   res.json({ success: true, message });
// });

// // Reset message
// app.post('/api/:site/reset', async (req, res) => {
//   const { site } = req.params;
//   const filePath = path.join(messagesDir, `${site}.json`);
//   await writeJSON(filePath, { message: "" });

//   // Update master
//   const websites = await readJSON(masterFile) || [];
//   const siteData = websites.find(w => w.site === site);
//   if (siteData) {
//     siteData.lastUpdated = new Date().toISOString();
//     siteData.messagePresent = false;
//     await writeJSON(masterFile, websites);
//   }

//   res.json({ success: true });
// });

// // Delete API
// app.delete('/api/:site', async (req, res) => {
//   const { site } = req.params;
//   const filePath = path.join(messagesDir, `${site}.json`);

//   // Delete file
//   await fs.unlink(filePath).catch(() => null);

//   // Remove from master
//   let websites = await readJSON(masterFile) || [];
//   websites = websites.filter(w => w.site !== site);
//   await writeJSON(masterFile, websites);

//   res.json({ success: true });
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });



import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';  // Promises-based version for async/await
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const messagesDir = path.join(__dirname, 'messages');
const masterFile = path.join(messagesDir, 'websites.json');

// Helper: read JSON (Asynchronous)
async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

// Helper: write JSON (Asynchronous)
async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

// Get live message for a specific site (new API method)
app.get('/api/:site', async (req, res) => {
  const { site } = req.params;
  const filePath = path.join(messagesDir, `${site}.json`);
  
  try {
    // Read site-specific message
    const siteData = await fs.readFile(filePath, 'utf8');
    const { message } = JSON.parse(siteData);
    res.json({ message }); // Return the live message
  } catch (err) {
    res.status(500).json({ message: "No message found for this site." });
  }
});

// Get all APIs / websites (existing API)
app.get('/api/list', async (req, res) => {
  const websites = await readJSON(masterFile) || [];
  res.json(websites);
});

// Create new API (existing API)
app.post('/api/create', async (req, res) => {
  const { site } = req.body;
  if (!site) return res.status(400).json({ error: "Site name required" });

  const filePath = path.join(messagesDir, `${site}.json`);
  const websites = await readJSON(masterFile) || [];

  // Check if site already exists
  if (websites.find(w => w.site === site)) {
    return res.status(400).json({ error: "API already exists" });
  }

  // Create JSON file for site
  await writeJSON(filePath, { message: "" });

  // Add to master
  websites.push({
    site,
    api: `/api/${site}`,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    messagePresent: false
  });
  await writeJSON(masterFile, websites);

  res.json({ success: true, site });
});

// Update message for a site (existing API)
app.post('/api/:site', async (req, res) => {
  const { site } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const filePath = path.join(messagesDir, `${site}.json`);
  await writeJSON(filePath, { message });

  // Update master file
  const websites = await readJSON(masterFile) || [];
  const siteData = websites.find(w => w.site === site);
  if (siteData) {
    siteData.lastUpdated = new Date().toISOString();
    siteData.messagePresent = message.trim() !== "";
    await writeJSON(masterFile, websites);
  }

  res.json({ success: true, message });
});

// Reset message (existing API)
app.post('/api/:site/reset', async (req, res) => {
  const { site } = req.params;
  const filePath = path.join(messagesDir, `${site}.json`);
  await writeJSON(filePath, { message: "" });

  // Update master file
  const websites = await readJSON(masterFile) || [];
  const siteData = websites.find(w => w.site === site);
  if (siteData) {
    siteData.lastUpdated = new Date().toISOString();
    siteData.messagePresent = false;
    await writeJSON(masterFile, websites);
  }

  res.json({ success: true });
});

// Delete API (existing API)
app.delete('/api/:site', async (req, res) => {
  const { site } = req.params;
  const filePath = path.join(messagesDir, `${site}.json`);

  // Delete file
  await fs.unlink(filePath).catch(() => null);

  // Remove from master
  let websites = await readJSON(masterFile) || [];
  websites = websites.filter(w => w.site !== site);
  await writeJSON(masterFile, websites);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});