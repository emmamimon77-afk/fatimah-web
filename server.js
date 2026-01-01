const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

// ===== BODY PARSER MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// ===================================


// ===== SSL CONFIGURATION =====
const SSL_KEY_PATH = 'ssl/key.pem';
const SSL_CERT_PATH = 'ssl/cert.pem';

let sslCredentials = null;
try {
  const privateKey = fs.readFileSync(SSL_KEY_PATH, 'utf8');
  const certificate = fs.readFileSync(SSL_CERT_PATH, 'utf8');
  sslCredentials = { key: privateKey, cert: certificate };
  console.log('✅ SSL certificates loaded successfully');
} catch (err) {
  console.log('⚠️ SSL certificates not found. HTTPS will not be available.');
  console.log('   HTTP will still work on port 8080.');
}

// ===== TEMPORARY: FORCE FILE STORAGE FOR TESTING =====
// Set to false when MongoDB is working
const FORCE_FILE_STORAGE = true;

// Then modify your initDB function:
async function initDB() {
  if (FORCE_FILE_STORAGE) {
    console.log('📁 TEMPORARY: Forcing file storage (MongoDB disabled)');
    messagesCollection = null;
    return;
  }
  
  try {
    dbClient = new MongoClient(MONGODB_URI);
    await dbClient.connect();
    const db = dbClient.db(DB_NAME);
    messagesCollection = db.collection(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Create index for better performance
    await messagesCollection.createIndex({ time: -1 });
  } catch (err) {
    console.log('❌ MongoDB connection error:', err.message);
    // Fallback to memory storage
    messagesCollection = null;
  }
}

// ===== MONGODB CONFIGURATION =====
const { MongoClient } = require('mongodb');

// Your connection string from MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://emmamimon77_db_user:z01RznyHwIuTqSWw@cluster0.7prkjzu.mongodb.net/fatimah_server?retryWrites=true&w=majority';

// Add this line back:
const DB_NAME = 'fatimah_server';  // <-- ADD THIS LINE BACK
const COLLECTION_NAME = 'messages';


let dbClient = null;
let messagesCollection = null;

// Initialize MongoDB connection
async function initDB() {
  try {
    dbClient = new MongoClient(MONGODB_URI);
    await dbClient.connect();
    const db = dbClient.db(DB_NAME);
    messagesCollection = db.collection(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Create index for better performance
    await messagesCollection.createIndex({ time: -1 });
  } catch (err) {
    console.log('❌ MongoDB connection error:', err.message);
    // Fallback to memory storage
    messagesCollection = null;
  }
}

// Call init on server start
initDB();

// ===== MESSAGE SYSTEM =====
let messages = [];

async function loadMessages() {
  if (messagesCollection) {
    try {
      // Load from MongoDB
      const dbMessages = await messagesCollection
        .find({})
        .sort({ time: -1 })
        .limit(100)
        .toArray();
      
      messages = dbMessages.reverse(); // Oldest first
      console.log(`📝 Loaded ${messages.length} messages from MongoDB`);
    } catch (err) {
      console.log('Error loading from MongoDB:', err.message);
      messages = [];
    }
  } else {
    // Fallback to file system
    try {
      if (fs.existsSync('data/messages.json')) {
        const data = fs.readFileSync('data/messages.json', 'utf8');
        messages = JSON.parse(data);
        console.log(`📝 Loaded ${messages.length} messages from file`);
      }
    } catch (err) {
      console.log('Error loading messages:', err.message);
      messages = [];
    }
  }
}

async function saveMessages() {
  console.log(`💾 Attempting to save ${messages.length} messages...`);
  
  if (messagesCollection) {
    try {
      // Save to MongoDB (replace all documents)
      console.log('🗃️ Saving to MongoDB...');
      await messagesCollection.deleteMany({});
      if (messages.length > 0) {
        const result = await messagesCollection.insertMany(messages);
        console.log(`✅ Saved ${result.insertedCount} messages to MongoDB`);
      } else {
        console.log('📭 No messages to save to MongoDB');
      }
    } catch (err) {
      console.log('❌ MongoDB save error:', err.message);
      console.log('❌ Full error:', err);
      
      // Fallback to file
      try {
        if (!fs.existsSync('data')) {
          fs.mkdirSync('data', { recursive: true });
        }
        fs.writeFileSync('data/messages.json', JSON.stringify(messages, null, 2));
        console.log('📁 Saved to fallback file instead');
      } catch (fileErr) {
        console.log('❌ File save error:', fileErr.message);
      }
    }
  } else {
    // Fallback to file
    console.log('📁 MongoDB not available, saving to file...');
    try {
      if (!fs.existsSync('data')) {
        fs.mkdirSync('data', { recursive: true });
      }
      fs.writeFileSync('data/messages.json', JSON.stringify(messages, null, 2));
      console.log(`📁 Saved ${messages.length} messages to file`);
    } catch (err) {
      console.log('Error saving messages to file:', err.message);
    }
  }
}

function cleanupMessages() {
  if (messages.length > 100) {
    console.log(`🧹 Cleaning up messages: ${messages.length} -> 100`);
    messages = messages.slice(-100);
    saveMessages();
  }
}

// Load messages on startup
loadMessages();
setInterval(cleanupMessages, 3600000);

// ===== FILE UPLOAD CONFIG =====
const UPLOADS_DIR = 'uploads';

// Ensure uploads directory exists on startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('✅ Created uploads directory');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR);
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

// Ensure data directory exists on startup
if (!fs.existsSync('data')) {
  fs.mkdirSync('data', { recursive: true });
  console.log('✅ Created data directory');
}

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});


