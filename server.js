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
    <a href="/history" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">📜 History & Economics</a>
    <a href="/geopolitics" style="color: white; margin: 0 10px; text-decoration: none; font-weight: bold;">📜 🗺️ Geopolitics</a>
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

// BUDDHISM PAGE - DETAILED
app.get('/religions/buddhism', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Buddhism - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>☸️ Buddhism - The Middle Way</h1>
        <p><strong>Followers:</strong> 520 million (7% of world population)</p>
        <p><strong>Founded:</strong> ~500 BCE in Lumbini, Nepal (modern day)</p>
        <p><strong>Founder:</strong> Siddhartha Gautama (The Buddha)</p>
        <p><strong>Major Traditions:</strong> Theravada, Mahayana, Vajrayana</p>
        
        <h2>📖 Sacred Scriptures - Tripitaka (Three Baskets)</h2>
        <div class="message-box">
          <h3>Pali Canon (Tipiṭaka) - Theravada Buddhism</h3>
          <p><strong>Three Divisions:</strong></p>
          <p>1. <strong>Vinaya Piṭaka:</strong> Monastic rules and discipline</p>
          <p>2. <strong>Sutta Piṭaka:</strong> Discourses of the Buddha</p>
          <p>3. <strong>Abhidhamma Piṭaka:</strong> Philosophical analysis</p>
          
          <p><strong>Total:</strong> Approximately 40 volumes</p>
          
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://www.accesstoinsight.org/tipitaka" target="_blank">Access to Insight</a> - Pali Canon translations</p>
          <p>• <a href="https://suttacentral.net" target="_blank">SuttaCentral</a> - Early Buddhist texts</p>
          <p>• <a href="https://www.palicanon.org" target="_blank">PaliCanon.org</a> - Complete Pali texts</p>
        </div>
        
        <div class="message-box">
          <h3>Mahayana Sutras</h3>
          <p><strong>Major Texts:</strong></p>
          <p>• <strong>Lotus Sutra (Saddharma Puṇḍarīka Sūtra):</strong> Most influential Mahayana text</p>
          <p>• <strong>Heart Sutra (Prajñāpāramitā Hṛdaya):</strong> Shortest, most popular sutra</p>
          <p>• <strong>Diamond Sutra (Vajracchedikā Prajñāpāramitā Sūtra):</strong> Wisdom teachings</p>
          <p>• <strong>Platform Sutra:</strong> Zen Buddhism foundational text</p>
          <p>• <strong>Pure Land Sutras:</strong> Three main sutras of Pure Land Buddhism</p>
        </div>
        
        <h2>☸️ Core Teachings - The Four Noble Truths</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>1. Dukkha (Suffering)</h3>
            <p>• Life involves suffering</p>
            <p>• Birth, aging, sickness, death</p>
            <p>• Separation from what we love</p>
            <p>• Not getting what we want</p>
          </div>
          
          <div class="link-card">
            <h3>2. Samudaya (Cause of Suffering)</h3>
            <p>• Craving and attachment</p>
            <p>• Desire for pleasure</p>
            <p>• Desire for existence/non-existence</p>
            <p>• Ignorance of true nature</p>
          </div>
          
          <div class="link-card">
            <h3>3. Nirodha (Cessation of Suffering)</h3>
            <p>• Suffering can end</p>
            <p>• Letting go of craving</p>
            <p>• Achieving Nirvana</p>
            <p>• Liberation from cycle of rebirth</p>
          </div>
          
          <div class="link-card">
            <h3>4. Magga (Path to End Suffering)</h3>
            <p>• The Noble Eightfold Path</p>
            <p>• Middle Way between extremes</p>
            <p>• Practical guide to enlightenment</p>
            <p>• Leads to Nirvana</p>
          </div>
        </div>
        
        <h2>🕉️ The Noble Eightfold Path</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Wisdom (Paññā)</h3>
            <p>1. <strong>Right View:</strong> Understanding Four Noble Truths</p>
            <p>2. <strong>Right Intention:</strong> Commitment to ethical life</p>
          </div>
          
          <div class="link-card">
            <h3>Ethical Conduct (Sīla)</h3>
            <p>3. <strong>Right Speech:</strong> No lying, slander, harsh words</p>
            <p>4. <strong>Right Action:</strong> No killing, stealing, sexual misconduct</p>
            <p>5. <strong>Right Livelihood:</strong> Ethical occupation</p>
          </div>
          
          <div class="link-card">
            <h3>Mental Discipline (Samādhi)</h3>
            <p>6. <strong>Right Effort:</strong> Cultivate wholesome, abandon unwholesome</p>
            <p>7. <strong>Right Mindfulness:</strong> Awareness of body, feelings, mind, phenomena</p>
            <p>8. <strong>Right Concentration:</strong> Meditative absorption</p>
          </div>
        </div>
        
        <h2>🧘 How to Meditate (Buddhist Practice)</h2>
        <div class="message-box">
          <h3>Basic Meditation Instructions</h3>
          
          <p><strong>Posture (Asana):</strong></p>
          <p>1. Sit comfortably cross-legged or on chair</p>
          <p>2. Keep back straight but relaxed</p>
          <p>3. Hands resting on knees or in lap</p>
          <p>4. Eyes partially closed or softly focused</p>
          
          <p><strong>Mindfulness of Breathing (Ānāpānasati):</strong></p>
          <p>1. Focus attention on breath at nostrils or abdomen</p>
          <p>2. Observe natural breath without controlling</p>
          <p>3. When mind wanders, gently return to breath</p>
          <p>4. Start with 5-10 minutes daily</p>
          
          <p><strong>Loving-Kindness Meditation (Mettā):</strong></p>
          <p>1. Sit comfortably, relax body</p>
          <p>2. Repeat phrases silently:</p>
          <p>&nbsp;&nbsp;• "May I be happy and peaceful"</p>
          <p>&nbsp;&nbsp;• "May I be safe and protected"</p>
          <p>&nbsp;&nbsp;• "May I be healthy and strong"</p>
          <p>&nbsp;&nbsp;• "May I live with ease"</p>
          <p>3. Extend to others: loved ones, neutral people, all beings</p>
          
          <p><strong>📚 Meditation Guides:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=kQ7IzSgMhqM" target="_blank">Meditation for Beginners - 10 Minutes</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=SEfs5TJZ6Nk" target="_blank">Mindfulness Meditation Guide</a></p>
          <p>• <a href="https://www.dhamma.org" target="_blank">Vipassana Meditation Courses</a></p>
        </div>
        
        <h2>🌿 The Three Jewels (Triratna)</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>1. Buddha (The Teacher)</h3>
            <p>• The enlightened one</p>
            <p>• Historical Buddha: Siddhartha Gautama</p>
            <p>• Also refers to Buddha-nature in all beings</p>
            <p>• Refuge: "I take refuge in the Buddha"</p>
          </div>
          
          <div class="link-card">
            <h3>2. Dharma (The Teaching)</h3>
            <p>• Buddha's teachings</p>
            <p>• Universal law of nature</p>
            <p>• Path to enlightenment</p>
            <p>• Refuge: "I take refuge in the Dharma"</p>
          </div>
          
          <div class="link-card">
            <h3>3. Sangha (The Community)</h3>
            <p>• Monastic community</p>
            <p>• All Buddhist practitioners</p>
            <p>• Noble ones (enlightened beings)</p>
            <p>• Refuge: "I take refuge in the Sangha"</p>
          </div>
        </div>
        
        <h2>🌍 Major Buddhist Traditions</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Theravada</h3>
            <p>• <strong>Location:</strong> Sri Lanka, Thailand, Myanmar, Laos, Cambodia</p>
            <p>• <strong>Focus:</strong> Monastic life, meditation, Pali Canon</p>
            <p>• <strong>Goal:</strong> Become an arhat (liberated being)</p>
            <p>• <strong>Practice:</strong> Vipassana (insight) meditation</p>
          </div>
          
          <div class="link-card">
            <h3>Mahayana</h3>
            <p>• <strong>Location:</strong> China, Japan, Korea, Vietnam</p>
            <p>• <strong>Focus:</strong> Bodhisattva ideal, helping all beings</p>
            <p>• <strong>Goal:</strong> Become a Buddha for benefit of all</p>
            <p>• <strong>Schools:</strong> Zen, Pure Land, Chan, Nichiren</p>
          </div>
          
          <div class="link-card">
            <h3>Vajrayana</h3>
            <p>• <strong>Location:</strong> Tibet, Bhutan, Mongolia</p>
            <p>• <strong>Focus:</strong> Tantric practices, rituals, visualization</p>
            <p>• <strong>Goal:</strong> Enlightenment in one lifetime</p>
            <p>• <strong>Practice:</strong> Mantras, mandalas, deity yoga</p>
          </div>
        </div>
        
        <h2>🌐 Official Buddhist Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>📖 Scripture Study</h3>
            <p>• <a href="https://suttacentral.net" target="_blank">SuttaCentral</a> - Early Buddhist texts</p>
            <p>• <a href="https://www.accesstoinsight.org" target="_blank">Access to Insight</a> - Theravada texts</p>
            <p>• <a href="https://www.buddhanet.net" target="_blank">BuddhaNet</a> - Buddhist information portal</p>
          </div>
          
          <div class="link-card">
            <h3>🎓 Educational</h3>
            <p>• <a href="https://www.dhammatalks.org" target="_blank">Dharma Talks</a> - Free Buddhist books</p>
            <p>• <a href="https://www.lionsroar.com" target="_blank">Lion's Roar</a> - Buddhist magazine</p>
            <p>• <a href="https://www.tricycle.org" target="_blank">Tricycle</a> - Buddhist review</p>
          </div>
          
          <div class="link-card">
            <h3>🏮 Organizations</h3>
            <p>• <a href="https://www.dhamma.org" target="_blank">Vipassana Meditation</a></p>
            <p>• <a href="https://plumvillage.org" target="_blank">Plum Village</a> - Thich Nhat Hanh</p>
            <p>• <a href="https://fpmt.org" target="_blank">FPMT</a> - Tibetan Buddhism</p>
          </div>
        </div>
        
        <br>
        <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// SIKHISM PAGE - DETAILED
app.get('/religions/sikhism', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sikhism - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>☬ Sikhism - The Way of the Disciple</h1>
        <p><strong>Followers:</strong> 30 million (0.4% of world population)</p>
        <p><strong>Founded:</strong> 1469 CE in Punjab, Indian subcontinent</p>
        <p><strong>Founder:</strong> Guru Nanak Dev Ji (1469-1539)</p>
        <p><strong>Scripture:</strong> Guru Granth Sahib (compiled 1604)</p>
        
        <h2>📖 Sacred Scripture - Guru Granth Sahib</h2>
        <div class="message-box">
          <h3>The Eternal Guru</h3>
          <p>• <strong>Language:</strong> Gurmukhi script (Sant Bhasha, Punjabi, Hindi, Persian)</p>
          <p>• <strong>Pages:</strong> 1,430 (Ang)</p>
          <p>• <strong>Composition:</strong> 5,894 hymns (Shabads)</p>
          <p>• <strong>Authors:</strong> 6 Sikh Gurus + 15 Bhagats (saints) + 11 Bhatts (bards)</p>
          <p>• <strong>Compiled:</strong> Fifth Guru Arjan Dev (1604)</p>
          <p>• <strong>Finalized:</strong> Tenth Guru Gobind Singh (1708) - declared eternal Guru</p>
          
          <p><strong>Content:</strong></p>
          <p>• Teachings about One God (Ik Onkar)</p>
          <p>• Devotional poetry and hymns</p>
          <p>• Ethical guidelines for daily life</p>
          <p>• Rejection of caste system and ritualism</p>
          <p>• Emphasis on truthful living and honest work</p>
          
          <p><strong>📚 Read Online:</strong></p>
          <p>• <a href="https://www.srigranth.org" target="_blank">SriGranth.org</a> - Complete Guru Granth Sahib</p>
          <p>• <a href="https://www.searchgurbani.com" target="_blank">SearchGurbani.com</a> - Search and translations</p>
          <p>• <a href="https://www.sikhitothemax.org" target="_blank">SikhiToTheMax</a> - Gurbani with meanings</p>
          <p>• <a href="https://www.gurbanifm.com" target="_blank">GurbaniFM</a> - Audio recitations</p>
        </div>
        
        <div class="message-box">
          <h3>Other Important Scriptures</h3>
          <p>• <strong>Dasam Granth:</strong> Compositions of Guru Gobind Singh</p>
          <p>• <strong>Janamsakhis:</strong> Biographies of Guru Nanak</p>
          <p>• <strong>Rahit Maryada:</strong> Sikh code of conduct (modern)</p>
          <p>• <strong>Varan Bhai Gurdas:</strong> Key to understanding Guru Granth Sahib</p>
        </div>
        
        <h2>☬ Core Beliefs</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>1. Ik Onkar (ੴ)</h3>
            <p>• One Universal Creator God</p>
            <p>• Formless (Nirguna) and with qualities (Saguna)</p>
            <p>• Not anthropomorphic (no human form)</p>
            <p>• Present in all creation</p>
            <p>• Opening phrase of Guru Granth Sahib</p>
          </div>
          
          <div class="link-card">
            <h3>2. Equality of All Humans</h3>
            <p>• No caste distinctions</p>
            <p>• Gender equality</p>
            <p>• Equal access to worship</p>
            <p>• Langar (community kitchen) serves all</p>
            <p>• Rejection of priesthood class</p>
          </div>
          
          <div class="link-card">
            <h3>3. Rejection of Ritualism</h3>
            <p>• No fasting, pilgrimages, or asceticism</p>
            <p>• No idol worship</p>
            <p>• No superstitions or astrology</p>
            <p>• Focus on inner devotion</p>
            <p>• Simple, direct worship</p>
          </div>
          
          <div class="link-card">
            <h3>4. Three Pillars</h3>
            <p><strong>Naam Japna:</strong> Meditating on God's name</p>
            <p><strong>Kirat Karni:</strong> Honest living and work</p>
            <p><strong>Vand Chakna:</strong> Sharing with others</p>
          </div>
        </div>
        
        <h2>🙏 Sikh Worship & Practice</h2>
        <div class="message-box">
          <h3>Daily Routine (Nitnem)</h3>
          
          <p><strong>Morning Prayers (Amrit Vela - 3-6 AM):</strong></p>
          <p>1. <strong>Japji Sahib:</strong> Composed by Guru Nanak (38 pauris)</p>
          <p>2. <strong>Jaap Sahib:</strong> Composed by Guru Gobind Singh</p>
          <p>3. <strong>Tav-Prasad Savaiye:</strong> Composed by Guru Gobind Singh</p>
          <p>4. <strong>Anand Sahib:</strong> 40 verses, last 6 recited</p>
          
          <p><strong>Evening Prayers:</strong></p>
          <p>• <strong>Rehras Sahib:</strong> Evening prayer</p>
          
          <p><strong>Bedtime Prayer:</strong></p>
          <p>• <strong>Kirtan Sohila:</strong> Before sleeping</p>
          
          <p><strong>📚 How to Recite:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=Qj3q0TPYlNY" target="_blank">Japji Sahib Full Path</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=Y2Z__y3VkhY" target="_blank">Nitnem - Daily Prayers</a></p>
          <p>• <a href="https://www.sikhiwiki.org/index.php/Nitnem" target="_blank">SikhiWiki - Nitnem Guide</a></p>
        </div>
        
        <div class="message-box">
          <h3>Gurdwara (Sikh Temple) Protocol</h3>
          
          <p><strong>Before Entering:</strong></p>
          <p>1. Remove shoes</p>
          <p>2. Wash hands and feet</p>
          <p>3. Cover head (turban, scarf, or handkerchief)</p>
          
          <p><strong>Inside Gurdwara:</strong></p>
          <p>1. Bow before Guru Granth Sahib</p>
          <p>2. Offer donation (optional)</p>
          <p>3. Sit on floor (men and women together)</p>
          <p>4. Listen to Kirtan (hymn singing)</p>
          <p>5. Listen to Katha (discourse)</p>
          
          <p><strong>Ardas (Prayer):</strong></p>
          <p>• Formal congregational prayer</p>
          <p>• Stand with folded hands</p>
          <p>• Recited by Granthi (reader)</p>
          <p>• Ends with "Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh"</p>
          
          <p><strong>Karah Parshad (Sacred Pudding):</strong></p>
          <p>• Sweet flour-based offering</p>
          <p>• Blessed and distributed to all</p>
          <p>• Received with cupped hands</p>
          
          <p><strong>Langar (Community Meal):</strong></p>
          <p>• Free vegetarian meal served to all</p>
          <p>• Everyone sits together on floor</p>
          <p>• Served by volunteers (seva)</p>
        </div>
        
        <h2>⚔️ The Five Ks (Panj Kakkar)</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>1. Kesh (Uncut Hair)</h3>
            <p>• Symbol of acceptance of God's will</p>
            <p>• Covered with turban (Dastar)</p>
            <p>• Represents saintliness and spirituality</p>
            <p>• Men and women keep hair uncut</p>
          </div>
          
          <div class="link-card">
            <h3>2. Kangha (Wooden Comb)</h3>
            <p>• For cleanliness and discipline</p>
            <p>• Kept in hair at all times</p>
            <p>• Symbol of order and purity</p>
            <p>• Used twice daily</p>
          </div>
          
          <div class="link-card">
            <h3>3. Kara (Steel Bracelet)</h3>
            <p>• Worn on right wrist</p>
            <p>• Symbol of restraint and link to Guru</p>
            <p>• Reminder of moral actions</p>
            <p>• Circular shape = eternity of God</p>
          </div>
          
          <div class="link-card">
            <h3>4. Kirpan (Ceremonial Sword)</h3>
            <p>• Symbol of dignity, courage, justice</p>
            <p>• Defend the weak and oppressed</p>
            <p>• Struggle against injustice</p>
            <p>• Usually small (3-9 inches)</p>
          </div>
          
          <div class="link-card">
            <h3>5. Kachera (Cotton Undergarment)</h3>
            <p>• Symbol of self-control and chastity</p>
            <p>• Practical for horseback riding</p>
            <p>• Reminder of moral restraint</p>
            <p>• Always ready for action</p>
          </div>
        </div>
        
        <h2>🕊️ The Ten Gurus</h2>
        <div class="message-box">
          <p><strong>1. Guru Nanak Dev</strong> (1469-1539) - Founder, taught "Ik Onkar"</p>
          <p><strong>2. Guru Angad Dev</strong> (1504-1552) - Developed Gurmukhi script</p>
          <p><strong>3. Guru Amar Das</strong> (1479-1574) - Established Langar,反对 caste</p>
          <p><strong>4. Guru Ram Das</strong> (1534-1581) - Founded Amritsar, built Harmandir Sahib</p>
          <p><strong>5. Guru Arjan Dev</strong> (1563-1606) - Compiled Adi Granth, built Golden Temple</p>
          <p><strong>6. Guru Hargobind</strong> (1595-1644) - Wore two swords (Miri-Piri)</p>
          <p><strong>7. Guru Har Rai</strong> (1630-1661) - Maintained military force</p>
          <p><strong>8. Guru Har Krishan</strong> (1656-1664) - Youngest Guru (age 5)</p>
          <p><strong>9. Guru Tegh Bahadur</strong> (1621-1675) - Martyred defending religious freedom</p>
          <p><strong>10. Guru Gobind Singh</strong> (1666-1708) - Founded Khalsa, declared Guru Granth Sahib as final Guru</p>
        </div>
        
        <h2>🎉 Major Sikh Festivals</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Gurpurbs</h3>
            <p>• <strong>Guru Nanak's Birthday:</strong> Most important</p>
            <p>• <strong>Guru Gobind Singh's Birthday:</strong> January</p>
            <p>• <strong>Guru Arjan's Martyrdom:</strong> June</p>
            <p>• <strong>Guru Tegh Bahadur's Martyrdom:</strong> November</p>
          </div>
          
          <div class="link-card">
            <h3>Historical Events</h3>
            <p>• <strong>Vaisakhi:</strong> Founding of Khalsa (April 13, 1699)</p>
            <p>• <strong>Bandi Chhor Divas:</strong> Diwali for Sikhs</p>
            <p>• <strong>Hola Mohalla:</strong> Martial arts festival</p>
            <p>• <strong>Maghi:</strong> Commemorates martyrdom of 40 Sikhs</p>
          </div>
        </div>
        
        <h2>🌍 Official Sikh Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>📖 Scripture Study</h3>
            <p>• <a href="https://www.srigranth.org" target="_blank">SriGranth.org</a></p>
            <p>• <a href="https://www.searchgurbani.com" target="_blank">SearchGurbani.com</a></p>
            <p>• <a href="https://www.sikhitothemax.org" target="_blank">SikhiToTheMax</a></p>
          </div>
          
          <div class="link-card">
            <h3>🎓 Educational</h3>
            <p>• <a href="https://www.sikhiwiki.org" target="_blank">SikhiWiki</a> - Sikh encyclopedia</p>
            <p>• <a href="https://www.sikhnet.com" target="_blank">SikhNet</a> - Educational resources</p>
            <p>• <a href="https://www.sgpc.net" target="_blank">SGPC</a> - Shiromani Gurdwara Parbandhak Committee</p>
          </div>
          
          <div class="link-card">
            <h3>🕌 Organizations</h3>
            <p>• <a href="https://www.goldentempleamritsar.org" target="_blank">Golden Temple, Amritsar</a></p>
            <p>• <a href="https://www.unitedsikhs.org" target="_blank">United Sikhs</a></p>
            <p>• <a href="https://www.sikhcoalition.org" target="_blank">Sikh Coalition</a></p>
          </div>
        </div>
        
        <br>
        <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// OTHER RELIGIONS & TRADITIONS PAGE
app.get('/religions/other', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Other Religions & Traditions - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🌍 Other Religions & Spiritual Traditions</h1>
        <p>Exploring diverse religious traditions, indigenous spirituality, and philosophical systems from around the world.</p>
        
        <h2>🌏 Indigenous & Traditional Religions</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>African Traditional Religions</h3>
            <p><strong>Followers:</strong> ~100 million</p>
            <p><strong>Regions:</strong> Sub-Saharan Africa</p>
            <p><strong>Features:</strong> Ancestor veneration, nature spirits, oral traditions</p>
            <p><strong>Key Concepts:</strong> Ubuntu, community harmony, connection to land</p>
            <p><strong>Resources:</strong></p>
            <p>• <a href="https://www.africanworldheritage.org" target="_blank">African World Heritage</a></p>
            <p>• <a href="https://www.metmuseum.org/toah/hd/rela/hd_rela.htm" target="_blank">Met Museum - African Religions</a></p>
          </div>
          
          <div class="link-card">
            <h3>Native American Spirituality</h3>
            <p><strong>Peoples:</strong> Various tribes across Americas</p>
            <p><strong>Features:</strong> Connection to nature, vision quests, sweat lodges</p>
            <p><strong>Sacred:</strong> Medicine wheels, totem animals, sacred pipes</p>
            <p><strong>Values:</strong> Seven generations principle, earth stewardship</p>
            <p><strong>Resources:</strong></p>
            <p>• <a href="https://www.native-languages.org/religion.htm" target="_blank">Native Languages - Religion</a></p>
            <p>• <a href="https://www.nlm.nih.gov/nativevoices/timeline/532.html" target="_blank">Native Voices Timeline</a></p>
          </div>
          
          <div class="link-card">
            <h3>Aboriginal Australian</h3>
            <p><strong>Concept:</strong> The Dreaming/Dreamtime</p>
            <p><strong>Features:</strong> Songlines, ancestral beings, connection to land</p>
            <p><strong>Sacred Sites:</strong> Uluru, Kata Tjuta</p>
            <p><strong>Traditions:</strong> 60,000+ years continuous practice</p>
            <p><strong>Resources:</strong></p>
            <p>• <a href="https://www.australia.com/en/things-to-do/aboriginal-australia/dreamtime.html" target="_blank">Australian Dreamtime</a></p>
            <p>• <a href="https://aiatsis.gov.au/explore/dreaming-and-dreamtime" target="_blank">AIATSIS - Dreaming</a></p>
          </div>
        </div>
        
        <h2>🕯️ Abrahamic Traditions (Beyond Main Three)</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Baháʼí Faith</h3>
            <p><strong>Followers:</strong> 7-8 million</p>
            <p><strong>Founded:</strong> 1863, Persia (Iran)</p>
            <p><strong>Founder:</strong> Baháʼu'lláh</p>
            <p><strong>Core Belief:</strong> Unity of all religions, humanity, God</p>
            <p><strong>Scripture:</strong> Kitáb-i-Aqdas, Hidden Words</p>
            <p><strong>Official:</strong> <a href="https://www.bahai.org" target="_blank">Bahai.org</a></p>
          </div>
          
          <div class="link-card">
            <h3>Druze</h3>
            <p><strong>Followers:</strong> 1-1.5 million</p>
            <p><strong>Founded:</strong> 11th century, Egypt</p>
            <p><strong>Features:</strong> Esoteric, unitarian, closed community</p>
            <p><strong>Regions:</strong> Lebanon, Syria, Israel, Jordan</p>
            <p><strong>Texts:</strong> Epistles of Wisdom (Rasa'il al-hikma)</p>
            <p><strong>Study:</strong> <a href="https://www.britannica.com/topic/Druze" target="_blank">Encyclopedia Britannica</a></p>
          </div>
          
          <div class="link-card">
            <h3>Rastafari</h3>
            <p><strong>Followers:</strong> ~1 million</p>
            <p><strong>Founded:</strong> 1930s, Jamaica</p>
            <p><strong>Central Figure:</strong> Haile Selassie I</p>
            <p><strong>Practices:</strong> Ital diet, dreadlocks, reasoning sessions</p>
            <p><strong>Sacrament:</strong> Cannabis (ganja) for meditation</p>
            <p><strong>Resources:</strong> <a href="https://rastafari.today" target="_blank">Rastafari Today</a></p>
          </div>
        </div>
        
        <h2>☯️ Dharmic & Eastern Traditions</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Jainism</h3>
            <p><strong>Followers:</strong> 4-5 million</p>
            <p><strong>Founded:</strong> ~600 BCE, India</p>
            <p><strong>Key Principle:</strong> Ahimsa (non-violence)</p>
            <p><strong>Scriptures:</strong> Agamas, Tattvartha Sutra</p>
            <p><strong>Sects:</strong> Digambara, Śvētāmbara</p>
            <p><strong>Official:</strong> <a href="https://www.jainworld.com" target="_blank">JainWorld.com</a></p>
          </div>
          
          <div class="link-card">
            <h3>Shinto</h3>
            <p><strong>Followers:</strong> 4 million (Japan)</p>
            <p><strong>Origin:</strong> Indigenous Japanese</p>
            <p><strong>Features:</strong> Kami worship, nature spirits, shrines</p>
            <p><strong>Texts:</strong> Kojiki, Nihon Shoki</p>
            <p><strong>Practice:</strong> Purification rituals, festivals (matsuri)</p>
            <p><strong>Resources:</strong> <a href="https://www.jinjahoncho.or.jp/en/" target="_blank">Jinja Honcho</a></p>
          </div>
          
          <div class="link-card">
            <h3>Taoism (Daoism)</h3>
            <p><strong>Followers:</strong> 12-20 million</p>
            <p><strong>Founded:</strong> ~500 BCE, China</p>
            <p><strong>Key Text:</strong> Tao Te Ching (Laozi)</p>
            <p><strong>Concept:</strong> Wu Wei (effortless action)</p>
            <p><strong>Symbol:</strong> Yin-Yang, balance of opposites</p>
            <p><strong>Study:</strong> <a href="https://ctext.org/daoism" target="_blank">Chinese Text Project</a></p>
          </div>
          
          <div class="link-card">
            <h3>Confucianism</h3>
            <p><strong>More philosophy than religion</strong></p>
            <p><strong>Founded:</strong> 551–479 BCE, China</p>
            <p><strong>Founder:</strong> Confucius (Kong Fuzi)</p>
            <p><strong>Texts:</strong> Four Books and Five Classics</p>
            <p><strong>Values:</strong> Filial piety, ritual, righteousness</p>
            <p><strong>Study:</strong> <a href="https://plato.stanford.edu/entries/confucius/" target="_blank">Stanford Encyclopedia</a></p>
          </div>
        </div>
        
        <h2>🔮 New Religious Movements</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Mormonism (LDS)</h3>
            <p><strong>Followers:</strong> 16+ million</p>
            <p><strong>Founded:</strong> 1830, USA</p>
            <p><strong>Founder:</strong> Joseph Smith</p>
            <p><strong>Scriptures:</strong> Bible + Book of Mormon</p>
            <p><strong>Official:</strong> <a href="https://www.churchofjesuschrist.org" target="_blank">Church of Jesus Christ</a></p>
          </div>
          
          <div class="link-card">
            <h3>Jehovah's Witnesses</h3>
            <p><strong>Followers:</strong> 8+ million</p>
            <p><strong>Founded:</strong> 1870s, USA</p>
            <p><strong>Founder:</strong> Charles Taze Russell</p>
            <p><strong>Features:</strong> Door-to-door ministry, no military service</p>
            <p><strong>Official:</strong> <a href="https://www.jw.org" target="_blank">JW.org</a></p>
          </div>
          
          <div class="link-card">
            <h3>Unification Church</h3>
            <p><strong>Followers:</strong> 3+ million</p>
            <p><strong>Founded:</strong> 1954, South Korea</p>
            <p><strong>Founder:</strong> Sun Myung Moon</p>
            <p><strong>Text:</strong> Divine Principle</p>
            <p><strong>Known for:</strong> Mass weddings</p>
            <p><strong>Site:</strong> <a href="https://www.unification.org" target="_blank">Unification.org</a></p>
          </div>
        </div>
        
        <h2>📚 Academic & Comparative Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Academic Study</h3>
            <p>• <a href="https://www.hds.harvard.edu" target="_blank">Harvard Divinity School</a></p>
            <p>• <a href="https://divinity.uchicago.edu" target="_blank">University of Chicago Divinity</a></p>
            <p>• <a href="https://religiousstudies.stanford.edu" target="_blank">Stanford Religious Studies</a></p>
            <p>• <a href="https://www.thearda.com" target="_blank">ARDA - Religion Data Archive</a></p>
          </div>
          
          <div class="link-card">
            <h3>Museums & Collections</h3>
            <p>• <a href="https://www.metmuseum.org/about-the-met/collection-areas/arts-of-africa-oceania-and-the-americas" target="_blank">Met Museum - World Religions Art</a></p>
            <p>• <a href="https://www.britishmuseum.org/collection/galleries/living-and-dying" target="_blank">British Museum - Living and Dying</a></p>
            <p>• <a href="https://www.si.edu/museums/african-art-museum" target="_blank">Smithsonian African Art</a></p>
          </div>
          
          <div class="link-card">
            <h3>Interfaith Organizations</h3>
            <p>• <a href="https://www.uri.org" target="_blank">United Religions Initiative</a></p>
            <p>• <a href="https://www.parliamentofreligions.org" target="_blank">Parliament of World's Religions</a></p>
            <p>• <a href="https://www.scarboromissions.ca" target="_blank">Scarboro Missions Interfaith</a></p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>🎓 Educational Note</h3>
          <p>This section aims to provide respectful, accurate information about diverse religious traditions. All content is sourced from academic institutions, official religious organizations, and reputable ethnographic studies. Inclusion here does not imply endorsement, but rather recognition of each tradition's cultural and spiritual significance.</p>
        </div>
        
        <br>
        <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});

// SACRED SCRIPTURE LIBRARIES PAGE
app.get('/religions/scriptures', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sacred Scripture Libraries - World Religions</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>📚 Sacred Scripture Libraries</h1>
        <p>Digital archives and repositories of sacred texts from world religious traditions.</p>
        
        <h2>🌐 Multi-Religion Digital Libraries</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Sacred Texts Archive</h3>
            <p>• <a href="https://www.sacred-texts.com" target="_blank">Sacred-Texts.com</a></p>
            <p><strong>Features:</strong> One of the oldest and largest online archives</p>
            <p><strong>Content:</strong> Over 1,700 sacred texts across 50+ traditions</p>
            <p><strong>Languages:</strong> English translations, some original languages</p>
            <p><strong>Religions:</strong> All major world religions + mythology, folklore</p>
          </div>
          
          <div class="link-card">
            <h3>Internet Sacred Text Archive</h3>
            <p>• <a href="https://www.isfa.org" target="_blank">ISFA.org</a></p>
            <p><strong>Features:</strong> Academic focus, peer-reviewed translations</p>
            <p><strong>Content:</strong> Critical editions, comparative studies</p>
            <p><strong>Specialties:</strong> Ancient Near Eastern texts, Gnostic scriptures</p>
            <p><strong>Resources:</strong> Bibliographies, study guides</p>
          </div>
          
          <div class="link-card">
            <h3>World Digital Library</h3>
            <p>• <a href="https://www.wdl.org" target="_blank">WDL.org</a> (UNESCO)</p>
            <p><strong>Features:</strong> High-resolution manuscript scans</p>
            <p><strong>Content:</strong> Original manuscripts, historical documents</p>
            <p><strong>Languages:</strong> 100+ languages, multilingual interface</p>
            <p><strong>Highlight:</strong> Gutenberg Bible, Quran manuscripts, Torah scrolls</p>
          </div>
        </div>
        
        <h2>📖 Abrahamic Scriptures</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Jewish Scriptures</h3>
            <p>• <a href="https://www.sefaria.org" target="_blank">Sefaria.org</a> - Complete Jewish library</p>
            <p>• <a href="https://www.mechon-mamre.org" target="_blank">Mechon Mamre</a> - Hebrew Tanakh</p>
            <p>• <a href="https://www.chabad.org/library" target="_blank">Chabad Library</a> - Torah + commentary</p>
            <p>• <a href="https://www.jewishvirtuallibrary.org/jewish-source-texts" target="_blank">Jewish Virtual Library</a></p>
          </div>
          
          <div class="link-card">
            <h3>Christian Scriptures</h3>
            <p>• <a href="https://www.biblegateway.com" target="_blank">BibleGateway.com</a> - 200+ translations</p>
            <p>• <a href="https://www.bible.com" target="_blank">YouVersion Bible</a> - 2,000+ versions</p>
            <p>• <a href="https://www.blueletterbible.org" target="_blank">Blue Letter Bible</a> - Greek/Hebrew tools</p>
            <p>• <a href="https://www.vatican.va/archive/index.htm" target="_blank">Vatican Archive</a> - Catholic texts</p>
          </div>
          
          <div class="link-card">
            <h3>Islamic Scriptures</h3>
            <p>• <a href="https://quran.com" target="_blank">Quran.com</a> - Multiple translations</p>
            <p>• <a href="https://sunnah.com" target="_blank">Sunnah.com</a> - Hadith collections</p>
            <p>• <a href="https://www.altafsir.com" target="_blank">Altafsir.com</a> - Quran commentaries</p>
            <p>• <a href="https://www.islamicstudies.info" target="_blank">IslamicStudies.info</a> - Research portal</p>
          </div>
        </div>
        
        <h2>🕉️ Dharmic Scriptures</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Hindu Scriptures</h3>
            <p>• <a href="https://www.sacred-texts.com/hin" target="_blank">Sacred Texts - Hinduism</a></p>
            <p>• <a href="https://www.gitasupersite.iitk.ac.in" target="_blank">Gita Supersite</a> - Bhagavad Gita</p>
            <p>• <a href="https://www.vedabase.io" target="_blank">Vedabase</a> - Vedic literature</p>
            <p>• <a href="https://www.mahabharataonline.com" target="_blank">Mahabharata Online</a></p>
          </div>
          
          <div class="link-card">
            <h3>Buddhist Scriptures</h3>
            <p>• <a href="https://suttacentral.net" target="_blank">SuttaCentral</a> - Early Buddhist texts</p>
            <p>• <a href="https://www.accesstoinsight.org" target="_blank">Access to Insight</a> - Theravada</p>
            <p>• <a href="https://www.buddhanet.net" target="_blank">BuddhaNet</a> - Digital library</p>
            <p>• <a href="https://www.dharmapearls.net" target="_blank">Dharma Pearls</a> - Chinese Agamas</p>
          </div>
          
          <div class="link-card">
            <h3>Sikh Scriptures</h3>
            <p>• <a href="https://www.srigranth.org" target="_blank">SriGranth.org</a> - Guru Granth Sahib</p>
            <p>• <a href="https://www.searchgurbani.com" target="_blank">SearchGurbani.com</a></p>
            <p>• <a href="https://www.sikhitothemax.org" target="_blank">SikhiToTheMax</a></p>
            <p>• <a href="https://www.gurbanifm.com" target="_blank">GurbaniFM</a> - Audio recitations</p>
          </div>
        </div>
        
        <h2>☯️ East Asian Scriptures</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Taoist & Confucian</h3>
            <p>• <a href="https://ctext.org" target="_blank">Chinese Text Project</a></p>
            <p>• <a href="https://www.daoisopen.com" target="_blank">Dao Is Open</a> - Taoist texts</p>
            <p>• <a href="https://www.confucius.org" target="_blank">Confucius Publishing</a></p>
            <p>• <a href="https://www.acmuller.net/descriptive_catalogue" target="_blank">Korean Buddhist Canon</a></p>
          </div>
          
          <div class="link-card">
            <h3>Shinto Texts</h3>
            <p>• <a href="https://jhti.berkeley.edu" target="_blank">Japanese Historical Text Initiative</a></p>
            <p>• <a href="https://www.sacred-texts.com/shi" target="_blank">Sacred Texts - Shinto</a></p>
            <p>• <a href="https://www.kokugakuin.ac.jp" target="_blank">Kokugakuin University</a></p>
            <p>• <a href="https://www.japanesemythology.jp" target="_blank">Japanese Mythology</a></p>
          </div>
        </div>
        
        <h2>🔍 Specialized Collections</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Ancient & Classical</h3>
            <p>• <a href="https://www.perseus.tufts.edu" target="_blank">Perseus Digital Library</a></p>
            <p>• <a href="https://www.loebclassics.com" target="_blank">Loeb Classical Library</a></p>
            <p>• <a href="https://www.earlychristianwritings.com" target="_blank">Early Christian Writings</a></p>
            <p>• <a href="https://www.gnosis.org/library.html" target="_blank">Gnostic Society Library</a></p>
          </div>
          
          <div class="link-card">
            <h3>Academic Databases</h3>
            <p>• <a href="https://www.jstor.org" target="_blank">JSTOR</a> - Academic journals</p>
            <p>• <a href="https://www.atla.com" target="_blank">ATLA Religion Database</a></p>
            <p>• <a href="https://www.brill.com" target="_blank">Brill Online</a> - Religious studies</p>
            <p>• <a href="https://www.religion-online.org" target="_blank">Religion Online</a> - 6,000+ articles</p>
          </div>
          
          <div class="link-card">
            <h3>Manuscript Collections</h3>
            <p>• <a href="https://www.bl.uk/manuscripts" target="_blank">British Library MSS</a></p>
            <p>• <a href="https://digitalcollections.nypl.org" target="_blank">NYPL Digital Collections</a></p>
            <p>• <a href="https://www.loc.gov/manuscripts" target="_blank">Library of Congress MSS</a></p>
            <p>• <a href="https://gallica.bnf.fr" target="_blank">Gallica (French National Library)</a></p>
          </div>
        </div>
        
        <h2>📱 Mobile Apps & Tools</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Multi-Text Apps</h3>
            <p>• <a href="https://www.logos.com" target="_blank">Logos Bible Software</a></p>
            <p>• <a href="https://www.accordancebible.com" target="_blank">Accordance</a></p>
            <p>• <a href="https://www.olivetree.com" target="_blank">Olive Tree Bible</a></p>
            <p>• <a href="https://www.blueletterbible.org/apps" target="_blank">Blue Letter Bible App</a></p>
          </div>
          
          <div class="link-card">
            <h3>Language Tools</h3>
            <p>• <a href="https://www.biblehub.com" target="_blank">BibleHub</a> - Interlinear</p>
            <p>• <a href="https://corpus.quran.com" target="_blank">Quranic Arabic Corpus</a></p>
            <p>• <a href="https://www.sanskrit-lexicon.uni-koeln.de" target="_blank">Cologne Sanskrit Lexicon</a></p>
            <p>• <a href="https://www.perseus.tufts.edu/hopper/morph" target="_blank">Perseus Morphology Tool</a></p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>💡 Using These Resources</h3>
          <p><strong>For Study:</strong> Compare translations, read commentaries, understand historical context</p>
          <p><strong>For Research:</strong> Use academic databases for peer-reviewed scholarship</p>
          <p><strong>For Devotion:</strong> Many sites offer audio recitations, daily reading plans, meditation guides</p>
          <p><strong>Respectful Use:</strong> When studying scriptures of traditions not your own, approach with academic curiosity and cultural sensitivity</p>
        </div>
        
        <br>
        <a href="/religions" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to Religions</a>
      </div>
    </body>
    </html>
  `);
});


// ===== HISTORY & ECONOMICS SECTION =====

// Main History Hub
app.get('/history', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>History & Economics - Fatimah's Server</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation.replace('href="/history"', 'href="/history" style="color: #6ee7b7;"')}
        <h1>📜 History & Economics - The Untold Stories</h1>
        <p>Uncensored historical analysis and economic truth from alternative researchers, whistleblowers, and suppressed archives.</p>
        
        <div class="https-info">
          <h3>🔍 About This Section</h3>
          <p>This section presents historical and economic perspectives often excluded from mainstream education. Sources include:</p>
          <p>• Declassified government documents</p>
          <p>• Whistleblower testimonies</p>
          <p>• Alternative historians and researchers</p>
          <p>• Independent investigative journalism</p>
          <p>• Suppressed academic research</p>
        </div>
        
        <h2>🌍 Global History</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>World Wars Analysis</h3>
            <p>• Hidden causes and profiteers</p>
            <p>• False flag operations</p>
            <p>• Economic motivations</p>
            <p><a href="/history/world-wars"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Revolutions & Coups</h3>
            <p>• CIA operations abroad</p>
            <p>• Color revolutions</p>
            <p>• Regime change operations</p>
            <p><a href="/history/revolutions"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Colonialism & Empire</h3>
            <p>• Resource extraction</p>
            <p>• Divide and rule strategies</p>
            <p>• Neo-colonialism today</p>
            <p><a href="/history/colonialism"><button>📖 Explore</button></a></p>
          </div>
        </div>
        
        <h2>🏛️ Power Structures</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Banking & Finance Control</h3>
            <p>• Central banking origins</p>
            <p>• Debt-based currency</p>
            <p>• Financial oligarchy</p>
            <p><a href="/history/banking"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Ruling Families & Dynasties</h3>
            <p>• Rothschild, Rockefeller, etc.</p>
            <p>• Intermarriage strategies</p>
            <p>• Corporate control networks</p>
            <p><a href="/history/ruling-families"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Intelligence Agencies</h3>
            <p>• CIA, MI6, Mossad operations</p>
            <p>• Covert action history</p>
            <p>• Media manipulation</p>
            <p><a href="/history/intelligence"><button>📖 Explore</button></a></p>
          </div>
        </div>
        
        <h2>💰 Economic Truth</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Wealth Concentration</h3>
            <p>• 1% vs 99% statistics</p>
            <p>• Tax havens and evasion</p>
            <p>• Inheritance dynasties</p>
            <p><a href="/history/wealth"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Resource Control</h3>
            <p>• Oil, minerals, agriculture</p>
            <p>• Water rights battles</p>
            <p>• Land grabbing</p>
            <p><a href="/history/resources"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Monetary Systems</h3>
            <p>• Fiat currency deception</p>
            <p>• Gold standard removal</p>
            <p>• Cryptocurrency battles</p>
            <p><a href="/history/money"><button>📖 Explore</button></a></p>
          </div>
        </div>
        
        <h2>🌐 Regional Histories</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>United States</h3>
            <p>• Federal Reserve creation</p>
            <p>• JFK assassination</p>
            <p>• Deep State origins</p>
            <p><a href="/history/usa"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Europe</h3>
            <p>• EU creation motives</p>
            <p>• Vatican financial power</p>
            <p>• Monarchies today</p>
            <p><a href="/history/europe"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Middle East</h3>
            <p>• Oil wars truth</p>
            <p>• Israel-Palestine history</p>
            <p>• Arab Spring manipulation</p>
            <p><a href="/history/middle-east"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Asia & Africa</h3>
            <p>• Colonial exploitation</p>
            <p>• Resource wars</p>
            <p>• Development trap</p>
            <p><a href="/history/asia"><button>📖 Explore Asia</button></a></p>
            <p><a href="/history/africa"><button>📖 Explore Africa</button></a></p>
          </div>
        </div>
        
        <h2>📚 Research Resources</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Document Archives</h3>
            <p>• Declassified documents</p>
            <p>• Whistleblower sites</p>
            <p>• Leaked databases</p>
            <p><a href="/history/archives"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Researchers & Whistleblowers</h3>
            <p>• Independent journalists</p>
            <p>• Academic dissenters</p>
            <p>• Former insiders</p>
            <p><a href="/history/researchers"><button>📖 Explore</button></a></p>
          </div>
          
          <div class="link-card">
            <h3>Alternative Media</h3>
            <p>• Uncensored platforms</p>
            <p>• Independent analysis</p>
            <p>• Community investigations</p>
            <p><a href="/history/media"><button>📖 Explore</button></a></p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>⚠️ Critical Thinking Required</h3>
          <p>This section presents controversial perspectives. We encourage:</p>
          <p>1. <strong>Verify claims</strong> with multiple sources</p>
          <p>2. <strong>Check dates and context</strong> of information</p>
          <p>3. <strong>Follow the money</strong> in historical events</p>
          <p>4. <strong>Question official narratives</strong> that don't add up</p>
          <p>5. <strong>Research primary sources</strong> when possible</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// WORLD WARS PAGE - Uncensored Analysis
app.get('/history/world-wars', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>World Wars - Hidden Truths</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>⚔️ World Wars - The Untold Stories</h1>
        <p>Analysis of hidden causes, profiteers, and suppressed facts about the World Wars.</p>
        
        <div class="https-info">
          <h3>📋 Official Narrative vs Hidden Truths</h3>
          <p>This page presents perspectives from alternative historians, declassified documents, and whistleblower testimonies that challenge mainstream narratives.</p>
        </div>
        
        <h2>🌍 World War I (1914-1918)</h2>
        
        <div class="message-box">
          <h3>Hidden Causes & Profiteers</h3>
          
          <p><strong>Banking Interests:</strong></p>
          <p>• The Federal Reserve Act (1913) created months before WWI</p>
          <p>• International bankers funded both sides</p>
          <p>• War debt created permanent client states</p>
          
          <p><strong>Key Documents & Sources:</strong></p>
          <p>• <a href="https://archive.org/details/pdfy-LzPJrXY17uzk3bu9/page/n1/mode/2up" target="_blank">"Secrets of the Federal Reserve" by Eustace Mullins</a></p>
          <p>• <a href="https://archive.org/details/WallStreetAndTheBolshevikRevolution" target="_blank">"Wall Street and the Bolshevik Revolution" by Antony Sutton</a></p>
          <p>• <a href="https://www.cia.gov/readingroom/historical-collections" target="_blank">CIA declassified: Banking in WWI</a></p>
          <p>• <a href="https://www.cia.gov/readingroom/search/site" target="_blank">CIA declassified: Freedom of Information Act Electronic Reading Room</a></p>
          
          <p><strong>The Lusitania False Flag:</strong></p>
          <p>• British ship carrying munitions to Britain</p>
          <p>• Winston Churchill admitted hoping for attack to draw US into war</p>
          <p>• US passengers used as human shields</p>
          <p>• Source: <a href="https://www.archives.gov/milestone-documents/address-to-congress-declaration-of-war-against-germany" target="_blank">National Archives - Lusitania documents</a></p>
          <p>• Source: <a href="https://www.archives.gov/publications/prologue/2016/winter/zimmermann-telegram" target="_blank">National Archives - Lusitania documents</a></p>
        </div>
        
        <div class="message-box">
          <h3>The Balfour Declaration Context</h3>
          <p>• 1917 British promise for Jewish homeland in Palestine</p>
          <p>• Issued while Britain didn't control the territory</p>
          <p>• Part of efforts to get Jewish banking support for war</p>
          <p>• Zionist lobbying powerful in Britain and US</p>
          <p>• <a href="https://avalon.law.yale.edu/20th_century/balfour.asp" target="_blank">Original Balfour Declaration text</a></p>
        </div>
        
        <h2>⚔️ World War II (1939-1945)</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>Funding Hitler's Rise</h3>
            <p><strong>Documented Evidence:</strong></p>
            <p>• Prescott Bush (George H.W. Bush's father) business dealings with Nazi Germany</p>
            <p>• Standard Oil (Rockefeller) continued supplying Germany via neutral countries</p>
            <p>• IBM provided technology for concentration camp administration</p>
            <p>• Ford Motor Company produced vehicles for German military</p>
            
            <p><strong>Sources:</strong></p>
            <p>• <a href="https://www.archives.gov/press/press-releases/2004/nr04-55" target="_blank">National Archives - Nazi financial records</a></p>
            <p>• "Trading With the Enemy" by Charles Higham</p>
            <p>• <a href="https://archive.org/details/charles-higham-trading-with-the-enemy-an-expose-of-the-nazi-american-money-plot-_202012/page/n2/mode/1up" target="_blank">"Trading With the Enemy" by Charles Higham</a></p>
            <p>• <a href="https://archive.org/details/EssentialDissent-EdwinBlackIBMAndTheHolocaustPart1Of2281-2" target="_blank">"IBM and the Holocaust,Part 1" by Edwin Black</a></p>
            <p>• <a href="https://archive.org/details/EssentialDissent-EdwinBlackIBMAndTheHolocaustPart2Of2335" target="_blank">"IBM and the Holocaust,Part 2" by Edwin Black</a></p>
          </div>
          
        <div class="link-card">

            <h3>Pearl Harbor Foreknowledge</h3>
            <p><strong>Declassified Evidence:</strong></p>
            <p>• US broke Japanese codes before attack</p>
            <p>• Warnings sent but not acted upon</p>
            <p>• Roosevelt needed "back door to war"</p>
            <p>• Public opposed entering European war</p>
            
            <p><strong>Sources:</strong></p>
            <p>• <a href="https://www.nsa.gov/Press-Room/News-Highlights/Article/Article/3609901/doing-it-until-we-got-it-right-a-short-history-of-the-pearl-harbor-investigatio/" target="_blank">NSA declassified: Pearl Harbor intelligence</a></p>
            <p>• "Day of Deceit" by Robert Stinnett</p>
            <p>• <a href="https://archive.org/details/dayofdeceit" target="_blank">Day Of Deceit The Truth About FDR And Pearl Harbor by ROBERT B. STSNNETT</a></p>
            <p>• Congressional investigations (1945-46)</p>
          </div>
        </div>
        
        <div class="message-box">
          <h3>The Holocaust Industrial Complex</h3>
          
          <p><strong>Post-War Exploitation:</strong></p>
          <p>• Swiss banks hoarded Jewish assets</p>
          <p>• German companies used slave labor</p>
          <p>• Art theft and cultural plunder</p>
          <p>• Pharmaceutical testing on prisoners</p>
          
          <p><strong>Suppressed Stories:</strong></p>
          <p>• <a href="https://www.nytimes.com/1996/05/23/world/swiss-banks-and-nazi-gold-the-story-that-won-t-go-away.html" target="_blank">Swiss banks and Nazi gold</a></p>
          <p>• IBM's role in Holocaust administration</p>
          <p>• <a href="https://www.theguardian.com/world/2002/mar/29/humanities.highereducation" target="_blank">IBM dealt directly with Holocaust organisers</a></p>
          <p>• Ford, GM, and Standard Oil war profiteering</p>
          <p>• <a href="https://dogandlemon.com/sites/default/files/cars_nazis.pdf" target="_blank">Ford, GM and Stardard Oil war profiteering</a></p>
          <p>• <a href="https://archive.org/details/hitlerssilentpar0000vinc_w4a0" target="_blank">Swiss banks, Nazi gold and the pursuit of justice</a></p>
          <p><strong>Whistleblower Accounts:</strong></p>
          <p>• John Loftus - former US Justice Department Nazi hunter</p>
          <p>• <a href="https://remember.org/loftus.html" target="_blank">John Loftus-Finding and prosecuting Nazi war criminals</a></p>
          <p>• "The Secret War Against the Jews" documentation</p>
          <p>• <a href="https://archive.org/details/secretwaragainst0000loft" target="_blank">John Loftus-The secret war against the jews:how western espionage betrayed the Jewish people</a></p>
        </div>
        
        <h2>💰 War Profiteering & Economic Motives</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Military-Industrial Complex</h3>
            <p>• Eisenhower's 1961 warning</p>
            <p>• Permanent war economy</p>
            <p>• Defense contractor profits</p>
            <p>• Revolving door officials</p>
            <p>• <a href="https://www.archives.gov/milestone-documents/president-dwight-d-eisenhowers-farewell-address" target="_blank">Eisenhower's Farewell Address</a></p>
          </div>
          
          <div class="link-card">
            <h3>Central Banking Expansion</h3>
            <p>• Wars create debt</p>
            <p>• Debt creates control</p>
            <p>• IMF/World Bank creation</p>
            <p>• Dollar as reserve currency</p>
            <p>• Bretton Woods system</p>
          </div>
          
          <div class="link-card">
            <h3>Resource Control</h3>
            <p>• Middle East oil access</p>
            <p>• Strategic minerals</p>
            <p>• Trade route control</p>
            <p>• Colonial rearrangements</p>
            <p>• Pipeline politics</p>
          </div>
        </div>
        
        <h2>📚 Alternative Historians & Researchers</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Academic Dissenters</h3>
            <p>• <strong>David Irving</strong> - Controversial WWII historian</p>
            <p>• <strong>Harry Elmer Barnes</strong> - Revisionist historian</p>
            <p>• <strong>Antony Sutton</strong> - Wall Street funding research</p>
            <p>• <strong>Carroll Quigley</strong> - Anglo-American establishment</p>
          </div>
          
          <div class="link-card">
            <h3>Investigative Journalists</h3>
            <p>• <strong>Webster Tarpley</strong> - 9/11 and false flags</p>
            <p>• <strong>John Pilger</strong> - War propaganda</p>
            <p>• <strong>Robert Parry</strong> - Consortium News</p>
            <p>• <strong>Whitney Webb</strong> - Unlimited Hangout</p>
          </div>
          
          <div class="link-card">
            <h3>Whistleblowers</h3>
            <p>• <strong>Smedley Butler</strong> - "War is a Racket"</p>
            <p>• <strong>John Perkins</strong> - "Confessions of an Economic Hit Man"</p>
            <p>• <strong>Karen Hudes</strong> - World Bank whistleblower</p>
            <p>• <strong>Peter Dale Scott</strong> - Deep State researcher</p>
          </div>
        </div>
        
        <h2>🔍 Primary Source Archives</h2>
        <div class="message-box">
          <h3>Declassified Documents</h3>
          <p>• <a href="https://www.archives.gov/research/captured-german-records" target="_blank">US National Archives - Captured German Records</a></p>
          <p>• <a href="https://www.cia.gov/library/readingroom/collection/german-world-war-ii-records" target="_blank">CIA Reading Room - WWII records</a></p>
          <p>• <a href="https://nsarchive.gwu.edu/" target="_blank">National Security Archive</a></p>
          <p>• <a href="https://www.wilsoncenter.org/digital-archive" target="_blank">Wilson Center Digital Archive</a></p>
          <p>• <a href="https://www.loc.gov/collections/veterans-history-project-collection/" target="_blank">Library of Congress Veterans History</a></p>
        </div>
        
        <div class="https-info">
          <h3>⚠️ Critical Analysis Required</h3>
          <p><strong>Follow the Money:</strong> Who profited from the wars?</p>
          <p><strong>Question Official Narratives:</strong> What facts don't add up?</p>
          <p><strong>Examine Contradictions:</strong> Official story vs declassified evidence</p>
          <p><strong>Research Primary Sources:</strong> Avoid secondary interpretations</p>
          <p><strong>Consider Multiple Perspectives:</strong> Mainstream vs alternative views</p>
        </div>
        
        <br>
        <a href="/history" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to History</a>
      </div>
    </body>
    </html>
  `);
});

