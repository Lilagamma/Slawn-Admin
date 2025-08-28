// server/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Root route (so "Cannot GET /" doesn't show)
app.get('/', (req, res) => {
  res.send('✅ Slawn Admin Backend is Running');
});

app.use('/api/email', emailRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
