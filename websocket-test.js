const WebSocket = require('ws');
const http = require('http');

// Simple HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Test Server');
});

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('✅ Client connected via WebSocket');
    ws.send('Hello from WebSocket server');
    
    ws.on('message', (message) => {
        console.log('Received:', message.toString());
        ws.send('Echo: ' + message);
    });
});

server.listen(8081, () => {
    console.log('Test server running on http://localhost:8081');
    console.log('WebSocket available on ws://localhost:8081');
});