// REVOLUTIONS & COUPS PAGE
app.get('/history/revolutions', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Revolutions & Coups - Hidden History</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🎭 Revolutions & Coups - CIA Operations Exposed</h1>
        <p>Documented regime change operations, color revolutions, and covert interventions.</p>
        
        <div class="https-info">
          <h3>📋 Declassified Evidence</h3>
          <p>This page compiles information from declassified CIA documents, congressional investigations, and whistleblower testimonies. All claims are sourced from official government records or verified investigative journalism.</p>
        </div>
        
        <h2>🌍 Documented CIA Coups & Interventions</h2>
        
        <div class="message-box">
          <h3>1953 - Iran (Operation Ajax)</h3>
          <p><strong>Target:</strong> Democratically elected Prime Minister Mohammad Mosaddegh</p>
          <p><strong>Reason:</strong> Nationalized Iranian oil (British Petroleum interests)</p>
          <p><strong>Method:</strong> CIA/MI6 organized protests, bribed officials, installed Shah</p>
          <p><strong>Result:</strong> 26 years of authoritarian rule, led to 1979 Islamic Revolution</p>
          <p><strong>Evidence:</strong></p>
          <p>• <a href="https://nsarchive2.gwu.edu/NSAEBB/NSAEBB435/" target="_blank">National Security Archive - CIA confirms role</a></p>
          <p>• <a href="https://www.cia.gov/library/center-for-the-study-of-intelligence/csi-publications/csi-studies/studies/vol-48-no-2/article10.html" target="_blank">CIA's own history of coup</a></p>
          <p>• <a href="https://foreignpolicy.com/2013/08/19/cia-admits-it-was-behind-irans-coup/" target="_blank">Foreign Policy - CIA admission</a></p>
        </div>
        
        <div class="message-box">
          <h3>1954 - Guatemala (Operation PBSuccess)</h3>
          <p><strong>Target:</strong> President Jacobo Árbenz</p>
          <p><strong>Reason:</strong> Land reform threatened United Fruit Company profits</p>
          <p><strong>Method:</strong> CIA trained paramilitary, psychological warfare, bombing</p>
          <p><strong>Result:</strong> 40+ years of civil war, 200,000 dead</p>
          <p><strong>Evidence:</strong></p>
          <p>• <a href="https://nsarchive2.gwu.edu/NSAEBB/NSAEBB4/" target="_blank">National Security Archive - Declassified docs</a></p>
          <p>• <a href="https://www.cia.gov/library/readingroom/docs/DOC_0000134974.pdf" target="_blank">CIA declassified: Guatemala operation</a></p>
          <p>• "Bitter Fruit" by Stephen Schlesinger & Stephen Kinzer</p>
        </div>
        
        <div class="message-box">
          <h3>1973 - Chile (Project FUBELT)</h3>
          <p><strong>Target:</strong> Socialist President Salvador Allende</p>
          <p><strong>Reason:</strong> Nationalized copper mines (US corporate interests)</p>
          <p><strong>Method:</strong> Economic sabotage, military coup support, assassination</p>
          <p><strong>Installed:</strong> General Augusto Pinochet dictatorship</p>
          <p><strong>Result:</strong> 3,000+ killed, 40,000 tortured, 17 years military rule</p>
          <p><strong>Evidence:</strong></p>
          <p>• <a href="https://nsarchive2.gwu.edu/NSAEBB/NSAEBB8/nsaebb8i.htm" target="_blank">National Security Archive - Kissinger's role</a></p>
          <p>• <a href="https://www.cia.gov/library/reports/general-reports-1/chile/" target="_blank">CIA Report on Chile 1963-1973</a></p>
          <p>• Congressional Church Committee investigations (1975)</p>
        </div>
        
        <h2>🎨 "Color Revolutions" (21st Century)</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>2003 - Georgia (Rose Revolution)</h3>
            <p>• US-funded NGOs trained activists</p>
            <p>• USAID, NED, Soros Foundation involvement</p>
            <p>• Overthrew Shevardnadze</p>
            <p>• Pro-Western government installed</p>
            <p><strong>Source:</strong> <a href="https://www.theguardian.com/world/2004/nov/26/ukraine.usa" target="_blank">Guardian - US role in revolutions</a></p>
          </div>
          
          <div class="link-card">
            <h3>2004 - Ukraine (Orange Revolution)</h3>
            <p>• $65 million US funding documented</p>
            <p>• State Dept, USAID orchestration</p>
            <p>• Viktor Yushchenko installed</p>
            <p>• Led to 2014 Euromaidan coup</p>
            <p><strong>Source:</strong> <a href="https://www.theguardian.com/world/2004/nov/26/ukraine.usa" target="_blank">Guardian investigation</a></p>
          </div>
          
          <div class="link-card">
            <h3>2011 - Arab Spring</h3>
            <p>• Tunisia, Egypt, Libya, Syria</p>
            <p>• Social media manipulation</p>
            <p>• CIA, MI6, Mossad coordination</p>
            <p>• Regime change attempts</p>
            <p><strong>Analysis:</strong> <a href="https://www.mintpressnews.com/arab-spring-western-intervention/214789/" target="_blank">MintPress - Western intervention</a></p>
          </div>
        </div>
        
        <h2>💰 Economic Warfare Tactics</h2>
        <div class="message-box">
          <h3>Documented Methods</h3>
          <p><strong>1. Economic Sanctions</strong></p>
          <p>• Starve civilian population</p>
          <p>• Blame government for suffering</p>
          <p>• Create conditions for unrest</p>
          <p>• Examples: Venezuela, Cuba, Iran, Iraq (1990s)</p>
          
          <p><strong>2. Currency Manipulation</strong></p>
          <p>• Short selling national currency</p>
          <p>• Capital flight orchestration</p>
          <p>• IMF "structural adjustment"</p>
          <p>• Debt trap diplomacy</p>
          
          <p><strong>3. Resource Control</strong></p>
          <p>• Oil, minerals, agriculture</p>
          <p>• Blockades and embargoes</p>
          <p>• Control of strategic assets</p>
          <p>• Pipeline politics</p>
          
          <p><strong>Evidence:</strong></p>
          <p>• "Confessions of an Economic Hit Man" by John Perkins</p>
          <p>• <a href="https://www.wsws.org/en/articles/2019/01/30/vene-j30.html" target="_blank">Venezuela coup attempt documentation</a></p>
        </div>
        
        <h2>🕵️ Key Organizations & Funding</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>National Endowment for Democracy (NED)</h3>
            <p>• Founded 1983 (Reagan era)</p>
            <p>• "Doing openly what CIA did covertly"</p>
            <p>• $300+ million annual budget</p>
            <p>• Funds opposition groups worldwide</p>
            <p>• <a href="https://www.ned.org/about/" target="_blank">NED official site</a></p>
          </div>
          
          <div class="link-card">
            <h3>USAID</h3>
            <p>• Front for CIA operations</p>
            <p>• Cuba, Venezuela operations exposed</p>
            <p>• Social media manipulation (ZunZuneo)</p>
            <p>• "Development" as cover</p>
            <p>• <a href="https://apnews.com/article/904a9a6a1bcd46cebfc14bea2ee30fdf" target="_blank">AP - USAID Cuba program</a></p>
          </div>
          
          <div class="link-card">
            <h3>Open Society Foundations (Soros)</h3>
            <p>• Active in 120+ countries</p>
            <p>• Funds "pro-democracy" groups</p>
            <p>• Color revolution involvement</p>
            <p>• $32 billion endowment</p>
            <p>• <a href="https://www.opensocietyfoundations.org/" target="_blank">OSF official site</a></p>
          </div>
        </div>
        
        <h2>📚 Whistleblowers & Investigators</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>John Perkins</h3>
            <p><strong>Former Economic Hit Man</strong></p>
            <p>• Confessed to engineering coups</p>
            <p>• Debt trap methodology exposed</p>
            <p>• Books: "Confessions of an Economic Hit Man"</p>
            <p>• <a href="https://johnperkins.org/" target="_blank">Official website</a></p>
          </div>
          
          <div class="link-card">
            <h3>Philip Agee</h3>
            <p><strong>Former CIA Officer</strong></p>
            <p>• Exposed CIA operations in Latin America</p>
            <p>• "Inside the Company: CIA Diary" (1975)</p>
            <p>• Revealed covert action methods</p>
            <p>• Died in exile (Cuba, 2008)</p>
          </div>
          
          <div class="link-card">
            <h3>William Blum</h3>
            <p><strong>Former State Department</strong></p>
            <p>• "Killing Hope: US Military Interventions"</p>
            <p>• Documented 70+ regime changes</p>
            <p>• "Rogue State" author</p>
            <p>• <a href="https://williamblum.org/" target="_blank">Archive of work</a></p>
          </div>
        </div>
        
        <h2>🔍 Research Resources</h2>
        <div class="message-box">
          <h3>Declassified Document Archives</h3>
          <p>• <a href="https://nsarchive.gwu.edu/" target="_blank">National Security Archive</a> - George Washington University</p>
          <p>• <a href="https://www.cia.gov/library/readingroom/" target="_blank">CIA Reading Room</a> - Declassified documents</p>
          <p>• <a href="https://history.state.gov/historicaldocuments" target="_blank">State Department Historical Documents</a></p>
          <p>• <a href="https://www.archives.gov/research/foreign-policy" target="_blank">National Archives - Foreign Policy</a></p>
          <p>• <a href="https://www.wilsoncenter.org/digital-archive" target="_blank">Wilson Center Digital Archive</a></p>
        </div>
        
        <div class="https-info">
          <h3>🎯 Pattern Recognition</h3>
          <p><strong>Common Coup Indicators:</strong></p>
          <p>1. Country nationalizes resources (oil, minerals)</p>
          <p>2. Leader rejects US/Western demands</p>
          <p>3. Sudden "pro-democracy" protests appear</p>
          <p>4. Western media demonizes leader</p>
          <p>5. Economic sanctions imposed</p>
          <p>6. Opposition receives foreign funding</p>
          <p>7. Military trained by US turns on government</p>
          <p>8. "Humanitarian intervention" threatened</p>
        </div>
        
        <br>
        <a href="/history" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to History</a>
      </div>
    </body>
    </html>
  `);
});

// COLONIALISM PAGE
app.get('/history/colonialism', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Colonialism & Neo-Colonialism</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🌍 Colonialism & Neo-Colonialism - Exploitation Never Ended</h1>
        <p>From overt colonial rule to modern economic colonialism through debt and corporations.</p>
        
        <h2>📜 Historical Colonialism (1500s-1960s)</h2>
        
        <div class="message-box">
          <h3>European Colonial Empires</h3>
          
          <p><strong>British Empire (Largest)</strong></p>
          <p>• Controlled 25% of world's land and population</p>
          <p>• India: $45 trillion stolen over 200 years (research by Utsa Patnaik)</p>
          <p>• Artificial famines killed millions (Bengal 1943: 3 million dead)</p>
          <p>• Opium Wars forced drug trade on China</p>
          <p>• <a href="https://www.aljazeera.com/opinions/2018/12/19/how-britain-stole-45-trillion-from-india" target="_blank">Al Jazeera - Britain's theft from India</a></p>
          
          <p><strong>Belgian Congo (King Leopold II)</strong></p>
          <p>• 10-15 million Congolese killed (1885-1908)</p>
          <p>• Rubber extraction through forced labor</p>
          <p>• Hands cut off for not meeting quotas</p>
          <p>• Personal property of Belgian king (not even state colony)</p>
          <p>• <a href="https://www.bbc.com/news/world-europe-53017188" target="_blank">BBC - Belgium's colonial atrocities</a></p>
          
          <p><strong>French Colonial Empire</strong></p>
          <p>• Algeria: 1.5 million killed in independence war</p>
          <p>• "Colonial tax" continues today (CFA Franc)</p>
          <p>• 14 African countries forced to keep reserves in French treasury</p>
          <p>• France has veto power over their monetary policy</p>
          <p>• <a href="https://www.aljazeera.com/opinions/2019/5/6/is-france-looting-africa" target="_blank">Al Jazeera - France's continued exploitation</a></p>
        </div>
        
        <h2>💰 Neo-Colonialism Through Debt</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>IMF & World Bank</h3>
            <p><strong>The Debt Trap</strong></p>
            <p>• Created at Bretton Woods (1944)</p>
            <p>• Loan conditions ("structural adjustment")</p>
            <p>• Force privatization of state assets</p>
            <p>• Cut social spending (health, education)</p>
            <p>• Open markets to foreign corporations</p>
            <p>• Remove capital controls</p>
            
            <p><strong>Result:</strong> Perpetual debt, asset stripping</p>
            <p>• <a href="https://www.cadtm.org/ABC" target="_blank">CADTM - Debt abolition movement</a></p>
            <p>• "The Shock Doctrine" by Naomi Klein</p>
          </div>
          
          <div class="link-card">
            <h3>Resource Extraction</h3>
            <p><strong>Modern Plunder</strong></p>
            <p>• Western mining companies in Africa</p>
            <p>• Oil corporations in Middle East</p>
            <p>• Agricultural land grabs</p>
            <p>• Water privatization</p>
            <p>• Profits flow to West, poverty remains</p>
            
            <p><strong>Example: DRC (Congo)</strong></p>
            <p>• Richest in minerals (coltan, cobalt, diamonds)</p>
            <p>• Population among world's poorest</p>
            <p>• Ongoing proxy wars for resource control</p>
            <p>• <a href="https://www.theguardian.com/global-development/2019/dec/16/apple-and-google-named-in-us-lawsuit-over-congolese-child-cobalt-mining-deaths" target="_blank">Guardian - Child labor for tech companies</a></p>
          </div>
          
          <div class="link-card">
            <h3>Corporate Colonialism</h3>
            <p><strong>Transnational Corporations</strong></p>
            <p>• Chevron, Shell, BP oil extraction</p>
            <p>• Monsanto (Bayer) agriculture control</p>
            <p>• Mining: Rio Tinto, Glencore</p>
            <p>• Coca-Cola water depletion</p>
            <p>• Nike, Apple sweatshop labor</p>
            
            <p><strong>Tactics:</strong></p>
            <p>• Bribe local officials</p>
            <p>• Fund military/police</p>
            <p>• Exploit lax environmental laws</p>
            <p>• Tax havens to avoid paying countries</p>
            <p>• <a href="https://www.corpwatch.org/" target="_blank">CorpWatch - Corporate accountability</a></p>
          </div>
        </div>
        
        <h2>🗺️ Artificial Borders & Divide-and-Rule</h2>
        
        <div class="message-box">
          <h3>Colonial Border Drawing</h3>
          <p><strong>Africa - Berlin Conference (1884-1885)</strong></p>
          <p>• European powers carved up Africa</p>
          <p>• Borders drawn with rulers, no regard for ethnicities</p>
          <p>• Created artificial nations (Nigeria: 250+ ethnic groups)</p>
          <p>• Designed to create conflict and prevent unity</p>
          <p>• <a href="https://www.bbc.com/news/world-africa-47115384" target="_blank">BBC - How colonial borders affect Africa today</a></p>
          
          <p><strong>Middle East - Sykes-Picot Agreement (1916)</strong></p>
          <p>• Britain and France divided Ottoman territories</p>
          <p>• Iraq, Syria, Lebanon, Jordan created artificially</p>
          <p>• Israel creation displaced Palestinians (1948)</p>
          <p>• Ongoing conflicts result from colonial borders</p>
          <p>• <a href="https://www.bbc.com/news/world-middle-east-36300224" target="_blank">BBC - Sykes-Picot 100 years later</a></p>
          <p>• <a href="https://www.reuters.com/world/middle-east/" target="_blank">Reuters - how US and Israel forment the unrest in the Arabs and middle East</a></p>
          
          <p><strong>India-Pakistan Partition (1947)</strong></p>
          <p>• Hastily drawn border by British lawyer (Cyril Radcliffe)</p>
          <p>• 2 million killed in communal violence</p>
          <p>• 15 million displaced</p>
          <p>• Kashmir conflict continues today</p>
          <p>• "Divide and rule" succeeded in preventing unity</p>
        </div>
        
        <h2>🏭 Resource Theft Statistics</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>Africa to West</h3>
            <p>• <strong>$192 billion/year</strong> flows OUT of Africa</p>
            <p>• Only $134 billion flows IN (aid, investment)</p>
            <p>• <strong>Net loss: $58 billion/year</strong></p>
            <p>• Tax evasion by corporations: $30 billion/year</p>
            <p>• Debt payments: $18 billion/year</p>
            <p><strong>Source:</strong> <a href="https://www.globaljustice.org.uk/resources/honest-accounts-2017-how-world-profits-africas-wealth" target="_blank">Global Justice Now report</a></p>
          </div>
          
          <div class="link-card">
            <h3>Latin America Plunder</h3>
            <p>• <strong>$420 billion</strong> stolen since 1980 (capital flight)</p>
            <p>• United Fruit (now Chiquita) land theft</p>
            <p>• Mining companies pay <5% royalties</p>
            <p>• Oil companies in Venezuela, Ecuador</p>
            <p>• Environmental destruction unpaid</p>
            <p><strong>Source:</strong> <a href="https://www.cepal.org/en" target="_blank">ECLAC - Economic data</a></p>
          </div>
          
          <div class="link-card">
            <h3>Asia Exploitation</h3>
            <p>• Sweatshop wages: $1-3/day</p>
            <p>• Product sells in West for 100x cost</p>
            <p>• Bangladesh garment workers: 4,000 dead since 1990</p>
            <p>• Apple suppliers: worker suicides at Foxconn</p>
            <p>• Nike: $0.20/hour wages, sells shoes for $100+</p>
            <p><strong>Source:</strong> <a href="https://cleanclothes.org/" target="_blank">Clean Clothes Campaign</a></p>
          </div>
        </div>
        
        <h2>📚 Essential Reading</h2>
        <div class="message-box">
          <h3>Books Exposing Neo-Colonialism</h3>
          <p>• <strong>"How Europe Underdeveloped Africa"</strong> by Walter Rodney</p>
          <p>• <strong>"The Divide"</strong> by Jason Hickel</p>
          <p>• <strong>"Confessions of an Economic Hit Man"</strong> by John Perkins</p>
          <p>• <strong>"The Shock Doctrine"</strong> by Naomi Klein</p>
          <p>• <strong>"Open Veins of Latin America"</strong> by Eduardo Galeano</p>
          <p>• <strong>"The Wretched of the Earth"</strong> by Frantz Fanon</p>
          <p>• <strong>"Discourse on Colonialism"</strong> by Aimé Césaire</p>
        </div>
        
        <h2>🔍 Research Organizations</h2>
        <div class="link-grid">
          <div class="link-card">
            <h3>Global Justice</h3>
            <p>• <a href="https://www.globaljustice.org.uk/" target="_blank">Global Justice Now</a></p>
            <p>• <a href="https://www.cadtm.org/spip.php?page=sommaire&lang=en" target="_blank">CADTM (Debt abolition)</a></p>
            <p>• <a href="https://jubileedebt.org.uk/" target="_blank">Jubilee Debt Campaign</a></p>
          </div>
          
          <div class="link-card">
            <h3>Corporate Accountability</h3>
            <p>• <a href="https://www.corpwatch.org/" target="_blank">CorpWatch</a></p>
            <p>• <a href="https://www.business-humanrights.org/" target="_blank">Business & Human Rights</a></p>
            <p>• <a href="https://www.foei.org/" target="_blank">Friends of the Earth International</a></p>
          </div>
          
          <div class="link-card">
            <h3>Data & Research</h3>
            <p>• <a href="https://data.worldbank.org/" target="_blank">World Bank Data</a></p>
            <p>• <a href="https://www.un.org/development/desa/en/" target="_blank">UN Development Data</a></p>
            <p>• <a href="https://www.oxfam.org/en/research" target="_blank">Oxfam Research</a></p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>💡 Key Takeaways</h3>
          <p><strong>Colonialism never ended - it evolved:</strong></p>
          <p>1. <strong>Overt military control</strong> → Economic control through debt</p>
          <p>2. <strong>Direct resource theft</strong> → Corporate "legal" extraction</p>
          <p>3. <strong>Colonial governors</strong> → IMF/World Bank conditions</p>
          <p>4. <strong>Explicit racism</strong> → "Development" and "modernization" rhetoric</p>
          <p>5. <strong>European empires</strong> → US-led Western dominance</p>
          <p><br><strong>The result:</strong> Global South remains poor while enriching the West</p>
        </div>
        
        <br>
        <a href="/history" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to History</a>
      </div>
    </body>
    </html>
  `);
});

