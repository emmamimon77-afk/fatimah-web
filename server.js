const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

const mongoose = require('mongoose');



// ===== MONGODB CONNECTION =====
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://emmamimon77_db_user:ZMofEUDjvhoWRbvY@cluster0.7prkjzu.mongodb.net/fatimah_server';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas successfully'))
  .catch(err => console.log('⚠️ MongoDB connection failed, using in-memory messages. Error:', err.message));


// ===== MESSAGE SCHEMA =====
const messageSchema = new mongoose.Schema({
  name: String,
  message: String,
  time: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);


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

// ===== CONFIGURATION =====
const MESSAGES_FILE = 'data/messages.json';
const UPLOADS_DIR = 'uploads';

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// ===== FILE UPLOAD CONFIG =====
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

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ===== MESSAGE SYSTEM =====
let messages = [];

function loadMessages() {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      console.log(`📝 Loaded ${messages.length} messages from file`);
    }
  } catch (err) {
    console.log('Error loading messages:', err.message);
    messages = [];
  }
}


function saveMessages() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.log('Error saving messages:', err.message);
  }
}

function cleanupMessages() {
  if (messages.length > 100) {
    console.log(`🧹 Cleaning up messages: ${messages.length} -> 100`);
    messages = messages.slice(-100);
    saveMessages();
  }
}

loadMessages();
setInterval(cleanupMessages, 3600000);


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
    <a href="/religions" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">🕌 World Religions</a>
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


// ===== MESSAGES ROUTES =====
app.get('/message', async (req, res) => {
  const success = req.query.success;
  const error = req.query.error;

  try {
    const dbMessages = await Message.find().sort({ time: -1 }).limit(10).exec();

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
            <br><button type="submit">📤 Send Message</button>
          </form>

          <h2>📜 Recent Messages (${dbMessages.length} total)</h2>
          ${dbMessages.map(msg => `
            <div class="message-box">
              <p><strong>${msg.name}</strong> said:</p>
              <p>${msg.message}</p>
              <p><small>${msg.time}</small></p>
              <p><a href="/delete-message/${msg._id}"><button class="delete-btn">🗑️ Delete</button></a></p>
            </div>
          `).join('')}

          <div class="https-info">
            <h3>💾 Message Storage</h3>
            <p>• Messages are saved to MongoDB</p>
            <p>• Only visible to Tailscale-connected friends</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.redirect('/message?error=Failed to load messages');
  }
});

app.post('/send-message', async (req, res) => {
  const { name, message } = req.body;
  if (!name.trim() || !message.trim()) return res.redirect('/message?error=Name and message are required');

  try {
    const newMessage = new Message({ name: name.trim(), message: message.trim() });
    await newMessage.save();
    res.redirect('/message?success=Message sent successfully!');
  } catch (err) {
    console.error(err);
    res.redirect('/message?error=Failed to save message');
  }
});