// ===== SHARED TEMPLATES =====
const navigation = `
  <nav style="background: rgba(0,0,0,0.8); padding: 15px; border-radius: 10px; margin-bottom: 30px;">
    <a href="/" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">🏠 Home</a>
    <a href="/about" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">📖 About</a>
    <a href="/friends" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">👥 Friends</a>
    <a href="/message" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">💬 Messages</a>
    <a href="/files" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">🗂️ Files</a>
    <a href="/links" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">🔗 Basic Links</a>
    <a href="/education" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">🎓 Education</a>
    <a href="/ai" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">🤖 AI Resources</a>
    <a href="/news" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">📰 News & Media</a>
    <a href="/entertainment" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">🎬 Entertainment</a>
  </nav>
`;

const styles = `
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      text-align: center;
      padding: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
    }
    .container {
      background: rgba(0,0,0,0.7);
      padding: 40px;
      border-radius: 15px;
      display: inline-block;
      max-width: 800px;
      margin: 20px auto;
      text-align: left;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 20px;
      color: #ffd166;
    }
    h2 {
      color: #a9e4d7;
      margin-top: 30px;
    }
    p {
      font-size: 1.2em;
      margin: 10px 0;
      line-height: 1.6;
    }
    a {
      color: #6ee7b7;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .message-box, .friend-card, .file-item {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    input, textarea {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
      border: none;
    }
    button {
      background: #6ee7b7;
      color: #000;
      padding: 12px 25px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1.1em;
      font-weight: bold;
    }
    button:hover {
      background: #34d399;
    }
    .delete-btn {
      background: #f87171;
      margin-left: 10px;
    }
    .delete-btn:hover {
      background: #ef4444;
    }
    .success {
      background: rgba(110, 231, 183, 0.2);
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
    .error {
      background: rgba(248, 113, 113, 0.2);
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
    .https-info {
      background: rgba(255, 215, 102, 0.2);
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .link-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .link-card {
      background: rgba(255,255,255,0.05);
      padding: 15px;
      border-radius: 8px;
      transition: transform 0.2s;
    }
    .link-card:hover {
      transform: translateY(-2px);
      background: rgba(255,255,255,0.08);
    }
  </style>
`;

// Test MongoDB connection
app.get('/test-mongo', async (req, res) => {
  try {
    if (!messagesCollection) {
      return res.send('❌ MongoDB not connected. messagesCollection is null');
    }
    
    // Test connection
    const count = await messagesCollection.countDocuments();
    const testMessage = {
      name: 'Test User',
      message: 'Test message from /test-mongo route',
      time: new Date().toLocaleString()
    };
    
    // Try to insert
    const insertResult = await messagesCollection.insertOne(testMessage);
    
    // Count again
    const newCount = await messagesCollection.countDocuments();
    
    // Delete test message
    await messagesCollection.deleteOne({ _id: insertResult.insertedId });
    
    res.send(`
      <h1>MongoDB Test Results</h1>
      <p>✅ Connection status: ${messagesCollection ? 'Connected' : 'Not connected'}</p>
      <p>📊 Initial document count: ${count}</p>
      <p>✅ Test insertion: Successful</p>
      <p>📊 New document count: ${newCount}</p>
      <p>✅ Test deletion: Successful</p>
      <p>🔄 Final document count: ${await messagesCollection.countDocuments()}</p>
      <hr>
      <p>Messages in memory: ${messages.length}</p>
      <p>Uploads directory exists: ${fs.existsSync('uploads') ? 'Yes' : 'No'}</p>
      <p>Data directory exists: ${fs.existsSync('data') ? 'Yes' : 'No'}</p>
    `);
  } catch (err) {
    res.send(`
      <h1>MongoDB Test Error</h1>
      <p>❌ Error: ${err.message}</p>
      <p>📝 Stack: ${err.stack}</p>
      <hr>
      <p>Messages in memory: ${messages.length}</p>
    `);
  }
});

// ===== ROUTES =====

