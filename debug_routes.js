const express = require('express');
const app = express();

// Add route logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Looking for route matching:', req.url);
  next();
});

// Simple test route
app.get('/test-debug', (req, res) => {
  console.log('Test route matched!');
  res.send('Debug test works');
});

// Your actual history route (simplified)
app.get('/history', (req, res) => {
  console.log('HISTORY ROUTE MATCHED!');
  res.send('History route works!');
});

// Catch-all for debugging
app.use((req, res) => {
  console.log('NO ROUTE MATCHED for:', req.url);
  res.status(404).send('No route matched: ' + req.url);
});

app.listen(8082, () => {
  console.log('Debug server on port 8082');
  console.log('Visit http://localhost:8082/history');
});
