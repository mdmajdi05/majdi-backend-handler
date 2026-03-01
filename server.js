import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod'; 

const app = express();
const PORT = 5000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE"],
  credentials: true
}));

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const messagesDir = path.join(__dirname, 'messages');
const masterFile = path.join(messagesDir, 'websites.json');

async function initStorage() {
  try {
    await fs.mkdir(messagesDir, { recursive: true });
    try {
      await fs.access(masterFile);
    } catch {
      await fs.writeFile(masterFile, JSON.stringify([], null, 2), 'utf8');
      console.log("📂 Storage Initialized: Created websites.json");
    }
  } catch (err) {
    console.error("❌ Critical Storage Error:", err);
  }
}

// --- ZOD VALIDATION ---
const SiteSchema = z.string().min(2).max(50).regex(/^[a-zA-Z0-9-]+$/, "Invalid characters in site name");
const MessageSchema = z.string().optional();

// --- ATOMIC & SAFE FILE HELPERS ---
async function safeWriteJSON(file, data) {
  const tempFile = `${file}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempFile, file); 
}

async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

// ==============================================
// ✅ FIX: SPECIFIC ROUTES PEHLE, DYNAMIC BAAD
// ==============================================

// GET: All Websites List  ← ✅ Pehle yeh (specific route)
app.get('/api/list', catchAsync(async (req, res) => {
  const websites = await readJSON(masterFile) || [];
  res.json(websites);
}));

// POST: Create New API  ← ✅ Pehle yeh (specific route)
app.post('/api/create', catchAsync(async (req, res) => {
  const site = SiteSchema.parse(req.body.site);
  const filePath = path.join(messagesDir, `${site}.json`);
  const websites = await readJSON(masterFile) || [];

  if (websites.find(w => w.site === site)) {
    return res.status(400).json({ error: "API already exists" });
  }

  await safeWriteJSON(filePath, { message: "" });

  websites.push({
    site,
    api: `/api/${site}`,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    messagePresent: false
  });
  await safeWriteJSON(masterFile, websites);

  res.json({ success: true, site });
}));

// POST: Reset Site Message  ← ✅ Pehle yeh (:site/reset, more specific)
app.post('/api/:site/reset', catchAsync(async (req, res) => {
  const site = SiteSchema.parse(req.params.site);
  const filePath = path.join(messagesDir, `${site}.json`);
  
  await safeWriteJSON(filePath, { message: "" });

  const websites = await readJSON(masterFile) || [];
  const index = websites.findIndex(w => w.site === site);
  
  if (index !== -1) {
    websites[index].lastUpdated = new Date().toISOString();
    websites[index].messagePresent = false;
    await safeWriteJSON(masterFile, websites);
  }

  res.json({ success: true });
}));

// GET: Individual Site Message  ← Dynamic route, baad mein
app.get('/api/:site', catchAsync(async (req, res) => {
  const site = SiteSchema.parse(req.params.site);
  const filePath = path.join(messagesDir, `${site}.json`);
  
  try {
    const siteData = await fs.readFile(filePath, 'utf8');
    res.json(JSON.parse(siteData));
  } catch (err) {
    res.status(404).json({ message: "No message found for this site." });
  }
}));

// POST: Update Site Message  ← Dynamic route, baad mein
app.post('/api/:site', catchAsync(async (req, res) => {
  const site = SiteSchema.parse(req.params.site);
  const { message } = req.body;
  const validMessage = MessageSchema.parse(message);

  const filePath = path.join(messagesDir, `${site}.json`);
  await safeWriteJSON(filePath, { message: validMessage || "" });

  const websites = await readJSON(masterFile) || [];
  const index = websites.findIndex(w => w.site === site);
  
  if (index !== -1) {
    websites[index].lastUpdated = new Date().toISOString();
    websites[index].messagePresent = (validMessage?.trim() || "") !== "";
    await safeWriteJSON(masterFile, websites);
  }

  res.json({ success: true, message: validMessage });
}));

// DELETE: Remove API
app.delete('/api/:site', catchAsync(async (req, res) => {
  const site = SiteSchema.parse(req.params.site);
  const filePath = path.join(messagesDir, `${site}.json`);

  await fs.unlink(filePath).catch(() => null);

  let websites = await readJSON(masterFile) || [];
  websites = websites.filter(w => w.site !== site);
  await safeWriteJSON(masterFile, websites);

  res.json({ success: true });
}));

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ 
      error: "Validation Failed", 
      details: err.errors.map(e => e.message) 
    });
  }
  
  if (err.code === 'ENOENT') {
    return res.status(404).json({ error: "File or Resource not found" });
  }

  console.error("🔥 System Error Catch:", err.stack);
  res.status(500).json({ error: "Internal Server Sync Error" });
});

(async () => {
  await initStorage();
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
})();