// BANKING & FINANCE CONTROL PAGE
app.get('/history/banking', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Banking & Finance Control</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🏦 Banking & Finance Control - The Hidden Power</h1>
        <p>How central banks, private bankers, and the financial system control nations.</p>
        
        <div class="https-info">
          <h3>⚠️ "Give me control of a nation's money, and I care not who makes its laws"</h3>
          <p>- Mayer Amschel Rothschild (founder of Rothschild banking dynasty)</p>
        </div>
        
        <h2>🏛️ The Federal Reserve (1913) - A Private Bank</h2>
        
        <div class="message-box">
          <h3>Creation & Deception</h3>
          
          <p><strong>Jekyll Island Meeting (1910)</strong></p>
          <p>• Secret meeting of 7 men representing 1/4 of world's wealth</p>
          <p>• J.P. Morgan, Rockefeller, Rothschild agents</p>
          <p>• Drafted Federal Reserve Act in secret</p>
          <p>• Passed Congress on December 23, 1913 (most members gone for holiday)</p>
          <p>• President Woodrow Wilson signed it (later regretted)</p>
          
          <p><strong>The Deception:</strong></p>
          <p>• Name "Federal Reserve" implies government control</p>
          <p>• <strong>It is NOT federal</strong> - it's a private corporation</p>
          <p>• <strong>It has no reserves</strong> - it creates money from nothing</p>
          <p>• Owned by private banks (shareholders secret until 2011)</p>
          <p>• Never been audited by government</p>
          
          <p><strong>Evidence:</strong></p>
          <p>• <a href="https://www.federalreserve.gov/aboutthefed/section7.htm" target="_blank">Federal Reserve Act - Section 7</a></p>
          <p>• <a href="https://archive.org/details/church-state-g-edward-griffin-the-creature-from-jekyll-island_202301/page/n9/mode/2up" target="_blank">Church & State G Edward Griffin The Creature From Jekyll Island</a></p>
          <p>• <a href="https://archive.org/details/secretsoffederal00mull/page/n11/mode/2up" target="_blank">Secrets of the Federal Reserve : the London Connection</a></p>
          <p>• <a href="https://www.tacticalreport.com/daily/62809-saudi-mbs-on-the-petrodollar-agreement-with-us" target="_blank">TackticalReport- Saudi MBS on the petrodollar agreement with U.S.</a></p>
        </div>
        
        <div class="message-box">
          <h3>How the Fed Creates Money (Debt-Based Currency)</h3>
          
          <p><strong>The Scam Explained:</strong></p>
          <p>1. US Government needs money</p>
          <p>2. Government prints Treasury Bonds (IOUs)</p>
          <p>3. Federal Reserve "buys" bonds by creating money electronically</p>
          <p>4. Money enters circulation with INTEREST owed</p>
          <p>5. More money owed than exists (impossible to repay)</p>
          <p>6. Government taxes citizens to pay interest to private bankers</p>
          <p>7. National debt grows forever (now $34 trillion)</p>
          
          <p><strong>The Trap:</strong></p>
          <p>• If US Government simply printed its own money (no debt)</p>
          <p>• No national debt, no interest payments to bankers</p>
          <p>• This is what Lincoln did (Greenbacks) - assassinated shortly after</p>
          <p>• This is what JFK tried (Executive Order 11110) - assassinated</p>
          <p>• This is what Libya's Gaddafi did (gold dinar) - overthrown and killed</p>
          
          <p><strong>Video Explanation:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=iFDe5kUUyT0" target="_blank">"Money as Debt" - Animated documentary</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=mII9NZ8MMVM" target="_blank">"The Biggest Scam In The History Of Mankind"</a></p>
        </div>
        
        <h2>🌍 Bank for International Settlements (BIS)</h2>
        
        <div class="message-box">
          <h3>The Central Bank of Central Banks</h3>
            <p><strong>Founded:</strong> 1930, Basel, Switzerland</p>
            <p><strong>Purpose:</strong> Coordinate world's central banks</p>
            <p><strong>Power:</strong> Above all governments, immune from prosecution</p>
            <p><strong>Members:</strong> 63 central banks representing 95% of world GDP</p>
            <p><strong>Immunity & Secrecy:</strong></p>
      <p>• Cannot be prosecuted by any government</p>
      <p>• Cannot be raided, assets cannot be seized</p>
      <p>• Staff have diplomatic immunity</p>
      <p>• No taxes paid</p>
      <p>• Meetings are secret</p>
      <p>• Sets global banking regulations (Basel Accords)</p>
      
      <p><strong>Historical Note:</strong></p>
      <p>• Helped Nazi Germany launder gold during WWII</p>
      <p>• American and British directors stayed on board during war</p>
      <p>• Continued operating throughout WWII</p>
      
      <p><strong>Sources:</strong></p>
      <p>• "Tower of Basel" by Adam LeBor</p>
      <p>• <a href="https://archive.org/details/towerofbaselshad0000lebo" target="_blank">Tower of Basel : the shadowy history of the secret bank that runs the world</a></p>
      <p>• <a href="https://www.bis.org/" target="_blank">BIS official website</a></p>
      <p>• <a href="https://www.nytimes.com/1997/08/05/opinion/the-bank-that-rules-the-world.html" target="_blank">NYT - The Bank That Rules the World</a></p>
      <p>• <a href="https://www.forex-central.net/video-goldman-sachs-documentary.php" target="_blank">Goldman Sachs - The Bank That Rules the World</a></p>
      <p>• <a href="https://www.youtube.com/watch?v=J5Npf2xJpag" target="_blank">Goldman Sachs - The Bank That Rules the World | 2023 Documentary</a></p>
    </div>
    
    <h2>👑 Banking Dynasties</h2>
    
    <div class="link-grid">
      <div class="link-card">
        <h3>Rothschild Family</h3>
        <p><strong>Founded:</strong> 1760s, Frankfurt</p>
        <p><strong>Strategy:</strong> Five sons sent to 5 European capitals</p>
        <p><strong>Method:</strong> Finance both sides of wars</p>
        <p><strong>Estimated wealth:</strong> $2+ trillion (family combined)</p>
        
        <p><strong>Historical Facts:</strong></p>
        <p>• Financed British Empire expansion</p>
        <p>• Funded Napoleon AND his enemies</p>
        <p>• Created Israel (Balfour Declaration to Lord Rothschild)</p>
        <p>• Control central banks worldwide</p>
        <p>• Own Bank of England</p>
        
        <p><strong>Research:</strong></p>
        <p>• "The Rothschilds: A Family Portrait" by Frederic Morton</p>
        <p>• <a href="https://www.rothschildandco.com/en/" target="_blank">Rothschild & Co - Official history</a></p>
      </div>
      
      <div class="link-card">
        <h3>Rockefeller Family</h3>
        <p><strong>Founded:</strong> John D. Rockefeller (Standard Oil)</p>
        <p><strong>Wealth:</strong> $1.4 billion in 1937 ($340 billion today)</p>
        <p><strong>Control:</strong> Banking, oil, pharmaceuticals, media</p>
        
        <p><strong>Key Holdings:</strong></p>
        <p>• Chase Manhattan Bank (now JPMorgan Chase)</p>
        <p>• ExxonMobil, Chevron (from Standard Oil breakup)</p>
        <p>• Council on Foreign Relations (CFR) - founded by Rockefeller</p>
        <p>• Trilateral Commission</p>
        <p>• Major influence over Federal Reserve</p>
        
        <p><strong>Quote:</strong></p>
        <p><em>"We are grateful to the Washington Post, NY Times, Time Magazine and other great publications whose directors have attended our meetings and respected their promises of discretion for almost forty years... It would have been impossible for us to develop our plan for the world if we had been subject to the bright lights of publicity during those years."</em></p>
        <p>- David Rockefeller, 1991 Bilderberg meeting</p>
      </div>
      
      <div class="link-card">
        <h3>Morgan Family</h3>
        <p><strong>J.P. Morgan</strong> - Most powerful banker in US history</p>
        <p><strong>Role:</strong> Created Federal Reserve system</p>
        <p><strong>Power:</strong> Bailed out US Government (1895, 1907)</p>
        
        <p><strong>Revelations:</strong></p>
        <p>• Was agent for Rothschild interests in America</p>
        <p>• Most of "his" wealth actually belonged to Rothschilds</p>
        <p>• Discovered after his death (1913)</p>
        <p>• His bank: JPMorgan Chase (now largest US bank)</p>
        
        <p><strong>Titanic Connection:</strong></p>
        <p>• Owned White Star Line (Titanic's company)</p>
        <p>• Canceled his Titanic voyage at last minute</p>
        <p>• 3 opponents of Federal Reserve died on Titanic</p>
        <p>• Fed created months after Titanic sinking</p>
      </div>
    </div>
    
    <h2>💀 Leaders Who Opposed Private Banking - All Killed</h2>
    
    <div class="message-box">
      <h3>Pattern of Assassination</h3>
      
      <p><strong>Abraham Lincoln (1865)</strong></p>
      <p>• Refused Rothschild loans at 24-36% interest for Civil War</p>
      <p>• Printed government money ("Greenbacks") - no debt</p>
      <p>• Assassinated shortly after war ended</p>
      <p>• Greenbacks immediately removed from circulation</p>
      
      <p><strong>James Garfield (1881)</strong></p>
      <p>• President for only 4 months</p>
      <p>• Spoke against banking power</p>
      <p>• Quote: "Whoever controls the volume of money in any country is absolute master of all industry and commerce"</p>
      <p>• Assassinated within weeks of quote</p>
      
      <p><strong>John F. Kennedy (1963)</strong></p>
      <p>• Executive Order 11110 (June 4, 1963)</p>
      <p>• Authorized US Treasury to issue silver certificates</p>
      <p>• Bypassed Federal Reserve</p>
      <p>• $4.3 billion issued</p>
      <p>• Assassinated November 22, 1963</p>
      <p>• LBJ reversed order immediately</p>
      <p>• <a href="https://www.presidency.ucsb.edu/documents/executive-order-11110-amendment-executive-order-no-10289-amended-relating-the-performance" target="_blank">EO 11110 - Official text</a></p>
      
      <p><strong>Muammar Gaddafi (2011)</strong></p>
      <p>• Proposed gold-backed African currency (gold dinar)</p>
      <p>• Would end African dependence on dollar</p>
      <p>• Would end French CFA Franc domination</p>
      <p>• NATO intervention (Hillary Clinton: "We came, we saw, he died")</p>
      <p>• Libya destroyed, gold reserves stolen</p>
      <p>• <a href="https://www.foreignpolicyjournal.com/2016/01/06/new-hillary-emails-reveal-true-motive-for-libya-intervention/" target="_blank">Hillary emails reveal Libya invasion motive</a></p>
    </div>
    
    <h2>🌐 Global Banking Control Today</h2>
    
    <div class="link-grid">
      <div class="link-card">
        <h3>Countries WITHOUT Rothschild Central Bank</h3>
        <p><strong>Before 2000:</strong></p>
        <p>• Afghanistan, Iraq, Libya, Sudan, North Korea, Iran, Syria, Cuba</p>
        
        <p><strong>After US "interventions":</strong></p>
        <p>• Afghanistan - invaded 2001 (central bank created)</p>
        <p>• Iraq - invaded 2003 (central bank created)</p>
        <p>• Libya - destroyed 2011 (central bank created)</p>
        <p>• Sudan - split 2011 (central bank created)</p>
        
        <p><strong>Remaining (2024):</strong></p>
        <p>• Iran, Syria, North Korea, Cuba</p>
        <p>• All labeled "enemies" by US</p>
        <p>• All face sanctions</p>
        <p>• All targets of regime change</p>
      </div>
      
      <div class="link-card">
        <h3>SWIFT System Control</h3>
        <p><strong>Society for Worldwide Interbank Financial Telecommunication</strong></p>
        <p>• Controls international money transfers</p>
        <p>• Based in Belgium, controlled by US/EU</p>
        <p>• Used as weapon (sanctions)</p>
        <p>• Russia cut off (2022) → led to BRICS alternative</p>
        <p>• Iran, North Korea excluded</p>
        <p>• Any country can be cut off instantly</p>
        <p>• <a href="https://www.swift.com/" target="_blank">SWIFT official site</a></p>
      </div>
      
      <div class="link-card">
        <h3>Petrodollar System</h3>
        <p><strong>1974 - US-Saudi Deal</strong></p>
        <p>• Oil only sold in US dollars</p>
        <p>• Creates artificial dollar demand</p>
        <p>• US can print infinite dollars</p>
        <p>• Countries need dollars to buy oil</p>
        <p>• Countries overthrown for challenging this:</p>
        <p>&nbsp;&nbsp;- Iraq (2003) - switched to euros</p>
        <p>&nbsp;&nbsp;- Libya (2011) - proposed gold dinar</p>
        <p>&nbsp;&nbsp;- Syria, Iran - reject petrodollar</p>
        <p>• <a href="https://www.bloomberg.com/news/articles/2016-04-01/the-untold-story-behind-saudi-arabia-s-41-year-u-s-debt-secret" target="_blank">Bloomberg - Petrodollar secret deal</a></p>
      </div>
    </div>
    
    <h2>📚 Essential Reading & Resources</h2>
    
    <div class="message-box">
      <h3>Books</h3>
      <p>• <strong>"The Creature from Jekyll Island"</strong> by G. Edward Griffin</p>
      <p>• <strong>"Secrets of the Federal Reserve"</strong> by Eustace Mullins</p>
      <p>• <strong>"A History of Central Banking"</strong> by Stephen Goodson</p>
      <p>• <strong>"The Money Masters"</strong> (documentary - 3.5 hours)</p>
      <p>• <strong>"Web of Debt"</strong> by Ellen Hodgson Brown</p>
      <p>• <strong>"Tower of Basel"</strong> by Adam LeBor</p>
      <p>• <strong>"The Ascent of Money"</strong> by Niall Ferguson</p>
      
      <h3>Documentaries</h3>
      <p>• <a href="https://www.youtube.com/watch?v=5IJeemTQ7Vk" target="_blank">"The Money Masters" (1996)</a></p>
      <p>• <a href="https://www.youtube.com/watch?v=iFDe5kUUyT0" target="_blank">"Money as Debt" (2006)</a></p>
      <p>• <a href="https://www.youtube.com/watch?v=mII9NZ8MMVM" target="_blank">"The Biggest Scam in History"</a></p>
      <p>• <a href="https://www.youtube.com/watch?v=L29McL7LVhE" target="_blank">"All Wars Are Bankers' Wars"</a></p>
    </div>
    
    <div class="https-info">
      <h3>💡 Key Understanding</h3>
      <p><strong>Money is created as DEBT:</strong></p>
      <p>• Every dollar is loaned into existence</p>
      <p>• Interest is owed on all money</p>
      <p>• More money owed than exists</p>
      <p>• System requires perpetual growth (impossible)</p>
      <p>• Economic crashes are BUILT IN by design</p>
      <p>• Bankers own everything after each crash</p>
      <p><br><strong>Solution:</strong> Government-issued, debt-free currency (like Lincoln's Greenbacks)</p>
      <p><strong>Why it won't happen:</strong> Anyone who tries gets killed</p>
    </div>
    
    <br>
    <a href="/history" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to History</a>
  </div>
</body>
</html>
`);
});

// Add this route to your server.js after the banking section

app.get('/history/ruling-families', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ruling Families & Dynasties</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>👑 Ruling Families & Dynasties - The Hidden Aristocracy</h1>
        <p>Banking dynasties, royal families, and corporate oligarchs who wield real power behind political scenes.</p>
        
        <div class="https-info">
          <h3>🔍 "The aristocracy of our moneyed corporations... dare not to defy them."</h3>
          <p>- President Grover Cleveland, 1888</p>
        </div>
        
        <h2>🏦 Banking Dynasties</h2>
        
        <div class="message-box">
          <h3>The Rothschild Family - $2+ Trillion (Estimated)</h3>
          <p><strong>Founded:</strong> 1760s, Frankfurt by Mayer Amschel Rothschild</p>
          <p><strong>Strategy:</strong> Five sons established in 5 European capitals</p>
          <p><strong>Power Base:</strong> Central banking, gold, government bonds</p>
          
          <p><strong>Key Holdings & Influence:</strong></p>
          <p>• Bank of England (founding shareholders)</p>
          <p>• Federal Reserve (major influence)</p>
          <p>• European Central Banks</p>
          <p>• De Beers diamonds (historical control)</p>
          <p>• Rio Tinto mining (historical influence)</p>
          
          <p><strong>Historical Events:</strong></p>
          <p>• Funded both sides of Napoleonic Wars</p>
          <p>• Financed British Empire expansion</p>
          <p>• Balfour Declaration addressed to Lord Rothschild</p>
          <p>• Austrian-Hungarian Empire financing</p>
          
          <p><strong>Modern Operations:</strong></p>
          <p>• Rothschild & Co (investment banking)</p>
          <p>• Edmond de Rothschild Group</p>
          <p>• RIT Capital Partners (Jacob Rothschild)</p>
          <p>• Major art collectors (largest private collection)</p>
          
          <p><strong>Research Resources:</strong></p>
          <p>• <a href="https://www.rothschildandco.com/en/our-history/" target="_blank">Rothschild & Co Official History</a></p>
          <p>• "The House of Rothschild" by Niall Ferguson</p>
          <p>• <a href="https://www.bloomberg.com/news/articles/2015-03-26/rothschild-scion-builds-3-billion-fortune-outside-dynasty" target="_blank">Bloomberg - Rothschild Wealth</a></p>
        </div>
        
        <div class="message-box">
          <h3>The Rockefeller Family - $340 Billion+ (Peak)</h3>
          <p><strong>Origin:</strong> John D. Rockefeller (Standard Oil monopoly)</p>
          <p><strong>Peak Wealth:</strong> $1.4 billion in 1937 = $340+ billion today</p>
          <p><strong>Modern Fortune:</strong> Estimated $8-10 billion (publicly known)</p>
          
          <p><strong>Key Holdings & Foundations:</strong></p>
          <p>• Rockefeller Foundation ($6.3 billion endowment)</p>
          <p>• Rockefeller University</p>
          <p>• Chase Manhattan Bank (now JPMorgan Chase)</p>
          <p>• ExxonMobil, Chevron (Standard Oil descendants)</p>
          <p>• Major real estate (Rockefeller Center)</p>
          
          <p><strong>Political Influence:</strong></p>
          <p>• Council on Foreign Relations (founded by Rockefeller)</p>
          <p>• Trilateral Commission (founding member)</p>
          <p>• Bilderberg Group (regular participants)</p>
          <p>• UN headquarters land donation</p>
          
          <p><strong>Philanthropic Control:</strong></p>
          <p>• Medical research funding</p>
          <p>• Education system influence</p>
          <p>• Population control programs</p>
          <p>• Green Revolution agriculture</p>
          
          <p><strong>Famous Quote:</strong></p>
          <p><em>"We are grateful to the Washington Post, the New York Times, Time Magazine and other great publications whose directors have attended our meetings and respected their promises of discretion for almost forty years. It would have been impossible for us to develop our plan for the world if we had been subject to the bright lights of publicity during those years."</em></p>
          <p>- David Rockefeller, 1991 Bilderberg meeting</p>
        </div>
        
        <h2>👥 Other Powerful Families</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>Morgan Family</h3>
            <p>• J.P. Morgan (Rothschild agent in America)</p>
            <p>• JPMorgan Chase (largest US bank)</p>
            <p>• Titanic connection (opponents of Fed died)</p>
            <p>• Federal Reserve creation</p>
          </div>
          
          <div class="link-card">
            <h3>Warburg Family</h3>
            <p>• Paul Warburg (Fed architect)</p>
            <p>• Max Warburg (German intelligence WWI)</p>
            <p>• Kuhn, Loeb & Co investment bank</p>
            <p>• Federal Reserve Board members</p>
          </div>
          
          <div class="link-card">
            <h3>Schiff Family</h3>
            <p>• Jacob Schiff financed Japanese-Russian War</p>
            <p>• Financed Bolshevik Revolution</p>
            <p>• Kuhn, Loeb & Co partners</p>
            <p>• Anti-Czarist activities</p>
          </div>
        </div>
        
        <h2>👑 European Royal Families Still in Power</h2>
        
        <div class="message-box">
          <h3>British Royal Family - $28+ Billion</h3>
          <p><strong>Wealth Sources:</strong></p>
          <p>• Crown Estate ($19.5 billion portfolio)</p>
          <p>• Duchy of Lancaster ($1 billion)</p>
          <p>• Duchy of Cornwall ($1.3 billion)</p>
          <p>• Art collection (priceless)</p>
          <p>• Jewel collection ($4+ billion)</p>
          
          <p><strong>Hidden Power:</strong></p>
          <p>• 1/6 of Earth's land surface (historical)</p>
          <p>• Commonwealth of Nations (54 countries)</p>
          <p>• City of London Corporation (separate sovereignty)</p>
          <p>• Crown dependencies (tax havens)</p>
        </div>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>Saudi Royal Family</h3>
            <p>• 15,000+ princes</p>
            <p>• $1.4 trillion wealth (family)</p>
            <p>• Oil control (16% world reserves)</p>
            <p>• Petrodollar system</p>
          </div>
          
          <div class="link-card">
            <h3>Dutch Royal Family</h3>
            <p>• House of Orange-Nassau</p>
            <p>• Dutch East India Company legacy</p>
            <p>• Shell Oil founding</p>
            <p>• Unilever control</p>
          </div>
          
          <div class="link-card">
            <h3>Vatican/Black Nobility</h3>
            <p>• Oldest continuous institution</p>
            <p>• $10-15 billion wealth</p>
            <p>• 5,000+ years of art/treasure</p>
            <p>• Global diplomatic network</p>
          </div>
        </div>
        
        <h2>💼 Modern Corporate Dynasties</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>Walton Family (Walmart)</h3>
            <p>• $250+ billion wealth</p>
            <p>• Richest family in world</p>
            <p>• Walmart: $600+ billion revenue</p>
            <p>• Political influence through donations</p>
          </div>
          
          <div class="link-card">
            <h3>Mars Family (Candy)</h3>
            <p>• $160+ billion wealth</p>
            <p>• Mars Inc: $45 billion revenue</p>
            <p>• Pet care monopoly</p>
            <p>• Secretive family</p>
          </div>
          
          <div class="link-card">
            <h3>Koch Family (Oil)</h3>
            <p>• $120+ billion wealth</p>
            <p>• Koch Industries: $125 billion revenue</p>
            <p>• Americans for Prosperity</p>
            <p>• Political network funding</p>
          </div>
        </div>
        
        <h2>🔍 Intermarriage & Alliance Patterns</h2>
        
        <div class="message-box">
          <h3>Historical Intermarriages</h3>
          <p><strong>Banking Families:</strong></p>
          <p>• Rothschild-Warburg marriages</p>
          <p>• Schiff-Warburg connections</p>
          <p>• Rockefeller-Percy (British aristocracy)</p>
          <p>• Morgan-European nobility</p>
          
          <p><strong>Business-Political Marriages:</strong></p>
          <p>• Kennedy family (banking-political)</p>
          <p>• Bush family (banking-oil-political)</p>
          <p>• Clinton family (political-legal)</p>
          <p>• Gates family (tech-philanthropy)</p>
          
          <p><strong>Modern Tech Dynasties:</strong></p>
          <p>• Bezos (Amazon monopoly)</p>
          <p>• Musk (Tesla, SpaceX, Twitter)</p>
          <p>• Zuckerberg (Facebook/Meta)</p>
          <p>• Page/Brin (Google/Alphabet)</p>
        </div>
        
        <h2>📚 Research Resources</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>Books</h3>
            <p>• "Tragedy and Hope" by Carroll Quigley</p>
            <p>• "The House of Rothschild" by Niall Ferguson</p>
            <p>• "The Rockefeller Files" by Gary Allen</p>
            <p>• "Bloodlines of the Illuminati" by Fritz Springmeier</p>
          </div>
          
          <div class="link-card">
            <h3>Documentaries</h3>
            <p>• <a href="https://www.youtube.com/watch?v=U1Qt6a-vaNM" target="_blank">"The Rothschild Dynasty"</a></p>
            <p>• <a href="https://www.youtube.com/watch?v=d8XWEV-sKX8" target="_blank">"The Rockefeller Family"</a></p>
            <p>• <a href="https://www.youtube.com/watch?v=54adG6VY5lM" target="_blank">"The World's Richest Families"</a></p>
          </div>
          
          <div class="link-card">
            <h3>Data Sources</h3>
            <p>• <a href="https://www.forbes.com/wealth/families/" target="_blank">Forbes World's Richest Families</a></p>
            <p>• <a href="https://www.bloomberg.com/billionaires/" target="_blank">Bloomberg Billionaires Index</a></p>
            <p>• <a href="https://www.openscrets.org/" target="_blank">OpenSecrets - Money in Politics</a></p>
          </div>
        </div>
        
        <div class="https-info">
          <h3>🎯 Key Understanding</h3>
          <p><strong>Family dynasties maintain power through:</strong></p>
          <p>1. <strong>Intergenerational wealth transfer</strong> (trust funds, tax avoidance)</p>
          <p>2. <strong>Strategic marriages</strong> (consolidating power blocks)</p>
          <p>3. <strong>Philanthropic foundations</strong> (tax-free influence vehicles)</p>
          <p>4. <strong>Educational institutions</strong> (grooming next generations)</p>
          <p>5. <strong>Think tanks and NGOs</strong> (policy influence without accountability)</p>
          <p><br><strong>Result:</strong> While 99% focus on political theater, real power remains in hands of ~100-200 families worldwide.</p>
        </div>
        
        <br>
        <a href="/history" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to History</a>
      </div>
    </body>
    </html>
  `);
});