// Home Page
app.get('/', (req, res) => {
  const protocol = req.secure ? 'https' : 'http';
  const port = PORT;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🌸 Fatimah's Server 🌸</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🌸 Welcome to Fatimah's Server! 🌸</h1>
        <p>You are connected via my private Tailscale network.</p>
        <p>Connected via: <strong>${protocol.toUpperCase()}</strong> on port <strong>${port}</strong></p>
        
        <div class="message-box">
          <h2>📢 Recent Messages</h2>
          ${messages.slice(-3).reverse().map(msg => `
            <p><strong>${msg.name}</strong>: ${msg.message} <em>(${msg.time})</em></p>
          `).join('')}
          ${messages.length === 0 ? '<p>No messages yet. Be the first to say hello!</p>' : ''}
        </div>
        
        <div class="https-info">
         <h2>🔐 Secure Connection</h2>
         ${protocol === 'https' 
          ? '<p>✅ You are connected via HTTPS (secure)</p>' 
          : '<p>✅ You are connected via HTTP (your connection is managed by Render)</p>'
          }
        </div>
        
        <h2>⚡ Quick Access</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>💬 Communication</h3>
            <p><a href="/message"><button>Send a Message</button></a></p>
            <p><a href="/files"><button>File Sharing</button></a></p>
            <p><a href="/friends"><button>Friends List</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>🎓 Learning</h3>
            <p><a href="/education"><button>Education</button></a></p>
            <p><a href="/ai"><button>AI Resources</button></a></p>
            <p><a href="/links"><button>Basic Links</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>📰 Media</h3>
            <p><a href="/news"><button>News & Media</button></a></p>
            <p><a href="/entertainment"><button>Entertainment</button></a></p>
            <p><a href="/about"><button>About Server</button></a></p>
          </div>
        </div>
        
        <h2>📊 Server Stats</h2>
        <p>• Messages stored: <strong>${messages.length}</strong></p>
        <p>• Files directory: <code>~/fatimah-web/uploads/</code></p>
        <p>• HTTPS available: <strong>${sslCredentials ? 'Yes' : 'No'}</strong></p>
        <p>• Auto-restart: <strong>Enabled</strong> (survives reboots)</p>
      </div>
    </body>
    </html>
  `);
});

// About Page - FIXED FOR RENDER
app.get('/about', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>About - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>📖 About This Server</h1>
        <p>This is an educational web server project deployed on Render.</p>
        
        <h2>🎯 Purpose</h2>
        <p>• Private communication hub for friends</p>
        <p>• Share links and resources securely</p>
        <p>• Learning platform for web development</p>
        <p>• Safe space to experiment and collaborate</p>
        
        <h2>🔒 Security</h2>
        <p>• Deployed on Render with automatic HTTPS</p>
        <p>• Secure connections via SSL/TLS</p>
        <p>• Private code repository</p>
        <p>• Regular updates and maintenance</p>
        
        <h2>🚀 Technology</h2>
        <p>• Node.js + Express web server</p>
        <p>• Render.com for cloud hosting</p>
        <p>• GitHub for version control</p>
        <p>• JavaScript, HTML, CSS</p>
        
        <h2>🌐 Connection Info</h2>
        <p>• Live URL: <code>https://fatimah-web.onrender.com</code></p>
        <p>• GitHub: <code>https://github.com/emmamimon77-afk/fatimah-web</code></p>
        <p>• Port: <code>${process.env.PORT || 10000}</code></p>
        
        <h2>📁 Project Structure</h2>
        <p>• Server code: <code>server.js</code></p>
        <p>• Messages: stored in application memory</p>
        <p>• Dependencies: <code>package.json</code></p>
        <p>• Version control: Git with GitHub</p>
        
        <br>
        <a href="/" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

// Friends Page
app.get('/friends', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Friends - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>👥 Friends Network</h1>
        <p>These are the trusted friends who can access this server:</p>
        
        <div class="friend-card">
          <h3>🌸 Fatimah (You!)</h3>
          <p>📍 Server Administrator</p>
          <p>💻 Maintains this private network</p>
          <p>📧 Can add/remove friends via Tailscale admin</p>
        </div>
        
        <div class="friend-card">
          <h3>👋 Future Friend 1</h3>
          <p>📍 To be invited via Tailscale</p>
          <p>📧 Will appear here once joined</p>
          <p>🎯 Can send messages and share files</p>
        </div>
        
        <div class="friend-card">
          <h3>👋 Future Friend 2</h3>
          <p>📍 To be invited via Tailscale</p>
          <p>📧 Will appear here once joined</p>
          <p>🎯 Can access all educational resources</p>
        </div>
        
        <div class="friend-card">
          <h3>👋 Future Friend 3</h3>
          <p>📍 To be invited via Tailscale</p>
          <p>📧 Will appear here once joined</p>
          <p>🎯 Can browse news and entertainment</p>
        </div>
        
        <h2>➕ How to Add Friends</h2>
        <p>1. Go to <a href="https://login.tailscale.com" target="_blank">Tailscale Admin</a></p>
        <p>2. Click "Invite someone"</p>
        <p>3. Send the invite link to your friend</p>
        <p>4. Once they join, their name will appear here!</p>
        
        <h2>🔐 Friend Permissions</h2>
        <p>• All friends can: Send messages, upload/download files</p>
        <p>• All friends can: Access all educational and AI resources</p>
        <p>• All friends can: Browse news and entertainment links</p>
        <p>• Only Fatimah can: Delete messages, delete files, manage server</p>
      </div>
    </body>
    </html>
  `);
});

