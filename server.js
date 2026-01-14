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
            <p><a href="/history/asia-africa"><button>📖 Explore</button></a></p>
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
