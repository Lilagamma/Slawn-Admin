// server/index.js
require('dotenv').config();          // <-- Load .env at the very top
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Root route for quick health check
app.get('/', (req, res) => {
  res.send('✅ Slawn Admin Backend is Running');
});

// Routes
app.use('/api/email', emailRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`SendGrid key loaded: ${process.env.SENDGRID_API_KEY ? '✅ Yes' : '❌ No'}`);
});