// ===== INTELLIGENCE AGENCIES PAGE =====
app.get('/history/intelligence', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Intelligence Agencies - Covert Operations</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        ${navigation}
        <h1>🕵️ Intelligence Agencies - The Deep State's Hidden Hand</h1>
        <p>Covert operations, mind control programs, false flags, and the secret history of intelligence agencies.</p>
        
        <div class="https-info">
          <h3>🔍 "The CIA owns everyone of any significance in the major media."</h3>
          <p>- William Colby, former CIA Director</p>
        </div>
        
        <h2>🇺🇸 Central Intelligence Agency (CIA) - Founded 1947</h2>
        
        <div class="message-box">
          <h3>Documented Covert Operations</h3>
          
          <p><strong>Regime Change Operations:</strong></p>
          <p>• 1953 Iran (Operation Ajax) - Overthrew Mosaddegh</p>
          <p>• 1954 Guatemala (Operation PBSuccess) - Overthrew Árbenz</p>
          <p>• 1961 Cuba (Bay of Pigs) - Failed invasion</p>
          <p>• 1973 Chile (Project FUBELT) - Overthrew Allende</p>
          <p>• 1979 Afghanistan (Operation Cyclone) - Created Mujahideen</p>
          <p>• 1980s Nicaragua (Contras) - Illegal funding</p>
          
          <p><strong>Assassination Programs:</strong></p>
          <p>• ZR/RIFLE (Castro assassination attempts)</p>
          <p>• Phoenix Program (Vietnam, 26,000+ killed)</p>
          <p>• Targeted drone strikes (post-9/11)</p>
          
          <p><strong>Evidence Sources:</strong></p>
          <p>• <a href="https://nsarchive2.gwu.edu/NSAEBB/NSAEBB435/" target="_blank">National Security Archive - Iran Coup</a></p>
          <p>• <a href="https://www.cia.gov/readingroom/document/0000134974" target="_blank">CIA Guatemala Documents</a></p>
          <p>• Church Committee Reports (1975-76)</p>
          <p>• <a href="https://www.archives.gov/research/jfk/select-committee-report" target="_blank">JFK Assassination Records</a></p>
        </div>
        
        <div class="message-box">
          <h3>MKUltra & Mind Control Programs</h3>
          
          <p><strong>Project MKUltra (1953-1973):</strong></p>
          <p>• CIA's mind control research program</p>
          <p>• LSD testing on unwitting subjects</p>
          <p>• Hypnosis, sensory deprivation, torture</p>
          <p>• Destroyed most records in 1973</p>
          
          <p><strong>Subprojects:</strong></p>
          <p>• Operation Midnight Climax (prostitutes, LSD)</p>
          <p>• Project Artichoke (torture, interrogation)</p>
          <p>• Project Bluebird (mind control)</p>
          <p>• Subproject 68 (LSD on mental patients)</p>
          
          <p><strong>Victims & Whistleblowers:</strong></p>
          <p>• Frank Olson (scientist, suicide/murder)</p>
          <p>• Whitey Bulger (prisoner experiments)</p>
          <p>• Thousands of unwitting subjects</p>
          
          <p><strong>Declassified Evidence:</strong></p>
          <p>• <a href="https://www.cia.gov/readingroom/collection/mkultra" target="_blank">CIA MKUltra Documents</a></p>
          <p>• <a href="https://www.nytimes.com/1977/08/03/archives/cia-data-about-drug-tests-on-humans-stolen-files-show.html" target="_blank">NYT 1977 MKUltra Exposure</a></p>
          <p>• Church Committee Hearings</p>
        </div>
        
        <h2>🇬🇧 MI6 & 🇮🇱 Mossad Operations</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>MI6 (British Secret Intelligence)</h3>
            <p><strong>Historical Operations:</strong></p>
            <p>• Sykes-Picot Agreement (1916)</p>
            <p>• Balfour Declaration (1917)</p>
            <p>• Iranian Coup (1953, with CIA)</p>
            <p>• Libyan intervention (2011)</p>
            <p>• Syrian conflict involvement</p>
            
            <p><strong>Notorious Agents:</strong></p>
            <p>• Kim Philby (Soviet double agent)</p>
            <p>• T.E. Lawrence (Lawrence of Arabia)</p>
            <p>• Daphne Park (Africa operations)</p>
          </div>
          
          <div class="link-card">
            <h3>Mossad (Israeli Intelligence)</h3>
            <p><strong>Assassinations:</strong></p>
            <p>• Munich Olympics perpetrators</p>
            <p>• Nuclear scientists (Iran, Iraq)</p>
            <p>• Hamas leaders</p>
            
            <p><strong>Covert Actions:</strong></p>
            <p>• Operation Entebbe (1976)</p>
            <p>• Stuxnet virus (Iran nuclear)</p>
            <p>• Iranian nuclear sabotage</p>
            
            <p><strong>Controversies:</strong></p>
            <p>• Lavon Affair (1954 false flag)</p>
            <p>• USS Liberty attack (1967)</p>
            <p>• Dubai assassination (2010)</p>
          </div>
        </div>
        
        <h2>🏠 Domestic Surveillance Programs</h2>
        
        <div class="message-box">
          <h3>COINTELPRO (1956-1971)</h3>
          <p><strong>FBI domestic surveillance program</strong></p>
          
          <p><strong>Targeted Groups:</strong></p>
          <p>• Civil Rights Movement (MLK, Malcolm X)</p>
          <p>• Black Panthers</p>
          <p>• American Indian Movement</p>
          <p>• Anti-war activists</p>
          <p>• Feminist organizations</p>
          <p>• Communist Party USA</p>
          
          <p><strong>Methods Used:</strong></p>
          <p>• Infiltration and provocation</p>
          <p>• Psychological warfare</p>
          <p>• Illegal surveillance</p>
          <p>• Fabrication of evidence</p>
          <p>• Assassination of leaders</p>
          
          <p><strong>Exposed by:</strong></p>
          <p>• Citizens' Commission to Investigate FBI</p>
          <p>• Media leaks (1971)</p>
          <p>• Church Committee (1975)</p>
          
          <p><strong>Documents:</strong></p>
          <p>• <a href="https://vault.fbi.gov/cointel-pro" target="_blank">FBI COINTELPRO Files</a></p>
          <p>• Church Committee Final Report</p>
        </div>
        
        <div class="message-box">
          <h3>Operation Mockingbird (1948-1976+)</h3>
          <p><strong>CIA media control program</strong></p>
          
          <p><strong>Methodology:</strong></p>
          <p>• Recruiting journalists as assets</p>
          <p>• Owning media outlets outright</p>
          <p>• Placing agents in newsrooms</p>
          <p>• Controlling publishing houses</p>
          
          <p><strong>Confirmed Outlets:</strong></p>
          <p>• The New York Times</p>
          <p>• The Washington Post</p>
          <p>• Time Magazine</p>
          <p>• CBS News</p>
          <p>• Associated Press</p>
          <p>• United Press International</p>
          
          <p><strong>Whistleblower Testimony:</strong></p>
          <p>• Carl Bernstein (1977 Rolling Stone article)</p>
          <p>• Deborah Davis ("Katharine the Great")</p>
          <p>• Former CIA officers' confessions</p>
        </div>
        
        <h2>🛰️ Modern Surveillance State</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>PRISM (NSA Program)</h3>
            <p>• Direct access to tech company servers</p>
            <p>• Google, Facebook, Apple, Microsoft</p>
            <p>• Exposed by Edward Snowden (2013)</p>
            <p>• <a href="https://www.theguardian.com/world/prism" target="_blank">Guardian PRISM Coverage</a></p>
          </div>
          
          <div class="link-card">
            <h3>XKeyscore (NSA)</h3>
            <p>• "Collects nearly everything"</p>
            <p>• Email, browsing history, searches</p>
            <p>• Real-time data collection</p>
            <p>• Global surveillance network</p>
          </div>
          
          <div class="link-card">
            <h3>ECHELON (Five Eyes)</h3>
            <p>• US, UK, Canada, Australia, NZ</p>
            <p>• Global communications interception</p>
            <p>• Satellite and cable tapping</p>
            <p>• Since Cold War era</p>
          </div>
        </div>
        
        <h2>📚 Whistleblowers & Investigators</h2>
        
        <div class="link-grid">
          <div class="link-card">
            <h3>Edward Snowden</h3>
            <p>• Former NSA contractor</p>
            <p>• Exposed PRISM, XKeyscore</p>
            <p>• Currently in Russia</p>
            <p>• <a href="https://www.theguardian.com/us-news/ng-interactive/2021/sep/21/edward-snowden-interview-permanent-record" target="_blank">Guardian Interview</a></p>
          </div>
          
          <div class="link-card">
            <h3>Julian Assange</h3>
            <p>• WikiLeaks founder</p>
            <p>• Published diplomatic cables</p>
            <p>• Iraq/Afghanistan war logs</p>
            <p>• Currently imprisoned</p>
          </div>
          
          <div class="link-card">
            <h3>Chelsea Manning</h3>
            <p>• US Army intelligence analyst</p>
            <p>• Leaked to WikiLeaks</p>
            <p>• Iraq war crimes video</p>
            <p>• Served 7 years prison</p>
          </div>
        </div>
        
        <h2>🔍 Research Resources</h2>
        
        <div class="message-box">
          <h3>Document Archives</h3>
          <p>• <a href="https://nsarchive.gwu.edu/" target="_blank">National Security Archive</a></p>
          <p>• <a href="https://www.cia.gov/readingroom/" target="_blank">CIA Reading Room</a></p>
          <p>• <a href="https://vault.fbi.gov/" target="_blank">FBI Vault</a></p>
          <p>• <a href="https://www.snowdenarchive.ca/" target="_blank">Snowden Surveillance Archive</a></p>
          <p>• <a href="https://wikileaks.org/" target="_blank">WikiLeaks</a></p>
        </div>
        
        <div class="message-box">
          <h3>Books & Documentaries</h3>
          <p><strong>Books:</strong></p>
          <p>• "The CIA as Organized Crime" by Douglas Valentine</p>
          <p>• "A Legacy of Ashes" by Tim Weiner</p>
          <p>• "The Brothers" by Stephen Kinzer</p>
          <p>• "Permanent Record" by Edward Snowden</p>
          
          <p><strong>Documentaries:</strong></p>
          <p>• <a href="https://www.youtube.com/watch?v=5rXPrfnU3G0" target="_blank">"The CIA's Secret Experiments"</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=7bHmuhX_wIs" target="_blank">"Citizenfour" (Snowden)</a></p>
          <p>• <a href="https://www.youtube.com/watch?v=6rxWc-TNIJI" target="_blank">"The War on Democracy"</a></p>
        </div>
        
        <div class="https-info">
          <h3>⚠️ Pattern Recognition</h3>
          <p><strong>Intelligence Agency Modus Operandi:</strong></p>
          <p>1. <strong>Create problem</strong> (fund extremists, stage false flags)</p>
          <p>2. <strong>Public reaction</strong> (media manipulates public opinion)</p>
          <p>3. <strong>Offer solution</strong> (more power, funding, surveillance)</p>
          <p>4. <strong>Repeat cycle</strong> (perpetual "war on terror")</p>
          <p><br><strong>Result:</strong> Gradual erosion of civil liberties, permanent surveillance state, unaccountable secret government.</p>
        </div>
        
        <br>
        <a href="/history" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">← Back to History</a>
      </div>
    </body>
    </html>
  `);
});

// ============================================
// /history/wealth - Wealth & Power Structures
// ============================================

app.get('/history/wealth', (req, res) => {
    const wealthContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wealth & Power Structures - Historical Analysis</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                color: #333;
                line-height: 1.6;
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            header {
                background: linear-gradient(90deg, #1a237e, #283593, #3949ab);
                color: white;
                padding: 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
                background-size: 50px 50px;
                animation: float 20s linear infinite;
            }
            
            @keyframes float {
                0% { transform: translate(0,0) rotate(0deg); }
                100% { transform: translate(-50px,-50px) rotate(360deg); }
            }
            
            h1 {
                font-size: 2.8rem;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            
            .subtitle {
                font-size: 1.2rem;
                opacity: 0.9;
                margin-bottom: 20px;
                position: relative;
                z-index: 1;
            }
            
            .timeline-container {
                display: flex;
                flex-direction: column;
                gap: 30px;
                padding: 40px;
            }
            
            .era {
                background: linear-gradient(145deg, #ffffff, #f0f0f0);
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                border-left: 5px solid;
                transition: transform 0.3s ease;
            }
            
            .era:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            }
            
            .era-1 { border-color: #4CAF50; }
            .era-2 { border-color: #2196F3; }
            .era-3 { border-color: #9C27B0; }
            .era-4 { border-color: #FF9800; }
            .era-5 { border-color: #F44336; }
            
            .era-title {
                font-size: 1.5rem;
                color: #1a237e;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .era-icon {
                font-size: 1.8rem;
            }
            
            .wealth-structure {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 20px;
                margin: 15px 0;
                border: 1px solid #e0e0e0;
            }
            
            .wealth-title {
                font-weight: bold;
                color: #283593;
                margin-bottom: 10px;
                font-size: 1.1rem;
            }
            
            .key-symbols {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 15px;
            }
            
            .symbol {
                background: #e3f2fd;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 0.9rem;
                color: #1565c0;
                border: 1px solid #bbdefb;
            }
            
            .navigation {
                display: flex;
                justify-content: space-between;
                padding: 30px 40px;
                background: #f8f9fa;
                border-top: 1px solid #e0e0e0;
            }
            
            .nav-button {
                padding: 12px 25px;
                background: linear-gradient(90deg, #3949ab, #283593);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .nav-button:hover {
                background: linear-gradient(90deg, #283593, #1a237e);
                transform: scale(1.05);
            }
            
            .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 0.9rem;
                background: #f1f3f4;
                border-top: 1px solid #ddd;
            }
            
            @media (max-width: 768px) {
                .container {
                    margin: 10px;
                    border-radius: 15px;
                }
                
                header {
                    padding: 25px 20px;
                }
                
                h1 {
                    font-size: 2rem;
                }
                
                .timeline-container {
                    padding: 20px;
                }
                
                .navigation {
                    flex-direction: column;
                    gap: 15px;
                    padding: 20px;
                }
                
                .nav-button {
                    justify-content: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>💰 Wealth & Power Structures</h1>
                <div class="subtitle">A Historical Analysis of Wealth Accumulation, Storage, and Transfer</div>
            </header>
            
            <div class="timeline-container">
                <!-- Era 1: Ancient Wealth -->
                <div class="era era-1">
                    <div class="era-title">
                        <span class="era-icon">🏺</span>
                        Ancient Wealth Systems (3000 BCE - 500 CE)
                    </div>
                    <p><strong>Primary Forms:</strong> Land ownership, agricultural surplus, precious metals, slave labor</p>
                    
                    <div class="wealth-structure">
                        <div class="wealth-title">Key Characteristics:</div>
                        <ul>
                            <li>Wealth tied directly to agricultural production</li>
                            <li>Storage in physical goods: grain silos, gold/silver hoards</li>
                            <li>Wealth concentrated in royal/temple complexes</li>
                            <li>Trade networks (Silk Road, Incense Route) for luxury goods</li>
                        </ul>
                    </div>
                    
                    <div class="key-symbols">
                        <span class="symbol">👑 Royal Treasuries</span>
                        <span class="symbol">🌾 Grain Storage</span>
                        <span class="symbol">💰 Gold Coins</span>
                        <span class="symbol">⚓ Trade Routes</span>
                    </div>
                </div>
                
                <!-- Era 2: Medieval Wealth -->
                <div class="era era-2">
                    <div class="era-title">
                        <span class="era-icon">🏰</span>
                        Feudal & Medieval Systems (500 - 1500 CE)
                    </div>
                    <p><strong>Primary Forms:</strong> Land tenure (fiefs), feudal obligations, church tithes, guild monopolies</p>
                    
                    <div class="wealth-structure">
                        <div class="wealth-title">Power Structures:</div>
                        <ul>
                            <li>Manorial system with serf-based agriculture</li>
                            <li>Church as largest landowner and wealth accumulator</li>
                            <li>Italian banking families (Medici, Bardi, Peruzzi)</li>
                            <li>Hanseatic League trade monopoly in Northern Europe</li>
                        </ul>
                    </div>
                    
                    <div class="key-symbols">
                        <span class="symbol">⚔️ Feudal Oaths</span>
                        <span class="symbol">⛪ Church Lands</span>
                        <span class="symbol">🏦 Merchant Banks</span>
                        <span class="symbol">📜 Guild Charters</span>
                    </div>
                </div>
                
                <!-- Era 3: Mercantile Capitalism -->
                <div class="era era-3">
                    <div class="era-title">
                        <span class="era-icon">🚢</span>
                        Mercantile Capitalism & Colonialism (1500 - 1800)
                    </div>
                    <p><strong>Primary Forms:</strong> Precious metals, colonial commodities, slave trade profits, joint-stock companies</p>
                    
                    <div class="wealth-structure">
                        <div class="wealth-title">Wealth Mechanisms:</div>
                        <ul>
                            <li>Triangular Trade (Europe-Africa-Americas)</li>
                            <li>Spanish Silver from Potosí and Mexican mines</li>
                            <li>Chartered Companies (East India Companies)</li>
                            <li>First stock exchanges (Amsterdam, 1602)</li>
                        </ul>
                    </div>
                    
                    <div class="key-symbols">
                        <span class="symbol">📈 Joint-Stock Companies</span>
                        <span class="symbol">⛓️ Slave Trade</span>
                        <span class="symbol">🏭 Colonial Plantations</span>
                        <span class="symbol">💎 Precious Metals</span>
                    </div>
                </div>
                
                <!-- Era 4: Industrial Wealth -->
                <div class="era era-4">
                    <div class="era-title">
                        <span class="era-icon">🏭</span>
                        Industrial Revolution & Gilded Age (1800 - 1914)
                    </div>
                    <p><strong>Primary Forms:</strong> Industrial capital, railways, steel, oil, banking networks</p>
                    
                    <div class="wealth-structure">
                        <div class="wealth-title">New Wealth Structures:</div>
                        <ul>
                            <li>Robber Barons and industrial monopolies</li>
                            <li>Global banking families (Rothschild, Morgan, Rockefeller)</li>
                            <li>Corporation as legal person with limited liability</li>
                            <li>Mass production and consumer markets</li>
                        </ul>
                    </div>
                    
                    <div class="key-symbols">
                        <span class="symbol">🤖 Factory System</span>
                        <span class="symbol">🛤️ Railway Networks</span>
                        <span class="symbol">🏦 Investment Banks</span>
                        <span class="symbol">🛢️ Oil Monopolies</span>
                    </div>
                </div>
                
                <!-- Era 5: Modern Financialization -->
                <div class="era era-5">
                    <div class="era-title">
                        <span class="era-icon">💻</span>
                        Financialization & Digital Wealth (1970 - Present)
                    </div>
                    <p><strong>Primary Forms:</strong> Financial instruments, intellectual property, data, cryptocurrencies</p>
                    
                    <div class="wealth-structure">
                        <div class="wealth-title">Contemporary Systems:</div>
                        <ul>
                            <li>Derivatives and complex financial engineering</li>
                            <li>Tech monopolies and data as new oil</li>
                            <li>Offshore wealth havens and tax optimization</li>
                            <li>Cryptocurrencies and decentralized finance</li>
                        </ul>
                    </div>
                    
                    <div class="key-symbols">
                        <span class="symbol">📊 Derivatives</span>
                        <span class="symbol">🌐 Digital Platforms</span>
                        <span class="symbol">🏝️ Offshore Trusts</span>
                        <span class="symbol">₿ Cryptocurrency</span>
                    </div>
                </div>
            </div>
            
            <div class="navigation">
                <a href="/history/banking" class="nav-button">
                    ← Previous: Banking History
                </a>
                <a href="/history/resources" class="nav-button">
                    Next: Resources & Commodities →
                </a>
            </div>
            
            <div class="footer">
                <p>Historical Analysis Project • Wealth as a measure of power through time</p>
                <p style="margin-top: 5px; font-size: 0.8rem; color: #888;">
                    Note: This timeline shows the evolution of wealth storage from physical goods to abstract financial instruments
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(wealthContent);
});

// ============================================
// /history/resources - Resource Control & Management
// ============================================

app.get('/history/resources', (req, res) => {
    const resourcesContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resource Control & Management - Historical Analysis</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                line-height: 1.6;
                min-height: 100vh;
                padding: 20px;
                background-attachment: fixed;
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 25px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                overflow: hidden;
                backdrop-filter: blur(10px);
            }
            
            header {
                background: linear-gradient(90deg, #0f3460, #16213e, #1a1a2e);
                color: white;
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .header-animation {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: hidden;
            }
            
            .floating-resource {
                position: absolute;
                font-size: 2rem;
                opacity: 0.1;
                animation: floatAround 15s linear infinite;
            }
            
            .oil { top: 10%; left: 5%; animation-delay: 0s; }
            .water { top: 20%; right: 10%; animation-delay: -3s; }
            .gold { bottom: 30%; left: 15%; animation-delay: -5s; }
            .food { bottom: 20%; right: 20%; animation-delay: -8s; }
            
            @keyframes floatAround {
                0% { transform: translate(0,0) rotate(0deg); }
                25% { transform: translate(50px,50px) rotate(90deg); }
                50% { transform: translate(0,100px) rotate(180deg); }
                75% { transform: translate(-50px,50px) rotate(270deg); }
                100% { transform: translate(0,0) rotate(360deg); }
            }
            
            h1 {
                font-size: 3.5rem;
                margin-bottom: 15px;
                background: linear-gradient(45deg, #00b4db, #0083b0);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 3px 3px 6px rgba(0,0,0,0.2);
                position: relative;
                z-index: 1;
            }
            
            .subtitle {
                font-size: 1.4rem;
                opacity: 0.9;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            
            .explore-btn {
                display: inline-block;
                padding: 15px 40px;
                background: linear-gradient(45deg, #00b4db, #0083b0);
                color: white;
                text-decoration: none;
                border-radius: 30px;
                font-weight: bold;
                margin-top: 20px;
                transition: all 0.3s ease;
                box-shadow: 0 5px 15px rgba(0,131,176,0.4);
                position: relative;
                z-index: 1;
            }
            
            .explore-btn:hover {
                transform: translateY(-3px) scale(1.05);
                box-shadow: 0 8px 20px rgba(0,131,176,0.6);
            }
            
            .resources-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 30px;
                padding: 50px;
            }
            
            .resource-card {
                background: white;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                transition: all 0.4s ease;
                position: relative;
                border: 1px solid rgba(0,0,0,0.1);
            }
            
            .resource-card:hover {
                transform: translateY(-10px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            }
            
            .card-header {
                padding: 25px;
                color: white;
                position: relative;
                overflow: hidden;
            }
            
            .card-1 .card-header { background: linear-gradient(135deg, #f46b45, #eea849); }
            .card-2 .card-header { background: linear-gradient(135deg, #36d1dc, #5b86e5); }
            .card-3 .card-header { background: linear-gradient(135deg, #834d9b, #d04ed6); }
            .card-4 .card-header { background: linear-gradient(135deg, #11998e, #38ef7d); }
            .card-5 .card-header { background: linear-gradient(135deg, #ff416c, #ff4b2b); }
            
            .card-icon {
                font-size: 3.5rem;
                margin-bottom: 15px;
                text-align: center;
                animation: bounce 2s infinite;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .card-title {
                font-size: 1.8rem;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .card-body {
                padding: 30px;
            }
            
            .info-list {
                list-style: none;
            }
            
            .info-list li {
                padding: 12px 0;
                border-bottom: 1px dashed #eee;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .info-list li:before {
                content: "▶";
                color: #00b4db;
                font-size: 0.8rem;
            }
            
            .key-events {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                margin-top: 20px;
            }
            
            .event {
                padding: 8px;
                margin: 5px 0;
                background: rgba(0,180,219,0.1);
                border-radius: 5px;
                border-left: 3px solid #00b4db;
            }
            
            .navigation {
                display: flex;
                justify-content: space-between;
                padding: 40px;
                background: #16213e;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            
            .nav-button {
                padding: 15px 30px;
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                text-decoration: none;
                border-radius: 15px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: bold;
            }
            
            .nav-button:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(102,126,234,0.6);
            }
            
            .stats {
                display: flex;
                justify-content: space-around;
                padding: 40px;
                background: linear-gradient(135deg, #0f3460, #16213e);
                color: white;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-number {
                font-size: 2.5rem;
                font-weight: bold;
                color: #00b4db;
            }
            
            .stat-label {
                font-size: 0.9rem;
                opacity: 0.8;
            }
            
            @media (max-width: 768px) {
                .resources-grid {
                    grid-template-columns: 1fr;
                    padding: 20px;
                    gap: 20px;
                }
                
                h1 {
                    font-size: 2.2rem;
                }
                
                .navigation {
                    flex-direction: column;
                    gap: 15px;
                    padding: 20px;
                }
                
                .stats {
                    flex-direction: column;
                    gap: 25px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="header-animation">
                    <div class="floating-resource oil">🛢️</div>
                    <div class="floating-resource water">💧</div>
                    <div class="floating-resource gold">💰</div>
                    <div class="floating-resource food">🌾</div>
                </div>
                <h1>Resource Control & Management</h1>
                <div class="subtitle">The Historical Battle for Earth's Most Valuable Assets</div>
                <a href="#resources" class="explore-btn">Explore Resource Histories</a>
            </header>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number" data-count="80">0</div>
                    <div class="stat-label">of world's resources controlled by 20%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number" data-count="4000">0</div>
                    <div class="stat-label">Water-related conflicts in history</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number" data-count="65">0</div>
                    <div class="stat-label">Oil wars since 1900</div>
                </div>
            </div>
            
            <div id="resources" class="resources-grid">
                <!-- Oil & Energy Resources -->
                <div class="resource-card card-1">
                    <div class="card-header">
                        <div class="card-icon">🛢️</div>
                        <div class="card-title">Oil & Energy Resources</div>
                    </div>
                    <div class="card-body">
                        <ul class="info-list">
                            <li><strong>Peak Control:</strong> 7 sisters, OPEC, state-owned companies</li>
                            <li><strong>Historical Conflicts:</strong> Middle East wars, pipeline politics</li>
                            <li><strong>Strategic Reserves:</strong> US Strategic Petroleum Reserve</li>
                            <li><strong>Transition:</strong> From coal to oil to renewables</li>
                        </ul>
                        <div class="key-events">
                            <div class="event">1901 - First oil discovery in Persia</div>
                            <div class="event">1960 - OPEC founded</div>
                            <div class="event">1973 - Oil embargo crisis</div>
                            <a href="#" class="explore-btn" style="padding: 10px 20px; margin-top: 15px; display: inline-block;">Explore Oil Wars</a>
                        </div>
                    </div>
                </div>
                
                <!-- Water Resources -->
                <div class="resource-card card-2">
                    <div class="card-header">
                        <div class="card-icon">💧</div>
                        <div class="card-title">Water & Hydropolitics</div>
                    </div>
                    <div class="card-body">
                        <ul class="info-list">
                            <li><strong>Key Battles:</strong> Nile, Mekong, Colorado River disputes</li>
                            <li><strong>Control Methods:</strong> Dams, irrigation, privatization</li>
                            <li><strong>Corporate Control:</strong> Nestlé, Coca-Cola water rights</li>
                            <li><strong>Future Wars:</strong> Predicted water scarcity conflicts</li>
                        </ul>
                        <div class="key-events">
                            <div class="event">1960 - Indus Water Treaty</div>
                            <div class="event">1990s - Cochabamba Water War</div>
                            <div class="event">2010 - UN declares water as human right</div>
                            <a href="#" class="explore-btn" style="padding: 10px 20px; margin-top: 15px; display: inline-block;">Explore Water Wars</a>
                        </div>
                    </div>
                </div>
                
                <!-- Mineral Resources -->
                <div class="resource-card card-3">
                    <div class="card-header">
                        <div class="card-icon">⛏️</div>
                        <div class="card-title">Minerals & Rare Earths</div>
                    </div>
                    <div class="card-body">
                        <ul class="info-list">
                            <li><strong>Critical Minerals:</strong> Lithium, cobalt, rare earth elements</li>
                            <li><strong>Control Points:</strong> Democratic Republic of Congo, China</li>
                            <li><strong>Tech Dependency:</strong> Smartphones, EVs, military tech</li>
                            <li><strong>Historical:</strong> Gold rushes, diamond conflicts</li>
                        </ul>
                        <div class="key-events">
                            <div class="event">1848 - California Gold Rush</div>
                            <div class="event">1867 - Diamond discovery in South Africa</div>
                            <div class="event">2010 - China restricts rare earth exports</div>
                            <a href="#" class="explore-btn" style="padding: 10px 20px; margin-top: 15px; display: inline-block;">Explore Mineral Conflicts</a>
                        </div>
                    </div>
                </div>
                
                <!-- Agricultural Resources -->
                <div class="resource-card card-4">
                    <div class="card-header">
                        <div class="card-icon">🌾</div>
                        <div class="card-title">Food & Agricultural Control</div>
                    </div>
                    <div class="card-body">
                        <ul class="info-list">
                            <li><strong>Land Grabbing:</strong> 200M hectares since 2000</li>
                            <li><strong>Seed Control:</strong> Monsanto/Bayer patent monopoly</li>
                            <li><strong>Grain Cartels:</strong> ABCD companies (ADM, Bunge, Cargill, Dreyfus)</li>
                            <li><strong>Historical:</strong> Potato famine, Green Revolution</li>
                        </ul>
                        <div class="key-events">
                            <div class="event">1845 - Irish Potato Famine</div>
                            <div class="event">1960s - Green Revolution</div>
                            <div class="event">2008 - Global food price crisis</div>
                            <a href="#" class="explore-btn" style="padding: 10px 20px; margin-top: 15px; display: inline-block;">Explore Food Systems</a>
                        </div>
                    </div>
                </div>
                
                <!-- Land & Territory -->
                <div class="resource-card card-5">
                    <div class="card-header">
                        <div class="card-icon">🗺️</div>
                        <div class="card-title">Land & Strategic Territory</div>
                    </div>
                    <div class="card-body">
                        <ul class="info-list">
                            <li><strong>Geopolitical:</strong> Straits, canals, choke points</li>
                            <li><strong>Modern Grabbing:</strong> Africa, Amazon, Arctic claims</li>
                            <li><strong>Urban Control:</strong> Real estate as wealth storage</li>
                            <li><strong>Historical:</strong> Colonial land divisions, homesteading</li>
                        </ul>
                        <div class="key-events">
                            <div class="event">1884 - Berlin Conference partitions Africa</div>
                            <div class="event">1919 - Versailles Treaty redraws borders</div>
                            <div class="event">2007 - Arctic territorial claims escalate</div>
                            <a href="#" class="explore-btn" style="padding: 10px 20px; margin-top: 15px; display: inline-block;">Explore Land Conflicts</a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="navigation">
                <a href="/history/wealth" class="nav-button">
                    ⬅️ Previous: Wealth & Power Structures
                </a>
                <a href="/history/money" class="nav-button">
                    Next: Monetary Systems ➡️
                </a>
            </div>
        </div>
        
        <script>
            // Animate the statistics counting
            function animateCounters() {
                const counters = document.querySelectorAll('.stat-number');
                counters.forEach(counter => {
                    const target = parseInt(counter.getAttribute('data-count'));
                    const increment = target / 100;
                    let current = 0;
                    
                    const updateCounter = () => {
                        if (current < target) {
                            current += increment;
                            counter.textContent = Math.floor(current);
                            setTimeout(updateCounter, 20);
                        } else {
                            counter.textContent = target + '%';
                        }
                    };
                    
                    updateCounter();
                });
            }
            
            // Run animation when page loads
            window.addEventListener('load', animateCounters);
            
            // Add hover effects to resource cards
            document.querySelectorAll('.resource-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.zIndex = '100';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.zIndex = '1';
                });
            });
        </script>
    </body>
    </html>
    `;
    
    res.send(resourcesContent);
});

// ============================================
// /history/money - Monetary Systems & Currency
// ============================================

