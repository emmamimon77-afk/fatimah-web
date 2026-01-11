const express = require('express');
const app = express();
const PORT = 8081;

app.get('/test', (req, res) => {
  res.send('Test route works!');
});

app.listen(PORT, () => {
  console.log(`Test server on port ${PORT}`);
});