// Messages Page
app.get('/message', (req, res) => {
  const success = req.query.success;
  const error = req.query.error;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Send Message - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>💬 Send a Message</h1>
        <p>Leave a message for Fatimah or other friends visiting this server.</p>
        
        ${success ? `<div class="success">${success}</div>` : ''}
        ${error ? `<div class="error">${error}</div>` : ''}
        
        <form method="POST" action="/send-message">
          <p><strong>Your Name:</strong></p>
          <input type="text" name="name" placeholder="Enter your name" required>
          
          <p><strong>Your Message:</strong></p>
          <textarea name="message" rows="5" placeholder="Type your message here..." required></textarea>
          
          <br>
          <button type="submit">📤 Send Message</button>
        </form>
        
        <h2>📜 Recent Messages (${messages.length} total)</h2>
        ${messages.slice(-5).reverse().map((msg, index) => `
          <div class="message-box">
            <p><strong>${msg.name}</strong> said:</p>
            <p>${msg.message}</p>
            <p><small>${msg.time}</small></p>
            <p>
              <a href="/delete-message/${messages.length - 1 - index}">
                <button class="delete-btn">🗑️ Delete</button>
              </a>
            </p>
          </div>
        `).join('')}
        ${messages.length === 0 ? '<p>No messages yet. Be the first!</p>' : ''}
        
        <div class="https-info">
          <h3>💾 Message Storage</h3>
          <p>• Messages are saved to <strong>MongoDB Atlas</strong> (persistent storage)</p>
          <p>• Auto-cleanup: Keeps last 100 messages</p>
          <p>• Messages persist through server restarts</p>
          <p>• Only visible to Tailscale-connected friends</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Handle message submission
app.post('/send-message', async (req, res) => {
  // Debug: log what we receive
  console.log('📨 Received form data:', req.body);
  
  if (!req.body) {
    return res.redirect('/message?error=No form data received. Check server middleware.');
  }
  
  const { name, message } = req.body;
  const time = new Date().toLocaleString();
  
  if (!name || !name.trim() || !message || !message.trim()) {
    return res.redirect('/message?error=Name and message are required');
  }
  
  messages.push({ name: name.trim(), message: message.trim(), time });
  
  // Try to save
  try {
    await saveMessages();
    res.redirect('/message?success=Message sent successfully!');
  } catch (err) {
    console.error('❌ Save error:', err);
    // Even if save fails, keep message in memory for current session
    res.redirect('/message?success=Message sent (but saving failed)');
  }
});

// Delete message
app.get('/delete-message/:index', async (req, res) => {
  const index = parseInt(req.params.index);
  if (index >= 0 && index < messages.length) {
    messages.splice(index, 1);
    await saveMessages();
    res.redirect('/message?success=Message deleted');
  } else {
    res.redirect('/message?error=Invalid message');
  }
});

// File Upload Page
app.get('/files', (req, res) => {
  let fileList = [];
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    fileList = files.map(file => {
      const stats = fs.statSync(path.join(UPLOADS_DIR, file));
      return {
        name: file,
        size: (stats.size / 1024).toFixed(2) + ' KB',
        date: stats.mtime.toLocaleDateString(),
        url: `/download/${file}`
      };
    });
  } catch (err) {
    console.log('No files in uploads directory');
  }

  const success = req.query.success;
  const error = req.query.error;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>File Sharing - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/files"', 'href="/files" style="color: #6ee7b7;"')}
        <h1>🗂️ File Sharing Area</h1>
        <p>Upload and download files securely within our private network.</p>
        
        ${success ? `<div class="success">${success}</div>` : ''}
        ${error ? `<div class="error">${error}</div>` : ''}
        
        <div class="message-box">
          <h2>📤 Upload a File</h2>
          <form action="/upload" method="POST" enctype="multipart/form-data">
            <input type="file" name="file" required>
            <br><br>
            <button type="submit">⬆️ Upload File</button>
          </form>
          <p><small>Max file size: 50MB. Files are private to this server only.</small></p>
        </div>
        
        <h2>📥 Available Files (${fileList.length})</h2>
        ${fileList.length === 0 ? 
          '<p>No files uploaded yet. Be the first!</p>' : 
          fileList.map(file => `
            <div class="file-item">
              <h3>📄 ${file.name}</h3>
              <p>Size: ${file.size} | Date: ${file.date}</p>
              <p>
                <a href="${file.url}"><button>⬇️ Download</button></a>
                <a href="/delete-file/${file.name}">
                  <button class="delete-btn">🗑️ Delete</button>
                </a>
              </p>
            </div>
          `).join('')
        }
        
        <div class="https-info">
          <h3>📋 File Sharing Rules</h3>
          <p>1. Maximum file size: 50MB per file</p>
          <p>2. All file types allowed (images, documents, videos, etc.)</p>
          <p>3. Files stay until manually deleted</p>
          <p>4. Only Tailscale-connected friends can access</p>
          <p>5. Storage location: <code>~/fatimah-web/uploads/</code></p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.redirect('/files?error=No file uploaded');
  }
  res.redirect('/files?success=File uploaded successfully: ' + req.file.originalname);
});