app.get('/delete-message/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await Message.findByIdAndDelete(id);
    res.redirect('/message?success=Message deleted');
  } catch (err) {
    console.error(err);
    res.redirect('/message?error=Failed to delete message');
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

// ===== WORLD RELIGIONS SECTION =====

// Main Religions Hub
app.get('/religions', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>World Religions - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/religions"', 'href="/religions" style="color: #6ee7b7;"')}
        <h1>🕌 World Religions & Sacred Teachings</h1>
        <p>Explore the world's major religions, their sacred texts, core beliefs, and practices.</p>
        
        <h2>📊 Global Religious Demographics (2024)</h2>
        <div class="message-box">
          <p>• <strong>Christianity:</strong> 2.4 billion (31% of world population)</p>
          <p>• <strong>Islam:</strong> 1.9 billion (24%)</p>
          <p>• <strong>Hinduism:</strong> 1.2 billion (15%)</p>
          <p>• <strong>Buddhism:</strong> 520 million (7%)</p>
          <p>• <strong>Folk Religions:</strong> 430 million (6%)</p>
          <p>• <strong>Other Religions:</strong> 61 million (1%)</p>
          <p>• <strong>Judaism:</strong> 15 million (0.2%)</p>
          <p>• <strong>Unaffiliated:</strong> 1.2 billion (16%)</p>
          <p><small>Source: Pew Research Center</small></p>
        </div>
        
        <h2>🌍 Major World Religions</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>☪️ Islam</h3>
            <p><strong>Followers:</strong> 1.9 billion (24%)</p>
            <p><strong>Founded:</strong> 610 CE, Mecca (Arabia)</p>
            <p><strong>Prophet:</strong> Muhammad ﷺ</p>
            <p><a href="/religions/islam"><button>📖 Learn More</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>✝️ Christianity</h3>
            <p><strong>Followers:</strong> 2.4 billion (31%)</p>
            <p><strong>Founded:</strong> ~30 CE, Jerusalem</p>
            <p><strong>Central Figure:</strong> Jesus Christ</p>
            <p><a href="/religions/christianity"><button>📖 Learn More</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>✡️ Judaism</h3>
            <p><strong>Followers:</strong> 15 million (0.2%)</p>
            <p><strong>Founded:</strong> ~2000 BCE, Middle East</p>
            <p><strong>Patriarch:</strong> Abraham</p>
            <p><a href="/religions/judaism"><button>📖 Learn More</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>🕉️ Hinduism</h3>
            <p><strong>Followers:</strong> 1.2 billion (15%)</p>
            <p><strong>Founded:</strong> ~1500 BCE, Indian subcontinent</p>
            <p><strong>Origin:</strong> No single founder</p>
            <p><a href="/religions/hinduism"><button>📖 Learn More</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>☸️ Buddhism</h3>
            <p><strong>Followers:</strong> 520 million (7%)</p>
            <p><strong>Founded:</strong> ~500 BCE, India</p>
            <p><strong>Founder:</strong> Siddhartha Gautama (Buddha)</p>
            <p><a href="/religions/buddhism"><button>📖 Learn More</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>☬ Sikhism</h3>
            <p><strong>Followers:</strong> 30 million (0.4%)</p>
            <p><strong>Founded:</strong> 1469 CE, Punjab (India)</p>
            <p><strong>Founder:</strong> Guru Nanak Dev Ji</p>
            <p><a href="/religions/sikhism"><button>📖 Learn More</button></a></p>
          </div>
        </div>
        
        <h2>📚 Additional Resources</h2>
        <p><a href="/religions/other"><button>Other Religions & Traditions</button></a></p>
        <p><a href="/religions/scriptures"><button>Sacred Scripture Libraries</button></a></p>
        
        <div class="https-info">
          <h3>🎓 Educational Purpose</h3>
          <p>This section provides objective information about world religions for educational purposes. All content is sourced from academic institutions, official religious organizations, and reputable interfaith resources.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ISLAM PAGE
app.get('/religions/islam', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Islam - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>☪️ Islam - The Religion of Peace</h1>
        <p><strong>Followers:</strong> 1.9 billion (24% of world population)</p>
        <p><strong>Founded:</strong> 610 CE in Mecca, Arabian Peninsula</p>
        <p><strong>Prophet:</strong> Muhammad ﷺ (Peace Be Upon Him)</p>
        <p><strong>Major Branches:</strong> Sunni (85-90%), Shia (10-15%)</p>
        
        <h2>📖 Sacred Scriptures</h2>
        <div class="message-box">
          <h3>The Holy Quran (القرآن الكريم)</h3>
          <p>• <strong>Revealed:</strong> 610-632 CE over 23 years</p>
          <p>• <strong>Chapters (Surahs):</strong> 114</p>
          <p>• <strong>Language:</strong> Classical Arabic</p>
          <p>• <strong>Content:</strong> Divine guidance, law, stories of prophets, moral teachings</p>
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://quran.com" target="_blank">Quran.com</a> - Multiple translations, audio recitations</p>
          <p>• <a href="https://tanzil.net" target="_blank">Tanzil.net</a> - Quran text and translations</p>
          <p>• <a href="https://corpus.quran.com" target="_blank">Quranic Arabic Corpus</a> - Word-by-word analysis</p>
        </div>
        
        <div class="message-box">
          <h3>Hadith (Prophetic Traditions)</h3>
          <p>• <strong>Definition:</strong> Sayings, actions, and approvals of Prophet Muhammad ﷺ</p>
          <p>• <strong>Major Collections:</strong></p>
          <p>&nbsp;&nbsp;○ Sahih al-Bukhari (7,563 hadiths)</p>
          <p>&nbsp;&nbsp;○ Sahih Muslim (7,190 hadiths)</p>
          <p>&nbsp;&nbsp;○ Sunan Abu Dawood, Tirmidhi, Nasa'i, Ibn Majah</p>
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://sunnah.com" target="_blank">Sunnah.com</a> - Searchable hadith database</p>
          <p>• <a href="https://ahadith.co.uk" target="_blank">Ahadith.co.uk</a> - Hadith collections</p>
        </div>
        
        <h2>☪️ Five Pillars of Islam</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>1. Shahada (Faith)</h3>
            <p><em>"There is no god but Allah, and Muhammad is His messenger"</em></p>
            <p>Declaration of faith in one God and His Prophet</p>
          </div>
          
          <div class="link-card">
            <h3>2. Salah (Prayer)</h3>
            <p>Five daily prayers facing Mecca</p>
            <p>• Fajr (Dawn), Dhuhr (Noon), Asr (Afternoon), Maghrib (Sunset), Isha (Night)</p>
          </div>
          
          <div class="link-card">
            <h3>3. Zakat (Charity)</h3>
            <p>Obligatory almsgiving (2.5% of wealth annually)</p>
            <p>Given to the poor and needy</p>
          </div>
          
          <div class="link-card">
            <h3>4. Sawm (Fasting)</h3>
            <p>Fasting during Ramadan (9th Islamic month)</p>
            <p>From dawn to sunset - no food, drink, or intimacy</p>
          </div>
          
          <div class="link-card">
            <h3>5. Hajj (Pilgrimage)</h3>
            <p>Pilgrimage to Mecca once in lifetime</p>
            <p>For those physically and financially able</p>
          </div>
        </div>
        
        <h2>🕌 How to Pray in Islam (Salah)</h2>
        <div class="message-box">
          <h3>Step 1: Wudu (Ablution) - Ritual Purification</h3>
          <p><strong>Watch Official Tutorial:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=exm58FdO-9Y" target="_blank">How to Perform Wudu (Islam Channel)</a></p>
          <p><strong>Steps:</strong></p>
          <p>1. Make intention (niyyah) for wudu</p>
          <p>2. Say "Bismillah" (In the name of Allah)</p>
          <p>3. Wash both hands to wrists (3x)</p>
          <p>4. Rinse mouth (3x)</p>
          <p>5. Rinse nose (3x)</p>
          <p>6. Wash face from forehead to chin (3x)</p>
          <p>7. Wash right arm to elbow (3x), then left arm (3x)</p>
          <p>8. Wipe head with wet hands once</p>
          <p>9. Wipe inside and outside of ears once</p>
          <p>10. Wash right foot to ankle (3x), then left foot (3x)</p>
          <p><strong>📚 Detailed Guide:</strong> <a href="https://islamqa.info/en/answers/65" target="_blank">IslamQA - How to Perform Wudu</a></p>
        </div>
        
        <div class="message-box">
          <h3>Step 2: Prayer (Salah) - Step by Step</h3>
          <p><strong>Watch Complete Prayer Tutorial:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=W9kTd7q1zjE" target="_blank">How to Pray Salah (Step by Step)</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=lvhhMGJShI8" target="_blank">How to Pray for Beginners</a></p>
          <p><strong>Prayer Structure (2 Rakats example):</strong></p>
          <p>1. <strong>Takbir:</strong> Stand facing Qibla (Mecca), raise hands, say "Allahu Akbar"</p>
          <p>2. <strong>Recitation:</strong> Recite Surah Al-Fatiha and another Surah</p>
          <p>3. <strong>Ruku:</strong> Bow with hands on knees, say "Subhana Rabbiyal Adheem" (3x)</p>
          <p>4. <strong>Stand:</strong> Rise, say "Sami Allahu liman hamidah" (Allah hears those who praise Him)</p>
          <p>5. <strong>Sujud:</strong> Prostrate with forehead on ground, say "Subhana Rabbiyal A'la" (3x)</p>
          <p>6. <strong>Sit:</strong> Sit briefly between prostrations</p>
          <p>7. <strong>Second Sujud:</strong> Prostrate again, repeat glorification</p>
          <p>8. <strong>Repeat:</strong> Stand for 2nd Rakat, repeat steps 2-7</p>
          <p>9. <strong>Tashahhud:</strong> Sit, recite testimony of faith</p>
          <p>10. <strong>Tasleem:</strong> Turn head right then left, say "Assalamu alaikum wa rahmatullah"</p>
          <p><strong>📚 Complete Guide:</strong> <a href="https://islamqa.info/en/answers/115369" target="_blank">IslamQA - How to Pray Step by Step</a></p>
        </div>
        
        <h2>📚 Core Beliefs (Aqeedah)</h2>
        <div class="link-card">
          <h3>Six Articles of Faith</h3>
          <p>1. <strong>Allah:</strong> Belief in One God, the Creator</p>
          <p>2. <strong>Angels:</strong> Belief in angels (Gabriel, Michael, etc.)</p>
          <p>3. <strong>Books:</strong> Belief in revealed scriptures (Quran, Torah, Gospel, Psalms)</p>
          <p>4. <strong>Prophets:</strong> Belief in all prophets from Adam to Muhammad ﷺ</p>
          <p>5. <strong>Day of Judgment:</strong> Belief in afterlife, resurrection, heaven and hell</p>
          <p>6. <strong>Divine Decree:</strong> Belief in God's predestination and free will</p>
        </div>
        
        <h2>🌍 Official Islamic Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>📖 Scripture Study</h3>
            <p>• <a href="https://quran.com" target="_blank">Quran.com</a> - Official Quran portal</p>
            <p>• <a href="https://sunnah.com" target="_blank">Sunnah.com</a> - Hadith collections</p>
            <p>• <a href="https://seekersguidance.org" target="_blank">SeekersGuidance</a> - Islamic education</p>
          </div>
          
          <div class="link-card">
            <h3>🎓 Learning Centers</h3>
            <p>• <a href="https://www.islamicity.org" target="_blank">IslamiCity</a> - Islamic resources</p>
            <p>• <a href="https://islamqa.info/en" target="_blank">IslamQA</a> - Q&A platform</p>
            <p>• <a href="https://www.whyislam.org" target="_blank">WhyIslam.org</a> - Educational portal</p>
          </div>
          
          <div class="link-card">
            <h3>🕌 Organizations</h3>
            <p>• <a href="https://www.isna.net" target="_blank">ISNA</a> - Islamic Society of North America</p>
            <p>• <a href="https://www.cair.com" target="_blank">CAIR</a> - Council on American-Islamic Relations</p>
            <p>• <a href="https://www.oic-oci.org" target="_blank">OIC</a> - Organization of Islamic Cooperation</p>
          </div>
        </div>
        
        <br>
        <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// CHRISTIANITY PAGE
app.get('/religions/christianity', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Christianity - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>✝️ Christianity - Following Christ</h1>
        <p><strong>Followers:</strong> 2.4 billion (31% of world population)</p>
        <p><strong>Founded:</strong> ~30 CE in Jerusalem</p>
        <p><strong>Central Figure:</strong> Jesus Christ (Isa عليه السلام)</p>
        <p><strong>Major Branches:</strong> Catholic (50%), Protestant (37%), Orthodox (12%)</p>
        
        <h2>📖 Sacred Scripture - The Holy Bible</h2>
        <div class="message-box">
          <h3>Structure of the Bible</h3>
          <p>• <strong>Old Testament:</strong> 39 books (Hebrew Scriptures)</p>
          <p>• <strong>New Testament:</strong> 27 books (Gospel, Acts, Epistles, Revelation)</p>
          <p>• <strong>Total:</strong> 66 books (Protestant canon)</p>
          <p>• <strong>Catholic Bible:</strong> Includes 7 additional books (Deuterocanonical)</p>
        </div>
        
        <div class="message-box">
          <h3>Major Bible Translations</h3>
          <p><strong>English Translations:</strong></p>
          <p>• <strong>King James Version (KJV):</strong> 1611, traditional English</p>
          <p>• <strong>New International Version (NIV):</strong> 1978, modern readable English</p>
          <p>• <strong>English Standard Version (ESV):</strong> 2001, literal translation</p>
          <p>• <strong>New American Standard Bible (NASB):</strong> 1971, word-for-word accuracy</p>
          <p>• <strong>New Revised Standard Version (NRSV):</strong> 1989, academic standard</p>
          <p>• <strong>The Message (MSG):</strong> 2002, contemporary paraphrase</p>
          
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://www.bible.com" target="_blank">Bible.com</a> - 2,000+ versions in 1,300+ languages</p>
          <p>• <a href="https://www.biblegateway.com" target="_blank">BibleGateway.com</a> - Multiple translations, search tools</p>
          <p>• <a href="https://www.blueletterbible.org" target="_blank">Blue Letter Bible</a> - Original Greek/Hebrew tools</p>
          <p>• <a href="https://www.biblehub.com" target="_blank">BibleHub.com</a> - Parallel translations, commentaries</p>
        </div>
        
        <h2>✝️ Core Beliefs</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>The Trinity</h3>
            <p>• <strong>Father:</strong> God the Creator</p>
            <p>• <strong>Son:</strong> Jesus Christ (Word made flesh)</p>
            <p>• <strong>Holy Spirit:</strong> God's presence</p>
            <p>Three persons in one divine essence</p>
          </div>
          
          <div class="link-card">
            <h3>Salvation</h3>
            <p>• <strong>Sin:</strong> Separation from God</p>
            <p>• <strong>Grace:</strong> God's unmerited favor</p>
            <p>• <strong>Faith:</strong> Trust in Jesus Christ</p>
            <p>• <strong>Redemption:</strong> Through Christ's sacrifice</p>
          </div>
          
          <div class="link-card">
            <h3>The Gospel</h3>
            <p>1. Jesus born of Virgin Mary</p>
            <p>2. Lived sinless life, taught God's kingdom</p>
            <p>3. Crucified for humanity's sins</p>
            <p>4. Resurrected on third day</p>
            <p>5. Ascended to heaven</p>
            <p>6. Will return to judge the living and dead</p>
          </div>
        </div>
        
        <h2>🙏 How Christians Pray</h2>
        <div class="message-box">
          <h3>Prayer Practices (Vary by Denomination)</h3>
          
          <p><strong>General Christian Prayer:</strong></p>
          <p>1. Find quiet place</p>
          <p>2. Address God (Father, Lord Jesus, etc.)</p>
          <p>3. Express gratitude and praise</p>
          <p>4. Confess sins, ask forgiveness</p>
          <p>5. Present requests and intercessions</p>
          <p>6. Close "In Jesus' name, Amen"</p>
          
          <p><strong>The Lord's Prayer (Matthew 6:9-13):</strong></p>
          <p><em>"Our Father in heaven, hallowed be your name. Your kingdom come, your will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our debts, as we also have forgiven our debtors. And lead us not into temptation, but deliver us from evil."</em></p>
          
          <p><strong>📚 Prayer Guides:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=v-rfVYG2zV0" target="_blank">How to Pray - Billy Graham</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=VNsW9_fqxh4" target="_blank">How to Pray for Beginners</a></p>
        </div>
        
        <div class="message-box">
          <h3>Catholic Prayer Practices</h3>
          <p><strong>Sign of the Cross:</strong> Touch forehead, chest, left shoulder, right shoulder</p>
          <p><strong>Rosary:</strong> Meditative prayer using beads (Hail Mary, Our Father, Glory Be)</p>
          <p><strong>Mass:</strong> Eucharistic celebration (communion)</p>
          <p>• <a href="https://www.youtube.com/watch?v=0ClAHsRX-1c" target="_blank">How to Pray the Rosary</a></p>
          <p>• <a href="https://www.usccb.org" target="_blank">USCCB.org</a> - Catholic resources</p>
        </div>
        
        <div class="message-box">
          <h3>Orthodox Prayer Practices</h3>
          <p><strong>Jesus Prayer:</strong> "Lord Jesus Christ, Son of God, have mercy on me, a sinner"</p>
          <p><strong>Icons:</strong> Sacred images used in prayer</p>
          <p><strong>Divine Liturgy:</strong> Worship service with incense, chanting</p>
          <p>• <a href="https://www.goarch.org" target="_blank">Greek Orthodox Archdiocese</a></p>
        </div>
        
        <h2>📚 Major Denominations</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Catholic (1.3 billion)</h3>
            <p>• <strong>Head:</strong> Pope in Vatican</p>
            <p>• <strong>Sacraments:</strong> 7 (Baptism, Eucharist, etc.)</p>
            <p>• <strong>Authority:</strong> Scripture + Tradition</p>
            <p>• <a href="https://www.vatican.va" target="_blank">Vatican.va</a></p>
          </div>
          
          <div class="link-card">
            <h3>Protestant (900 million)</h3>
            <p>• <strong>Reformation:</strong> 1517, Martin Luther</p>
            <p>• <strong>Principle:</strong> Sola Scriptura (Scripture alone)</p>
            <p>• <strong>Branches:</strong> Baptist, Methodist, Lutheran, etc.</p>
            <p>• <a href="https://www.thegospelcoalition.org" target="_blank">Gospel Coalition</a></p>
          </div>
          
          <div class="link-card">
            <h3>Orthodox (260 million)</h3>
            <p>• <strong>Split:</strong> 1054 CE (Great Schism)</p>
            <p>• <strong>Centers:</strong> Constantinople, Moscow, etc.</p>
            <p>• <strong>Emphasis:</strong> Tradition, mysticism, liturgy</p>
            <p>• <a href="https://www.goarch.org" target="_blank">Greek Orthodox</a></p>
          </div>
        </div>
        
        <h2>🌍 Official Christian Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>📖 Bible Study</h3>
            <p>• <a href="https://www.bible.com" target="_blank">YouVersion Bible</a></p>
            <p>• <a href="https://www.bibleproject.com" target="_blank">The Bible Project</a> - Visual summaries</p>
            <p>• <a href="https://www.desiringgod.org" target="_blank">Desiring God</a> - John Piper</p>
          </div>
          
          <div class="link-card">
            <h3>🎓 Educational</h3>
            <p>• <a href="https://www.christianity.com" target="_blank">Christianity.com</a></p>
            <p>• <a href="https://www.gotquestions.org" target="_blank">Got Questions?</a></p>
            <p>• <a href="https://www.biblestudytools.com" target="_blank">Bible Study Tools</a></p>
          </div>
          
          <div class="link-card">
            <h3>⛪ Organizations</h3>
            <p>• <a href="https://www.vatican.va" target="_blank">Vatican</a> - Catholic Church</p>
            <p>• <a href="https://www.oikoumene.org" target="_blank">World Council of Churches</a></p>
            <p>• <a href="https://billygraham.org" target="_blank">Billy Graham Evangelistic Assoc.</a></p>
          </div>
        </div>
        
        <br>
        <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// JUDAISM PAGE
app.get('/religions/judaism', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Judaism - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>✡️ Judaism - The Covenant People</h1>
        <p><strong>Followers:</strong> 15 million (0.2% of world population)</p>
        <p><strong>Founded:</strong> ~2000 BCE in Middle East</p>
        <p><strong>Patriarch:</strong> Abraham (Ibrahim عليه السلام)</p>
        <p><strong>Major Branches:</strong> Orthodox, Conservative, Reform, Reconstructionist</p>
        
        <h2>📖 Sacred Scriptures - Tanakh</h2>
        <div class="message-box">
          <h3>The Hebrew Bible (Tanakh) - תַּנַ״ךְ</h3>
          <p>Tanakh is an acronym of three sections:</p>
          <p>• <strong>Torah (תּוֹרָה):</strong> The Five Books of Moses (Pentateuch)</p>
          <p>&nbsp;&nbsp;○ Genesis (Bereshit) - Creation, Patriarchs</p>
          <p>&nbsp;&nbsp;○ Exodus (Shemot) - Moses, Ten Commandments, Exodus from Egypt</p>
          <p>&nbsp;&nbsp;○ Leviticus (Vayikra) - Laws, rituals, holiness</p>
          <p>&nbsp;&nbsp;○ Numbers (Bamidbar) - Wilderness wandering</p>
          <p>&nbsp;&nbsp;○ Deuteronomy (Devarim) - Moses' final speeches, law recap</p>
          
          <p>• <strong>Nevi'im (נְבִיאִים):</strong> The Prophets (Joshua, Judges, Samuel, Kings, Isaiah, Jeremiah, Ezekiel, 12 Minor Prophets)</p>
          
          <p>• <strong>Ketuvim (כְּתוּבִים):</strong> The Writings (Psalms, Proverbs, Job, Song of Songs, Ruth, Lamentations, Ecclesiastes, Esther, Daniel, Ezra-Nehemiah, Chronicles)</p>
          
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://www.sefaria.org" target="_blank">Sefaria.org</a> - Complete Jewish library (Hebrew + English)</p>
          <p>• <a href="https://www.chabad.org/library/bible_cdo/aid/63255/jewish/The-Bible-with-Rashi.htm" target="_blank">Chabad.org</a> - Torah with Rashi commentary</p>
          <p>• <a href="https://www.mechon-mamre.org/p/pt/pt0.htm" target="_blank">Mechon Mamre</a> - Hebrew Tanakh</p>
        </div>
        
        <div class="message-box">
          <h3>The Talmud (תַּלְמוּד)</h3>
          <p>• <strong>Definition:</strong> Central text of Rabbinic Judaism, oral Torah written down</p>
          <p>• <strong>Structure:</strong></p>
          <p>&nbsp;&nbsp;○ <strong>Mishnah:</strong> Oral law compiled ~200 CE</p>
          <p>&nbsp;&nbsp;○ <strong>Gemara:</strong> Rabbinical analysis and commentary</p>
          <p>• <strong>Two Versions:</strong></p>
          <p>&nbsp;&nbsp;○ <strong>Babylonian Talmud:</strong> More authoritative, 6,200 pages</p>
          <p>&nbsp;&nbsp;○ <strong>Jerusalem Talmud:</strong> Compiled earlier, less comprehensive</p>
          <p>• <strong>Content:</strong> Jewish law (Halakha), ethics, customs, history, theology</p>
          
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://www.sefaria.org/texts/Talmud" target="_blank">Sefaria - Talmud</a></p>
          <p>• <a href="https://www.halakhah.com" target="_blank">Halakhah.com</a> - Talmud study</p>
        </div>
        
        <div class="message-box">
          <h3>Other Important Texts</h3>
          <p>• <strong>Midrash:</strong> Homiletic interpretations of biblical texts</p>
          <p>• <strong>Mishneh Torah:</strong> Maimonides' code of Jewish law (12th century)</p>
          <p>• <strong>Shulchan Aruch:</strong> Code of Jewish law (16th century)</p>
          <p>• <strong>Zohar:</strong> Foundational work of Kabbalah (mysticism)</p>
        </div>
        
        <h2>✡️ Core Beliefs - 13 Principles of Faith (Maimonides)</h2>
        <div class="link-card">
          <p>1. God exists and is the Creator</p>
          <p>2. God is absolutely one and unique</p>
          <p>3. God is incorporeal (no physical form)</p>
          <p>4. God is eternal</p>
          <p>5. Prayer is to God alone</p>
          <p>6. The words of the prophets are true</p>
          <p>7. Moses was the greatest prophet</p>
          <p>8. The Torah was given by God to Moses</p>
          <p>9. The Torah is unchangeable</p>
          <p>10. God knows all human actions and thoughts</p>
          <p>11. God rewards the righteous and punishes the wicked</p>
          <p>12. The Messiah will come</p>
          <p>13. The dead will be resurrected</p>
        </div>
        
        <h2>📜 The 613 Commandments (Mitzvot)</h2>
        <div class="message-box">
          <p>• <strong>Total:</strong> 613 commandments in the Torah</p>
          <p>&nbsp;&nbsp;○ 248 Positive commandments ("You shall...")</p>
          <p>&nbsp;&nbsp;○ 365 Negative commandments ("You shall not...")</p>
          <p>• <strong>Famous Examples:</strong></p>
          <p>&nbsp;&nbsp;○ The Ten Commandments (Exodus 20:1-17)</p>
          <p>&nbsp;&nbsp;○ Love your neighbor as yourself (Leviticus 19:18)</p>
          <p>&nbsp;&nbsp;○ Hear O Israel, the Lord is our God, the Lord is One (Shema, Deut. 6:4)</p>
          <p>• <a href="https://www.jewfaq.org/613.htm" target="_blank">Complete list of 613 Mitzvot</a></p>
        </div>
        
        <h2>🙏 Jewish Prayer (Tefillah)</h2>
        <div class="message-box">
          <h3>Daily Prayer Times</h3>
          <p>• <strong>Shacharit:</strong> Morning prayer</p>
          <p>• <strong>Mincha:</strong> Afternoon prayer</p>
          <p>• <strong>Maariv (Arvit):</strong> Evening prayer</p>
          
          <h3>Prayer Preparation & Practice</h3>
          <p><strong>Ritual Washing (Netilat Yadayim):</strong></p>
          <p>• Wash hands before morning prayers</p>
          <p>• Pour water over each hand three times, alternating</p>
          <p>• Recite blessing: "Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us concerning the washing of hands"</p>
          
          <p><strong>Prayer Items:</strong></p>
          <p>• <strong>Tallit (Prayer Shawl):</strong> Worn during morning prayers, has 613 fringes (tzitzit)</p>
          <p>• <strong>Tefillin (Phylacteries):</strong> Black leather boxes with scripture, worn on arm and head (weekday mornings)</p>
          <p>• <strong>Kippah (Yarmulke):</strong> Head covering worn during prayer and study</p>
          
          <p><strong>Prayer Direction:</strong> Face Jerusalem (and the Temple Mount)</p>
          
          <p><strong>📚 How to Pray:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=aJe_SyCLv6Q" target="_blank">How to Pray in Judaism</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=9HNer_FGEu8" target="_blank">How to Put on Tefillin</a></p>
          <p>• <a href="https://www.chabad.org/library/article_cdo/aid/682091/jewish/How-to-Pray.htm" target="_blank">Chabad - How to Pray</a></p>
        </div>
        
        <div class="message-box">
          <h3>Central Prayers</h3>
          <p><strong>Shema (שְׁמַע יִשְׂרָאֵל):</strong></p>
          <p><em>"Hear, O Israel: The Lord our God, the Lord is One. Blessed be the name of His glorious kingdom forever and ever."</em></p>
          <p>Recited twice daily (morning and evening)</p>
          
          <p><strong>Amidah (עֲמִידָה) - The Standing Prayer:</strong></p>
          <p>• Central prayer of Jewish liturgy</p>
          <p>• 19 blessings on weekdays, 7 on Shabbat</p>
          <p>• Recited silently while standing, facing Jerusalem</p>
          <p>• Includes praise, petitions, and thanksgiving</p>
        </div>
        
        <h2>🕍 Jewish Practices & Observances</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Shabbat (Sabbath)</h3>
            <p>• <strong>Time:</strong> Friday sunset to Saturday nightfall</p>
            <p>• <strong>Practice:</strong> Day of rest, no work</p>
            <p>• <strong>Rituals:</strong> Light candles, blessing wine (Kiddush), challah bread</p>
            <p>• Commemorates Creation and Exodus</p>
          </div>
          
          <div class="link-card">
            <h3>Kashrut (Dietary Laws)</h3>
            <p>• No pork or shellfish</p>
            <p>• Kosher slaughter (shechita)</p>
            <p>• Separate meat and dairy</p>
            <p>• Based on Torah commands (Leviticus 11)</p>
          </div>
          
          <div class="link-card">
            <h3>Life Cycle Events</h3>
            <p>• <strong>Brit Milah:</strong> Circumcision (8 days old)</p>
            <p>• <strong>Bar/Bat Mitzvah:</strong> Coming of age (13/12)</p>
            <p>• <strong>Wedding:</strong> Under chuppah (canopy)</p>
            <p>• <strong>Death:</strong> Burial within 24 hours, mourning (shiva)</p>
          </div>
        </div>
        
        <h2>🎉 Major Jewish Holidays</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>High Holy Days</h3>
            <p>• <strong>Rosh Hashanah:</strong> Jewish New Year</p>
            <p>• <strong>Yom Kippur:</strong> Day of Atonement (fasting, repentance)</p>
          </div>
          
          <div class="link-card">
            <h3>Pilgrimage Festivals</h3>
            <p>• <strong>Pesach (Passover):</strong> Exodus from Egypt</p>
            <p>• <strong>Shavuot:</strong> Receiving the Torah</p>
            <p>• <strong>Sukkot:</strong> Feast of Tabernacles</p>
          </div>
          
          <div class="link-card">
            <h3>Other Festivals</h3>
            <p>• <strong>Hanukkah:</strong> Festival of Lights</p>
            <p>• <strong>Purim:</strong> Celebration of deliverance (Book of Esther)</p>
          </div>
        </div>
        
        <h2>🌍 Official Jewish Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>📖 Scripture Study</h3>
            <p>• <a href="https://www.sefaria.org" target="_blank">Sefaria.org</a> - Complete Jewish library</p>
            <p>• <a href="https://www.chabad.org" target="_blank">Chabad.org</a> - Torah, Talmud, Jewish law</p>
            <p>• <a href="https://www.ou.org" target="_blank">Orthodox Union</a></p>
          </div>
          
          <div class="link-card">
            <h3>🎓 Educational</h3>
            <p>• <a href="https://www.jewfaq.org" target="_blank">Judaism 101</a> - Comprehensive intro</p>
            <p>• <a href="https://www.myjewishlearning.com" target="_blank">My Jewish Learning</a></p>
            <p>• <a href="https://www.aish.com" target="_blank">Aish.com</a> - Jewish wisdom</p>
          </div>
          
          <div class="link-card">
            <h3>🕍 Organizations</h3>
            <p>• <a href="https://www.jewishvirtuallibrary.org" target="_blank">Jewish Virtual Library</a></p>
            <p>• <a href="https://www.myjewishlearning.com" target="_blank">My Jewish Learning</a></p>
            <p>• <a href="https://www.uscj.org" target="_blank">United Synagogue of Conservative Judaism</a></p>
          </div>
        </div>
        
        <br>
        <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// HINDUISM PAGE
app.get('/religions/hinduism', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hinduism - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🕉️ Hinduism - Sanatana Dharma (Eternal Law)</h1>
        <p><strong>Followers:</strong> 1.2 billion (15% of world population)</p>
        <p><strong>Founded:</strong> ~1500 BCE, Indian subcontinent (no single founder)</p>
        <p><strong>Origin:</strong> Evolved from ancient Vedic traditions</p>
        <p><strong>Major Traditions:</strong> Vaishnavism, Shaivism, Shaktism, Smartism</p>
        
        <h2>📖 Sacred Scriptures - Vast Canon</h2>
        <div class="message-box">
          <h3>Shruti (श्रुति) - "That Which is Heard" (Revealed)</h3>
          <p><strong>The Four Vedas (वेद) - Oldest Scriptures (~1500-500 BCE):</strong></p>
          <p>• <strong>Rigveda (ऋग्वेद):</strong> Hymns to gods (10,552 verses)</p>
          <p>• <strong>Samaveda (सामवेद):</strong> Melodies and chants (1,875 verses)</p>
          <p>• <strong>Yajurveda (यजुर्वेद):</strong> Sacrificial formulas (1,975 verses)</p>
          <p>• <strong>Atharvaveda (अथर्ववेद):</strong> Spells, healing, philosophy (5,977 verses)</p>
          
          <p><strong>Each Veda has 4 parts:</strong></p>
          <p>1. <strong>Samhitas:</strong> Hymns and mantras</p>
          <p>2. <strong>Brahmanas:</strong> Ritual instructions</p>
          <p>3. <strong>Aranyakas:</strong> Forest treatises (philosophy)</p>
          <p>4. <strong>Upanishads (उपनिषद्):</strong> Philosophical teachings (108+ texts)</p>
          
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://www.sacred-texts.com/hin/index.htm" target="_blank">Sacred-Texts.com - Hindu Texts</a></p>
          <p>• <a href="https://www.vedabase.io" target="_blank">Vedabase.io</a> - Vedic library</p>
          <p>• <a href="https://www.gitasupersite.iitk.ac.in" target="_blank">Gita Supersite</a> - Bhagavad Gita</p>
        </div>
        
        <div class="message-box">
          <h3>Smriti (स्मृति) - "That Which is Remembered" (Traditional)</h3>
          
          <p><strong>The Two Great Epics:</strong></p>
          <p>• <strong>Mahabharata (महाभारत):</strong> ~100,000 verses, longest epic poem</p>
          <p>&nbsp;&nbsp;○ Contains the <strong>Bhagavad Gita (भगवद्गीता)</strong> - Most famous Hindu text (700 verses)</p>
          <p>&nbsp;&nbsp;○ Story of Kurukshetra War, dharma, duty</p>
          <p>• <strong>Ramayana (रामायण):</strong> ~24,000 verses</p>
          <p>&nbsp;&nbsp;○ Story of Lord Rama, ideal king and husband</p>
          <p>&nbsp;&nbsp;○ Battle against demon king Ravana</p>
          
          <p><strong>Puranas (पुराण) - Ancient Stories:</strong></p>
          <p>• 18 major Puranas, 18 minor Puranas</p>
          <p>• Stories of creation, gods, kings, pilgrimage sites</p>
          <p>• Most famous: Bhagavata Purana (life of Krishna)</p>
          
          <p><strong>Dharma Shastras - Law Books:</strong></p>
          <p>• Manusmriti (Laws of Manu)</p>
          <p>• Codes of conduct, social duties, ethics</p>
          
          <p><strong>Agamas & Tantras:</strong></p>
          <p>• Temple rituals, worship methods, meditation</p>
          
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://www.holy-bhagavad-gita.org" target="_blank">Bhagavad Gita As It Is</a></p>
          <p>• <a href="https://www.valmikiramayan.net" target="_blank">Valmiki Ramayana</a></p>
          <p>• <a href="https://www.srimadbhagavatam.org" target="_blank">Srimad Bhagavatam</a></p>
        </div>
        
        <h2>🕉️ Core Beliefs</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Brahman (ब्रह्मन्)</h3>
            <p>• The ultimate reality, supreme cosmic spirit</p>
            <p>• Infinite, eternal, unchanging</p>
            <p>• Beyond attributes (Nirguna) and with attributes (Saguna)</p>
            <p>• "Tat Tvam Asi" - That Thou Art (you are Brahman)</p>
          </div>
          
          <div class="link-card">
            <h3>Atman (आत्मन्)</h3>
            <p>• The individual soul/self</p>
            <p>• Eternal, unchanging essence</p>
            <p>• Goal: Realize Atman = Brahman</p>
            <p>• Liberation (Moksha) from cycle of rebirth</p>
          </div>
          
          <div class="link-card">
            <h3>Karma (कर्म)</h3>
            <p>• Law of cause and effect</p>
            <p>• Actions determine future circumstances</p>
            <p>• Good deeds → Good karma</p>
            <p>• Bad deeds → Bad karma</p>
          </div>
          
          <div class="link-card">
            <h3>Samsara (संसार)</h3>
            <p>• Cycle of birth, death, rebirth</p>
            <p>• Driven by karma and desires</p>
            <p>• All beings trapped until liberation</p>
            <p>• Reincarnation based on karma</p>
          </div>
          
          <div class="link-card">
            <h3>Dharma (धर्म)</h3>
            <p>• Cosmic law and order</p>
            <p>• Righteous duty and moral conduct</p>
            <p>• Varies by age, caste, life stage</p>
            <p>• Following dharma leads to good karma</p>
          </div>
          
          <div class="link-card">
            <h3>Moksha (मोक्ष)</h3>
            <p>• Liberation from samsara</p>
            <p>• Union with Brahman</p>
            <p>• End of suffering and rebirth</p>
            <p>• Ultimate goal of Hindu life</p>
          </div>
        </div>
        
        <h2>🛕 The Trimurti - Three Main Deities</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Brahma (ब्रह्मा)</h3>
            <p>• <strong>Role:</strong> Creator of universe</p>
            <p>• <strong>Consort:</strong> Saraswati (goddess of knowledge)</p>
            <p>• <strong>Symbol:</strong> Four heads, lotus</p>
          </div>
          
          <div class="link-card">
            <h3>Vishnu (विष्णु)</h3>
            <p>• <strong>Role:</strong> Preserver, sustainer</p>
            <p>• <strong>Avatars:</strong> Rama, Krishna, etc. (10 incarnations)</p>
            <p>• <strong>Consort:</strong> Lakshmi (goddess of wealth)</p>
            <p>• <strong>Symbol:</strong> Blue skin, four arms, conch, discus</p>
          </div>
          
          <div class="link-card">
            <h3>Shiva (शिव)</h3>
            <p>• <strong>Role:</strong> Destroyer, transformer</p>
            <p>• <strong>Consort:</strong> Parvati/Shakti (Divine Mother)</p>
            <p>• <strong>Symbol:</strong> Third eye, trident, snake, Nataraja (cosmic dancer)</p>
          </div>
        </div>
        
        <h2>🙏 Hindu Worship & Prayer (Puja)</h2>
        <div class="message-box">
          <h3>Daily Worship Practices</h3>
          
          <p><strong>Morning Rituals:</strong></p>
          <p>1. <strong>Wake before sunrise</strong> (Brahma Muhurta)</p>
          <p>2. <strong>Bathe/wash</strong> for purification</p>
          <p>3. <strong>Apply tilak</strong> (sacred mark on forehead)</p>
          <p>4. <strong>Perform puja</strong> at home shrine</p>
          
          <p><strong>Puja (पूजा) - Worship Ritual:</strong></p>
          <p>1. <strong>Dhyana:</strong> Meditation, invoke deity's presence</p>
          <p>2. <strong>Offerings (Upachara):</strong></p>
          <p>&nbsp;&nbsp;• Water (washing deity)</p>
          <p>&nbsp;&nbsp;• Flowers, incense, lamp (diya)</p>
          <p>&nbsp;&nbsp;• Food (prasad - blessed offering)</p>
          <p>&nbsp;&nbsp;• Kumkum/turmeric powder</p>
          <p>3. <strong>Aarti:</strong> Waving lighted lamp before deity while singing</p>
          <p>4. <strong>Mantra chanting:</strong> Sacred sounds/prayers</p>
          <p>5. <strong>Pranams:</strong> Prostration or bow</p>
          <p>6. <strong>Receive prasad:</strong> Consume blessed food</p>
          
          <p><strong>📚 How to Perform Puja:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=pJDYH_YuTi4" target="_blank">How to Do Daily Puja at Home</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=XP0MhqN8uyY" target="_blank">Aarti - Complete Guide</a></p>
          <p>• <a href="https://www.drikpanchang.com/puja/puja-vidhi.html" target="_blank">Puja Vidhi - Step by Step</a></p>
        </div>
        
        <div class="message-box">
          <h3>Important Mantras</h3>
          <p><strong>Gayatri Mantra (गायत्री मन्त्र) - Most Sacred:</strong></p>
          <p><em>Om Bhur Bhuvah Svah<br>
          Tat Savitur Varenyam<br>
          Bhargo Devasya Dhimahi<br>
          Dhiyo Yo Nah Prachodayat</em></p>
          <p>Translation: "We meditate on the glory of the Creator who has created the universe, who is worthy of worship, who is the embodiment of knowledge and light. May He enlighten our intellect."</p>
          
          <p><strong>Om (ॐ) - Pranava Mantra:</strong></p>
          <p>• Most sacred sound in Hinduism</p>
          <p>• Represents Brahman, ultimate reality</p>
          <p>• Chanted at beginning and end of prayers</p>
          
          <p><strong>Maha Mrityunjaya Mantra:</strong></p>
          <p><em>Om Tryambakam Yajamahe Sugandhim Pushti-Vardhanam<br>
          Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat</em></p>
          <p>Prayer for health, healing, and liberation from death</p>
        </div>
        
        <h2>🛤️ Four Paths to Liberation (Moksha)</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>1. Karma Yoga</h3>
            <p>• <strong>Path of Action</strong></p>
            <p>• Selfless service without attachment to results</p>
            <p>• Fulfill duties (dharma) without desire for reward</p>
          </div>
          
          <div class="link-card">
            <h3>2. Bhakti Yoga</h3>
            <p>• <strong>Path of Devotion</strong></p>
            <p>• Loving devotion to personal deity</p>
            <p>• Worship, prayer, chanting, pilgrimage</p>
          </div>
          
          <div class="link-card">
            <h3>3. Jnana Yoga</h3>
            <p>• <strong>Path of Knowledge</strong></p>
            <p>• Study of scriptures, philosophical inquiry</p>
            <p>• Discrimination between real and unreal</p>
          </div>
          
          <div class="link-card">
            <h3>4. Raja Yoga</h3>
            <p>• <strong>Path of Meditation</strong></p>
            <p>• Eight-limbed path (Ashtanga)</p>
            <p>• Control of mind and senses</p>
            <p>• Patanjali's Yoga Sutras</p>
          </div>
        </div>
        
        <h2>🎉 Major Hindu Festivals</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Diwali (दिवाली)</h3>
            <p>• <strong>Festival of Lights</strong></p>
            <p>• Celebrates victory of light over darkness</p>
            <p>• Lamps, fireworks, sweets</p>
          </div>
          
          <div class="link-card">
            <h3>Holi (होली)</h3>
            <p>• <strong>Festival of Colors</strong></p>
            <p>• Celebrates spring, love, Krishna's playfulness</p>
            <p>• Colored powder, water fights</p>
          </div>
          
          <div class="link-card">
            <h3>Navaratri (नवरात्रि)</h3>
            <p>• <strong>Nine Nights</strong></p>
            <p>• Worship of Divine Mother (Durga)</p>
            <p>• Fasting, dancing (Garba), prayer</p>
          </div>
        </div>
        
        <h2>🌍 Official Hindu Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>📖 Scripture Study</h3>
            <p>• <a href="https://www.gitasupersite.iitk.ac.in" target="_blank">Bhagavad Gita Supersite</a></p>
            <p>• <a href="https://www.vedabase.io" target="_blank">Vedabase</a></p>
            <p>• <a href="https://www.sacred-texts.com/hin/" target="_blank">Sacred Texts - Hinduism</a></p>
           </div>
          <div class="link-card">
            <h3>🎓 Educational</h3>
            <p>• <a href="https://www.hinduwebsite.com" target="_blank">Hinduwebsite.com</a></p>
            <p>• <a href="https://www.hinduismtoday.com" target="_blank">Hinduism Today Magazine</a></p>
            <p>• <a href="https://www.yogajournal.com" target="_blank">Yoga Journal</a></p>
           </div>
      
          <div class="link-card">
            <h3>🛕 Organizations</h3>
            <p>• <a href="https://www.hindu.org" target="_blank">Hindu American Foundation</a></p>
            <p>• <a href="https://www.vhp.org" target="_blank">Vishva Hindu Parishad</a></p>
            <p>• <a href="https://iskcon.org" target="_blank">ISKCON</a></p>
           </div>
          </div>
    
          <br>
          <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
         </div>
       </body>
       </html>
`);
});

// ===== PLACEHOLDER ROUTES FOR MISSING RELIGIONS =====

// Buddhism Placeholder
app.get('/religions/buddhism', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Buddhism - Coming Soon</title>${styles}</head>
    <body>
      <div class="container">
        ${navigation}
        <h1>☸️ Buddhism - Page Under Construction</h1>
        <p>This page is coming soon!</p>
        <a href="/religions">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// Sikhism Placeholder
app.get('/religions/sikhism', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Sikhism - Coming Soon</title>${styles}</head>
    <body>
      <div class="container">
        ${navigation}
        <h1>☬ Sikhism - Page Under Construction</h1>
        <p>This page is coming soon!</p>
        <a href="/religions">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// Other Religions Placeholder
app.get('/religions/other', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Other Religions - Coming Soon</title>${styles}</head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🌍 Other Religions & Traditions</h1>
        <p>This page is coming soon!</p>
        <a href="/religions">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// Scriptures Placeholder
app.get('/religions/scriptures', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Sacred Scriptures - Coming Soon</title>${styles}</head>
    <body>
      <div class="container">
        ${navigation}
        <h1>📚 Sacred Scripture Libraries</h1>
        <p>This page is coming soon!</p>
        <a href="/religions">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// ===== 404 ERROR HANDLER =====
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head><title>404 - Page Not Found</title>${styles}</head>
    <body>
      <div class="container">
        ${navigation}
        <h1>❌ 404 - Page Not Found</h1>
        <p>The page <code>${req.url}</code> doesn't exist.</p>
        <a href="/">← Back to Home</a>
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