app.get('/history/money', (req, res) => {
    const moneyContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monetary Systems - Currency History & Hidden Truths</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
        }
        
        :root {
            --gold: #FFD700;
            --silver: #C0C0C0;
            --crypto-blue: #00b4db;
            --fiat-red: #ff416c;
            --document-green: #11998e;
        }
        
        body {
            background: radial-gradient(circle at center, #0a0a0a, #000000);
            color: #f0f0f0;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .money-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        }
        
        .floating-coin {
            position: absolute;
            font-size: 2rem;
            opacity: 0.1;
            animation: floatCoin 20s linear infinite;
        }
        
        @keyframes floatCoin {
            0% {
                transform: translateY(100vh) rotate(0deg);
                opacity: 0;
            }
            10% {
                opacity: 0.1;
            }
            90% {
                opacity: 0.1;
            }
            100% {
                transform: translateY(-100px) rotate(360deg);
                opacity: 0;
            }
        }
        
        .container {
            position: relative;
            z-index: 2;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            text-align: center;
            padding: 80px 20px;
            background: linear-gradient(45deg, 
                rgba(255, 215, 0, 0.1), 
                rgba(192, 192, 192, 0.1), 
                rgba(0, 180, 219, 0.1));
            border-radius: 30px;
            margin-bottom: 50px;
            border: 1px solid rgba(255, 215, 0, 0.2);
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        .holographic-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                45deg,
                transparent 30%,
                rgba(255, 255, 255, 0.05) 50%,
                transparent 70%
            );
            animation: holographic 3s linear infinite;
        }
        
        @keyframes holographic {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        
        h1 {
            font-size: 4rem;
            background: linear-gradient(45deg, var(--gold), var(--silver), var(--crypto-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
        }
        
        .tagline {
            font-size: 1.3rem;
            color: #aaa;
            margin-bottom: 40px;
            font-style: italic;
        }
        
        .era-timeline {
            display: flex;
            flex-direction: column;
            gap: 40px;
            margin-bottom: 60px;
        }
        
        .era-card {
            background: rgba(20, 20, 30, 0.8);
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid;
            transition: all 0.4s ease;
            backdrop-filter: blur(10px);
        }
        
        .era-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
        }
        
        .era-1 { border-color: var(--gold); }
        .era-2 { border-color: var(--silver); }
        .era-3 { border-color: #8B4513; }
        .era-4 { border-color: var(--fiat-red); }
        .era-5 { border-color: var(--crypto-blue); }
        
        .era-header {
            padding: 25px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
        }
        
        .era-title {
            font-size: 1.8rem;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .era-icon {
            font-size: 2rem;
        }
        
        .toggle-btn {
            background: none;
            border: 2px solid currentColor;
            color: inherit;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .toggle-btn:hover {
            transform: rotate(180deg);
        }
        
        .era-content {
            padding: 0;
            max-height: 0;
            overflow: hidden;
            transition: all 0.5s ease;
        }
        
        .era-content.expanded {
            padding: 30px;
            max-height: 2000px;
        }
        
        .documents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .document-card {
            background: rgba(30, 30, 40, 0.8);
            padding: 20px;
            border-radius: 15px;
            border: 1px solid var(--document-green);
            transition: all 0.3s ease;
        }
        
        .document-card:hover {
            background: rgba(40, 40, 50, 0.9);
            transform: translateY(-3px);
        }
        
        .doc-title {
            color: var(--document-green);
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .doc-source {
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
        
        .doc-link {
            display: inline-block;
            padding: 8px 15px;
            background: var(--document-green);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .doc-link:hover {
            background: #0d7c6f;
            transform: scale(1.05);
        }
        
        .hidden-archive {
            background: rgba(0, 0, 0, 0.5);
            border: 2px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin-top: 20px;
            position: relative;
        }
        
        .archive-toggle {
            background: linear-gradient(45deg, #ff416c, #ff4b2b);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0 auto;
            transition: all 0.3s ease;
        }
        
        .archive-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(255, 65, 108, 0.4);
        }
        
        .archive-content {
            max-height: 0;
            overflow: hidden;
            transition: all 0.5s ease;
            margin-top: 0;
        }
        
        .archive-content.expanded {
            max-height: 2000px;
            margin-top: 20px;
        }
        
        .secret-link {
            color: #aaa;
            text-decoration: none;
            border-bottom: 1px dashed #666;
            padding: 5px 0;
            display: block;
            margin: 5px 0;
            transition: all 0.3s ease;
        }
        
        .secret-link:hover {
            color: var(--gold);
            border-bottom-color: var(--gold);
        }
        
        .verification-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(17, 153, 142, 0.2);
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8rem;
            margin-left: 10px;
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            padding: 40px 0;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .nav-button {
            padding: 15px 30px;
            background: linear-gradient(45deg, rgba(255,215,0,0.1), rgba(192,192,192,0.1));
            color: var(--gold);
            text-decoration: none;
            border-radius: 15px;
            border: 1px solid rgba(255,215,0,0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .nav-button:hover {
            background: linear-gradient(45deg, rgba(255,215,0,0.2), rgba(192,192,192,0.2));
            transform: translateY(-3px);
            box-shadow: 0 5px 20px rgba(255,215,0,0.2);
        }
        
        .disclaimer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9rem;
            border-top: 1px solid rgba(255,255,255,0.1);
            margin-top: 40px;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }
            
            .era-title {
                font-size: 1.4rem;
            }
            
            .documents-grid {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
                gap: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="money-animation" id="moneyAnimation"></div>
    
    <div class="container">
        <header>
            <div class="holographic-effect"></div>
            <h1>Monetary Systems</h1>
            <div class="tagline">From Gold Standard to Digital Currency - The Hidden Architecture of Power</div>
            <div class="verification-badge">
                <span>🔒</span> Sources Verified | Archived Documents Available
            </div>
        </header>
        
        <div class="era-timeline">
            <!-- Era 1: Commodity Money -->
            <div class="era-card era-1">
                <div class="era-header" onclick="toggleEra('era1')">
                    <div class="era-title">
                        <span class="era-icon">💰</span>
                        Commodity Money Era (Ancient - 1700)
                    </div>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="era-content" id="era1">
                    <p><strong>Primary Forms:</strong> Gold, silver, shells, salt, cattle</p>
                    <p><strong>Key Feature:</strong> Money had intrinsic value</p>
                    
                    <div class="documents-grid">
                        <div class="document-card">
                            <div class="doc-title">Code of Hammurabi (1754 BCE)</div>
                            <div class="doc-source">Babylonian Law Code - First monetary regulations</div>
                            <a href="https://avalon.law.yale.edu/ancient/hamframe.asp" target="_blank" class="doc-link">
                                View Original Text
                            </a>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-title">Lydia's Electrum Coins (7th Century BCE)</div>
                            <div class="doc-source">First standardized metal coinage</div>
                            <a href="https://www.britishmuseum.org/collection/object/G_1920-0214-1" target="_blank" class="doc-link">
                                British Museum Archive
                            </a>
                        </div>
                    </div>
                    
                    <div class="hidden-archive">
                        <button class="archive-toggle" onclick="toggleArchive('archive1')">
                            <span>🔍</span> Hidden Sources & Research
                        </button>
                        <div class="archive-content" id="archive1">
                            <a href="https://www.federalreserve.gov/faqs/currency_12771.htm" target="_blank" class="secret-link">
                                Federal Reserve History of Currency
                            </a>
                            <a href="https://www.imf.org/external/np/exr/center/mm/eng/mm_dt_01.htm" target="_blank" class="secret-link">
                                IMF Monetary Systems Timeline
                            </a>
                            <a href="https://www.bis.org/publ/work133.pdf" target="_blank" class="secret-link">
                                BIS: History of Monetary Systems (PDF)
                            </a>
                            <a href="https://fraser.stlouisfed.org/" target="_blank" class="secret-link">
                                Federal Reserve Economic Data Archive
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Era 2: Gold Standard -->
            <div class="era-card era-2">
                <div class="era-header" onclick="toggleEra('era2')">
                    <div class="era-title">
                        <span class="era-icon">🥇</span>
                        Gold Standard Era (1717 - 1971)
                    </div>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="era-content" id="era2">
                    <p><strong>Key Event:</strong> 1944 Bretton Woods Agreement - USD tied to gold</p>
                    <p><strong>End Date:</strong> August 15, 1971 - Nixon closes gold window</p>
                    
                    <div class="documents-grid">
                        <div class="document-card">
                            <div class="doc-title">Bretton Woods Agreements (1944)</div>
                            <div class="doc-source">Established IMF and World Bank</div>
                            <a href="https://www.imf.org/external/np/exr/center/mm/eng/mm_bt_01.htm" target="_blank" class="doc-link">
                                IMF Original Documents
                            </a>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-title">Nixon's Executive Order 11615 (1971)</div>
                            <div class="doc-source">"Nixon Shock" - Ended gold convertibility</div>
                            <a href="https://www.presidency.ucsb.edu/documents/executive-order-11615-providing-stabilization-economic-prices-rents-wages-and-salaries" target="_blank" class="doc-link">
                                Presidential Archive
                            </a>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-title">Bank of England Gold Archives</div>
                            <div class="doc-source">Historical gold reserve data</div>
                            <a href="https://www.bankofengland.co.uk/statistics/gold-and-foreign-currency-reserves" target="_blank" class="doc-link">
                                BOE Statistics
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Era 3: Fiat Currency -->
            <div class="era-card era-3">
                <div class="era-header" onclick="toggleEra('era3')">
                    <div class="era-title">
                        <span class="era-icon">🏦</span>
                        Fiat Currency Era (1971 - Present)
                    </div>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="era-content" id="era3">
                    <p><strong>Definition:</strong> Government-decreed money with no intrinsic value</p>
                    <p><strong>Central Control:</strong> Federal Reserve, ECB, Bank of Japan</p>
                    
                    <div class="documents-grid">
                        <div class="document-card">
                            <div class="doc-title">Federal Reserve Act (1913)</div>
                            <div class="doc-source">Created US central banking system</div>
                            <a href="https://www.federalreserve.gov/aboutthefed/fract.htm" target="_blank" class="doc-link">
                                Full Text
                            </a>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-title">ECB Monetary Policy Framework</div>
                            <div class="doc-source">European Central Bank documentation</div>
                            <a href="https://www.ecb.europa.eu/mopo/html/index.en.html" target="_blank" class="doc-link">
                                ECB Official Site
                            </a>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-title">Quantitative Easing Programs</div>
                            <div class="doc-source">2008-2020 central bank balance sheets</div>
                            <a href="https://www.federalreserve.gov/monetarypolicy/bst_recenttrends.htm" target="_blank" class="doc-link">
                                Fed Balance Sheet Data
                            </a>
                        </div>
                    </div>
                    
                    <div class="hidden-archive">
                        <button class="archive-toggle" onclick="toggleArchive('archive3')">
                            <span>📊</span> Central Bank Research Archives
                        </button>
                        <div class="archive-content" id="archive3">
                            <a href="https://www.bis.org/publ/work781.pdf" target="_blank" class="secret-link">
                                BIS: The Future of Monetary Policy
                            </a>
                            <a href="https://www.frbsf.org/economic-research/publications/economic-letter/2021/january/why-is-u-s-inflation-higher-than-in-other-countries/" target="_blank" class="secret-link">
                                SF Fed Inflation Research
                            </a>
                            <a href="https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp2480~07f3d7f4c3.en.pdf" target="_blank" class="secret-link">
                                ECB Digital Currency Research
                            </a>
                            <a href="https://www.imf.org/en/Publications/WP/Issues/2021/01/29/The-Rise-of-Digital-Money-50027" target="_blank" class="secret-link">
                                IMF Digital Money Report
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Era 4: Cryptocurrency -->
            <div class="era-card era-5">
                <div class="era-header" onclick="toggleEra('era4')">
                    <div class="era-title">
                        <span class="era-icon">₿</span>
                        Digital & Cryptocurrency Era (2009 - Present)
                    </div>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="era-content" id="era4">
                    <p><strong>Genesis:</strong> Bitcoin Whitepaper - October 31, 2008</p>
                    <p><strong>Key Innovation:</strong> Decentralized, trustless systems</p>
                    
                    <div class="documents-grid">
                        <div class="document-card">
                            <div class="doc-title">Bitcoin Whitepaper (2008)</div>
                            <div class="doc-source">Satoshi Nakamoto - Original PDF</div>
                            <a href="https://bitcoin.org/bitcoin.pdf" target="_blank" class="doc-link">
                                Download PDF
                            </a>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-title">SEC Crypto Regulation Framework</div>
                            <div class="doc-source">US regulatory position</div>
                            <a href="https://www.sec.gov/corpfin/framework-investment-contract-analysis-digital-assets" target="_blank" class="doc-link">
                                SEC Official Guidance
                            </a>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-title">CBDC Research by Central Banks</div>
                            <div class="doc-source">Digital currency experiments</div>
                            <a href="https://www.atlanticcouncil.org/cbdctracker/" target="_blank" class="doc-link">
                                CBDC Tracker
                            </a>
                        </div>
                    </div>
                    
                    <div class="hidden-archive">
                        <button class="archive-toggle" onclick="toggleArchive('archive4')">
                            <span>🔗</span> Blockchain Research & Analytics
                        </button>
                        <div class="archive-content" id="archive4">
                            <a href="https://www.blockchain.com/explorer" target="_blank" class="secret-link">
                                Blockchain Explorer - Live Transactions
                            </a>
                            <a href="https://coinmetrics.io/" target="_blank" class="secret-link">
                                Coin Metrics - Crypto Data
                            </a>
                            <a href="https://messari.io/" target="_blank" class="secret-link">
                                Messari Crypto Research
                            </a>
                            <a href="https://www.gemini.com/cryptopedia" target="_blank" class="secret-link">
                                Cryptopedia - Educational Resource
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="navigation">
            <a href="/history/resources" class="nav-button">
                ⬅️ Previous: Resource Control
            </a>
            <a href="/history/usa" class="nav-button">
                Next: United States History ➡️
            </a>
        </div>
        
        <div class="disclaimer">
            <p>⚠️ This page contains verified historical documents and educational resources. All sources are from official archives, central banks, and academic institutions.</p>
            <p style="margin-top: 10px; font-size: 0.8rem; color: #555;">
                Last Updated: 2024 | Educational Use Only | Cross-Reference Recommended
            </p>
        </div>
    </div>
    
    <script>
        // Create floating coins animation
        function createFloatingCoins() {
            const animationDiv = document.getElementById('moneyAnimation');
            const coins = ['💰', '🥇', '💵', '💎', '₿', '🏦', '💳'];
            
            for (let i = 0; i < 30; i++) {
                const coin = document.createElement('div');
                coin.className = 'floating-coin';
                coin.textContent = coins[Math.floor(Math.random() * coins.length)];
                coin.style.left = (Math.random() * 100) + '%';
                coin.style.animationDelay = (Math.random() * 20) + 's';
                coin.style.fontSize = (1 + Math.random() * 3) + 'rem';
                animationDiv.appendChild(coin);
            }
        }
        
        // Toggle era content
        function toggleEra(eraId) {
            const content = document.getElementById(eraId);
            const button = content.previousElementSibling.querySelector('.toggle-btn');
            
            content.classList.toggle('expanded');
            button.textContent = content.classList.contains('expanded') ? '▲' : '▼';
        }
        
        // Toggle archive content
        function toggleArchive(archiveId) {
            const content = document.getElementById(archiveId);
            content.classList.toggle('expanded');
        }
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            createFloatingCoins();
            
            // Auto-expand first era
            setTimeout(function() {
                toggleEra('era1');
            }, 500);
        });
    </script>
</body>
</html>`;
    
    res.send(moneyContent);
});

// ============================================
// /history/usa - United States History
// ============================================

app.get('/history/usa', (req, res) => {
    const usaContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>United States History - From Revolution to Superpower</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Georgia', 'Times New Roman', serif;
        }
        
        :root {
            --usa-red: #B22234;
            --usa-blue: #3C3B6E;
            --usa-white: #FFFFFF;
            --patriotic-gold: #FFD700;
            --document-blue: #1E3A8A;
        }
        
        body {
            background: linear-gradient(135deg, #f0f0f0 0%, #ffffff 100%);
            color: #333;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        .stars-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--usa-blue);
            opacity: 0.03;
            z-index: -1;
        }
        
        .star {
            position: absolute;
            background: var(--usa-blue);
            clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
            opacity: 0.1;
        }
        
        .stripes {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 30px,
                rgba(178, 34, 52, 0.03) 30px,
                rgba(178, 34, 52, 0.03) 60px
            );
            z-index: -1;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        
        header {
            text-align: center;
            padding: 60px 40px;
            background: linear-gradient(90deg, var(--usa-blue), var(--usa-red));
            color: var(--usa-white);
            border-radius: 20px;
            margin-bottom: 50px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            border: 5px solid var(--patriotic-gold);
        }
        
        .flag-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.1;
            background-image: 
                linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.1) 50%),
                linear-gradient(transparent 50%, rgba(255,255,255,0.1) 50%);
            background-size: 60px 60px;
        }
        
        h1 {
            font-size: 3.5rem;
            margin-bottom: 15px;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
            position: relative;
        }
        
        .title-flag {
            display: inline-block;
            background: linear-gradient(90deg, var(--usa-red), var(--usa-white), var(--usa-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .subtitle {
            font-size: 1.4rem;
            opacity: 0.9;
            margin-bottom: 20px;
            font-style: italic;
        }
        
        .era-timeline {
            display: flex;
            flex-direction: column;
            gap: 30px;
            margin-bottom: 50px;
        }
        
        .era-card {
            background: var(--usa-white);
            border-radius: 15px;
            overflow: hidden;
            border-left: 8px solid;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            position: relative;
        }
        
        .era-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.2);
        }
        
        .era-revolution { border-color: #8B0000; }
        .era-civilwar { border-color: #556B2F; }
        .era-industrial { border-color: #4682B4; }
        .era-worldwars { border-color: #2F4F4F; }
        .era-coldwar { border-color: #4B0082; }
        .era-modern { border-color: #228B22; }
        
        .era-header {
            padding: 25px;
            background: linear-gradient(90deg, rgba(60,59,110,0.1), rgba(178,34,52,0.1));
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .era-title {
            font-size: 1.6rem;
            color: var(--usa-blue);
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .era-icon {
            font-size: 2rem;
        }
        
        .era-date {
            background: var(--usa-red);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
        }
        
        .era-content {
            padding: 0;
            max-height: 0;
            overflow: hidden;
            transition: all 0.5s ease;
        }
        
        .era-content.expanded {
            padding: 30px;
            max-height: 2000px;
        }
        
        .key-events {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .event-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
        }
        
        .event-card:hover {
            border-color: var(--usa-blue);
            transform: translateY(-3px);
        }
        
        .event-title {
            color: var(--usa-blue);
            font-size: 1.1rem;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .document-links {
            margin-top: 15px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .doc-link {
            display: inline-block;
            padding: 8px 15px;
            background: var(--document-blue);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .doc-link:hover {
            background: #1e40af;
            transform: scale(1.05);
        }
        
        .hidden-archive {
            background: #f1f5f9;
            border: 2px dashed #94a3b8;
            border-radius: 10px;
            padding: 20px;
            margin-top: 25px;
        }
        
        .archive-toggle {
            background: linear-gradient(90deg, var(--usa-red), var(--usa-blue));
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0 auto;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .archive-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(60,59,110,0.3);
        }
        
        .archive-content {
            max-height: 0;
            overflow: hidden;
            transition: all 0.5s ease;
            margin-top: 0;
        }
        
        .archive-content.expanded {
            max-height: 2000px;
            margin-top: 20px;
        }
        
        .archive-link {
            color: #475569;
            text-decoration: none;
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            display: block;
            transition: all 0.3s ease;
        }
        
        .archive-link:hover {
            color: var(--usa-red);
            background: #f8fafc;
            padding-left: 15px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, rgba(60,59,110,0.05), rgba(178,34,52,0.05));
            border-radius: 15px;
            border: 2px solid rgba(178,34,52,0.1);
        }
        
        .stat-item {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--usa-red);
            margin-bottom: 10px;
        }
        
        .stat-label {
            color: var(--usa-blue);
            font-size: 0.9rem;
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            padding: 40px 0;
            border-top: 2px solid #e5e7eb;
            margin-top: 40px;
        }
        
        .nav-button {
            padding: 15px 30px;
            background: linear-gradient(90deg, var(--usa-blue), var(--usa-red));
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .nav-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        
        .disclaimer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 0.9rem;
            background: #f9fafb;
            border-radius: 10px;
            margin-top: 40px;
            border: 1px solid #e5e7eb;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2.2rem;
            }
            
            .era-title {
                font-size: 1.3rem;
            }
            
            .key-events {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
                gap: 15px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="stars-background" id="starsBackground"></div>
    <div class="stripes"></div>
    
    <div class="container">
        <header>
            <div class="flag-pattern"></div>
            <h1><span class="title-flag">United States History</span></h1>
            <div class="subtitle">From Revolution to Superpower - The American Journey</div>
            <div style="margin-top: 20px; display: inline-block; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 20px;">
                <span style="color: var(--patriotic-gold);">★</span> Verified Historical Documents <span style="color: var(--patriotic-gold);">★</span>
            </div>
        </header>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number" data-count="1776">1776</div>
                <div class="stat-label">Declaration of Independence</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" data-count="27">27</div>
                <div class="stat-label">Constitutional Amendments</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" data-count="46">46</div>
                <div class="stat-label">Presidents</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" data-count="50">50</div>
                <div class="stat-label">States</div>
            </div>
        </div>
        
        <div class="era-timeline">
            <!-- Revolutionary Era -->
            <div class="era-card era-revolution">
                <div class="era-header" onclick="toggleEra('era1')">
                    <div class="era-title">
                        <span class="era-icon">⚔️</span>
                        Revolutionary Era (1765-1783)
                    </div>
                    <div class="era-date">Founding Years</div>
                </div>
                <div class="era-content" id="era1">
                    <p><strong>Key Events:</strong> Boston Tea Party, Declaration of Independence, Revolutionary War</p>
                    
                    <div class="key-events">
                        <div class="event-card">
                            <div class="event-title">Declaration of Independence (1776)</div>
                            <p>Thomas Jefferson's revolutionary document</p>
                            <div class="document-links">
                                <a href="https://www.archives.gov/founding-docs/declaration" target="_blank" class="doc-link">
                                    National Archives
                                </a>
                                <a href="https://www.loc.gov/item/90898038/" target="_blank" class="doc-link">
                                    Library of Congress
                                </a>
                            </div>
                        </div>
                        
                        <div class="event-card">
                            <div class="event-title">U.S. Constitution (1787)</div>
                            <p>Founding document of American government</p>
                            <div class="document-links">
                                <a href="https://www.archives.gov/founding-docs/constitution" target="_blank" class="doc-link">
                                    Full Text & Analysis
                                </a>
                                <a href="https://constitutioncenter.org/interactive-constitution" target="_blank" class="doc-link">
                                    Interactive Constitution
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hidden-archive">
                        <button class="archive-toggle" onclick="toggleArchive('archive1')">
                            <span>📜</span> Foundational Documents Archive
                        </button>
                        <div class="archive-content" id="archive1">
                            <a href="https://avalon.law.yale.edu/18th_century/fed01.asp" target="_blank" class="archive-link">
                                Federalist Papers - Full Collection
                            </a>
                            <a href="https://founders.archives.gov/" target="_blank" class="archive-link">
                                Founders Online - Washington, Jefferson, Adams
                            </a>
                            <a href="https://www.mountvernon.org/library/" target="_blank" class="archive-link">
                                George Washington's Papers
                            </a>
                            <a href="https://www.masshist.org/digitaladams/" target="_blank" class="archive-link">
                                Adams Family Papers
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Civil War Era -->
            <div class="era-card era-civilwar">
                <div class="era-header" onclick="toggleEra('era2')">
                    <div class="era-title">
                        <span class="era-icon">⚖️</span>
                        Civil War & Reconstruction (1861-1877)
                    </div>
                    <div class="era-date">Nation Divided</div>
                </div>
                <div class="era-content" id="era2">
                    <p><strong>Key Events:</strong> Emancipation Proclamation, Gettysburg Address, 13th Amendment</p>
                    
                    <div class="key-events">
                        <div class="event-card">
                            <div class="event-title">Emancipation Proclamation (1863)</div>
                            <p>Lincoln's executive order freeing slaves</p>
                            <div class="document-links">
                                <a href="https://www.archives.gov/exhibits/featured-documents/emancipation-proclamation" target="_blank" class="doc-link">
                                    Original Document
                                </a>
                                <a href="https://www.loc.gov/item/2021667573/" target="_blank" class="doc-link">
                                    Library of Congress Scan
                                </a>
                            </div>
                        </div>
                        
                        <div class="event-card">
                            <div class="event-title">Gettysburg Address (1863)</div>
                            <p>Lincoln's iconic speech</p>
                            <div class="document-links">
                                <a href="https://www.loc.gov/exhibits/gettysburg-address/" target="_blank" class="doc-link">
                                    All Five Manuscripts
                                </a>
                                <a href="https://www.nps.gov/gett/learn/historyculture/gettysburg-address.htm" target="_blank" class="doc-link">
                                    National Park Service
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Industrial Revolution -->
            <div class="era-card era-industrial">
                <div class="era-header" onclick="toggleEra('era3')">
                    <div class="era-title">
                        <span class="era-icon">🏭</span>
                        Industrial Revolution (1870-1914)
                    </div>
                    <div class="era-date">Economic Transformation</div>
                </div>
                <div class="era-content" id="era3">
                    <p><strong>Key Developments:</strong> Railroad expansion, Robber Barons, Labor movements</p>
                    
                    <div class="key-events">
                        <div class="event-card">
                            <div class="event-title">Sherman Antitrust Act (1890)</div>
                            <p>First federal act to limit monopolies</p>
                            <div class="document-links">
                                <a href="https://www.law.cornell.edu/uscode/text/15/1" target="_blank" class="doc-link">
                                    Current Law Text
                                </a>
                                <a href="https://www.archives.gov/milestone-documents/sherman-anti-trust-act" target="_blank" class="doc-link">
                                    Historical Context
                                </a>
                            </div>
                        </div>
                        
                        <div class="event-card">
                            <div class="event-title">Federal Reserve Act (1913)</div>
                            <p>Created central banking system</p>
                            <div class="document-links">
                                <a href="https://www.federalreserve.gov/aboutthefed/fract.htm" target="_blank" class="doc-link">
                                    Full Text
                                </a>
                                <a href="https://fraser.stlouisfed.org/title/federal-reserve-act-961" target="_blank" class="doc-link">
                                    Historical Documents
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- World Wars Era -->
            <div class="era-card era-worldwars">
                <div class="era-header" onclick="toggleEra('era4')">
                    <div class="era-title">
                        <span class="era-icon">🌍</span>
                        World Wars Era (1914-1945)
                    </div>
                    <div class="era-date">Global Power Emerges</div>
                </div>
                <div class="era-content" id="era4">
                    <p><strong>Key Events:</strong> Treaty of Versailles, New Deal, Pearl Harbor, Manhattan Project</p>
                    
                    <div class="key-events">
                        <div class="event-card">
                            <div class="event-title">New Deal Programs (1933-1939)</div>
                            <p>FDR's response to Great Depression</p>
                            <div class="document-links">
                                <a href="https://www.archives.gov/research/alic/reference/new-deal.html" target="_blank" class="doc-link">
                                    National Archives Guide
                                </a>
                                <a href="https://www.fdrlibrary.org/new-deal" target="_blank" class="doc-link">
                                    FDR Library
                                </a>
                            </div>
                        </div>
                        
                        <div class="event-card">
                            <div class="event-title">United Nations Charter (1945)</div>
                            <p>US role in founding UN</p>
                            <div class="document-links">
                                <a href="https://www.un.org/en/about-us/un-charter/full-text" target="_blank" class="doc-link">
                                    UN Charter Text
                                </a>
                                <a href="https://www.archives.gov/milestone-documents/united-nations-charter" target="_blank" class="doc-link">
                                    US Ratification
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cold War Era -->
            <div class="era-card era-coldwar">
                <div class="era-header" onclick="toggleEra('era5')">
                    <div class="era-title">
                        <span class="era-icon">☢️</span>
                        Cold War Era (1947-1991)
                    </div>
                    <div class="era-date">Superpower Conflict</div>
                </div>
                <div class="era-content" id="era5">
                    <p><strong>Key Events:</strong> Truman Doctrine, Space Race, Cuban Missile Crisis, Vietnam War</p>
                    
                    <div class="key-events">
                        <div class="event-card">
                            <div class="event-title">NATO Treaty (1949)</div>
                            <p>North Atlantic Treaty Organization</p>
                            <div class="document-links">
                                <a href="https://www.nato.int/cps/en/natohq/official_texts_17120.htm" target="_blank" class="doc-link">
                                    NATO Original Text
                                </a>
                                <a href="https://history.state.gov/historicaldocuments/frus1949v04/d24" target="_blank" class="doc-link">
                                    State Department Records
                                </a>
                            </div>
                        </div>
                        
                        <div class="event-card">
                            <div class="event-title">Civil Rights Act (1964)</div>
                            <p>Landmark civil rights legislation</p>
                            <div class="document-links">
                                <a href="https://www.archives.gov/milestone-documents/civil-rights-act" target="_blank" class="doc-link">
                                    National Archives
                                </a>
                                <a href="https://www.congress.gov/bill/88th-congress/house-bill/7152" target="_blank" class="doc-link">
                                    Congressional Record
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modern Era -->
            <div class="era-card era-modern">
                <div class="era-header" onclick="toggleEra('era6')">
                    <div class="era-title">
                        <span class="era-icon">💻</span>
                        Modern Era (1991-Present)
                    </div>
                    <div class="era-date">Digital Age & Globalization</div>
                </div>
                <div class="era-content" id="era6">
                    <p><strong>Key Developments:</strong> Internet revolution, War on Terror, 2008 Financial Crisis</p>
                    
                    <div class="key-events">
                        <div class="event-card">
                            <div class="event-title">9/11 Commission Report (2004)</div>
                            <p>Official investigation of September 11 attacks</p>
                            <div class="document-links">
                                <a href="https://9-11commission.gov/report/" target="_blank" class="doc-link">
                                    Full Report
                                </a>
                                <a href="https://www.archives.gov/research/9-11" target="_blank" class="doc-link">
                                    National Archives Collection
                                </a>
                            </div>
                        </div>
                        
                        <div class="event-card">
                            <div class="event-title">Affordable Care Act (2010)</div>
                            <p>Major healthcare reform</p>
                            <div class="document-links">
                                <a href="https://www.congress.gov/bill/111th-congress/house-bill/3590/text" target="_blank" class="doc-link">
                                    Full Legislation Text
                                </a>
                                <a href="https://www.healthcare.gov/" target="_blank" class="doc-link">
                                    Official Government Site
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="navigation">
            <a href="/history/money" class="nav-button">
                ⬅️ Previous: Monetary Systems
            </a>
            <a href="/history/europe" class="nav-button">
                Next: European History ➡️
            </a>
        </div>
        
        <div class="disclaimer">
            <p>🇺🇸 This page contains verified historical documents from U.S. National Archives, Library of Congress, and other official sources.</p>
            <p style="margin-top: 10px; font-size: 0.8rem;">
                Educational Resource | Primary Source Materials | Updated Regularly
            </p>
        </div>
    </div>
    
    <script>
        // Create stars background
        function createStars() {
            const starsBg = document.getElementById('starsBackground');
            for (let i = 0; i < 100; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.width = (5 + Math.random() * 15) + 'px';
                star.style.height = star.style.width;
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                starsBg.appendChild(star);
            }
        }
        
        // Toggle era content
        function toggleEra(eraId) {
            const content = document.getElementById(eraId);
            content.classList.toggle('expanded');
        }
        
        // Toggle archive content
        function toggleArchive(archiveId) {
            const content = document.getElementById(archiveId);
            content.classList.toggle('expanded');
        }
        
        // Animate statistics
        function animateStats() {
            const stats = document.querySelectorAll('.stat-number');
            stats.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-count'));
                let current = 0;
                const increment = target / 50;
                
                const update = () => {
                    if (current < target) {
                        current += increment;
                        stat.textContent = Math.floor(current);
                        setTimeout(update, 20);
                    } else {
                        stat.textContent = target;
                    }
                };
                update();
            });
        }
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            createStars();
            animateStats();
            
            // Auto-expand first era
            setTimeout(function() {
                toggleEra('era1');
            }, 500);
        });
    </script>
</body>
</html>`;
    
    res.send(usaContent);
});

// ============================================
// /history/europe - European History
// ============================================

app.get('/history/europe', (req, res) => {
    const europeContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>European History - From Ancient Civilizations to European Union</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Garamond', 'Palatino', serif;
        }
        
        :root {
            --eu-blue: #003399;
            --eu-gold: #FFCC00;
            --eu-stars: #FFFFFF;
            --renaissance-red: #C8102E;
            --enlightenment-blue: #0055A4;
            --modern-green: #008000;
        }
        
        body {
            background: linear-gradient(135deg, #f8f9ff 0%, #e6e9ff 100%);
            color: #333;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        .eu-stars-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--eu-blue);
            opacity: 0.03;
            z-index: -1;
        }
        
        .eu-star {
            position: absolute;
            color: var(--eu-gold);
            font-size: 1.5rem;
            opacity: 0.1;
            animation: twinkle 3s infinite alternate;
        }
        
        @keyframes twinkle {
            0% { opacity: 0.05; transform: scale(1); }
            100% { opacity: 0.15; transform: scale(1.1); }
        }
        
        .ring-pattern {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 30% 30%, transparent 20%, rgba(0, 51, 153, 0.02) 21%, transparent 22%),
                radial-gradient(circle at 70% 70%, transparent 20%, rgba(255, 204, 0, 0.02) 21%, transparent 22%);
            background-size: 100px 100px;
            z-index: -1;
            opacity: 0.5;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        
        header {
            text-align: center;
            padding: 60px 40px;
            background: linear-gradient(135deg, var(--eu-blue), #1a4dcc);
            color: var(--eu-stars);
            border-radius: 25px;
            margin-bottom: 50px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 15px 35px rgba(0, 51, 153, 0.2);
            border: 4px solid var(--eu-gold);
        }
        
        .eu-circle {
            position: absolute;
            width: 300px;
            height: 300px;
            border: 3px solid var(--eu-gold);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.1;
        }
        
        .eu-circle:nth-child(2) {
            width: 400px;
            height: 400px;
            opacity: 0.05;
        }
        
        h1 {
            font-size: 3.8rem;
            margin-bottom: 15px;
            position: relative;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .title-gradient {
            background: linear-gradient(45deg, var(--eu-stars), var(--eu-gold));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .subtitle {
            font-size: 1.4rem;
            opacity: 0.9;
            margin-bottom: 25px;
            font-style: italic;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .verification-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 204, 0, 0.2);
            padding: 12px 25px;
            border-radius: 30px;
            border: 2px solid var(--eu-gold);
            margin-top: 20px;
        }
        
        .timeline-container {
            position: relative;
            margin: 60px 0;
            padding-left: 50px;
        }
        
        .timeline-line {
            position: absolute;
            left: 25px;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(to bottom, var(--eu-blue), var(--eu-gold));
            border-radius: 2px;
        }
        
        .timeline-item {
            position: relative;
            margin-bottom: 60px;
            padding-left: 50px;
        }
        
        .timeline-marker {
            position: absolute;
            left: -35px;
            top: 0;
            width: 60px;
            height: 60px;
            background: var(--eu-blue);
            border: 4px solid var(--eu-gold);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--eu-stars);
            font-size: 1.5rem;
            z-index: 2;
            transition: all 0.3s ease;
        }
        
        .timeline-marker:hover {
            transform: scale(1.2);
            background: var(--eu-gold);
            color: var(--eu-blue);
        }
        
        .era-card {
            background: var(--eu-stars);
            border-radius: 20px;
            padding: 35px;
            box-shadow: 0 10px 30px rgba(0, 51, 153, 0.1);
            border: 2px solid transparent;
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
        }
        
        .era-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 51, 153, 0.15);
            border-color: var(--eu-gold);
        }
        
        .era-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, var(--eu-blue), var(--eu-gold));
        }
        
        .era-title {
            font-size: 1.8rem;
            color: var(--eu-blue);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .era-period {
            background: var(--eu-gold);
            color: var(--eu-blue);
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
            margin-left: auto;
        }
        
        .key-documents {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin-top: 25px;
        }
        
        .document-card {
            background: #f8f9ff;
            padding: 25px;
            border-radius: 15px;
            border: 1px solid #e0e5ff;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .document-card:hover {
            border-color: var(--eu-blue);
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(0, 51, 153, 0.1);
        }
        
        .doc-badge {
            position: absolute;
            top: -10px;
            right: 20px;
            background: var(--eu-blue);
            color: var(--eu-stars);
            padding: 5px 15px;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .doc-title {
            color: var(--eu-blue);
            font-size: 1.2rem;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .doc-description {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .doc-links {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .doc-link {
            display: inline-block;
            padding: 8px 18px;
            background: var(--eu-blue);
            color: var(--eu-stars);
            text-decoration: none;
            border-radius: 8px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .doc-link:hover {
            background: var(--eu-stars);
            color: var(--eu-blue);
            border-color: var(--eu-blue);
            transform: translateY(-2px);
        }
        
        .archive-section {
            background: linear-gradient(135deg, rgba(0, 51, 153, 0.05), rgba(255, 204, 0, 0.05));
            border-radius: 15px;
            padding: 30px;
            margin-top: 40px;
            border: 2px dashed var(--eu-gold);
        }
        
        .archive-toggle {
            background: linear-gradient(135deg, var(--eu-blue), #1a4dcc);
            color: var(--eu-stars);
            border: none;
            padding: 15px 30px;
            border-radius: 30px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 15px;
            margin: 0 auto;
            font-size: 1.1rem;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .archive-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 25px rgba(0, 51, 153, 0.3);
        }
        
        .archive-content {
            max-height: 0;
            overflow: hidden;
            transition: all 0.5s ease;
            margin-top: 0;
        }
        
        .archive-content.expanded {
            max-height: 2000px;
            margin-top: 30px;
        }
        
        .archive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        
        .archive-item {
            background: rgba(255, 255, 255, 0.9);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #e0e5ff;
        }
        
        .archive-item a {
            color: var(--eu-blue);
            text-decoration: none;
            display: block;
            padding: 10px 0;
            border-bottom: 1px solid #e0e5ff;
            transition: all 0.3s ease;
        }
        
        .archive-item a:hover {
            color: var(--eu-gold);
            padding-left: 10px;
        }
        
        .stats-eu {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 25px;
            margin: 50px 0;
            padding: 40px;
            background: linear-gradient(135deg, var(--eu-blue), #1a4dcc);
            border-radius: 20px;
            color: var(--eu-stars);
        }
        
        .stat-eu {
            text-align: center;
            padding: 25px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .stat-number-eu {
            font-size: 3rem;
            font-weight: bold;
            color: var(--eu-gold);
            margin-bottom: 10px;
        }
        
        .stat-label-eu {
            font-size: 1rem;
            opacity: 0.9;
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            padding: 40px 0;
            border-top: 2px solid #e0e5ff;
            margin-top: 50px;
        }
        
        .nav-button {
            padding: 15px 30px;
            background: linear-gradient(135deg, var(--eu-blue), var(--eu-gold));
            color: var(--eu-stars);
            text-decoration: none;
            border-radius: 12px;
            font-weight: bold;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 5px 15px rgba(0, 51, 153, 0.2);
        }
        
        .nav-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(0, 51, 153, 0.3);
        }
        
        .disclaimer {
            text-align: center;
            padding: 25px;
            color: #666;
            font-size: 0.9rem;
            background: #f8f9ff;
            border-radius: 15px;
            margin-top: 40px;
            border: 1px solid #e0e5ff;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }
            
            .timeline-container {
                padding-left: 30px;
            }
            
            .timeline-marker {
                width: 50px;
                height: 50px;
                left: -25px;
                font-size: 1.2rem;
            }
            
            .era-card {
                padding: 25px;
            }
            
            .key-documents {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
                gap: 20px;
            }
            
            .stats-eu {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="eu-stars-bg" id="euStarsBg"></div>
    <div class="ring-pattern"></div>
    
    <div class="container">
        <header>
            <div class="eu-circle"></div>
            <div class="eu-circle"></div>
            <h1><span class="title-gradient">European History</span></h1>
            <div class="subtitle">From Ancient Civilizations to European Union - The Continental Journey</div>
            <div class="verification-badge">
                <span>🏛️</span> EU Official Archives & Historical Institutions
            </div>
        </header>
        
        <div class="stats-eu">
            <div class="stat-eu">
                <div class="stat-number-eu" data-count="27">27</div>
                <div class="stat-label-eu">European Union Member States</div>
            </div>
            <div class="stat-eu">
                <div class="stat-number-eu" data-count="2000">2000+</div>
                <div class="stat-label-eu">Years of Recorded History</div>
            </div>
            <div class="stat-eu">
                <div class="stat-number-eu" data-count="24">24</div>
                <div class="stat-label-eu">Official EU Languages</div>
            </div>
            <div class="stat-eu">
                <div class="stat-number-eu" data-count="447">447M</div>
                <div class="stat-label-eu">EU Population</div>
            </div>
        </div>
        
        <div class="timeline-container">
            <div class="timeline-line"></div>
            
            <!-- Ancient Civilizations -->
            <div class="timeline-item">
                <div class="timeline-marker" onclick="toggleEra('era1')">🏺</div>
                <div class="era-card" id="era1">
                    <div class="era-title">
                        Ancient Civilizations
                        <div class="era-period">3000 BCE - 500 CE</div>
                    </div>
                    <p><strong>Key Civilizations:</strong> Greek democracy, Roman Empire, Celtic cultures</p>
                    
                    <div class="key-documents">
                        <div class="document-card">
                            <div class="doc-badge">🇬🇷</div>
                            <div class="doc-title">Code of Justinian (529-534 CE)</div>
                            <div class="doc-description">Corpus Juris Civilis - Foundation of Roman law and modern legal systems</div>
                            <div class="doc-links">
                                <a href="https://droitromain.univ-grenoble-alpes.fr/" target="_blank" class="doc-link">
                                    Roman Law Archive
                                </a>
                                <a href="https://www.britannica.com/topic/Code-of-Justinian" target="_blank" class="doc-link">
                                    Encyclopedia
                                </a>
                            </div>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-badge">🏛️</div>
                            <div class="doc-title">Magna Graecia Collections</div>
                            <div class="doc-description">Greek colonies in Southern Italy archaeological records</div>
                            <div class="doc-links">
                                <a href="https://www.metmuseum.org/toah/hd/grarc/hd_grarc.htm" target="_blank" class="doc-link">
                                    Metropolitan Museum
                                </a>
                                <a href="https://www.britishmuseum.org/collection/galleries/greece-and-rome" target="_blank" class="doc-link">
                                    British Museum
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Middle Ages -->
            <div class="timeline-item">
                <div class="timeline-marker" onclick="toggleEra('era2')">🏰</div>
                <div class="era-card" id="era2">
                    <div class="era-title">
                        Middle Ages & Feudalism
                        <div class="era-period">500 - 1500 CE</div>
                    </div>
                    <p><strong>Key Developments:</strong> Holy Roman Empire, Crusades, Magna Carta, Black Death</p>
                    
                    <div class="key-documents">
                        <div class="document-card">
                            <div class="doc-badge">🇬🇧</div>
                            <div class="doc-title">Magna Carta (1215)</div>
                            <div class="doc-description">Great Charter limiting royal power, foundation of constitutional law</div>
                            <div class="doc-links">
                                <a href="https://www.bl.uk/magna-carta" target="_blank" class="doc-link">
                                    British Library
                                </a>
                                <a href="https://www.nationalarchives.gov.uk/education/resources/magna-carta/" target="_blank" class="doc-link">
                                    National Archives UK
                                </a>
                            </div>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-badge">🇻🇦</div>
                            <div class="doc-title">Papal Bull Archive</div>
                            <div class="doc-description">Vatican documents from medieval period</div>
                            <div class="doc-links">
                                <a href="https://www.vatican.va/archive/index.htm" target="_blank" class="doc-link">
                                    Vatican Archives
                                </a>
                                <a href="https://sourcebooks.fordham.edu/source/source-med.html" target="_blank" class="doc-link">
                                    Medieval Sourcebook
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Renaissance -->
            <div class="timeline-item">
                <div class="timeline-marker" onclick="toggleEra('era3')">🎨</div>
                <div class="era-card" id="era3">
                    <div class="era-title">
                        Renaissance & Reformation
                        <div class="era-period">1300 - 1600 CE</div>
                    </div>
                    <p><strong>Key Movements:</strong> Italian Renaissance, Protestant Reformation, Scientific Revolution</p>
                    
                    <div class="key-documents">
                        <div class="document-card">
                            <div class="doc-badge">🇮🇹</div>
                            <div class="doc-title">Treaty of Tordesillas (1494)</div>
                            <div class="doc-description">Divided New World between Spain and Portugal</div>
                            <div class="doc-links">
                                <a href="https://avalon.law.yale.edu/15th_century/mod001.asp" target="_blank" class="doc-link">
                                    Yale Law Archive
                                </a>
                                <a href="https://www.archives.gov/milestone-documents/treaty-of-tordesillas" target="_blank" class="doc-link">
                                    US National Archives
                                </a>
                            </div>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-badge">🇩🇪</div>
                            <div class="doc-title">95 Theses (1517)</div>
                            <div class="doc-description">Martin Luther's protest that started Protestant Reformation</div>
                            <div class="doc-links">
                                <a href="https://www.luther.de/en/95thesen.html" target="_blank" class="doc-link">
                                    Luther 95 Theses
                                </a>
                                <a href="https://www.projectwittenberg.org/pub/resources/text/wittenberg/luther/web/ninetyfive.html" target="_blank" class="doc-link">
                                    Project Wittenberg
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Enlightenment -->
            <div class="timeline-item">
                <div class="timeline-marker" onclick="toggleEra('era4')">💡</div>
                <div class="era-card" id="era4">
                    <div class="era-title">
                        Enlightenment & Revolution
                        <div class="era-period">1600 - 1800 CE</div>
                    </div>
                    <p><strong>Key Events:</strong> French Revolution, Napoleonic Wars, Industrial Revolution begins</p>
                    
                    <div class="key-documents">
                        <div class="document-card">
                            <div class="doc-badge">🇫🇷</div>
                            <div class="doc-title">Declaration of the Rights of Man (1789)</div>
                            <div class="doc-description">French Revolution's foundational document</div>
                            <div class="doc-links">
                                <a href="https://www.conseil-constitutionnel.fr/en/declaration-of-the-rights-of-man-and-of-the-citizen-of-26-august-1789" target="_blank" class="doc-link">
                                    Constitutional Council
                                </a>
                                <a href="https://avalon.law.yale.edu/18th_century/rightsof.asp" target="_blank" class="doc-link">
                                    Yale Avalon Project
                                </a>
                            </div>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-badge">🌍</div>
                            <div class="doc-title">Congress of Vienna (1815)</div>
                            <div class="doc-description">Redrew European map after Napoleonic Wars</div>
                            <div class="doc-links">
                                <a href="https://history.state.gov/milestones/1801-1829/congress-vienna" target="_blank" class="doc-link">
                                    US State Department
                                </a>
                                <a href="https://www.britannica.com/event/Congress-of-Vienna" target="_blank" class="doc-link">
                                    Encyclopedia Britannica
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- World Wars -->
            <div class="timeline-item">
                <div class="timeline-marker" onclick="toggleEra('era5')">⚔️</div>
                <div class="era-card" id="era5">
                    <div class="era-title">
                        World Wars Era
                        <div class="era-period">1914 - 1945</div>
                    </div>
                    <p><strong>Key Events:</strong> Treaty of Versailles, Rise of Fascism, Holocaust, WWII</p>
                    
                    <div class="key-documents">
                        <div class="document-card">
                            <div class="doc-badge">🇫🇷</div>
                            <div class="doc-title">Treaty of Versailles (1919)</div>
                            <div class="doc-description">Ended WWI, imposed reparations on Germany</div>
                            <div class="doc-links">
                                <a href="https://www.loc.gov/law/help/us-treaties/bevans/m-ust000002-0043.pdf" target="_blank" class="doc-link">
                                    Library of Congress PDF
                                </a>
                                <a href="https://www.archives.gov/milestone-documents/treaty-of-versailles" target="_blank" class="doc-link">
                                    US National Archives
                                </a>
                            </div>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-badge">🇺🇳</div>
                            <div class="doc-title">Universal Declaration of Human Rights (1948)</div>
                            <div class="doc-description">Response to WWII atrocities, drafted with European leadership</div>
                            <div class="doc-links">
                                <a href="https://www.un.org/en/about-us/universal-declaration-of-human-rights" target="_blank" class="doc-link">
                                    United Nations
                                </a>
                                <a href="https://www.ohchr.org/en/human-rights/universal-declaration/translations/english" target="_blank" class="doc-link">
                                    OHCHR Official
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- European Union -->
            <div class="timeline-item">
                <div class="timeline-marker" onclick="toggleEra('era6')">🇪🇺</div>
                <div class="era-card" id="era6">
                    <div class="era-title">
                        European Union Formation
                        <div class="era-period">1951 - Present</div>
                    </div>
                    <p><strong>Key Developments:</strong> ECSC, Treaty of Rome, Maastricht Treaty, Euro currency</p>
                    
                    <div class="key-documents">
                        <div class="document-card">
                            <div class="doc-badge">🇪🇺</div>
                            <div class="doc-title">Treaty of Rome (1957)</div>
                            <div class="doc-description">Established European Economic Community, foundation of EU</div>
                            <div class="doc-links">
                                <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:11957E/TXT" target="_blank" class="doc-link">
                                    EUR-Lex Official
                                </a>
                                <a href="https://www.cvce.eu/en/education/unit-content/-/unit/02bb76df-d066-4c08-a58a-d4686a3e68ff/61c5b2ae-fc5a-4b08-b3c0-9a9bb8f77f9f" target="_blank" class="doc-link">
                                    CVCE Historical Archives
                                </a>
                            </div>
                        </div>
                        
                        <div class="document-card">
                            <div class="doc-badge">🇪🇺</div>
                            <div class="doc-title">Maastricht Treaty (1992)</div>
                            <div class="doc-description">Formally established European Union and Euro currency</div>
                            <div class="doc-links">
                                <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A11992M%2FTXT" target="_blank" class="doc-link">
                                    EUR-Lex Official
                                </a>
                                <a href="https://europa.eu/european-union/sites/default/files/archives/docs/maastricht_en.pdf" target="_blank" class="doc-link">
                                    Official PDF
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="archive-section">
                        <button class="archive-toggle" onclick="toggleArchive('euArchive')">
                            <span>📚</span> European Union Digital Archives
                        </button>
                        <div class="archive-content" id="euArchive">
                            <div class="archive-grid">
                                <div class="archive-item">
                                    <h4>EU Official Portals</h4>
                                    <a href="https://eur-lex.europa.eu/" target="_blank">EUR-Lex: EU Law Database</a>
                                    <a href="https://publications.europa.eu/" target="_blank">EU Publications Office</a>
                                    <a href="https://www.consilium.europa.eu/en/documents-publications/" target="_blank">Council of EU Documents</a>
                                </div>
                                <div class="archive-item">
                                    <h4>Historical Archives</h4>
                                    <a href="https://www.cvce.eu/" target="_blank">CVCE: European Integration Studies</a>
                                    <a href="https://archives.eui.eu/" target="_blank">European University Institute Archives</a>
                                    <a href="https://www.europarl.europa.eu/thinktank/en/home.html" target="_blank">EPRS: European Parliament Research</a>
                                </div>
                                <div class="archive-item">
                                    <h4>National Archives</h4>
                                    <a href="https://www.nationalarchives.gov.uk/" target="_blank">UK National Archives</a>
                                    <a href="https://www.archives-nationales.culture.gouv.fr/" target="_blank">French National Archives</a>
                                    <a href="https://www.bundesarchiv.de/" target="_blank">German Federal Archives</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="navigation">
            <a href="/history/usa" class="nav-button">
                ⬅️ Previous: United States History
            </a>
            <a href="/history/middle-east" class="nav-button">
                Next: Middle Eastern History ➡️
            </a>
        </div>
        
        <div class="disclaimer">
            <p>🇪🇺 This page contains documents from European Union institutions, national archives, and verified historical sources.</p>
            <p style="margin-top: 10px; font-size: 0.8rem;">
                European Historical Resource | Multilingual Sources | Regularly Updated
            </p>
        </div>
    </div>
    
    <script>
        // Create EU stars background
        function createEUStars() {
            const starsBg = document.getElementById('euStarsBg');
            for (let i = 0; i < 80; i++) {
                const star = document.createElement('div');
                star.className = 'eu-star';
                star.innerHTML = '★';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.animationDelay = (Math.random() * 5) + 's';
                star.style.fontSize = (10 + Math.random() * 20) + 'px';
                starsBg.appendChild(star);
            }
        }
        
        // Toggle era content
        function toggleEra(eraId) {
            const content = document.getElementById(eraId);
            content.classList.toggle('expanded');
            
            // Scroll to era if expanding
            if (content.classList.contains('expanded')) {
                content.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        // Toggle archive content
        function toggleArchive(archiveId) {
            const content = document.getElementById(archiveId);
            content.classList.toggle('expanded');
        }
        
        // Animate EU statistics
        function animateEUStats() {
            const stats = document.querySelectorAll('.stat-number-eu');
            stats.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-count'));
                let current = 0;
                const increment = target / 60;
                
                const update = () => {
                    if (current < target) {
                        current += increment;
                        if (target > 100) {
                            stat.textContent = Math.floor(current) + 'M';
                        } else {
                            stat.textContent = Math.floor(current);
                        }
                        setTimeout(update, 20);
                    } else {
                        stat.textContent = target > 100 ? target + 'M' : target;
                    }
                };
                update();
            });
        }
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            createEUStars();
            animateEUStats();
            
            // Auto-expand first era
            setTimeout(function() {
                toggleEra('era1');
            }, 800);
        });
    </script>
</body>
</html>`;
    
    res.send(europeContent);
});

// ============================================
// /history/middle-east - Middle Eastern History
// ============================================

app.get('/history/middle-east', (req, res) => {
    const middleEastContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Middle Eastern History - Cradle of Civilization to Modern Geopolitics</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
        }
        
        :root {
            --islamic-green: #006400;
            --arabic-gold: #D4AF37;
            --persian-blue: #1C39BB;
            --ottoman-red: #CE1126;
            --desert-sand: #F5DEB3;
        }
        
        body {
            background: linear-gradient(135deg, #f5f1e6 0%, #e8dfca 100%);
            color: #333;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        .arabesque-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 20% 80%, rgba(0, 100, 0, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 50%);
            z-index: -1;
        }
        
        .geometric-pattern {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 100, 0, 0.02) 10px, rgba(0, 100, 0, 0.02) 20px);
            z-index: -1;
            opacity: 0.3;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        
        header {
            text-align: center;
            padding: 60px 40px;
            background: linear-gradient(135deg, var(--islamic-green), #008000);
            color: white;
            border-radius: 20px;
            margin-bottom: 50px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 15px 35px rgba(0, 100, 0, 0.2);
            border: 4px solid var(--arabic-gold);
        }
        
        .islamic-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path d="M50,0 C77.614,0 100,22.386 100,50 C100,77.614 77.614,100 50,100 C22.386,100 0,77.614 0,50 C0,22.386 22.386,0 50,0 Z" fill="none" stroke="%23D4AF37" stroke-width="1" opacity="0.1"/></svg>');
            background-size: 100px;
            opacity: 0.3;
        }
        
        h1 {
            font-size: 3.5rem;
            margin-bottom: 15px;
            position: relative;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .title-arabic {
            font-family: 'Georgia', serif;
            background: linear-gradient(45deg, var(--arabic-gold), white, var(--arabic-gold));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .subtitle {
            font-size: 1.4rem;
            opacity: 0.9;
            margin-bottom: 20px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .civilization-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin: 50px 0;
        }
        
        .civilization-card {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: all 0.4s ease;
            border: 2px solid transparent;
            position: relative;
        }
        
        .civilization-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-color: var(--arabic-gold);
        }
        
        .card-header {
            padding: 25px;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .card-1 .card-header { background: linear-gradient(135deg, #8B4513, #D2691E); }
        .card-2 .card-header { background: linear-gradient(135deg, #228B22, #32CD32); }
        .card-3 .card-header { background: linear-gradient(135deg, #B22222, #DC143C); }
        .card-4 .card-header { background: linear-gradient(135deg, #1C39BB, #4169E1); }
        .card-5 .card-header { background: linear-gradient(135deg, #8B0000, #B22222); }
        .card-6 .card-header { background: linear-gradient(135deg, #006400, #228B22); }
        
        .civilization-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            text-align: center;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .civilization-title {
            font-size: 1.8rem;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .civilization-period {
            font-size: 0.9rem;
            opacity: 0.9;
            text-align: center;
        }
        
        .card-body {
            padding: 25px;
        }
        
        .key-achievements {
            list-style: none;
            margin-top: 15px;
        }
        
        .key-achievements li {
            padding: 8px 0;
            border-bottom: 1px dashed #eee;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .key-achievements li:before {
            content: "★";
            color: var(--arabic-gold);
        }
        
        .document-links {
            margin-top: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .doc-link {
            display: inline-block;
            padding: 8px 15px;
            background: var(--islamic-green);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .doc-link:hover {
            background: var(--arabic-gold);
            color: #333;
            transform: scale(1.05);
        }
        
        .modern-issues {
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.05), rgba(0, 100, 0, 0.05));
            border-radius: 20px;
            padding: 40px;
            margin: 50px 0;
            border: 2px solid var(--arabic-gold);
        }
        
        .issues-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        
        .issue-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .issue-title {
            color: var(--islamic-green);
            font-size: 1.2rem;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .resource-archive {
            background: #f8f5ee;
            border-radius: 15px;
            padding: 30px;
            margin-top: 40px;
            border: 2px dashed var(--arabic-gold);
        }
        
        .archive-toggle {
            background: linear-gradient(135deg, var(--islamic-green), var(--persian-blue));
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 30px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 15px;
            margin: 0 auto;
            font-size: 1.1rem;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .archive-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 25px rgba(0, 100, 0, 0.3);
        }
        
        .archive-content {
            max-height: 0;
            overflow: hidden;
            transition: all 0.5s ease;
            margin-top: 0;
        }
        
        .archive-content.expanded {
            max-height: 2000px;
            margin-top: 30px;
        }
        
        .archive-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .archive-column h4 {
            color: var(--islamic-green);
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--arabic-gold);
        }
        
        .archive-column a {
            color: #555;
            text-decoration: none;
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: block;
            transition: all 0.3s ease;
        }
        
        .archive-column a:hover {
            color: var(--islamic-green);
            padding-left: 15px;
            background: #f0f0f0;
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            padding: 40px 0;
            border-top: 2px solid #e0dcc9;
            margin-top: 50px;
        }
        
        .nav-button {
            padding: 15px 30px;
            background: linear-gradient(135deg, var(--islamic-green), var(--arabic-gold));
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: bold;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 5px 15px rgba(0, 100, 0, 0.2);
        }
        
        .nav-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(0, 100, 0, 0.3);
        }
        
        .disclaimer {
            text-align: center;
            padding: 25px;
            color: #666;
            font-size: 0.9rem;
            background: #f8f5ee;
            border-radius: 15px;
            margin-top: 40px;
            border: 1px solid #e0dcc9;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }
            
            .civilization-grid {
                grid-template-columns: 1fr;
            }
            
            .issues-grid {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
                gap: 20px;
            }
            
            .archive-links {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="arabesque-bg"></div>
    <div class="geometric-pattern"></div>
    
    <div class="container">
        <header>
            <div class="islamic-pattern"></div>
            <h1><span class="title-arabic">Middle Eastern History</span></h1>
            <div class="subtitle">Cradle of Civilization • Birthplace of Three Abrahamic Faiths • Crossroads of Empires</div>
            <div style="margin-top: 20px; display: inline-block; padding: 10px 25px; background: rgba(212, 175, 55, 0.2); border-radius: 25px; border: 2px solid var(--arabic-gold);">
                <span style="color: var(--arabic-gold);">📜</span> Archaeological & Historical Archives <span style="color: var(--arabic-gold);">📜</span>
            </div>
        </header>
        
        <div class="civilization-grid">
            <!-- Mesopotamia -->
            <div class="civilization-card card-1">
                <div class="card-header">
                    <div class="civilization-icon">🏺</div>
                    <div class="civilization-title">Mesopotamia</div>
                    <div class="civilization-period">3500 BCE - 500 BCE</div>
                </div>
                <div class="card-body">
                    <p><strong>Key Cities:</strong> Sumer, Babylon, Assyria</p>
                    <ul class="key-achievements">
                        <li>First writing system (Cuneiform)</li>
                        <li>Code of Hammurabi</li>
                        <li>Early mathematics & astronomy</li>
                    </ul>
                    <div class="document-links">
                        <a href="https://www.britishmuseum.org/collection/galleries/mesopotamia" target="_blank" class="doc-link">
                            British Museum
                        </a>
                        <a href="https://www.metmuseum.org/toah/hd/mesp/hd_mesp.htm" target="_blank" class="doc-link">
                            Metropolitan Museum
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Ancient Egypt -->
            <div class="civilization-card card-2">
                <div class="card-header">
                    <div class="civilization-icon">🐫</div>
                    <div class="civilization-title">Ancient Egypt</div>
                    <div class="civilization-period">3100 BCE - 332 BCE</div>
                </div>
                <div class="card-body">
                    <p><strong>Key Dynasties:</strong> Old, Middle, New Kingdoms</p>
                    <ul class="key-achievements">
                        <li>Hieroglyphic writing</li>
                        <li>Pyramid architecture</li>
                        <li>Advanced medicine</li>
                    </ul>
                    <div class="document-links">
                        <a href="https://www.egyptianmuseum.org/" target="_blank" class="doc-link">
                            Egyptian Museum
                        </a>
                        <a href="https://www.britishmuseum.org/collection/galleries/egyptian-sculpture" target="_blank" class="doc-link">
                            Egyptian Galleries
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Persian Empire -->
            <div class="civilization-card card-3">
                <div class="card-header">
                    <div class="civilization-icon">👑</div>
                    <div class="civilization-title">Persian Empire</div>
                    <div class="civilization-period">550 BCE - 651 CE</div>
                </div>
                <div class="card-body">
                    <p><strong>Key Rulers:</strong> Cyrus the Great, Darius I</p>
                    <ul class="key-achievements">
                        <li>Royal Road infrastructure</li>
                        <li>Cyrus Cylinder (human rights)</li>
                        <li>Zoroastrianism</li>
                    </ul>
                    <div class="document-links">
                        <a href="https://www.livius.org/sources/content/achaemenid-royal-inscriptions/" target="_blank" class="doc-link">
                            Royal Inscriptions
                        </a>
                        <a href="https://www.getty.edu/art/exhibitions/persia/" target="_blank" class="doc-link">
                            Getty Exhibitions
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Islamic Golden Age -->
            <div class="civilization-card card-4">
                <div class="card-header">
                    <div class="civilization-icon">📚</div>
                    <div class="civilization-title">Islamic Golden Age</div>
                    <div class="civilization-period">750 CE - 1258 CE</div>
                </div>
                <div class="card-body">
                    <p><strong>Key Centers:</strong> Baghdad, Cordoba, Cairo</p>
                    <ul class="key-achievements">
                        <li>House of Wisdom</li>
                        <li>Advancements in algebra</li>
                        <li>Medical encyclopedia</li>
                    </ul>
                    <div class="document-links">
                        <a href="https://www.metmuseum.org/toah/hd/isla/hd_isla.htm" target="_blank" class="doc-link">
                            Islamic Art History
                        </a>
                        <a href="https://www.loc.gov/exhibits/house-of-wisdom/" target="_blank" class="doc-link">
                            House of Wisdom Exhibit
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Ottoman Empire -->
            <div class="civilization-card card-5">
                <div class="card-header">
                    <div class="civilization-icon">🏰</div>
                    <div class="civilization-title">Ottoman Empire</div>
                    <div class="civilization-period">1299 CE - 1922 CE</div>
                </div>
                <div class="card-body">
                    <p><strong>Key Period:</strong> Conquest of Constantinople</p>
                    <ul class="key-achievements">
                        <li>Millet system</li>
                        <li>Islamic architecture</li>
                        <li>Transcontinental trade</li>
                    </ul>
                    <div class="document-links">
                        <a href="https://www.topkapisarayi.gov.tr/en" target="_blank" class="doc-link">
                            Topkapi Palace Archives
                        </a>
                        <a href="https://www.metmuseum.org/toah/hd/otto/hd_otto.htm" target="_blank" class="doc-link">
                            Ottoman Art History
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Modern Middle East -->
            <div class="civilization-card card-6">
                <div class="card-header">
                    <div class="civilization-icon">🕊️</div>
                    <div class="civilization-title">Modern Era</div>
                    <div class="civilization-period">1918 CE - Present</div>
                </div>
                <div class="card-body">
                    <p><strong>Key Events:</strong> Sykes-Picot, Oil Discovery</p>
                    <ul class="key-achievements">
                        <li>OPEC formation</li>
                        <li>Arab-Israeli conflicts</li>
                        <li>Modern state system</li>
                    </ul>
                    <div class="document-links">
                        <a href="https://unispal.un.org/" target="_blank" class="doc-link">
                            UN Palestine Archives
                        </a>
                        <a href="https://www.archives.gov/research/foreign-policy/middle-east" target="_blank" class="doc-link">
                            US Foreign Policy
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modern-issues">
            <h2 style="color: var(--islamic-green); text-align: center; margin-bottom: 20px;">Contemporary Issues & Resources</h2>
            <div class="issues-grid">
                <div class="issue-card">
                    <div class="issue-title">🏛️ Regional Organizations</div>
                    <ul style="list-style: none; margin-top: 10px;">
                        <li><a href="https://www.arab.org/" target="_blank" style="color: var(--persian-blue);">Arab League</a></li>
                        <li><a href="https://www.oic-oci.org/" target="_blank" style="color: var(--persian-blue);">Organization of Islamic Cooperation</a></li>
                        <li><a href="https://www.opec.org/" target="_blank" style="color: var(--persian-blue);">OPEC</a></li>
                    </ul>
                </div>
                
                <div class="issue-card">
                    <div class="issue-title">📊 Economic Data</div>
                    <ul style="list-style: none; margin-top: 10px;">
                        <li><a href="https://data.worldbank.org/region/middle-east-and-north-africa" target="_blank" style="color: var(--persian-blue);">World Bank MENA Data</a></li>
                        <li><a href="https://www.imf.org/en/Countries/MENAP" target="_blank" style="color: var(--persian-blue);">IMF Middle East Reports</a></li>
                        <li><a href="https://www.mei.edu/" target="_blank" style="color: var(--persian-blue);">Middle East Institute</a></li>
                    </ul>
                </div>
                
                <div class="issue-card">
                    <div class="issue-title">📚 Academic Research</div>
                    <ul style="list-style: none; margin-top: 10px;">
                        <li><a href="https://www.h-net.org/~mideast/" target="_blank" style="color: var(--persian-blue);">H-Middle East</a></li>
                        <li><a href="https://www.cambridge.org/core/journals/international-journal-of-middle-east-studies" target="_blank" style="color: var(--persian-blue);">IJMES Journal</a></li>
                        <li><a href="https://www.mesana.org/" target="_blank" style="color: var(--persian-blue);">Middle East Studies Association</a></li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="resource-archive">
            <button class="archive-toggle" onclick="toggleArchive('middleEastArchive')">
                <span>🏺</span> Middle Eastern Digital Archives & Museums
            </button>
            <div class="archive-content" id="middleEastArchive">
                <div class="archive-links">
                    <div class="archive-column">
                        <h4>Museum Collections</h4>
                        <a href="https://www.britishmuseum.org/collection/galleries/middle-east" target="_blank">British Museum - Middle East</a>
                        <a href="https://www.louvre.fr/en/departments/oriental-antiquities" target="_blank">Louvre - Oriental Antiquities</a>
                        <a href="https://www.metmuseum.org/about-the-met/collection-areas/ancient-near-eastern-art" target="_blank">Met Museum - Ancient Near East</a>
                        <a href="https://www.pergamonmuseum.de/en/collection/vorderasiatisches-museum" target="_blank">Pergamon Museum</a>
                    </div>
                    
                    <div class="archive-column">
                        <h4>Digital Libraries</h4>
                        <a href="https://www.loc.gov/collections/arabic-and-middle-eastern-literature/" target="_blank">Library of Congress - Arabic</a>
                        <a href="https://www.qdl.qa/en" target="_blank">Qatar Digital Library</a>
                        <a href="https://www.wdl.org/en/" target="_blank">World Digital Library</a>
                        <a href="https://www.islamicmanuscripts.info/" target="_blank">Islamic Manuscripts</a>
                    </div>
                    
                    <div class="archive-column">
                        <h4>Archaeological Resources</h4>
                        <a href="https://oi.uchicago.edu/" target="_blank">University of Chicago - Oriental Institute</a>
                        <a href="https://www.harvardartmuseums.org/collections/department/ancient-mediterranean-and-near-eastern" target="_blank">Harvard Ancient Collections</a>
                        <a href="https://www.asor.org/" target="_blank">American Society of Overseas Research</a>
                        <a href="https://www.biblicalarchaeology.org/" target="_blank">Biblical Archaeology Society</a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="navigation">
            <a href="/history/europe" class="nav-button">
                ⬅️ Previous: European History
            </a>
            <a href="/history/asia" class="nav-button">
                Next: Asian Civilizations ➡️
            </a>
        </div>
        
        <div class="disclaimer">
            <p>🏺 This page contains resources from museums, universities, and archaeological institutions specializing in Middle Eastern studies.</p>
            <p style="margin-top: 10px; font-size: 0.8rem;">
                Academic Resource | Multidisciplinary Approach | Regular Updates
            </p>
        </div>
    </div>
    
    <script>
        // Toggle archive content
        function toggleArchive(archiveId) {
            const content = document.getElementById(archiveId);
            content.classList.toggle('expanded');
        }
        
        // Add animation to civilization cards on scroll
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.civilization-card');
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, { threshold: 0.1 });
            
            cards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'all 0.6s ease';
                observer.observe(card);
            });
            
            // Auto-expand archive after 2 seconds
            setTimeout(function() {
                toggleArchive('middleEastArchive');
            }, 2000);
        });
    </script>
</body>
</html>`;
    
    res.send(middleEastContent);
});

// ============================================
// /history/asia - Asian History & Civilizations
// ============================================

app.get('/history/asia', (req, res) => {
    const asiaContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asian History - Ancient Civilizations to Modern Nations</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --imperial-red: #DE2910;
            --golden-yellow: #FFDE00;
            --jade-green: #00A86B;
            --lotus-pink: #E0115F;
            --silk-white: #FAF0E6;
            --bamboo-green: #7BA05B;
        }
        
        body {
            background: linear-gradient(135deg, #fffaf0 0%, #fff5ee 100%);
            color: #333;
            min-height: 100vh;
            font-family: 'Segoe UI', 'Noto Sans', 'Microsoft YaHei', sans-serif;
            position: relative;
            overflow-x: hidden;
        }
        
        .asian-pattern-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(222, 41, 16, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 90% 80%, rgba(0, 168, 107, 0.03) 0%, transparent 50%);
            z-index: -1;
        }
        
        .lotus-pattern {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path d="M50,20 C60,10 80,10 90,20 C100,30 100,50 90,60 C80,70 60,70 50,60 C40,70 20,70 10,60 C0,50 0,30 10,20 C20,10 40,10 50,20 Z" fill="none" stroke="%2300A86B" stroke-width="0.5" opacity="0.1"/></svg>');
            background-size: 100px;
            z-index: -1;
            opacity: 0.3;
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        
        header {
            text-align: center;
            padding: 70px 40px;
            background: linear-gradient(135deg, var(--imperial-red), #ff4d4d);
            color: var(--silk-white);
            border-radius: 25px;
            margin-bottom: 60px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(222, 41, 16, 0.2);
            border: 6px solid var(--golden-yellow);
        }
        
        .dragon-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><path d="M20,100 Q50,50 100,50 Q150,50 180,100 Q150,150 100,150 Q50,150 20,100 Z" fill="none" stroke="%23FFDE00" stroke-width="2" opacity="0.1"/></svg>');
            background-size: 200px;
            opacity: 0.2;
        }
        
        h1 {
            font-size: 4rem;
            margin-bottom: 20px;
            position: relative;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
            font-weight: 800;
        }
        
        .title-characters {
            display: inline-block;
            background: linear-gradient(45deg, var(--golden-yellow), white, var(--jade-green));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
        }
        
        .subtitle {
            font-size: 1.6rem;
            opacity: 0.95;
            margin-bottom: 30px;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
            line-height: 1.6;
        }
        
        .verification-badge {
            display: inline-flex;
            align-items: center;
            gap: 15px;
            background: rgba(255, 222, 0, 0.2);
            padding: 15px 30px;
            border-radius: 40px;
            border: 3px solid var(--golden-yellow);
            font-size: 1.1rem;
            margin-top: 25px;
        }
        
        .region-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 35px;
            margin: 60px 0;
        }
        
        .region-card {
            background: white;
            border-radius: 25px;
            overflow: hidden;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            transition: all 0.5s ease;
            border: 3px solid transparent;
            position: relative;
        }
        
        .region-card:hover {
            transform: translateY(-12px) scale(1.02);
            box-shadow: 0 25px 50px rgba(0,0,0,0.2);
            border-color: var(--imperial-red);
        }
        
        .card-header {
            padding: 30px;
            color: white;
            position: relative;
            overflow: hidden;
            min-height: 180px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        
        .east-asia { background: linear-gradient(135deg, #DE2910, #FF4D00); }
        .south-asia { background: linear-gradient(135deg, #FF9933, #138808); }
        .se-asia { background: linear-gradient(135deg, #FF0000, #FFCC00); }
        .central-asia { background: linear-gradient(135deg, #0066CC, #00CCCC); }
        .west-asia { background: linear-gradient(135deg, #CE1126, #239F40); }
        
        .region-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        
        .region-title {
            font-size: 2rem;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .countries {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-top: 10px;
        }
        
        .card-body {
            padding: 30px;
        }
        
        .dynasty-timeline {
            position: relative;
            margin: 25px 0;
            padding-left: 30px;
        }
        
        .dynasty-timeline::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(to bottom, var(--imperial-red), var(--jade-green));
            border-radius: 2px;
        }
        
        .dynasty-item {
            position: relative;
            margin-bottom: 25px;
            padding-left: 25px;
        }
        
        .dynasty-item::before {
            content: '';
            position: absolute;
            left: -8px;
            top: 8px;
            width: 16px;
            height: 16px;
            background: var(--golden-yellow);
            border: 3px solid var(--imperial-red);
            border-radius: 50%;
            z-index: 2;
        }
        
        .dynasty-name {
            font-weight: bold;
            color: var(--imperial-red);
            margin-bottom: 5px;
            font-size: 1.2rem;
        }
        
        .dynasty-period {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
        
        .dynasty-achievements {
            color: #555;
            line-height: 1.5;
            font-size: 0.95rem;
        }
        
        .resources-section {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px dashed #eee;
        }
        
        .resource-links {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 15px;
        }
        
        .resource-link {
            display: inline-block;
            padding: 10px 20px;
            background: var(--jade-green);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .resource-link:hover {
            background: white;
            color: var(--jade-green);
            border-color: var(--jade-green);
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0, 168, 107, 0.2);
        }
        
        .archive-section {
            background: linear-gradient(135deg, rgba(222, 41, 16, 0.05), rgba(0, 168, 107, 0.05));
            border-radius: 25px;
            padding: 40px;
            margin: 70px 0;
            border: 4px solid var(--golden-yellow);
            position: relative;
            overflow: hidden;
        }
        
        .archive-section::before {
            content: '文';
            position: absolute;
            top: -50px;
            right: -50px;
            font-size: 300px;
            color: rgba(0, 168, 107, 0.05);
            font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
            font-weight: bold;
            transform: rotate(15deg);
        }
        
        .archive-title {
            text-align: center;
            font-size: 2.5rem;
            color: var(--imperial-red);
            margin-bottom: 40px;
            position: relative;
            z-index: 2;
        }
        
        .archive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 30px;
            position: relative;
            z-index: 2;
        }
        
        .archive-card {
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        
        .archive-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .archive-card-title {
            color: var(--imperial-red);
            font-size: 1.4rem;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid var(--golden-yellow);
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .archive-list {
            list-style: none;
        }
        
        .archive-list li {
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .archive-list li:last-child {
            border-bottom: none;
        }
        
        .archive-list a {
            color: #555;
            text-decoration: none;
            transition: all 0.3s ease;
            display: block;
            padding: 8px 0;
        }
        
        .archive-list a:hover {
            color: var(--imperial-red);
            padding-left: 10px;
        }
        
        .philosophy-section {
            background: linear-gradient(135deg, #8B4513, #D2691E);
            color: white;
            border-radius: 25px;
            padding: 50px;
            margin: 60px 0;
            text-align: center;
        }
        
        .philosophy-title {
            font-size: 2.2rem;
            margin-bottom: 30px;
            color: var(--golden-yellow);
        }
        
        .philosophy-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        
        .philosophy-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 25px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 222, 0, 0.3);
        }
        
        .philosophy-name {
            font-size: 1.4rem;
            color: var(--golden-yellow);
            margin-bottom: 15px;
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            padding: 50px 0;
            border-top: 3px solid #f0e6d6;
            margin-top: 60px;
        }
        
        .nav-button {
            padding: 18px 35px;
            background: linear-gradient(135deg, var(--imperial-red), var(--jade-green));
            color: white;
            text-decoration: none;
            border-radius: 15px;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 10px 25px rgba(222, 41, 16, 0.3);
        }
        
        .nav-button:hover {
            transform: translateY(-5px) scale(1.05);
            box-shadow: 0 15px 35px rgba(222, 41, 16, 0.4);
        }
        
        .disclaimer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 0.95rem;
            background: #f8f4e9;
            border-radius: 20px;
            margin-top: 50px;
            border: 2px solid #e6dcc3;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2.8rem;
            }
            
            .region-grid {
                grid-template-columns: 1fr;
                gap: 25px;
            }
            
            .archive-grid {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
                gap: 25px;
            }
            
            .philosophy-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">
</head>
<body>
    <div class="asian-pattern-bg"></div>
    <div class="lotus-pattern"></div>
    
    <div class="container">
        <header>
            <div class="dragon-pattern"></div>
            <h1><span class="title-characters">亞洲歷史</span><br><span style="font-size: 2.5rem;">Asian History & Civilizations</span></h1>
            <div class="subtitle">From the Yellow River to the Ganges • From the Silk Road to the Digital Age • 5,000 Years of Continuous Civilization</div>
            <div class="verification-badge">
                <span>🏯</span> Authentic Asian Sources • Indigenous Perspectives • Non-Western Scholarship
            </div>
        </header>
        
        <div class="region-grid">
            <!-- East Asia -->
            <div class="region-card">
                <div class="card-header east-asia">
                    <div class="region-icon">🐉</div>
                    <div class="region-title">East Asia</div>
                    <div class="countries">China • Japan • Korea • Taiwan • Mongolia</div>
                </div>
                <div class="card-body">
                    <div class="dynasty-timeline">
                        <div class="dynasty-item">
                            <div class="dynasty-name">Chinese Dynasties</div>
                            <div class="dynasty-period">2100 BCE - 1912 CE</div>
                            <div class="dynasty-achievements">Xia, Shang, Zhou, Qin, Han, Tang, Song, Yuan, Ming, Qing</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Japanese Periods</div>
                            <div class="dynasty-period">300 BCE - Present</div>
                            <div class="dynasty-achievements">Jōmon, Yayoi, Kofun, Nara, Heian, Kamakura, Edo, Meiji</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Korean Dynasties</div>
                            <div class="dynasty-period">2333 BCE - 1910 CE</div>
                            <div class="dynasty-achievements">Gojoseon, Three Kingdoms, Goryeo, Joseon</div>
                        </div>
                    </div>
                    
                    <div class="resources-section">
                        <div class="resource-links">
                            <a href="https://www.npm.gov.tw/" target="_blank" class="resource-link" title="National Palace Museum, Taiwan">
                                國立故宮博物院
                            </a>
                            <a href="https://www.dpm.org.cn/" target="_blank" class="resource-link" title="The Palace Museum, Beijing">
                                故宫博物院
                            </a>
                            <a href="https://www.kunaicho.go.jp/" target="_blank" class="resource-link" title="Imperial Household Agency, Japan">
                                宮内庁
                            </a>
                            <a href="https://www.museum.go.kr/" target="_blank" class="resource-link" title="National Museum of Korea">
                                국립중앙박물관
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- South Asia -->
            <div class="region-card">
                <div class="card-header south-asia">
                    <div class="region-icon">🕉️</div>
                    <div class="region-title">South Asia</div>
                    <div class="countries">India • Pakistan • Bangladesh • Sri Lanka • Nepal • Bhutan</div>
                </div>
                <div class="card-body">
                    <div class="dynasty-timeline">
                        <div class="dynasty-item">
                            <div class="dynasty-name">Indus Valley Civilization</div>
                            <div class="dynasty-period">3300 - 1300 BCE</div>
                            <div class="dynasty-achievements">Harappa, Mohenjo-daro, world's first urban sanitation</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Indian Empires</div>
                            <div class="dynasty-period">322 BCE - 1857 CE</div>
                            <div class="dynasty-achievements">Maurya, Gupta, Delhi Sultanate, Mughal, Maratha</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Classical Kingdoms</div>
                            <div class="dynasty-period">543 BCE - 1815 CE</div>
                            <div class="dynasty-achievements">Anuradhapura (Sri Lanka), Licchavi (Nepal), Tibetan Empire</div>
                        </div>
                    </div>
                    
                    <div class="resources-section">
                        <div class="resource-links">
                            <a href="https://www.nationalmuseumindia.gov.in/" target="_blank" class="resource-link">
                                National Museum, India
                            </a>
                            <a href="https://asi.nic.in/" target="_blank" class="resource-link">
                                Archaeological Survey of India
                            </a>
                            <a href="https://www.colombomuseum.gov.lk/" target="_blank" class="resource-link">
                                Colombo National Museum
                            </a>
                            <a href="https://www.skb museum.gov.np/" target="_blank" class="resource-link">
                                National Museum, Nepal
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Southeast Asia -->
            <div class="region-card">
                <div class="card-header se-asia">
                    <div class="region-icon">🏮</div>
                    <div class="region-title">Southeast Asia</div>
                    <div class="countries">Indonesia • Thailand • Vietnam • Philippines • Malaysia • Singapore • Myanmar • Cambodia • Laos</div>
                </div>
                <div class="card-body">
                    <div class="dynasty-timeline">
                        <div class="dynasty-item">
                            <div class="dynasty-name">Ancient Kingdoms</div>
                            <div class="dynasty-period">1st - 15th Century CE</div>
                            <div class="dynasty-achievements">Funan, Chenla, Champa, Srivijaya, Majapahit</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Classical Empires</div>
                            <div class="dynasty-period">802 - 1832 CE</div>
                            <div class="dynasty-achievements">Khmer Empire, Pagan Kingdom, Ayutthaya, Đại Việt</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Colonial & Modern</div>
                            <div class="dynasty-period">16th Century - Present</div>
                            <div class="dynasty-achievements">European colonization, independence movements, ASEAN</div>
                        </div>
                    </div>
                    
                    <div class="resources-section">
                        <div class="resource-links">
                            <a href="https://www.museumnasional.or.id/" target="_blank" class="resource-link">
                                Museum Nasional Indonesia
                            </a>
                            <a href="https://www.nationalmuseum.or.th/" target="_blank" class="resource-link">
                                National Museum, Thailand
                            </a>
                            <a href="https://baotanglichsu.vn/" target="_blank" class="resource-link">
                                National Museum of History, Vietnam
                            </a>
                            <a href="https://www.nationalmuseum.gov.ph/" target="_blank" class="resource-link">
                                National Museum, Philippines
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Central Asia -->
            <div class="region-card">
                <div class="card-header central-asia">
                    <div class="region-icon">🏔️</div>
                    <div class="region-title">Central Asia</div>
                    <div class="countries">Kazakhstan • Uzbekistan • Turkmenistan • Kyrgyzstan • Tajikistan • Afghanistan</div>
                </div>
                <div class="card-body">
                    <div class="dynasty-timeline">
                        <div class="dynasty-item">
                            <div class="dynasty-name">Silk Road Civilizations</div>
                            <div class="dynasty-period">200 BCE - 1400 CE</div>
                            <div class="dynasty-achievements">Sogdian traders, Bactria, Samarkand, Bukhara, Khiva</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Turkic & Mongol Empires</div>
                            <div class="dynasty-period">552 - 1502 CE</div>
                            <div class="dynasty-achievements">Göktürks, Timurid Empire, Mongol Khanates</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Islamic Golden Age Centers</div>
                            <div class="dynasty-period">8th - 14th Century CE</div>
                            <div class="dynasty-achievements">Al-Khwarizmi, Avicenna, Al-Biruni, Ulugh Beg</div>
                        </div>
                    </div>
                    
                    <div class="resources-section">
                        <div class="resource-links">
                            <a href="https://www.kaznm.kz/" target="_blank" class="resource-link">
                                National Museum, Kazakhstan
                            </a>
                            <a href="https://www.museum.uz/" target="_blank" class="resource-link">
                                State Museum, Uzbekistan
                            </a>
                            <a href="https://www.nationalmuseum.af/" target="_blank" class="resource-link">
                                National Museum, Afghanistan
                            </a>
                            <a href="http://orientalstudies.ru/" target="_blank" class="resource-link">
                                Institute of Oriental Studies
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- West Asia (Middle East) -->
            <div class="region-card">
                <div class="card-header west-asia">
                    <div class="region-icon">🕌</div>
                    <div class="region-title">West Asia</div>
                    <div class="countries">Iran • Turkey • Arabia • Levant • Caucasus</div>
                </div>
                <div class="card-body">
                    <div class="dynasty-timeline">
                        <div class="dynasty-item">
                            <div class="dynasty-name">Persian Empires</div>
                            <div class="dynasty-period">550 BCE - 1979 CE</div>
                            <div class="dynasty-achievements">Achaemenid, Parthian, Sassanian, Safavid, Qajar</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Islamic Caliphates</div>
                            <div class="dynasty-period">632 - 1924 CE</div>
                            <div class="dynasty-achievements">Rashidun, Umayyad, Abbasid, Ottoman</div>
                        </div>
                        <div class="dynasty-item">
                            <div class="dynasty-name">Ancient Anatolia</div>
                            <div class="dynasty-period">2000 BCE - 1453 CE</div>
                            <div class="dynasty-achievements">Hittites, Phrygians, Lydians, Byzantines, Seljuks</div>
                        </div>
                    </div>
                    
                    <div class="resources-section">
                        <div class="resource-links">
                            <a href="https://www.iranicaonline.org/" target="_blank" class="resource-link">
                                Encyclopædia Iranica
                            </a>
                            <a href="https://www.muze.gov.tr/" target="_blank" class="resource-link">
                                Turkish Museums
                            </a>
                            <a href="https://www.dgam.gov.sy/" target="_blank" class="resource-link">
                                Syrian Antiquities
                            </a>
                            <a href="https://www.britishmuseum.org/collection/galleries/assyrian-sculpture" target="_blank" class="resource-link">
                                Assyrian Collections
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="philosophy-section">
            <div class="philosophy-title">Asian Philosophical Traditions</div>
            <div class="philosophy-grid">
                <div class="philosophy-card">
                    <div class="philosophy-name">Confucianism 儒家</div>
                    <p>Harmony, filial piety, social order - foundational to East Asian societies</p>
                </div>
                <div class="philosophy-card">
                    <div class="philosophy-name">Hinduism सनातन धर्म</div>
                    <p>Dharma, karma, moksha - world's oldest living religion</p>
                </div>
                <div class="philosophy-card">
                    <div class="philosophy-name">Buddhism 佛教</div>
                    <p>Four Noble Truths, Eightfold Path - originated in India, spread across Asia</p>
                </div>
                <div class="philosophy-card">
                    <div class="philosophy-name">Taoism 道教</div>
                    <p>Wu wei, yin-yang, harmony with nature - indigenous Chinese philosophy</p>
                </div>
            </div>
        </div>
        
        <div class="archive-section">
            <div class="archive-title">Asian Digital Archives & Research Centers</div>
            <div class="archive-grid">
                <div class="archive-card">
                    <div class="archive-card-title">
                        <span>📜</span> Manuscript Archives
                    </div>
                    <ul class="archive-list">
                        <li><a href="https://www.tbrc.org/" target="_blank">Tibetan Buddhist Resource Center</a></li>
                        <li><a href="https://www.bl.uk/manuscripts/" target="_blank">British Library - Asian Collections</a></li>
                        <li><a href="https://www.loc.gov/collections/chinese-rare-books/" target="_blank">Library of Congress - Chinese Rare Books</a></li>
                        <li><a href="https://cudl.colorado.edu/" target="_blank">Cambridge Digital Library - Asian Collections</a></li>
                        <li><a href="https://www.smb.museum/en/museums-institutions/asian-art-museum/collection-research/library.html" target="_blank">Berlin Asian Art Museum Library</a></li>
                    </ul>
                </div>
                
                <div class="archive-card">
                    <div class="archive-card-title">
                        <span>🏛️</span> Archaeological Institutes
                    </div>
                    <ul class="archive-list">
                        <li><a href="https://www.archaeology.gov.lk/" target="_blank">Sri Lanka Archaeology Department</a></li>
                        <li><a href="https://www.kaogu.cn/" target="_blank">Chinese Academy of Archaeology</a></li>
                        <li><a href="https://asi.nic.in/" target="_blank">Archaeological Survey of India</a></li>
                        <li><a href="https://www.iias.asia/" target="_blank">International Institute for Asian Studies</a></li>
                        <li><a href="https://www.soas.ac.uk/" target="_blank">SOAS University of London - Asian Studies</a></li>
                    </ul>
                </div>
                
                <div class="archive-card">
                    <div class="archive-card-title">
                        <span>🌐</span> Digital Humanities
                    </div>
                    <ul class="archive-list">
                        <li><a href="https://www.eastview.com/resources/databases/chinese-studies/" target="_blank">Chinese Studies Database</a></li>
                        <li><a href="https://www.jstor.org/subject/asianstudies" target="_blank">JSTOR Asian Studies Collection</a></li>
                        <li><a href="https://www.oxfordbibliographies.com/obo/page/asian-studies" target="_blank">Oxford Bibliographies - Asian Studies</a></li>
                        <li><a href="https://www.asianstudies.org/" target="_blank">Association for Asian Studies</a></li>
                        <li><a href="https://www.aasianst.org/" target="_blank">American Association for Asian Studies</a></li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="navigation">
            <a href="/history/middle-east" class="nav-button">
                ⬅️ Previous: Middle Eastern History
            </a>
            <a href="/history/africa" class="nav-button">
                Next: African History ➡️
            </a>
        </div>
        
        <div class="disclaimer">
            <p>🐉 This resource centers Asian voices, uses indigenous terminology, and prioritizes sources from Asian institutions and scholars.</p>
            <p style="margin-top: 15px; font-size: 0.9rem; color: #888;">
                Note: This page avoids Eurocentric periodization and uses local historical frameworks. Dates follow Gregorian calendar for consistency.
            </p>
        </div>
    </div>
    
    <script>
        // Add animation to region cards
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.region-card');
            
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'all 0.6s ease ' + (index * 0.1) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 500 + (index * 100));
            });
            
            // Add hover effect to resource links
            const resourceLinks = document.querySelectorAll('.resource-link');
            resourceLinks.forEach(link => {
                link.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px) scale(1.05)';
                });
                link.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(-3px) scale(1)';
                });
            });
        });
    </script>
</body>
</html>`;
    
    res.send(asiaContent);
});

// ============================================
// /history/africa - African History & Civilizations
// ============================================

app.get('/history/africa', (req, res) => {
    const africaContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>African History - Cradle of Humanity to Rising Continent</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --pan-african-red: #E31B23;
            --pan-african-green: #00853F;
            --pan-african-yellow: #FFCE00;
            --pan-african-black: #000000;
            --earth-brown: #8B4513;
            --sunset-orange: #FF6B35;
            --baobab-green: #2E8B57;
        }
        
        body {
            background: linear-gradient(135deg, #f5f1e6 0%, #e8e1d1 100%);
            color: #222;
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            position: relative;
            overflow-x: hidden;
        }
        
        .african-pattern-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 20% 30%, rgba(227, 27, 35, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(0, 133, 63, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(255, 206, 0, 0.02) 0%, transparent 50%);
            z-index: -1;
        }
        
        .kente-pattern {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                repeating-linear-gradient(90deg, 
                    transparent, 
                    transparent 40px, 
                    rgba(227, 27, 35, 0.05) 40px, 
                    rgba(227, 27, 35, 0.05) 80px),
                repeating-linear-gradient(0deg, 
                    transparent, 
                    transparent 40px, 
                    rgba(0, 133, 63, 0.05) 40px, 
                    rgba(0, 133, 63, 0.05) 80px);
            z-index: -1;
            opacity: 0.4;
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        
        header {
            text-align: center;
            padding: 80px 40px;
            background: linear-gradient(135deg, var(--pan-african-red), #ff3333);
            color: white;
            border-radius: 30px;
            margin-bottom: 70px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(227, 27, 35, 0.3);
            border: 8px solid var(--pan-african-yellow);
        }
        
        .adinkra-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><path d="M100,20 C140,20 180,60 180,100 C180,140 140,180 100,180 C60,180 20,140 20,100 C20,60 60,20 100,20 Z" fill="none" stroke="%23FFCE00" stroke-width="3" opacity="0.2"/><path d="M100,50 C120,50 150,80 150,100 C150,120 120,150 100,150 C80,150 50,120 50,100 C50,80 80,50 100,50 Z" fill="none" stroke="%2300853F" stroke-width="2" opacity="0.2"/></svg>');
            background-size: 300px;
            opacity: 0.3;
        }
        
        h1 {
            font-size: 4.5rem;
            margin-bottom: 25px;
            position: relative;
            text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.4);
            font-weight: 900;
        }
        
        .title-gradient {
            display: inline-block;
            background: linear-gradient(45deg, var(--pan-african-yellow), white, var(--pan-african-green));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: none;
        }
        
        .subtitle {
            font-size: 1.8rem;
            opacity: 0.95;
            margin-bottom: 35px;
            max-width: 1000px;
            margin-left: auto;
            margin-right: auto;
            line-height: 1.7;
        }
        
        .africa-facts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin: 60px 0;
            padding: 40px;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(46, 139, 87, 0.8));
            border-radius: 25px;
            color: white;
        }
        
        .fact-item {
            text-align: center;
            padding: 30px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 206, 0, 0.3);
        }
        
        .fact-number {
            font-size: 3.5rem;
            font-weight: bold;
            color: var(--pan-african-yellow);
            margin-bottom: 15px;
        }
        
        .fact-label {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .region-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 40px;
            margin: 70px 0;
        }
        
        .region-card {
            background: white;
            border-radius: 30px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            transition: all 0.6s ease;
            border: 4px solid transparent;
            position: relative;
        }
        
        .region-card:hover {
            transform: translateY(-15px) scale(1.02);
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
            border-color: var(--pan-african-red);
        }
        
        .card-header {
            padding: 35px;
            color: white;
            position: relative;
            overflow: hidden;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        
        .north-africa { background: linear-gradient(135deg, #8B4513, #D2691E); }
        .west-africa { background: linear-gradient(135deg, #228B22, #32CD32); }
        .east-africa { background: linear-gradient(135deg, #FF4500, #FF8C00); }
        .central-africa { background: linear-gradient(135deg, #006400, #228B22); }
        .southern-africa { background: linear-gradient(135deg, #1C39BB, #4169E1); }
        
        .region-icon {
            font-size: 4.5rem;
            margin-bottom: 25px;
            filter: drop-shadow(0 6px 12px rgba(0,0,0,0.4));
        }
        
        .region-title {
            font-size: 2.2rem;
            margin-bottom: 15px;
            font-weight: bold;
        }
        
        .countries {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-top: 15px;
        }
        
        .card-body {
            padding: 35px;
        }
        
        .civilization-section {
            margin-bottom: 30px;
        }
        
        .civilization-title {
            color: var(--pan-african-red);
            font-size: 1.5rem;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid var(--pan-african-yellow);
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .civilization-list {
            list-style: none;
            margin-left: 20px;
        }
        
        .civilization-list li {
            padding: 12px 0;
            border-bottom: 1px dashed #eee;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .civilization-list li:before {
            content: "✦";
            color: var(--pan-african-green);
            font-size: 1.2rem;
        }
        
        .resources-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 25px;
        }
        
        .resource-link {
            display: block;
            padding: 15px 20px;
            background: var(--pan-african-green);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.3s ease;
            border: 3px solid transparent;
            text-align: center;
        }
        
        .resource-link:hover {
            background: white;
            color: var(--pan-african-green);
            border-color: var(--pan-african-green);
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 133, 63, 0.3);
        }
        
        .colonial-section {
            background: linear-gradient(135deg, rgba(227, 27, 35, 0.1), rgba(0, 0, 0, 0.1));
            border-radius: 30px;
            padding: 50px;
            margin: 80px 0;
            border: 5px solid var(--pan-african-red);
            position: relative;
            overflow: hidden;
        }
        
        .colonial-section::before {
            content: '✊🏿';
            position: absolute;
            top: -60px;
            right: -60px;
            font-size: 300px;
            opacity: 0.05;
            transform: rotate(15deg);
        }
        
        .colonial-title {
            text-align: center;
            font-size: 2.8rem;
            color: var(--pan-african-red);
            margin-bottom: 40px;
            position: relative;
            z-index: 2;
        }
        
        .colonial-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 35px;
            position: relative;
            z-index: 2;
        }
        
        .colonial-card {
            background: white;
            padding: 35px;
            border-radius: 25px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.15);
            transition: all 0.4s ease;
        }
        
        .colonial-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 25px 50px rgba(0,0,0,0.2);
        }
        
        .colonial-card-title {
            color: var(--pan-african-red);
            font-size: 1.6rem;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 4px solid var(--pan-african-yellow);
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .colonial-list {
            list-style: none;
        }
        
        .colonial-list li {
            padding: 15px 0;
            border-bottom: 1px solid #f0f0f0;
            font-size: 1.1rem;
        }
        
        .colonial-list li:last-child {
            border-bottom: none;
        }
        
        .colonial-list strong {
            color: var(--pan-african-green);
        }
        
        .cultural-section {
            background: linear-gradient(135deg, var(--pan-african-yellow), #ffdb4d);
            border-radius: 30px;
            padding: 60px;
            margin: 70px 0;
            color: #333;
            text-align: center;
        }
        
        .cultural-title {
            font-size: 2.5rem;
            margin-bottom: 40px;
            color: var(--pan-african-red);
        }
        
        .cultural-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        
        .cultural-card {
            background: rgba(255, 255, 255, 0.9);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .cultural-icon {
            font-size: 3.5rem;
            margin-bottom: 20px;
        }
        
        .cultural-name {
            font-size: 1.6rem;
            color: var(--pan-african-green);
            margin-bottom: 15px;
            font-weight: bold;
        }
        
        .archive-section {
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(46, 139, 87, 0.9));
            color: white;
            border-radius: 30px;
            padding: 60px;
            margin: 80px 0;
        }
        
        .archive-title {
            text-align: center;
            font-size: 2.8rem;
            color: var(--pan-african-yellow);
            margin-bottom: 50px;
        }
        
        .archive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 35px;
        }
        
        .archive-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 35px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
            border: 3px solid rgba(255, 206, 0, 0.3);
        }
        
        .archive-card-title {
            font-size: 1.8rem;
            color: var(--pan-african-yellow);
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid rgba(255, 206, 0, 0.5);
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .archive-list {
            list-style: none;
        }
        
        .archive-list li {
            padding: 15px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .archive-list li:last-child {
            border-bottom: none;
        }
        
        .archive-list a {
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
            display: block;
            padding: 10px 0;
        }
        
        .archive-list a:hover {
            color: var(--pan-african-yellow);
            padding-left: 15px;
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            padding: 60px 0;
            border-top: 4px solid #d4c7a3;
            margin-top: 80px;
        }
        
        .nav-button {
            padding: 20px 40px;
            background: linear-gradient(135deg, var(--pan-african-red), var(--pan-african-green));
            color: white;
            text-decoration: none;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.2rem;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 20px;
            box-shadow: 0 15px 35px rgba(227, 27, 35, 0.4);
        }
        
        .nav-button:hover {
            transform: translateY(-8px) scale(1.05);
            box-shadow: 0 25px 50px rgba(227, 27, 35, 0.6);
        }
        
        .disclaimer {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 1rem;
            background: #f5f1e6;
            border-radius: 25px;
            margin-top: 60px;
            border: 3px solid #d4c7a3;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 3rem;
            }
            
            .region-grid {
                grid-template-columns: 1fr;
                gap: 30px;
            }
            
            .colonial-grid {
                grid-template-columns: 1fr;
            }
            
            .archive-grid {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
                gap: 30px;
            }
            
            .cultural-grid {
                grid-template-columns: 1fr;
            }
            
            .africa-facts {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="african-pattern-bg"></div>
    <div class="kente-pattern"></div>
    
    <div class="container">
        <header>
            <div class="adinkra-pattern"></div>
            <h1><span class="title-gradient">AFRICAN HISTORY</span></h1>
            <div class="subtitle">Cradle of Humanity • Land of Ancient Kingdoms • Continent of Resilience • Future of Global Innovation</div>
            <div style="margin-top: 30px; display: inline-block; padding: 15px 35px; background: rgba(255, 206, 0, 0.2); border-radius: 40px; border: 4px solid var(--pan-african-yellow); font-size: 1.2rem;">
                <span style="color: var(--pan-african-yellow);">🦁</span> Centering African Voices • Decolonizing History <span style="color: var(--pan-african-yellow);">🦁</span>
            </div>
        </header>
        
        <div class="africa-facts">
            <div class="fact-item">
                <div class="fact-number">54</div>
                <div class="fact-label">Countries</div>
            </div>
            <div class="fact-item">
                <div class="fact-number">2000+</div>
                <div class="fact-label">Languages & Dialects</div>
            </div>
            <div class="fact-item">
                <div class="fact-number">1.4B</div>
                <div class="fact-label">People (World's Youngest Population)</div>
            </div>
            <div class="fact-item">
                <div class="fact-number">30%</div>
                <div class="fact-label">Earth's Mineral Resources</div>
            </div>
        </div>
        
        <div class="region-grid">
            <!-- North Africa -->
            <div class="region-card">
                <div class="card-header north-africa">
                    <div class="region-icon">🏜️</div>
                    <div class="region-title">North Africa</div>
                    <div class="countries">Egypt • Libya • Tunisia • Algeria • Morocco • Sudan • Mauritania</div>
                </div>
                <div class="card-body">
                    <div class="civilization-section">
                        <div class="civilization-title">
                            <span>🏺</span> Ancient Civilizations
                        </div>
                        <ul class="civilization-list">
                            <li><strong>Ancient Egypt</strong> (3100-332 BCE) - Pyramids, hieroglyphs, advanced mathematics</li>
                            <li><strong>Carthaginian Empire</strong> (814-146 BCE) - Phoenician traders, Hannibal</li>
                            <li><strong>Nubian Kingdoms</strong> (2500 BCE-1500 CE) - Kush, Meroë, advanced ironworking</li>
                            <li><strong>Berber Kingdoms</strong> - Numidia, Mauretania, resistance to Roman rule</li>
                        </ul>
                    </div>
                    
                    <div class="resources-grid">
                        <a href="https://www.egyptianmuseum.org/" target="_blank" class="resource-link">
                            Egyptian Museum, Cairo
                        </a>
                        <a href="https://www.metmuseum.org/toah/hd/phoe/hd_phoe.htm" target="_blank" class="resource-link">
                            Phoenician Art & History
                        </a>
                        <a href="https://www.britishmuseum.org/collection/galleries/sudan-egypt-nubia" target="_blank" class="resource-link">
                            Nubian Galleries
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- West Africa -->
            <div class="region-card">
                <div class="card-header west-africa">
                    <div class="region-icon">👑</div>
                    <div class="region-title">West Africa</div>
                    <div class="countries">Nigeria • Ghana • Mali • Senegal • Ivory Coast • Niger • Burkina Faso</div>
                </div>
                <div class="card-body">
                    <div class="civilization-section">
                        <div class="civilization-title">
                            <span>🏰</span> Great Empires
                        </div>
                        <ul class="civilization-list">
                            <li><strong>Ghana Empire</strong> (300-1200 CE) - Gold trade, "Land of Gold"</li>
                            <li><strong>Mali Empire</strong> (1235-1670 CE) - Mansa Musa (world's richest person), Timbuktu</li>
                            <li><strong>Songhai Empire</strong> (1464-1591 CE) - Largest African empire in history</li>
                            <li><strong>Benin Kingdom</strong> (1180-1897 CE) - Bronze casting, complex urban planning</li>
                            <li><strong>Ashanti Empire</strong> (1670-1902 CE) - Golden Stool, matrilineal inheritance</li>
                        </ul>
                    </div>
                    
                    <div class="resources-grid">
                        <a href="https://www.britishmuseum.org/collection/galleries/africa" target="_blank" class="resource-link">
                            British Museum - Africa Galleries
                        </a>
                        <a href="https://www.metmuseum.org/toah/hd/sghi/hd_sghi.htm" target="_blank" class="resource-link">
                            Songhai Empire History
                        </a>
                        <a href="https://www.worldhistory.org/Benin_Bronzes/" target="_blank" class="resource-link">
                            Benin Bronzes History
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- East Africa -->
            <div class="region-card">
                <div class="card-header east-africa">
                    <div class="region-icon">🏔️</div>
                    <div class="region-title">East Africa</div>
                    <div class="countries">Ethiopia • Kenya • Tanzania • Uganda • Rwanda • Somalia • Eritrea</div>
                </div>
                <div class="card-body">
                    <div class="civilization-section">
                        <div class="civilization-title">
                            <span>⛪</span> Ancient Kingdoms & Trade
                        </div>
                        <ul class="civilization-list">
                            <li><strong>Aksumite Empire</strong> (100-940 CE) - Obelisks, one of first Christian nations</li>
                            <li><strong>Swahili Coast</strong> (1st-19th century) - Indian Ocean trade, Stone Town</li>
                            <li><strong>Ethiopian Empire</strong> (1137-1974) - Solomonic dynasty, Lalibela churches</li>
                            <li><strong>Kingdom of Buganda</strong> (1300-1967) - Complex political system</li>
                            <li><strong>Kingdom of Rwanda</strong> (15th century-1962) - Intore dancers, milk culture</li>
                        </ul>
                    </div>
                    
                    <div class="resources-grid">
                        <a href="https://whc.unesco.org/en/list/15/" target="_blank" class="resource-link">
                            Rock-Hewn Churches of Lalibela
                        </a>
                        <a href="https://www.metmuseum.org/toah/hd/sswa/hd_sswa.htm" target="_blank" class="resource-link">
                            Swahili Coast History
                        </a>
                        <a href="https://www.britishmuseum.org/collection/galleries/ethiopia-and-coptic-egypt" target="_blank" class="resource-link">
                            Ethiopian Collections
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Central Africa -->
            <div class="region-card">
                <div class="card-header central-africa">
                    <div class="region-icon">🌳</div>
                    <div class="region-title">Central Africa</div>
                    <div class="countries">DR Congo • Cameroon • Gabon • Congo • CAR • Chad • Angola</div>
                </div>
                <div class="card-body">
                    <div class="civilization-section">
                        <div class="civilization-title">
                            <span>🌿</span> Forest Kingdoms & Bantu Migrations
                        </div>
                        <ul class="civilization-list">
                            <li><strong>Kingdom of Kongo</strong> (1390-1914) - Centralized state, early diplomacy with Europe</li>
                            <li><strong>Luba Empire</strong> (1585-1889) - Memory boards, sacred kingship</li>
                            <li><strong>Lunda Empire</strong> (1665-1887) - Confederation model, salt trade</li>
                            <li><strong>Kuba Kingdom</strong> (1625-1900) - Raffia cloth, elaborate court art</li>
                            <li><strong>Bantu Migrations</strong> (1000 BCE-500 CE) - Spread of languages, ironworking</li>
                        </ul>
                    </div>
                    
                    <div class="resources-grid">
                        <a href="https://www.metmuseum.org/toah/hd/ckng/hd_ckng.htm" target="_blank" class="resource-link">
                            Kingdom of Kongo Art
                        </a>
                        <a href="https://africa.si.edu/exhibits/kuba/index.html" target="_blank" class="resource-link">
                            Kuba Kingdom Art
                        </a>
                        <a href="https://www.britishmuseum.org/collection/galleries/africa-rooms-25" target="_blank" class="resource-link">
                            Central African Collections
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Southern Africa -->
            <div class="region-card">
                <div class="card-header southern-africa">
                    <div class="region-icon">💎</div>
                    <div class="region-title">Southern Africa</div>
                    <div class="countries">South Africa • Zimbabwe • Botswana • Namibia • Mozambique • Madagascar</div>
                </div>
                <div class="card-body">
                    <div class="civilization-section">
                        <div class="civilization-title">
                            <span>🏰</span> Stone Cities & Mineral Wealth
                        </div>
                        <ul class="civilization-list">
                            <li><strong>Great Zimbabwe</strong> (1100-1450) - Stone city, gold trade, largest ancient structure in Africa south of Sahara</li>
                            <li><strong>Mapungubwe</strong> (1075-1220) - First class-based social system in southern Africa</li>
                            <li><strong>Kingdom of Mutapa</strong> (1430-1760) - Gold mining empire</li>
                            <li><strong>Zulu Kingdom</strong> (1816-1897) - Military innovation, Shaka Zulu</li>
                            <li><strong>Merina Kingdom</strong> (1540-1897) - Madagascar's unification</li>
                        </ul>
                    </div>
                    
                    <div class="resources-grid">
                        <a href="https://whc.unesco.org/en/list/364/" target="_blank" class="resource-link">
                            Great Zimbabwe UNESCO
                        </a>
                        <a href="https://www.sahistory.org.za/" target="_blank" class="resource-link">
                            South African History Online
                        </a>
                        <a href="https://www.iziko.org.za/" target="_blank" class="resource-link">
                            Iziko Museums of South Africa
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="colonial-section">
            <div class="colonial-title">Colonial Exploitation & Resource Extraction</div>
            <div class="colonial-grid">
                <div class="colonial-card">
                    <div class="colonial-card-title">
                        <span>⛓️</span> Transatlantic Slave Trade
                    </div>
                    <ul class="colonial-list">
                        <li><strong>12.5 million</strong> Africans forcibly transported (1501-1866)</li>
                        <li><strong>2 million</strong> died during Middle Passage</li>
                        <li><strong>European ports:</strong> Liverpool, Bristol, Nantes, Lisbon</li>
                        <li><strong>African kingdoms involved:</strong> Dahomey, Asante, Kongo (under coercion)</li>
                        <li><strong>Legacy:</strong> Diaspora of 200 million people worldwide</li>
                    </ul>
                </div>
                
                <div class="colonial-card">
                    <div class="colonial-card-title">
                        <span>🛢️</span> Resource Extraction
                    </div>
                    <ul class="colonial-list">
                        <li><strong>Belgian Congo:</strong> Rubber terror (10 million deaths)</li>
                        <li><strong>South Africa:</strong> Gold & diamonds (De Beers monopoly)</li>
                        <li><strong>Nigeria:</strong> Oil (Shell BP operations since 1937)</li>
                        <li><strong>DR Congo:</strong> Cobalt, copper, coltan (modern slavery)</li>
                        <li><strong>West Africa:</strong> Cocoa, palm oil (child labor continues)</li>
                    </ul>
                </div>
                
                <div class="colonial-card">
                    <div class="colonial-card-title">
                        <span>🗺️</span> Artificial Borders
                    </div>
                    <ul class="colonial-list">
                        <li><strong>1884 Berlin Conference:</strong> Europe divided Africa without African representation</li>
                        <li><strong>56 new borders</strong> created, splitting ethnic groups</li>
                        <li><strong>French West Africa:</strong> 8 countries forced together</li>
                        <li><strong>British indirect rule:</strong> Divide and conquer tactics</li>
                        <li><strong>Legacy:</strong> Ongoing ethnic conflicts, resource wars</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="cultural-section">
            <div class="cultural-title">African Cultural & Spiritual Traditions</div>
            <div class="cultural-grid">
                <div class="cultural-card">
                    <div class="cultural-icon">🗣️</div>
                    <div class="cultural-name">Oral Traditions</div>
                    <p>Griots (West Africa), Imbongi (Southern Africa) - Living libraries preserving history through storytelling, poetry, and song</p>
                </div>
                <div class="cultural-card">
                    <div class="cultural-icon">🎭</div>
                    <div class="cultural-name">Mask Traditions</div>
                    <p>Dan masks (Liberia), Gelede masks (Yoruba), Pwo masks (Chokwe) - Spiritual communication, social commentary, initiation rites</p>
                </div>
                <div class="cultural-card">
                    <div class="cultural-icon">⚕️</div>
                    <div class="cultural-name">Traditional Medicine</div>
                    <p>Ubuntu philosophy, Sangomas (Southern Africa), Babalawo (Yoruba) - Holistic healing integrating body, mind, and community</p>
                </div>
                <div class="cultural-card">
                    <div class="cultural-icon">✊🏿</div>
                    <div class="cultural-name">Liberation Theologies</div>
                    <p>Black Consciousness (Steve Biko), Ubuntu Theology, African Independent Churches - Resistance through spiritual empowerment</p>
                </div>
            </div>
        </div>
        
        <div class="archive-section">
            <div class="archive-title">African-Centered Research & Archives</div>
            <div class="archive-grid">
                <div class="archive-card">
                    <div class="archive-card-title">
                        <span>🏛️</span> Digital Archives
                    </div>
                    <ul class="archive-list">
                        <li><a href="https://www.aluka.org/" target="_blank">Aluka Digital Library - African Cultural Heritage</a></li>
                        <li><a href="https://www.disa.ukzn.ac.za/" target="_blank">Digital Innovation South Africa - Anti-Apartheid Archives</a></li>
                        <li><a href="https://www.sahistory.org.za/" target="_blank">South African History Online</a></li>
                        <li><a href="https://www.africanactivist.msu.edu/" target="_blank">African Activist Archive</a></li>
                        <li><a href="https://www.africabib.org/" target="_blank">AfricaBib - Bibliographic Database</a></li>
                    </ul>
                </div>
                
                <div class="archive-card">
                    <div class="archive-card-title">
                        <span>📚</span> Academic Centers
                    </div>
                    <ul class="archive-list">
                        <li><a href="https://www.ascleiden.nl/" target="_blank">African Studies Centre Leiden</a></li>
                        <li><a href="https://www.soas.ac.uk/africa/" target="_blank">SOAS University of London - African Studies</a></li>
                        <li><a href="https://africa.harvard.edu/" target="_blank">Harvard University - Center for African Studies</a></li>
                        <li><a href="https://casi.sas.upenn.edu/" target="_blank">University of Pennsylvania - Center for Africana Studies</a></li>
                        <li><a href="https://www.ias.edu/african-studies" target="_blank">Institute for Advanced Study - African Studies</a></li>
                    </ul>
                </div>
                
                <div class="archive-card">
                    <div class="archive-card-title">
                        <span>🎨</span> Museum Collections
                    </div>
                    <ul class="archive-list">
                        <li><a href="https://africa.si.edu/" target="_blank">Smithsonian National Museum of African Art</a></li>
                        <li><a href="https://www.iziko.org.za/" target="_blank">Iziko Museums of South Africa</a></li>
                        <li><a href="https://www.museumaffiche.be/en" target="_blank">Royal Museum for Central Africa (Belgium)</a></li>
                        <li><a href="https://www.britishmuseum.org/collection/galleries/africa" target="_blank">British Museum - Africa Galleries</a></li>
                        <li><a href="https://www.quaibranly.fr/en/" target="_blank">Musée du Quai Branly - African Collections</a></li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="navigation">
            <a href="/history/asia" class="nav-button">
                ⬅️ Previous: Asian History
            </a>
            <a href="/history/archives" class="nav-button">
                Next: Document Archives ➡️
            </a>
        </div>
        
        <div class="disclaimer">
            <p>🦁 This resource centers African scholarship, uses African terminology, and prioritizes African institutions and perspectives.</p>
            <p style="margin-top: 20px; font-size: 1rem; color: #888;">
                <strong>Decolonizing Note:</strong> This page rejects colonial narratives, centers pre-colonial achievements, and documents ongoing resistance and resilience.
                All dates follow Gregorian calendar for accessibility while acknowledging indigenous timekeeping systems.
            </p>
        </div>
    </div>
    
    <script>
        // Add staggered animation to region cards
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.region-card');
            
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(40px) scale(0.95)';
                card.style.transition = 'all 0.7s ease ' + (index * 0.15) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0) scale(1)';
                }, 300 + (index * 150));
            });
            
            // Animate fact numbers
            const factNumbers = document.querySelectorAll('.fact-number');
            factNumbers.forEach(number => {
                const target = number.textContent;
                if (target.includes('B')) {
                    const num = parseFloat(target);
                    animateNumber(number, num, 'B');
                } else if (target.includes('%')) {
                    const num = parseFloat(target);
                    animateNumber(number, num, '%');
                } else {
                    const num = parseInt(target);
                    animateNumber(number, num, '');
                }
            });
            
            function animateNumber(element, target, suffix) {
                let current = 0;
                const increment = target / 50;
                const update = () => {
                    if (current < target) {
                        current += increment;
                        if (suffix === 'B') {
                            element.textContent = (current / 1).toFixed(1) + suffix;
                        } else {
                            element.textContent = Math.floor(current) + suffix;
                        }
                        setTimeout(update, 30);
                    } else {
                        element.textContent = target + suffix;
                    }
                };
                update();
            }
        });
    </script>
</body>
</html>`;
    
    res.send(africaContent);
});


// ============================================
// /history/asia-africa - Combined page
// ============================================

app.get('/history/asia-africa', (req, res) => {
    const asiaAfricaContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asia & Africa - Historical Analysis</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        header {
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #ff7e5f, #feb47b);
            border-radius: 15px;
            margin-bottom: 40px;
            color: white;
        }
        
        h1 {
            font-size: 3rem;
            margin-bottom: 20px;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .split-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 40px 0;
        }
        
        @media (max-width: 768px) {
            .split-section {
                grid-template-columns: 1fr;
            }
        }
        
        .continent-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .continent-card:hover {
            transform: translateY(-5px);
        }
        
        .asia-card {
            border-left: 5px solid #4CAF50;
        }
        
        .africa-card {
            border-left: 5px solid #FF9800;
        }
        
        .continent-title {
            font-size: 2rem;
            margin-bottom: 20px;
            color: #333;
        }
        
        .asia-title {
            color: #4CAF50;
        }
        
        .africa-title {
            color: #FF9800;
        }
        
        .continent-list {
            list-style: none;
            margin: 20px 0;
        }
        
        .continent-list li {
            padding: 10px 0;
            border-bottom: 1px dashed #eee;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .continent-list li:before {
            content: "✓";
            color: #4CAF50;
            font-weight: bold;
        }
        
        .africa-list li:before {
            content: "✓";
            color: #FF9800;
        }
        
        .button-container {
            text-align: center;
            margin-top: 30px;
        }
        
        .nav-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin: 10px;
            transition: all 0.3s ease;
        }
        
        .nav-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .back-button {
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
        }
        
        .info-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-top: 40px;
            border-left: 4px solid #2196F3;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🌏 Asia & Africa - Historical Analysis</h1>
            <div class="subtitle">Two Continents • Rich Histories • Separate In-Depth Coverage</div>
        </header>
        
        <div class="split-section">
            <div class="continent-card asia-card">
                <h2 class="continent-title asia-title">🌏 Asian History</h2>
                <p>From ancient civilizations to modern economic powerhouses:</p>
                <ul class="continent-list">
                    <li>Ancient China, India, and Persia</li>
                    <li>Silk Road trade networks</li>
                    <li>Colonial experiences and independence</li>
                    <li>Modern economic transformations</li>
                    <li>Cultural and philosophical traditions</li>
                </ul>
                <div class="button-container">
                    <a href="/history/asia" class="nav-button">Explore Asian History →</a>
                </div>
            </div>
            
            <div class="continent-card africa-card">
                <h2 class="continent-title africa-title">🌍 African History</h2>
                <p>From cradle of humanity to continent of the future:</p>
                <ul class="continent-list africa-list">
                    <li>Ancient Egyptian, Nubian, and Axumite civilizations</li>
                    <li>Great kingdoms of Mali, Songhai, and Zimbabwe</li>
                    <li>Transatlantic slave trade impact</li>
                    <li>Colonial division and independence movements</li>
                    <li>Post-colonial development challenges</li>
                </ul>
                <div class="button-container">
                    <a href="/history/africa" class="nav-button">Explore African History →</a>
                </div>
            </div>
        </div>
        
        <div class="info-box">
            <h3>📚 Why Separate Coverage?</h3>
            <p>Asia and Africa each have such vast, complex histories that they deserve dedicated, in-depth coverage. Combining them into a single page would not do justice to either continent's rich heritage:</p>
            <p>• <strong>Asia:</strong> 4.7 billion people, 48 countries, thousands of years of civilization</p>
            <p>• <strong>Africa:</strong> 1.4 billion people, 54 countries, cradle of humanity</p>
            <p>Each page provides detailed timelines, primary sources, and specialized analysis.</p>
        </div>
        
        <div class="button-container" style="margin-top: 40px;">
            <a href="/history" class="nav-button back-button">← Back to History Main</a>
        </div>
    </div>
</body>
</html>`;
    
    res.send(asiaAfricaContent);
});


// ============================================
// /history/archives - Document Archives
// ============================================

app.get('/history/archives', (req, res) => {
    const archivesContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Archives - Primary Sources</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.97);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        header {
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #2c3e50, #3498db);
            border-radius: 15px;
            margin-bottom: 40px;
            color: white;
        }
        
        h1 {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .archive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }
        
        .archive-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border-top: 5px solid #3498db;
        }
        
        .archive-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.2);
        }
        
        .archive-card-title {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .archive-card-title span {
            font-size: 2rem;
        }
        
        .archive-list {
            list-style: none;
        }
        
        .archive-list li {
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }
        
        .archive-list li:last-child {
            border-bottom: none;
        }
        
        .archive-list a {
            color: #2980b9;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .archive-list a:hover {
            color: #e74c3c;
        }
        
        .archive-list a:before {
            content: "📄";
            font-size: 1.2rem;
        }
        
        .description {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
            margin-left: 28px;
        }
        
        .nav-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #3498db, #2c3e50);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin: 10px;
            transition: all 0.3s ease;
        }
        
        .nav-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        @media (max-width: 768px) {
            .archive-grid {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
            }
            
            .nav-button {
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📚 Document Archives</h1>
            <div class="subtitle">Primary Sources • Declassified Documents • Historical Records</div>
        </header>
        
        <div class="archive-grid">
            <div class="archive-card">
                <div class="archive-card-title">
                    <span>🕵️</span> Declassified Documents
                </div>
                <ul class="archive-list">
                    <li>
                        <a href="https://www.archives.gov/research/foreign-policy/declassified" target="_blank">
                            U.S. National Archives - Declassified Documents
                        </a>
                        <div class="description">Official U.S. government declassified materials</div>
                    </li>
                    <li>
                        <a href="https://nsarchive.gwu.edu/" target="_blank">
                            National Security Archive (George Washington University)
                        </a>
                        <div class="description">Independent non-governmental research institute</div>
                    </li>
                    <li>
                        <a href="https://www.cia.gov/readingroom/" target="_blank">
                            CIA Freedom of Information Act (FOIA) Electronic Reading Room
                        </a>
                        <div class="description">Declassified CIA documents available to the public</div>
                    </li>
                    <li>
                        <a href="https://www.state.gov/foia/electronic-reading-room/" target="_blank">
                            U.S. State Department FOIA Reading Room
                        </a>
                        <div class="description">Declassified diplomatic cables and documents</div>
                    </li>
                    <li>
                        <a href="https://www.dni.gov/index.php/ic-on-the-record-database" target="_blank">
                            IC on the Record (U.S. Intelligence Community)
                        </a>
                        <div class="description">Official releases from U.S. intelligence agencies</div>
                    </li>
                </ul>
            </div>
            
            <div class="archive-card">
                <div class="archive-card-title">
                    <span>🌐</span> International Archives
                </div>
                <ul class="archive-list">
                    <li>
                        <a href="https://wikileaks.org/" target="_blank">
                            WikiLeaks
                        </a>
                        <div class="description">International non-profit organization publishing news leaks</div>
                    </li>
                    <li>
                        <a href="https://www.theguardian.com/us-news/series/us-embassy-cables-the-documents" target="_blank">
                            The Guardian - Diplomatic Cables
                        </a>
                        <div class="description">Full database of U.S. diplomatic cables</div>
                    </li>
                    <li>
                        <a href="https://www.europarl.europa.eu/thinktank/en/document.html" target="_blank">
                            European Parliament Think Tank
                        </a>
                        <div class="description">Research and analysis from EU Parliament</div>
                    </li>
                    <li>
                        <a href="https://www.un.org/depts/dhl/dag/" target="_blank">
                            UN Dag Hammarskjöld Library
                        </a>
                        <div class="description">United Nations documents and publications</div>
                    </li>
                    <li>
                        <a href="https://www.wilsoncenter.org/digital-archive" target="_blank">
                            Wilson Center Digital Archive
                        </a>
                        <div class="description">Declassified international relations documents</div>
                    </li>
                </ul>
            </div>
            
            <div class="archive-card">
                <div class="archive-card-title">
                    <span>📊</span> Data & Statistics Archives
                </div>
                <ul class="archive-list">
                    <li>
                        <a href="https://www.worldbank.org/en/research" target="_blank">
                            World Bank Open Data
                        </a>
                        <div class="description">Free and open access to global development data</div>
                    </li>
                    <li>
                        <a href="https://data.imf.org/" target="_blank">
                            IMF Data
                        </a>
                        <div class="description">International Monetary Fund statistics</div>
                    </li>
                    <li>
                        <a href="https://www.undp.org/data" target="_blank">
                            UNDP Human Development Data
                        </a>
                        <div class="description">United Nations Development Programme data</div>
                    </li>
                    <li>
                        <a href="https://ourworldindata.org/" target="_blank">
                            Our World in Data
                        </a>
                        <div class="description">Research and data to make progress against world's largest problems</div>
                    </li>
                    <li>
                        <a href="https://www.gapminder.org/data/" target="_blank">
                            Gapminder Data
                        </a>
                        <div class="description">Fact-based worldview everyone can understand</div>
                    </li>
                </ul>
            </div>
        </div>
        
        <div class="navigation">
            <a href="/history/asia-africa" class="nav-button">
                ⬅️ Previous: Asia & Africa
            </a>
            <a href="/history/researchers" class="nav-button">
                Next: Researchers & Whistleblowers ➡️
            </a>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3>🔍 Research Tips</h3>
            <p>• Cross-reference information from multiple sources</p>
            <p>• Check document authenticity and provenance</p>
            <p>• Consider historical context and potential biases</p>
            <p>• Look for primary sources when possible</p>
        </div>
    </div>
    
    <script>
        // Add animation to archive cards
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.archive-card');
            
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'all 0.6s ease ' + (index * 0.2) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 300);
            });
        });
    </script>
</body>
</html>`;
    
    res.send(archivesContent);
});

// ============================================
// /history/researchers - Researchers & Whistleblowers
// ============================================

app.get('/history/researchers', (req, res) => {
    const researchersContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Researchers & Whistleblowers - Critical Perspectives</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.97);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        header {
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            border-radius: 15px;
            margin-bottom: 40px;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        header:before {
            content: "🔍";
            position: absolute;
            font-size: 10rem;
            opacity: 0.1;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .categories {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }
        
        .category-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border-top: 5px solid;
        }
        
        .journalists {
            border-top-color: #e74c3c;
        }
        
        .academics {
            border-top-color: #3498db;
        }
        
        .whistleblowers {
            border-top-color: #2ecc71;
        }
        
        .category-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.2);
        }
        
        .category-title {
            font-size: 1.8rem;
            margin-bottom: 20px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .category-title span {
            font-size: 2rem;
        }
        
        .researcher-list {
            list-style: none;
        }
        
        .researcher-list li {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            transition: all 0.3s ease;
        }
        
        .researcher-list li:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        
        .researcher-name {
            font-size: 1.2rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .researcher-title {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 10px;
            font-style: italic;
        }
        
        .researcher-work {
            color: #555;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .researcher-link {
            display: inline-block;
            margin-top: 10px;
            color: #2980b9;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .researcher-link:hover {
            color: #e74c3c;
        }
        
        .researcher-link:after {
            content: " →";
        }
        
        .quote-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 40px 0;
            text-align: center;
            font-style: italic;
            font-size: 1.2rem;
            position: relative;
        }
        
        .quote-box:before {
            content: "❝";
            font-size: 4rem;
            position: absolute;
            top: 10px;
            left: 20px;
            opacity: 0.3;
        }
        
        .quote-box:after {
            content: "❞";
            font-size: 4rem;
            position: absolute;
            bottom: 10px;
            right: 20px;
            opacity: 0.3;
        }
        
        .nav-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #6a11cb, #2575fc);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin: 10px;
            transition: all 0.3s ease;
        }
        
        .nav-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .warning-box {
            background: #fff3cd;
            border-left: 5px solid #ffc107;
            padding: 20px;
            margin-top: 40px;
            border-radius: 10px;
        }
        
        @media (max-width: 768px) {
            .categories {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
            }
            
            .nav-button {
                text-align: center;
            }
            
            h1 {
                font-size: 2.2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 Researchers & Whistleblowers</h1>
            <div class="subtitle">Independent Investigators • Academic Dissenters • Truth Tellers</div>
        </header>
        
        <div class="quote-box">
            "The greatest crimes in the world are not committed by people breaking the rules, 
            but by people following the rules. It's people who follow orders that drop bombs 
            and massacre villages."
            <div style="margin-top: 15px; font-weight: bold;">— Julian Assange</div>
        </div>
        
        <div class="categories">
            <div class="category-card journalists">
                <h2 class="category-title">
                    <span>📰</span> Investigative Journalists
                </h2>
                <ul class="researcher-list">
                    <li>
                        <div class="researcher-name">Seymour Hersh</div>
                        <div class="researcher-title">Pulitzer Prize-winning investigative journalist</div>
                        <div class="researcher-work">
                            Known for exposing the My Lai Massacre and Abu Ghraib torture.
                            <a href="https://seymourhersh.substack.com/" target="_blank" class="researcher-link">Current Work</a>
                        </div>
                    </li>
                    <li>
                        <div class="researcher-name">Glenn Greenwald</div>
                        <div class="researcher-title">Journalist, lawyer, and author</div>
                        <div class="researcher-work">
                            Co-founding editor of The Intercept, broke Snowden NSA stories.
                            <a href="https://greenwald.substack.com/" target="_blank" class="researcher-link">Substack</a>
                        </div>
                    </li>
                    <li>
                        <div class="researcher-name">Robert Fisk</div>
                        <div class="researcher-title">Middle East correspondent (1946-2020)</div>
                        <div class="researcher-work">
                            Known for critical reporting on Western foreign policy in the Middle East.
                            <a href="https://www.independent.co.uk/author/robert-fisk" target="_blank" class="researcher-link">Archive</a>
                        </div>
                    </li>
                </ul>
            </div>
            
            <div class="category-card academics">
                <h2 class="category-title">
                    <span>🎓</span> Academic Researchers
                </h2>
                <ul class="researcher-list">
                    <li>
                        <div class="researcher-name">Noam Chomsky</div>
                        <div class="researcher-title">Professor Emeritus, MIT - Linguist & Political Analyst</div>
                        <div class="researcher-work">
                            Critical analysis of media, US foreign policy, and corporate power.
                            <a href="https://chomsky.info/" target="_blank" class="researcher-link">Website</a>
                        </div>
                    </li>
                    <li>
                        <div class="researcher-name">Edward Said</div>
                        <div class="researcher-title">Professor, Columbia University (1935-2003)</div>
                        <div class="researcher-work">
                            Author of "Orientalism," foundational post-colonial studies work.
                            <a href="https://www.edwardsaid.org/" target="_blank" class="researcher-link">Legacy</a>
                        </div>
                    </li>
                    <li>
                        <div class="researcher-name">Angela Davis</div>
                        <div class="researcher-title">Professor, UC Santa Cruz - Political Activist</div>
                        <div class="researcher-work">
                            Scholar of prison abolition, feminism, and anti-racism.
                            <a href="https://angeladavis.org/" target="_blank" class="researcher-link">Website</a>
                        </div>
                    </li>
                </ul>
            </div>
            
            <div class="category-card whistleblowers">
                <h2 class="category-title">
                    <span>⚖️</span> Whistleblowers & Insiders
                </h2>
                <ul class="researcher-list">
                    <li>
                        <div class="researcher-name">Daniel Ellsberg</div>
                        <div class="researcher-title">Former military analyst - Pentagon Papers</div>
                        <div class="researcher-work">
                            Released the Pentagon Papers exposing US government deception about Vietnam War.
                            <a href="https://www.ellsberg.net/" target="_blank" class="researcher-link">Website</a>
                        </div>
                    </li>
                    <li>
                        <div class="researcher-name">Chelsea Manning</div>
                        <div class="researcher-title">Former US Army intelligence analyst</div>
                        <div class="researcher-work">
                            Provided WikiLeaks with the largest set of classified documents ever leaked.
                            <a href="https://www.chelseamanning.org/" target="_blank" class="researcher-link">Website</a>
                        </div>
                    </li>
                    <li>
                        <div class="researcher-name">John Kiriakou</div>
                        <div class="researcher-title">Former CIA officer</div>
                        <div class="researcher-work">
                            Exposed CIA torture program, served prison time for whistleblowing.
                            <a href="https://johnkiriakou.com/" target="_blank" class="researcher-link">Blog</a>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        
        <div class="warning-box">
            <h3>⚠️ Note on Whistleblower Protection</h3>
            <p>Many whistleblowers face legal consequences, persecution, or exile for revealing information. 
            Support organizations like <a href="https://exposefacts.org/" target="_blank">ExposeFacts</a> and 
            <a href="https://www.whistleblower.org/" target="_blank">National Whistleblower Center</a> that work to protect truth-tellers.</p>
        </div>
        
        <div class="navigation">
            <a href="/history/archives" class="nav-button">
                ⬅️ Previous: Document Archives
            </a>
            <a href="/history/media" class="nav-button">
                Next: Alternative Media ➡️
            </a>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3>📚 Further Reading</h3>
            <p>• <a href="https://www.thewhistleblowers.org/" target="_blank">The Whistleblowers</a> - Stories of courage</p>
            <p>• <a href="https://gijn.org/" target="_blank">Global Investigative Journalism Network</a> - Resources for journalists</p>
            <p>• <a href="https://www.projectcensored.org/" target="_blank">Project Censored</a> - Important news stories missed by mainstream media</p>
        </div>
    </div>
    
    <script>
        // Add staggered animation to researcher items
        document.addEventListener('DOMContentLoaded', function() {
            const items = document.querySelectorAll('.researcher-list li');
            
            items.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                item.style.transition = 'all 0.5s ease ' + (index * 0.1) + 's';
                
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                }, 300);
            });
            
            // Animate category cards
            const cards = document.querySelectorAll('.category-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(40px)';
                card.style.transition = 'all 0.7s ease ' + (index * 0.2) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 500);
            });
        });
    </script>
</body>
</html>`;
    
    res.send(researchersContent);
});

// ============================================
// /history/media - Alternative Media
// ============================================

app.get('/history/media', (req, res) => {
    const mediaContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alternative Media - Independent News & Analysis</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.97);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        header {
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #ff7e5f, #feb47b);
            border-radius: 15px;
            margin-bottom: 40px;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        header:before {
            content: "📡";
            position: absolute;
            font-size: 10rem;
            opacity: 0.1;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }
        
        .media-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border-left: 5px solid;
            display: flex;
            flex-direction: column;
        }
        
        .news-card {
            border-left-color: #e74c3c;
        }
        
        .analysis-card {
            border-left-color: #3498db;
        }
        
        .community-card {
            border-left-color: #2ecc71;
        }
        
        .media-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.2);
        }
        
        .media-icon {
            font-size: 3rem;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .media-title {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        
        .media-description {
            color: #666;
            margin-bottom: 20px;
            flex-grow: 1;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .media-links {
            list-style: none;
            margin-top: auto;
        }
        
        .media-links li {
            margin: 10px 0;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        .media-links li:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        
        .media-link {
            color: #2980b9;
            text-decoration: none;
            font-weight: 500;
            display: block;
            transition: color 0.3s ease;
        }
        
        .media-link:hover {
            color: #e74c3c;
        }
        
        .media-link:after {
            content: " ↗";
            font-size: 0.9rem;
            opacity: 0.7;
        }
        
        .link-description {
            color: #777;
            font-size: 0.85rem;
            margin-top: 5px;
            line-height: 1.4;
        }
        
        .stats-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 40px 0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            text-align: center;
        }
        
        .stat-item h3 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .stat-item p {
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .nav-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #ff7e5f, #feb47b);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin: 10px;
            transition: all 0.3s ease;
        }
        
        .nav-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .critical-thinking {
            background: #d4edda;
            border-left: 5px solid #28a745;
            padding: 25px;
            margin-top: 40px;
            border-radius: 10px;
        }
        
        .critical-thinking h3 {
            color: #155724;
            margin-bottom: 15px;
        }
        
        @media (max-width: 768px) {
            .media-grid {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
            }
            
            .nav-button {
                text-align: center;
            }
            
            .stats-box {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 2.2rem;
            }
        }
        
        .language-badge {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            margin-left: 8px;
            vertical-align: middle;
        }
        
        .english { background: #3498db; }
        .multilingual { background: #2ecc71; }
        .arabic { background: #e74c3c; }
        .spanish { background: #f39c12; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📡 Alternative Media</h1>
            <div class="subtitle">Uncensored Platforms • Independent Analysis • Community Investigations</div>
        </header>
        
        <div class="stats-box">
            <div class="stat-item">
                <h3>73%</h3>
                <p>of Americans believe traditional media outlets report news they know to be fake</p>
            </div>
            <div class="stat-item">
                <h3>42%</h3>
                <p>regularly seek out alternative news sources for different perspectives</p>
            </div>
            <div class="stat-item">
                <h3>58%</h3>
                <p>trust independent journalists more than mainstream media reporters</p>
            </div>
        </div>
        
        <div class="media-grid">
            <div class="media-card news-card">
                <div class="media-icon">📰</div>
                <h2 class="media-title">Independent News Outlets</h2>
                <p class="media-description">Platforms providing news without corporate or state editorial control, often focusing on underreported stories.</p>
                <ul class="media-links">
                    <li>
                        <a href="https://theintercept.com/" target="_blank" class="media-link">
                            The Intercept
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Investigative journalism on national security, politics, and civil liberties</div>
                    </li>
                    <li>
                        <a href="https://www.democracynow.org/" target="_blank" class="media-link">
                            Democracy Now!
                            <span class="language-badge multilingual">EN/ES</span>
                        </a>
                        <div class="link-description">Daily independent global news hour with Amy Goodman</div>
                    </li>
                    <li>
                        <a href="https://www.middleeasteye.net/" target="_blank" class="media-link">
                            Middle East Eye
                            <span class="language-badge multilingual">EN/FR/AR</span>
                        </a>
                        <div class="link-description">Independent news covering Middle East and North Africa</div>
                    </li>
                    <li>
                        <a href="https://www.aljazeera.com/" target="_blank" class="media-link">
                            Al Jazeera English
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Qatar-based international news network with global perspective</div>
                    </li>
                    <li>
                        <a href="https://www.theguardian.com/international" target="_blank" class="media-link">
                            The Guardian International
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">British newspaper known for investigative journalism</div>
                    </li>
                </ul>
            </div>
            
            <div class="media-card analysis-card">
                <div class="media-icon">🔍</div>
                <h2 class="media-title">Analytical Platforms</h2>
                <p class="media-description">In-depth analysis, research, and commentary beyond daily news cycles.</p>
                <ul class="media-links">
                    <li>
                        <a href="https://www.counterpunch.org/" target="_blank" class="media-link">
                            CounterPunch
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Critical perspectives on politics, culture, and international affairs</div>
                    </li>
                    <li>
                        <a href="https://www.mintpressnews.com/" target="_blank" class="media-link">
                            MintPress News
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Independent journalism focusing on human rights and geopolitics</div>
                    </li>
                    <li>
                        <a href="https://thegrayzone.com/" target="_blank" class="media-link">
                            The Grayzone
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Investigative journalism on foreign policy and media narratives</div>
                    </li>
                    <li>
                        <a href="https://www.asiatimes.com/" target="_blank" class="media-link">
                            Asia Times
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Pan-Asian news and analysis with regional perspectives</div>
                    </li>
                    <li>
                        <a href="https://www.opendemocracy.net/en/" target="_blank" class="media-link">
                            openDemocracy
                            <span class="language-badge multilingual">EN/ES/PT</span>
                        </a>
                        <div class="link-description">Global media platform covering challenges to democracy worldwide</div>
                    </li>
                </ul>
            </div>
            
            <div class="media-card community-card">
                <div class="media-icon">🌐</div>
                <h2 class="media-title">Community & Regional Media</h2>
                <p class="media-description">Grassroots reporting and platforms amplifying local and marginalized voices.</p>
                <ul class="media-links">
                    <li>
                        <a href="https://indiancountrytoday.com/" target="_blank" class="media-link">
                            Indian Country Today
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Digital news platform covering Indigenous communities</div>
                    </li>
                    <li>
                        <a href="https://africasacountry.com/" target="_blank" class="media-link">
                            Africa Is a Country
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Critique and analysis of African politics and culture</div>
                    </li>
                    <li>
                        <a href="https://www.newarab.com/" target="_blank" class="media-link">
                            The New Arab
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Independent pan-Arab news and analysis</div>
                    </li>
                    <li>
                        <a href="https://www.telesurenglish.net/" target="_blank" class="media-link">
                            TeleSUR English
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Latin American multimedia platform with anti-imperialist focus</div>
                    </li>
                    <li>
                        <a href="https://balkaninsight.com/" target="_blank" class="media-link">
                            Balkan Insight
                            <span class="language-badge english">EN</span>
                        </a>
                        <div class="link-description">Investigative journalism focusing on Southeast Europe</div>
                    </li>
                </ul>
            </div>
        </div>
        
        <div class="critical-thinking">
            <h3>💭 Critical Thinking Required</h3>
            <p><strong>This caution message constitutes non-critical information.</strong> We encourage you to explore the material further while maintaining critical thinking:</p>
            <ul style="margin-top: 10px; padding-left: 20px;">
                <li>Verify claims with multiple sources</li>
                <li>Consider potential biases in all media, including alternative sources</li>
                <li>Check sources' funding and ownership structures</li>
                <li>Look for primary documentation when available</li>
                <li>Engage with perspectives that challenge your own views</li>
            </ul>
        </div>
        
        <div class="navigation">
            <a href="/history/researchers" class="nav-button">
                ⬅️ Previous: Researchers & Whistleblowers
            </a>
            <a href="/geopolitics" class="nav-button">
                Next: Geopolitics ➡️
            </a>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3>📱 Stay Informed</h3>
            <p>• Use RSS feeds to follow multiple sources: <a href="https://feedly.com/" target="_blank">Feedly</a>, <a href="https://innoreader.com/" target="_blank">Inoreader</a></p>
            <p>• Fact-checking resources: <a href="https://www.snopes.com/" target="_blank">Snopes</a>, <a href="https://www.factcheck.org/" target="_blank">FactCheck.org</a></p>
            <p>• Media bias analysis: <a href="https://www.allsides.com/" target="_blank">AllSides</a>, <a href="https://www.mediabiasfactcheck.com/" target="_blank">Media Bias Fact Check</a></p>
        </div>
    </div>
    
    <script>
        // Add animations to media cards
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.media-card');
            
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9) translateY(40px)';
                card.style.transition = 'all 0.7s ease ' + (index * 0.2) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1) translateY(0)';
                }, 500);
            });
            
            // Animate stats numbers
            const statNumbers = document.querySelectorAll('.stat-item h3');
            statNumbers.forEach(number => {
                const target = number.textContent;
                if (target.includes('%')) {
                    const num = parseInt(target);
                    animatePercentage(number, num);
                }
            });
            
            function animatePercentage(element, target) {
                let current = 0;
                const increment = target / 40;
                const update = () => {
                    if (current < target) {
                        current += increment;
                        element.textContent = Math.floor(current) + '%';
                        setTimeout(update, 30);
                    } else {
                        element.textContent = target + '%';
                    }
                };
                update();
            }
        });
    </script>
</head>
</html>`;
    
    res.send(mediaContent);
});

// ============================================
// /geopolitics - Main Geopolitics Overview
// ============================================

app.get('/geopolitics', (req, res) => {
    const geopoliticsContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Geopolitics - Global Power Structures & Analysis</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.97);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }
        
        header {
            text-align: center;
            padding: 60px 40px;
            background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%);
            border-radius: 15px;
            margin-bottom: 50px;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        header:before {
            content: "🗺️";
            position: absolute;
            font-size: 15rem;
            opacity: 0.1;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
            50% { transform: translate(-50%, -50%) translateY(-20px); }
        }
        
        h1 {
            font-size: 3.5rem;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .subtitle {
            font-size: 1.3rem;
            opacity: 0.95;
            position: relative;
            z-index: 1;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .intro-box {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin: 40px 0;
            border-left: 5px solid #3498db;
            font-size: 1.1rem;
            line-height: 1.7;
        }
        
        .region-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 50px 0;
        }
        
        .region-card {
            background: white;
            padding: 35px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            transition: all 0.4s ease;
            text-align: center;
            border-top: 8px solid;
            position: relative;
            overflow: hidden;
        }
        
        .region-card:hover {
            transform: translateY(-15px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        .region-card:before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: rgba(255,255,255,0.3);
        }
        
        .middle-east { border-top-color: #e74c3c; }
        .usa { border-top-color: #3498db; }
        .europe { border-top-color: #9b59b6; }
        .asia-africa { border-top-color: #2ecc71; }
        .economics { border-top-color: #f39c12; }
        
        .region-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            display: block;
        }
        
        .region-title {
            font-size: 1.8rem;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        
        .region-description {
            color: #666;
            margin-bottom: 25px;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .topics-list {
            list-style: none;
            text-align: left;
            margin: 20px 0;
        }
        
        .topics-list li {
            padding: 8px 0;
            border-bottom: 1px dashed #eee;
            color: #555;
            display: flex;
            align-items: center;
        }
        
        .topics-list li:before {
            content: "•";
            color: #3498db;
            font-weight: bold;
            font-size: 1.5rem;
            margin-right: 10px;
        }
        
        .explore-btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 15px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .explore-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .nav-buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .nav-btn {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #1a2980, #26d0ce);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .nav-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .definition-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 40px 0;
        }
        
        .definition-box h3 {
            font-size: 1.8rem;
            margin-bottom: 15px;
        }
        
        @media (max-width: 768px) {
            .region-grid {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 2.5rem;
            }
            
            .nav-buttons {
                flex-direction: column;
                text-align: center;
            }
            
            .region-card {
                padding: 25px 20px;
            }
        }
        
        .disclaimer {
            background: #fff3cd;
            border-left: 5px solid #ffc107;
            padding: 20px;
            margin-top: 40px;
            border-radius: 10px;
            font-size: 0.95rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🗺️ Geopolitics</h1>
            <div class="subtitle">Global Power Structures • Regional Dynamics • Hidden Forces Shaping Our World</div>
        </header>
        
        <div class="definition-box">
            <h3>🌍 What is Geopolitics?</h3>
            <p>Geopolitics examines how geography, power, and international relations intersect. It explores how nations compete for resources, influence, and control, and how historical patterns continue to shape current conflicts and alliances.</p>
        </div>
        
        <div class="intro-box">
            <p>This section explores the hidden structures and real motivations behind global events. Unlike conventional analysis, we examine <strong>long-term patterns, economic interests, and power dynamics</strong> that mainstream narratives often overlook.</p>
            <p style="margin-top: 15px;">Each region below contains carefully curated resources from both official sources and independent analysts to provide balanced perspectives.</p>
        </div>
        
        <div class="region-grid">
            <!-- Middle East Card -->
            <div class="region-card middle-east">
                <span class="region-icon">🕌</span>
                <h2 class="region-title">Middle East</h2>
                <p class="region-description">The world's most contested region where oil, religion, and geopolitics intersect.</p>
                <ul class="topics-list">
                    <li>Israel-Palestine Historical Context</li>
                    <li>Oil Wars & Energy Politics</li>
                    <li>Arab Spring: Causes & Consequences</li>
                    <li>Regional Power Dynamics</li>
                </ul>
                <a href="/geopolitics/middle-east" class="explore-btn">Explore Middle East →</a>
            </div>
            
            <!-- United States Card -->
            <div class="region-card usa">
                <span class="region-icon">🇺🇸</span>
                <h2 class="region-title">United States</h2>
                <p class="region-description">Global superpower with complex domestic and international power structures.</p>
                <ul class="topics-list">
                    <li>Federal Reserve & Monetary Policy</li>
                    <li>JFK Assassination Context</li>
                    <li>Deep State & Bureaucratic Power</li>
                    <li>US Foreign Policy Evolution</li>
                </ul>
                <a href="/geopolitics/united-states" class="explore-btn">Explore USA →</a>
            </div>
            
            <!-- Europe Card -->
            <div class="region-card europe">
                <span class="region-icon">🇪🇺</span>
                <h2 class="region-title">Europe</h2>
                <p class="region-description">Ancient continent with modern power struggles and integration challenges.</p>
                <ul class="topics-list">
                    <li>EU Creation & Integration Motives</li>
                    <li>Vatican Financial Influence</li>
                    <li>Modern Monarchies & Power</li>
                    <li>East-West European Divides</li>
                </ul>
                <a href="/geopolitics/europe" class="explore-btn">Explore Europe →</a>
            </div>
            
            <!-- Asia & Africa Card -->
            <div class="region-card asia-africa">
                <span class="region-icon">🌏🌍</span>
                <h2 class="region-title">Asia & Africa</h2>
                <p class="region-description">Rising powers and nations grappling with colonial legacies and development.</p>
                <ul class="topics-list">
                    <li>Colonial Exploitation Patterns</li>
                    <li>Resource Wars & Extraction</li>
                    <li>Development Trap Analysis</li>
                    <li>South-South Cooperation</li>
                </ul>
                <a href="/geopolitics/asia-africa" class="explore-btn">Explore Asia & Africa →</a>
            </div>
            
            <!-- Economics Card -->
            <div class="region-card economics">
                <span class="region-icon">💸</span>
                <h2 class="region-title">Global Economics</h2>
                <p class="region-description">Financial systems, monetary policy, and economic warfare tactics.</p>
                <ul class="topics-list">
                    <li>Gold Standard Removal (1971)</li>
                    <li>Cryptocurrency Battles</li>
                    <li>Artificial Finance Systems</li>
                    <li>Economic Sanctions as Weapons</li>
                </ul>
                <a href="/geopolitics/economics" class="explore-btn">Explore Economics →</a>
            </div>
        </div>
        
        <div class="disclaimer">
            <h3>🔍 Analytical Approach</h3>
            <p>This section presents multiple perspectives on complex geopolitical issues. We include both official sources and critical analyses. Readers are encouraged to cross-reference information and consider multiple viewpoints before forming conclusions.</p>
        </div>
        
        <div class="nav-buttons">
            <a href="/history" class="nav-btn">← Back to History</a>
            <a href="/" class="nav-btn">🏠 Return to Home</a>
            <a href="/geopolitics/middle-east" class="nav-btn">Start with Middle East →</a>
        </div>
    </div>
    
    <script>
        // Add animations
        document.addEventListener('DOMContentLoaded', function() {
            // Animate region cards
            const cards = document.querySelectorAll('.region-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(50px) scale(0.9)';
                card.style.transition = 'all 0.7s ease ' + (index * 0.15) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0) scale(1)';
                }, 300);
            });
            
            // Add hover effect for topic items
            const topicItems = document.querySelectorAll('.topics-list li');
            topicItems.forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateX(5px)';
                    this.style.transition = 'transform 0.2s ease';
                });
                
                item.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateX(0)';
                });
            });
        });
    </script>
</body>
</html>`;
    
    res.send(geopoliticsContent);
});

// ============================================
// /geopolitics/middle-east - Middle East Geopolitics
// ============================================

app.get('/geopolitics/middle-east', (req, res) => {
    const middleEastContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Middle East Geopolitics - Oil, Conflict & Power Dynamics</title>
    <style>
        :root {
            --primary: #e74c3c;
            --secondary: #c0392b;
            --accent: #f39c12;
            --dark: #2c3e50;
            --light: #ecf0f1;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #d31027 0%, #ea384d 100%);
            color: #333;
            line-height: 1.6;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }
        
        header {
            text-align: center;
            padding: 50px 40px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 15px;
            margin-bottom: 40px;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        header:before {
            content: "🕌";
            position: absolute;
            font-size: 12rem;
            opacity: 0.1;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        h1 {
            font-size: 3.2rem;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
        }
        
        .subtitle {
            font-size: 1.3rem;
            opacity: 0.95;
            position: relative;
            z-index: 1;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .quick-facts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        
        .fact-box {
            background: var(--light);
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid var(--primary);
            transition: transform 0.3s ease;
        }
        
        .fact-box:hover {
            transform: translateY(-5px);
        }
        
        .fact-box h3 {
            color: var(--dark);
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .topics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin: 50px 0;
        }
        
        .topic-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-top: 8px solid;
            transition: all 0.4s ease;
        }
        
        .topic-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        .israel-palestine { border-top-color: #3498db; }
        .oil-wars { border-top-color: #f1c40f; }
        .arab-spring { border-top-color: #e74c3c; }
        
        .topic-icon {
            font-size: 3rem;
            margin-bottom: 20px;
            display: block;
        }
        
        .topic-title {
            font-size: 1.8rem;
            margin-bottom: 15px;
            color: var(--dark);
        }
        
        .topic-description {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .resources-list {
            list-style: none;
            margin: 25px 0;
        }
        
        .resources-list li {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        .resources-list li:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        
        .resource-link {
            color: #2980b9;
            text-decoration: none;
            font-weight: 500;
            display: block;
            margin-bottom: 5px;
            transition: color 0.3s ease;
        }
        
        .resource-link:hover {
            color: var(--primary);
        }
        
        .resource-type {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            margin-right: 8px;
        }
        
        .official { background: #3498db; }
        .academic { background: #2ecc71; }
        .alternative { background: #e74c3c; }
        .document { background: #9b59b6; }
        
        .timeline {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 40px 0;
        }
        
        .timeline h2 {
            font-size: 2rem;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .timeline-items {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .timeline-item {
            flex: 1;
            min-width: 200px;
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }
        
        .year {
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .nav-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin: 10px;
            transition: all 0.3s ease;
        }
        
        .nav-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .perspective-box {
            background: #fff3cd;
            border-left: 5px solid #ffc107;
            padding: 25px;
            margin: 40px 0;
            border-radius: 10px;
        }
        
        @media (max-width: 768px) {
            .topics-grid {
                grid-template-columns: 1fr;
            }
            
            .timeline-items {
                flex-direction: column;
            }
            
            h1 {
                font-size: 2.5rem;
            }
            
            .navigation {
                flex-direction: column;
                text-align: center;
            }
        }
        
        .map-container {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🕌 Middle East Geopolitics</h1>
            <div class="subtitle">Oil • Religion • Conflict • The World's Most Contested Region</div>
        </header>
        
        <div class="quick-facts">
            <div class="fact-box">
                <h3>🛢️ Oil Reserves</h3>
                <p>48% of world's proven oil reserves • 38% of global natural gas</p>
            </div>
            <div class="fact-box">
                <h3>⚔️ Ongoing Conflicts</h3>
                <p>7 active wars • 15+ armed conflicts since 1948</p>
            </div>
            <div class="fact-box">
                <h3>💵 Military Spending</h3>
                <p>$200+ billion annually • Highest per capita in world</p>
            </div>
            <div class="fact-box">
                <h3>🌍 Strategic Importance</h3>
                <p>Controls vital shipping lanes • 65% of Europe's oil imports</p>
            </div>
        </div>
        
        <div class="topics-grid">
            <!-- Israel-Palestine -->
            <div class="topic-card israel-palestine">
                <span class="topic-icon">⚖️</span>
                <h2 class="topic-title">Israel-Palestine Conflict</h2>
                <p class="topic-description">One of the world's longest-running conflicts with deep historical roots and ongoing humanitarian crisis.</p>
                
                <ul class="resources-list">
                    <li>
                        <span class="resource-type official">UN</span>
                        <a href="https://www.un.org/unispal/" target="_blank" class="resource-link">UN Information System on Palestine</a>
                        <div>Official UN documents and resolutions</div>
                    </li>
                    <li>
                        <span class="resource-type academic">Academic</span>
                        <a href="https://www.palestineremembered.com/" target="_blank" class="resource-link">Palestine Remembered</a>
                        <div>Oral history, maps, and documents from Palestinian perspective</div>
                    </li>
                    <li>
                        <span class="resource-type document">Archive</span>
                        <a href="https://www.archives.gov/research/foreign-policy/arab-israeli" target="_blank" class="resource-link">U.S. National Archives - Arab-Israeli Relations</a>
                        <div>Declassified U.S. documents 1948-present</div>
                    </li>
                    <li>
                        <span class="resource-type alternative">Analysis</span>
                        <a href="https://www.btselem.org/" target="_blank" class="resource-link">B'Tselem - Israeli Human Rights Organization</a>
                        <div>Documenting human rights violations in occupied territories</div>
                    </li>
                </ul>
            </div>
            
            <!-- Oil Wars -->
            <div class="topic-card oil-wars">
                <span class="topic-icon">🛢️</span>
                <h2 class="topic-title">Oil Wars & Energy Politics</h2>
                <p class="topic-description">How petroleum shapes foreign policy, military interventions, and regional power dynamics.</p>
                
                <ul class="resources-list">
                    <li>
                        <span class="resource-type official">Official</span>
                        <a href="https://www.eia.gov/international/analysis/region" target="_blank" class="resource-link">U.S. Energy Information Administration - Middle East</a>
                        <div>Official energy data and analysis</div>
                    </li>
                    <li>
                        <span class="resource-type document">Leaks</span>
                        <a href="https://www.theguardian.com/world/2011/apr/18/secret-papers-oil-firms-iraq-war" target="_blank" class="resource-link">The Guardian - Iraq Oil War Documents</a>
                        <div>Secret papers reveal oil interests in Iraq war</div>
                    </li>
                    <li>
                        <span class="resource-type academic">Research</span>
                        <a href="https://www.cfr.org/backgrounder/how-oil-markets-work" target="_blank" class="resource-link">Council on Foreign Relations - Oil Markets</a>
                        <div>Analysis of oil geopolitics and pricing</div>
                    </li>
                    <li>
                        <span class="resource-type alternative">Investigation</span>
                        <a href="https://www.middleeasteye.net/tags/oil" target="_blank" class="resource-link">Middle East Eye - Oil Investigations</a>
                        <div>Independent reporting on Middle East energy politics</div>
                    </li>
                </ul>
            </div>
            
            <!-- Arab Spring -->
            <div class="topic-card arab-spring">
                <span class="topic-icon">🌅</span>
                <h2 class="topic-title">Arab Spring & Geopolitical Manipulation</h2>
                <p class="topic-description">2010-2012 uprisings: Grassroots movements, foreign interventions, and lasting consequences.</p>
                
                <ul class="resources-list">
                    <li>
                        <span class="resource-type document">Archive</span>
                        <a href="https://wikileaks.org/" target="_blank" class="resource-link">WikiLeaks - Diplomatic Cables</a>
                        <div>U.S. diplomatic communications before/during Arab Spring</div>
                    </li>
                    <li>
                        <span class="resource-type academic">Study</span>
                        <a href="https://carnegieendowment.org/sada/" target="_blank" class="resource-link">Carnegie Endowment - Sada Journal</a>
                        <div>Academic analysis of Arab Spring aftermath</div>
                    </li>
                    <li>
                        <span class="resource-type alternative">Investigation</span>
                        <a href="https://theintercept.com/series/the-arab-spring/" target="_blank" class="resource-link">The Intercept - Arab Spring Series</a>
                        <div>Investigative journalism on foreign interventions</div>
                    </li>
                    <li>
                        <span class="resource-type official">Report</span>
                        <a href="https://www.amnesty.org/en/latest/news/2021/01/middle-east-and-north-africa-ten-years-after-the-arab-uprisings/" target="_blank" class="resource-link">Amnesty International - 10 Years After Report</a>
                        <div>Human rights assessment of Arab Spring outcomes</div>
                    </li>
                </ul>
            </div>
        </div>
        
        <div class="timeline">
            <h2>📜 Key Historical Timeline</h2>
            <div class="timeline-items">
                <div class="timeline-item">
                    <div class="year">1916</div>
                    <div>Sykes-Picot Agreement divides Middle East</div>
                </div>
                <div class="timeline-item">
                    <div class="year">1948</div>
                    <div>State of Israel established • Nakba</div>
                </div>
                <div class="timeline-item">
                    <div class="year">1973</div>
                    <div>Oil embargo • Petrodollar system established</div>
                </div>
                <div class="timeline-item">
                    <div class="year">2010</div>
                    <div>Arab Spring begins in Tunisia</div>
                </div>
                <div class="timeline-item">
                    <div class="year">Present</div>
                    <div>Ongoing conflicts • Normalization deals</div>
                </div>
            </div>
        </div>
        
        <div class="map-container">
            <h3>🗺️ Regional Map & Current Conflicts</h3>
            <p>Interactive resources for understanding current geopolitical divisions:</p>
            <p>
                <a href="https://www.crisisgroup.org/middle-east-north-africa" class="resource-link">International Crisis Group - Conflict Tracker</a> •
                <a href="https://acleddata.com/middle-east/" class="resource-link">ACLED - Armed Conflict Location Data</a> •
                <a href="https://www.reuters.com/graphics/MIDEAST-CRISIS/ISRAEL-PALESTINIANS/mopanwyabva/" class="resource-link">Reuters - Israel-Palestine Mapping</a>
            </p>
        </div>
        
        <div class="perspective-box">
            <h3>🔍 Multiple Perspectives Required</h3>
            <p>The Middle East is often viewed through polarized lenses. For balanced understanding, consult:</p>
            <ul style="margin-top: 10px; padding-left: 20px;">
                <li><strong>Regional media:</strong> Al Jazeera, Al Monitor, Middle East Eye</li>
                <li><strong>Israeli sources:</strong> Haaretz, Times of Israel, +972 Magazine</li>
                <li><strong>Palestinian sources:</strong> Ma'an News, WAFA, Al-Quds</li>
                <li><strong>International analysis:</strong> International Crisis Group, Carnegie Middle East Center</li>
            </ul>
        </div>
        
        <div class="navigation">
            <a href="/geopolitics" class="nav-button">
                ⬅️ Back to Geopolitics Overview
            </a>
            <a href="/geopolitics/united-states" class="nav-button">
                Next: United States Geopolitics ➡️
            </a>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3>📚 Further Study</h3>
            <p>• <a href="https://www.mei.edu/" target="_blank">Middle East Institute</a> - Research and analysis</p>
            <p>• <a href="https://www.aljazeera.com/news/longform/2023/10/9/the-israel-palestine-crisis-causes-consequences-portents" target="_blank">Al Jazeera - Israel-Palestine History</a></p>
            <p>• <a href="https://www.brookings.edu/region/middle-east/" target="_blank">Brookings Institution - Middle East Research</a></p>
        </div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Animate topic cards
            const cards = document.querySelectorAll('.topic-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(40px)';
                card.style.transition = 'all 0.7s ease ' + (index * 0.2) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 300);
            });
            
            // Animate fact boxes
            const facts = document.querySelectorAll('.fact-box');
            facts.forEach((fact, index) => {
                fact.style.opacity = '0';
                fact.style.transform = 'scale(0.9)';
                fact.style.transition = 'all 0.5s ease ' + (index * 0.1) + 's';
                
                setTimeout(() => {
                    fact.style.opacity = '1';
                    fact.style.transform = 'scale(1)';
                }, 400);
            });
        });
    </script>
</body>
</html>`;
    
    res.send(middleEastContent);
});


// ============================================
// /geopolitics/united-states - United States Geopolitics
// ============================================

app.get('/geopolitics/united-states', (req, res) => {
    const usaContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>United States Geopolitics - Power, Finance & Foreign Policy</title>
    <style>
            --accent: #e74c3c;
            --dark: #2c3e50;
            --light: #ecf0f1;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #3498db 0%, #2c3e50 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }
        
        header {
            text-align: center;
            padding: 50px 40px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 15px;
            margin-bottom: 40px;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        header:before {
            content: "🇺🇸";
            position: absolute;
            font-size: 12rem;
            opacity: 0.1;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        h1 {
            font-size: 3.2rem;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
        }
        
        .subtitle {
            font-size: 1.3rem;
            opacity: 0.95;
            position: relative;
            z-index: 1;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .quick-facts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        
        .fact-box {
            background: var(--light);
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid var(--primary);
            transition: transform 0.3s ease;
        }
        
        .fact-box:hover {
            transform: translateY(-5px);
        }
        
        .topics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin: 50px 0;
        }
        
        .topic-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-top: 8px solid;
            transition: all 0.4s ease;
        }
        
        .topic-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        .fed { border-top-color: #3498db; }
        .jfk { border-top-color: #e74c3c; }
        .deep-state { border-top-color: #2c3e50; }
        
        .topic-icon {
            font-size: 3rem;
            margin-bottom: 20px;
            display: block;
        }
        
        .topic-title {
            font-size: 1.8rem;
            margin-bottom: 15px;
            color: var(--dark);
        }
        
        .topic-description {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .resources-list {
            list-style: none;
            margin: 25px 0;
        }
        
        .resources-list li {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        .resources-list li:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        
        .resource-link {
            color: #2980b9;
            text-decoration: none;
            font-weight: 500;
            display: block;
            margin-bottom: 5px;
            transition: color 0.3s ease;
        }
        
        .resource-link:hover {
            color: var(--accent);
        }
        
        .resource-type {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            margin-right: 8px;
        }
        
        .official { background: #3498db; }
        .academic { background: #2ecc71; }
        .alternative { background: #e74c3c; }
        .archive { background: #9b59b6; }
        .documentary { background: #f39c12; }
        
        .timeline {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 40px 0;
        }
        
        .timeline h2 {
            font-size: 2rem;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .timeline-items {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .timeline-item {
            flex: 1;
            min-width: 200px;
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }
        
        .year {
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .nav-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin: 10px;
            transition: all 0.3s ease;
        }
        
        .nav-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .analysis-box {
            background: #e8f4fc;
            border-left: 5px solid #3498db;
            padding: 25px;
            margin: 40px 0;
            border-radius: 10px;
        }
        
        @media (max-width: 768px) {
            .topics-grid {
                grid-template-columns: 1fr;
            }
            
            .timeline-items {
                flex-direction: column;
            }
            
            h1 {
                font-size: 2.5rem;
            }
            
            .navigation {
                flex-direction: column;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🇺🇸 United States Geopolitics</h1>
            <div class="subtitle">Federal Reserve • Political Assassinations • Bureaucratic Power • Global Influence</div>
        </header>
        
        <div class="quick-facts">
            <div class="fact-box">
                <h3>💰 Federal Reserve</h3>
                <p>Private central bank established 1913 • Controls US monetary policy</p>
            </div>
            <div class="fact-box">
                <h3>🎯 Political Assassinations</h3>
                <p>4 US Presidents assassinated • 11+ attempts on sitting Presidents</p>
            </div>
            <div class="fact-box">
                <h3>🕵️ Intelligence Budget</h3>
                <p>$90+ billion annually • 17 intelligence agencies</p>
            </div>
            <div class="fact-box">
                <h3>🌎 Military Presence</h3>
                <p>750+ overseas military bases • Active in 80+ countries</p>
            </div>
        </div>
        
        <div class="topics-grid">
            <!-- Federal Reserve -->
            <div class="topic-card fed">
                <span class="topic-icon">💰</span>
                <h2 class="topic-title">Federal Reserve Creation</h2>
                <p class="topic-description">The 1913 establishment of America's central banking system and its ongoing influence on global finance.</p>
                
                <ul class="resources-list">
                    <li>
                        <span class="resource-type official">Official</span>
                        <a href="https://www.federalreserve.gov/aboutthefed.htm" target="_blank" class="resource-link">Federal Reserve - Official History</a>
                        <div>Official account of Fed's creation and mandate</div>
                    </li>
                    <li>
                        <span class="resource-type documentary">Documentary</span>
                        <a href="https://www.pbs.org/wgbh/pages/frontline/shows/secret/" target="_blank" class="resource-link">PBS Frontline - The Secret History of the Credit Card</a>
                        <div>Investigates the banking system evolution</div>
                    </li>
                    <li>
                        <span class="resource-type archive">Archive</span>
                        <a href="https://fraser.stlouisfed.org/" target="_blank" class="resource-link">FRASER - Federal Reserve Archival System</a>
                        <div>Historical documents and publications</div>
                    </li>
                    <li>
                        <span class="resource-type alternative">Analysis</span>
                        <a href="https://www.levyinstitute.org/" target="_blank" class="resource-link">Levy Economics Institute</a>
                        <div>Critical analysis of monetary policy</div>
                    </li>
                </ul>
            </div>
            
            <!-- JFK Assassination -->
            <div class="topic-card jfk">
                <span class="topic-icon">🎯</span>
                <h2 class="topic-title">JFK Assassination Context</h2>
                <p class="topic-description">November 22, 1963 - Official narrative vs. alternative theories and declassified documents.</p>
                
                <ul class="resources-list">
                    <li>
                        <span class="resource-type official">Official</span>
                        <a href="https://www.archives.gov/research/jfk" target="_blank" class="resource-link">National Archives - JFK Assassination Records</a>
                        <div>Declassified documents from official investigation</div>
                    </li>
                    <li>
                        <span class="resource-type documentary">Documentary</span>
                        <a href="https://www.pbs.org/wgbh/frontline/documentary/oswald-ghost/" target="_blank" class="resource-link">PBS Frontline - Oswald's Ghost</a>
                        <div>Examination of conspiracy theories</div>
                    </li>
                    <li>
                        <span class="resource-type archive">Archive</span>
                        <a href="https://www.maryferrell.org/" target="_blank" class="resource-link">Mary Ferrell Foundation</a>
                        <div>Largest JFK assassination document archive</div>
                    </li>
                    <li>
                        <span class="resource-type academic">Research</span>
                        <a href="https://www.history-matters.com/" target="_blank" class="resource-link">History Matters - JFK Research</a>
                        <div>Academic analysis of assassination evidence</div>
                    </li>
                </ul>
            </div>
            
            <!-- Deep State -->
            <div class="topic-card deep-state">
                <span class="topic-icon">🕵️</span>
                <h2 class="topic-title">Deep State Origins & Analysis</h2>
                <p class="topic-description">The permanent government bureaucracy, intelligence community, and their influence on policy.</p>
                
                <ul class="resources-list">
                    <li>
                        <span class="resource-type official">Report</span>
                        <a href="https://www.intelligence.gov/" target="_blank" class="resource-link">U.S. Intelligence Community</a>
                        <div>Official structure and agencies</div>
                    </li>
                    <li>
                        <span class="resource-type academic">Study</span>
                        <a href="https://www.brookings.edu/research/the-administrative-state-in-the-era-of-donald-trump/" target="_blank" class="resource-link">Brookings - The Administrative State</a>
                        <div>Analysis of bureaucratic power</div>
                    </li>
                    <li>
                        <span class="resource-type alternative">Investigation</span>
                        <a href="https://theintercept.com/series/the-deep-state/" target="_blank" class="resource-link">The Intercept - Deep State Series</a>
                        <div>Investigative journalism on intelligence agencies</div>
                    </li>
                    <li>
                        <span class="resource-type archive">Documents</span>
                        <a href="https://nsarchive.gwu.edu/" target="_blank" class="resource-link">National Security Archive</a>
                        <div>Declassified documents on intelligence operations</div>
                    </li>
                </ul>
            </div>
        </div>
        
        <div class="timeline">
            <h2>📜 Key Historical Timeline</h2>
            <div class="timeline-items">
                <div class="timeline-item">
                    <div class="year">1913</div>
                    <div>Federal Reserve Act • Income Tax established</div>
                </div>
                <div class="timeline-item">
                    <div class="year">1947</div>
                    <div>National Security Act • CIA created</div>
                </div>
                <div class="timeline-item">
                    <div class="year">1963</div>
                    <div>JFK Assassination • Warren Commission</div>
                </div>
                <div class="timeline-item">
                    <div class="year">1975</div>
                    <div>Church Committee • Intelligence abuses exposed</div>
                </div>
                <div class="timeline-item">
                    <div class="year">2001</div>
                    <div>Patriot Act • Expanded surveillance powers</div>
                </div>
            </div>
        </div>
        
        <div class="analysis-box">
            <h3>🔍 Analytical Framework</h3>
            <p>Understanding US power structures requires examining:</p>
            <ul style="margin-top: 10px; padding-left: 20px;">
                <li><strong>Public vs. Private Power:</strong> Federal Reserve as private institution with public functions</li>
                <li><strong>Electoral vs. Permanent Government:</strong> Elected officials vs. career bureaucrats</li>
                <li><strong>Transparency vs. Secrecy:</strong> Democratic ideals vs. national security state</li>
                <li><strong>Domestic vs. Foreign Policy:</strong> Interconnection between internal and external power</li>
            </ul>
        </div>
        
        <div class="navigation">
            <a href="/geopolitics/middle-east" class="nav-button">
                ⬅️ Previous: Middle East
            </a>
            <a href="/geopolitics/europe" class="nav-button">
                Next: Europe Geopolitics ➡️
            </a>
        </div>
        
        <style>
            .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
         }
    
            .nav-button {             
                 display: inline-block;
                 padding: 15px 30px;
                 background: linear-gradient(135deg, var(--primary), var(--secondary));
                 color: #ffffff;
                 text-shadow: 0 2px 4px rgba(0,0,0,0.7);
                 text-decoration: none;
                 border-radius: 10px;
                 font-weight: bold;
                 margin: 10px;
                 transition: all 0.3s ease;
                 border: 2px solid rgba(255,255,255,0.3);
             }  

  
          .nav-button:hover {
              background-color: #e0e0e0;
          }
        </style>

        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3>📚 Further Research</h3>
            <p>• <a href="https://www.cia.gov/readingroom/" target="_blank">CIA FOIA Reading Room</a> - Declassified documents</p>
            <p>• <a href="https://www.archives.gov/research" target="_blank">National Archives Research</a> - Primary source documents</p>
            <p>• <a href="https://www.fas.org/" target="_blank">Federation of American Scientists</a> - Security policy analysis</p>
        </div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Animate topic cards
            const cards = document.querySelectorAll('.topic-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(40px)';
                card.style.transition = 'all 0.7s ease ' + (index * 0.2) + 's';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 300);
            });
            
            // Animate fact boxes
            const facts = document.querySelectorAll('.fact-box');
            facts.forEach((fact, index) => {
                fact.style.opacity = '0';
                fact.style.transform = 'scale(0.9)';
                fact.style.transition = 'all 0.5s ease ' + (index * 0.1) + 's';
                
                setTimeout(() => {
                    fact.style.opacity = '1';
                    fact.style.transform = 'scale(1)';
                }, 400);
            });
        });
    </script>
</body>
</html>`;
    
    res.send(usaContent);
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


// ===== START SERVER =====

// Start server for Render (single port)
app.listen(PORT, () => {
  console.log(`🚀 Fatimah's Server running on port ${PORT}`);
  console.log(`📝 Messages: ${messages.length} loaded`);
  console.log(`   Render URL: https://fatimah-web.onrender.com`);
});

// Keep-alive
setInterval(() => {}, 60000);