// File download
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, UPLOADS_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.redirect('/files?error=File not found');
  }
});

// Delete file
app.get('/delete-file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, UPLOADS_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.redirect('/files?success=File deleted: ' + filename);
  } else {
    res.redirect('/files?error=File not found');
  }
});

// Links Page
app.get('/links', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Useful Links - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/links"', 'href="/links" style="color: #6ee7b7;"')}
        <h1>🔗 Basic Useful Links</h1>
        <p>Essential links for development, Tailscale, and general resources.</p>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>🌐 Tailscale</h3>
            <p><a href="https://login.tailscale.com" target="_blank">🔐 Admin Console</a></p>
            <p><a href="https://tailscale.com/kb" target="_blank">📚 Documentation</a></p>
            <p><a href="https://tailscale.com/download" target="_blank">⬇️ Downloads</a></p>
          </div>
          
          <div class="link-card">
            <h3>💻 Development</h3>
            <p><a href="https://nodejs.org" target="_blank">🟢 Node.js</a></p>
            <p><a href="https://expressjs.com" target="_blank">🚀 Express.js</a></p>
            <p><a href="https://developer.mozilla.org" target="_blank">🦖 MDN Web Docs</a></p>
          </div>
          
          <div class="link-card">
            <h3>🔧 Server Management</h3>
            <p><a href="https://systemd.io" target="_blank">⚙️ Systemd</a></p>
            <p><a href="https://linuxmint.com" target="_blank">🍃 Linux Mint</a></p>
            <p><a href="https://nginx.org" target="_blank">🌐 Nginx</a></p>
          </div>
          
          <div class="link-card">
            <h3>🎬 Social Media</h3>
            <p><a href="https://www.youtube.com" target="_blank">▶️ YouTube</a></p>
            <p><a href="https://www.patreon.com" target="_blank">❤️ Patreon</a></p>
            <p><a href="https://twitter.com" target="_blank">🐦 Twitter/X</a></p>
            <p><a href="https://discord.com" target="_blank">💬 Discord</a></p>
          </div>
        </div>
        
        <h2>🔍 More Categories</h2>
        <p>Check out our specialized pages for more organized links:</p>
        <p><a href="/education"><button>🎓 Education Resources</button></a></p>
        <p><a href="/ai"><button>🤖 AI Resources</button></a></p>
        <p><a href="/news"><button>📰 News & Media</button></a></p>
        <p><a href="/entertainment"><button>🎬 Entertainment</button></a></p>
      </div>
    </body>
    </html>
  `);
});

// ===== EDUCATION PAGE =====
app.get('/education', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Education Resources - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/education"', 'href="/education" style="color: #6ee7b7;"')}
        <h1>🎓 Education & Learning Resources</h1>
        <p>Free and open educational platforms for skill development and knowledge.</p>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>🧪 Interactive Learning</h3>
            <p><a href="https://kahoot.com" target="_blank">🎮 Kahoot</a> - Interactive quizzes</p>
            <p><a href="https://quizizz.com" target="_blank">📝 Quizizz</a> - Engaging quizzes</p>
            <p><a href="https://quizlet.com" target="_blank">📚 Quizlet</a> - Flashcards</p>
            <p><a href="https://duolingo.com" target="_blank">🦉 Duolingo</a> - Language learning</p>
          </div>
          
          <div class="link-card">
            <h3>💻 Web Development</h3>
            <p><a href="https://www.w3schools.com" target="_blank">🌐 W3Schools</a> - Web tutorials</p>
            <p><a href="https://freecodecamp.org" target="_blank">🏕️ freeCodeCamp</a> - Coding lessons</p>
            <p><a href="https://codecademy.com" target="_blank">💻 Codecademy</a> - Interactive coding</p>
            <p><a href="https://github.com" target="_blank">🐙 GitHub</a> - Code hosting</p>
            <p><a href="https://stackoverflow.com" target="_blank">🗃️ Stack Overflow</a> - Q&A</p>
          </div>
          
          <div class="link-card">
            <h3>📚 Academic Resources</h3>
            <p><a href="https://archive.org" target="_blank">🏛️ Internet Archive</a> - Digital library</p>
            <p><a href="https://libgen.is" target="_blank">📖 Library Genesis</a> - Academic books</p>
            <p><a href="https://sci-hub.se" target="_blank">🔬 Sci-Hub</a> - Scientific papers</p>
            <p><a href="https://z-lib.id" target="_blank">📕 Z-Library</a> - Book repository</p>
            <p><a href="https://www.unz.com" target="_blank">📖 Unz Review</a> - Alternative perspectives</p>
          </div>
          
          <div class="link-card">
            <h3>🎯 Skill Development</h3>
            <p><a href="https://khanacademy.org" target="_blank">🎯 Khan Academy</a> - Free courses</p>
            <p><a href="https://coursera.org" target="_blank">🎓 Coursera</a> - University courses</p>
            <p><a href="https://edx.org" target="_blank">📈 edX</a> - Online learning</p>
            <p><a href="https://udemy.com" target="_blank">🏫 Udemy</a> - Video courses</p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>💡 Learning Tips</h3>
          <p>• Set aside 30 minutes daily for consistent learning</p>
          <p>• Practice coding with small, manageable projects</p>
          <p>• Join online communities (Discord, forums) for support</p>
          <p>• Document your learning journey in a personal wiki or notes</p>
          <p>• Teach others what you've learned to reinforce knowledge</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ===== AI RESOURCES PAGE =====
app.get('/ai', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Resources - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/ai"', 'href="/ai" style="color: #6ee7b7;"')}
        <h1>🤖 Open Source AI Resources</h1>
        <p>Free and open AI platforms, models, and tools for learning and development.</p>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>🧠 AI Chat & Assistants</h3>
            <p><a href="https://chat.deepseek.com" target="_blank">🔍 DeepSeek AI</a> - Open source assistant</p>
            <p><a href="https://qwenlm.com" target="_blank">🐬 Qwen AI</a> - Alibaba's AI models</p>
            <p><a href="https://moonshot.cn" target="_blank">🚀 Moonshot AI</a> - Chinese AI platform</p>
            <p><a href="https://openai.com" target="_blank">⚡ OpenAI</a> - ChatGPT and APIs</p>
            <p><a href="https://claude.ai" target="_blank">🧠 Claude AI</a> - Anthropic's assistant</p>
          </div>
          
          <div class="link-card">
            <h3>📚 AI Learning Platforms</h3>
            <p><a href="https://brightlearn.ai" target="_blank">🌟 BrightLearn AI</a> - AI education</p>
            <p><a href="https://books.brightlearn.ai" target="_blank">📘 BrightLearn Books</a> - AI textbooks</p>
            <p><a href="https://huggingface.co" target="_blank">🤗 Hugging Face</a> - Model repository</p>
            <p><a href="https://kaggle.com" target="_blank">🏆 Kaggle</a> - Competitions & datasets</p>
            <p><a href="https://maestroai.org" target="_blank">🎼 Maestro AI</a> - Music AI platform</p>
          </div>
          
          <div class="link-card">
            <h3>🛠️ AI Development Tools</h3>
            <p><a href="https://developer.nvidia.com/ai" target="_blank">🟢 NVIDIA AI</a> - GPU-accelerated AI</p>
            <p><a href="https://pytorch.org" target="_blank">🔥 PyTorch</a> - ML framework</p>
            <p><a href="https://tensorflow.org" target="_blank">⚡ TensorFlow</a> - Google's ML platform</p>
            <p><a href="https://ollama.com" target="_blank">🦙 Ollama</a> - Local AI model runner</p>
            <p><a href="https://lmstudio.ai" target="_blank">💻 LM Studio</a> - Local AI interface</p>
          </div>
          
          <div class="link-card">
            <h3>🎨 Creative AI Tools</h3>
            <p><a href="https://stability.ai" target="_blank">🎨 Stability AI</a> - Stable Diffusion</p>
            <p><a href="https://leonardo.ai" target="_blank">🖼️ Leonardo AI</a> - Image generation</p>
            <p><a href="https://sunoaiapp.com" target="_blank">🎵 Suno AI</a> - Music generation</p>
            <p><a href="https://elevenlabs.io" target="_blank">🗣️ ElevenLabs</a> - Voice synthesis</p>
            <p><a href="https://runwayml.com" target="_blank">🎥 Runway ML</a> - Video AI tools</p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>🚀 Getting Started with AI</h3>
          <p>1. <strong>Begin with user-friendly platforms:</strong> Try DeepSeek or ChatGPT for casual use</p>
          <p>2. <strong>Learn Python basics:</strong> Python is the primary language for AI development</p>
          <p>3. <strong>Experiment with pre-trained models:</strong> Use Hugging Face to try models without coding</p>
          <p>4. <strong>Join AI communities:</strong> Discord servers, Reddit communities, and forums</p>
          <p>5. <strong>Work on small projects:</strong> Start with simple tasks like text classification or image generation</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ===== NEWS & MEDIA PAGE - UPDATED LINKS =====
app.get('/news', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>News & Media - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/news"', 'href="/news" style="color: #6ee7b7;"')}
        <h1>📰 Independent News & Media</h1>
        <p>Alternative news sources, independent journalism, and uncensored media.</p>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>📡 Alternative News Networks</h3>
            <p><a href="/world-news">🌍 World News</a> | <a href="https://censored.news/category/world" target="_blank">(External)</a></p>
            <p><a href="/us-news">🇺🇸 US News</a> | <a href="https://censored.news/category/us" target="_blank">(External)</a></p>
            <p><a href="/technology">💻 Technology</a> | <a href="https://censored.news/category/technology" target="_blank">(External)</a></p>
            <p><a href="/health">🏥 Health</a> | <a href="https://censored.news/category/health" target="_blank">(External)</a></p>
            <p><a href="https://censored.news" target="_blank">🚫 Censored News</a> - Main aggregator</p>
          </div>
          
          <div class="link-card">
            <h3>📚 Independent Publications</h3>
            <p><a href="https://www.unz.com" target="_blank">📖 The Unz Review</a> - Alternative perspectives</p>
            <p><a href="https://www.zerohedge.com" target="_blank">📈 Zero Hedge</a> - Financial news</p>
            <p><a href="https://www.theguardian.com" target="_blank">📰 The Guardian</a> - International news</p>
            <p><a href="https://www.aljazeera.com" target="_blank">🌐 Al Jazeera</a> - Middle East focus</p>
            <p><a href="https://www.rt.com" target="_blank">📺 RT News</a> - Russian perspective</p>
          </div>
          
          <div class="link-card">
            <h3>🎙️ Podcasts & Audio</h3>
            <p><a href="https://app.podscribe.com/series/9377" target="_blank">🎧 Podscribe Series</a> - Podcast platform</p>
            <p><a href="https://open.spotify.com" target="_blank">🎵 Spotify Podcasts</a></p>
            <p><a href="https://podcasts.apple.com" target="_blank">🍎 Apple Podcasts</a></p>
            <p><a href="https://www.youtube.com" target="_blank">📹 YouTube Podcasts</a></p>
            <p><a href="https://www.podbean.com" target="_blank">🌱 Podbean</a> - Podcast hosting</p>
          </div>
          
          <div class="link-card">
            <h3>📰 Fact-Checking & Verification</h3>
            <p><a href="https://mediabiasfactcheck.com" target="_blank">⚖️ Media Bias Fact Check</a></p>
            <p><a href="https://www.snopes.com" target="_blank">🔍 Snopes</a> - Fact checking</p>
            <p><a href="https://www.reuters.com" target="_blank">📰 Reuters</a> - News agency</p>
            <p><a href="https://apnews.com" target="_blank">🏢 Associated Press</a></p>
            <p><a href="https://www.bbc.com/news" target="_blank">🇬🇧 BBC News</a></p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>🔍 Media Literacy Tips</h3>
          <p>• <strong>Verify from multiple sources:</strong> Cross-check stories across different outlets</p>
          <p>• <strong>Check dates and context:</strong> News can be re-shared out of context</p>
          <p>• <strong>Understand media bias:</strong> Every outlet has perspective - know theirs</p>
          <p>• <strong>Follow primary sources:</strong> When possible, read original documents/interviews</p>
          <p>• <strong>Question funding sources:</strong> Who pays for the media you consume?</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ===== ENTERTAINMENT PAGE =====
app.get('/entertainment', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Entertainment - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/entertainment"', 'href="/entertainment" style="color: #6ee7b7;"')}
        <h1>🎬 Entertainment & Independent Media</h1>
        <p>Video platforms, streaming services, and entertainment outside mainstream control.</p>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>🎥 Independent Video Platforms</h3>
            <p><a href="https://www.brighteon.com" target="_blank">☀️ Brighteon</a> - Free speech video platform</p>
            <p><a href="https://www.brighteon.com/channels/hrreport" target="_blank">📺 Health Ranger Report</a></p>
            <p><a href="https://rumble.com" target="_blank">🎬 Rumble</a> - Alternative to YouTube</p>
            <p><a href="https://odysee.com" target="_blank">🟣 Odysee</a> - Decentralized video</p>
            <p><a href="https://bitchute.com" target="_blank">🔵 BitChute</a> - Peer-to-peer video</p>
          </div>
          
          <div class="link-card">
            <h3>🎬 Streaming Services</h3>
            <p><a href="https://www.youtube.com" target="_blank">▶️ YouTube</a> - Video sharing</p>
            <p><a href="https://www.netflix.com" target="_blank">🍿 Netflix</a> - Movies & series</p>
            <p><a href="https://www.disneyplus.com" target="_blank">🏰 Disney+</a> - Family entertainment</p>
            <p><a href="https://www.hulu.com" target="_blank">📺 Hulu</a> - TV shows</p>
            <p><a href="https://www.amazon.com/primevideo" target="_blank">📦 Amazon Prime Video</a></p>
          </div>
          
          <div class="link-card">
            <h3>🎮 Gaming & Interactive</h3>
            <p><a href="https://www.twitch.tv" target="_blank">🟣 Twitch</a> - Game streaming</p>
            <p><a href="https://www.steampowered.com" target="_blank">🚂 Steam</a> - Game platform</p>
            <p><a href="https://www.epicgames.com" target="_blank">🟣 Epic Games</a> - Game store</p>
            <p><a href="https://itch.io" target="_blank">🎮 itch.io</a> - Indie games</p>
            <p><a href="https://www.roblox.com" target="_blank">🧱 Roblox</a> - User-generated games</p>
          </div>
          
          <div class="link-card">
            <h3>🎵 Music & Audio</h3>
            <p><a href="https://www.spotify.com" target="_blank">🎵 Spotify</a> - Music streaming</p>
            <p><a href="https://soundcloud.com" target="_blank">☁️ SoundCloud</a> - Independent music</p>
            <p><a href="https://bandcamp.com" target="_blank">🎸 Bandcamp</a> - Artist direct sales</p>
            <p><a href="https://www.apple.com/apple-music" target="_blank">🍎 Apple Music</a></p>
            <p><a href="https://www.deezer.com" target="_blank">🎧 Deezer</a> - Music streaming</p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>🎯 Content Discovery Tips</h3>
          <p>• <strong>Use multiple platforms:</strong> Different platforms have different content ecosystems</p>
          <p>• <strong>Support independent creators:</strong> Patreon, Buy Me a Coffee, or direct purchases</p>
          <p>• <strong>Create themed playlists:</strong> Organize content by mood, activity, or topic</p>
          <p>• <strong>Explore recommendations:</strong> Ask friends for their favorite channels/creators</p>
          <p>• <strong>Curate your feed:</strong> Regularly unsubscribe from content that no longer serves you</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ===== MISSING NEWS ROUTES - ADDED =====

// World News Page
app.get('/world-news', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>World News - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🌍 World News</h1>
        <p>This section is for curated world news links and resources.</p>
        <p>• <a href="https://censored.news/category/world" target="_blank">🌐 Censored.news World Section</a></p>
        <p>• <a href="https://www.aljazeera.com" target="_blank">📰 Al Jazeera</a> - International coverage</p>
        <p>• <a href="https://www.bbc.com/news/world" target="_blank">🇬🇧 BBC World News</a></p>
        <p>• <a href="https://www.reuters.com/world" target="_blank">📊 Reuters World</a></p>
        <br>
        <a href="/news" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to News</a>
      </div>
    </body>
    </html>
  `);
});

