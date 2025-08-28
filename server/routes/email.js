// server/routes/email.js
const express = require('express');
const router = express.Router();
const sendEmail = require('../../sendEmail');

router.post('/', async (req, res) => {
  const { to, status } = req.body;

  if (!to || !status) {
    return res.status(400).json({ error: 'Missing email or status' });
  }

  try {
    await sendEmail({ to, status });
    res.status(200).json({ message: `Email sent to ${to}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