// US News Page
app.get('/us-news', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>US News - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🇺🇸 US News</h1>
        <p>US-focused news and political coverage.</p>
        <p>• <a href="https://censored.news/category/us" target="_blank">🚫 Censored.news US Section</a></p>
        <p>• <a href="https://www.zerohedge.com" target="_blank">📈 Zero Hedge</a> - Financial news</p>
        <p>• <a href="https://www.theguardian.com/us-news" target="_blank">📰 Guardian US</a></p>
        <p>• <a href="https://apnews.com/hub/us-news" target="_blank">🏢 AP US News</a></p>
        <br>
        <a href="/news" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to News</a>
      </div>
    </body>
    </html>
  `);
});

// Technology Page
app.get('/technology', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Technology - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>💻 Technology</h1>
        <p>Tech news, AI developments, and innovation coverage.</p>
        <p>• <a href="https://censored.news/category/technology" target="_blank">🚫 Censored.news Tech Section</a></p>
        <p>• <a href="https://techcrunch.com" target="_blank">🚀 TechCrunch</a></p>
        <p>• <a href="https://www.theverge.com/tech" target="_blank">🔷 The Verge Tech</a></p>
        <p>• <a href="https://arstechnica.com" target="_blank">⚙️ Ars Technica</a></p>
        <br>
        <a href="/news" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to News</a>
      </div>
    </body>
    </html>
  `);
});

// Health Page
app.get('/health', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Health - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🏥 Health</h1>
        <p>Health news, medical research, and wellness information.</p>
        <p>• <a href="https://censored.news/category/health" target="_blank">🚫 Censored.news Health Section</a></p>
        <p>• <a href="https://www.naturalnews.com" target="_blank">🌿 Natural News</a></p>
        <p>• <a href="https://www.nih.gov/news-events" target="_blank">🏛️ NIH News</a></p>
        <p>• <a href="https://www.who.int/news" target="_blank">🌍 WHO News</a></p>
        <br>
        <a href="/news" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to News</a>
      </div>
    </body>
    </html>
  `);
});

// ===== START SERVERS =====

// Start server for Render (single port)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fatimah's Server running on port ${PORT}`);
  console.log(`📝 Messages: ${messages.length} loaded`);
  console.log(`   Render URL: https://fatimah-web.onrender.com`);
});

// Keep-alive
setInterval(() => {}, 60000);
