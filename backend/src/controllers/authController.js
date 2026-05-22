const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../models/db');
const transporter = require('../utils/mailer');

const OTP_EXPIRY_MINUTES = 10;
const MOCK_OTP = '123456';

function useMockAuth() {
  return process.env.MOCK_AUTH === 'true' || process.env.USE_MOCK_DATA === 'true';
}

async function requestOtp(req, res) {
  const { email } = req.body;

  if (!email || !email.endsWith('@kaist.ac.kr')) {
    return res.status(400).json({ error: 'Must use a @kaist.ac.kr email' });
  }

  if (useMockAuth()) {
    return res.json({ message: 'OTP sent', devOtp: MOCK_OTP });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO users (email, otp_code, otp_expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
       SET otp_code = $2, otp_expires_at = $3`,
    [email, otp, expiresAt]
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Back2You — Your login code',
    text: `Your one-time code is: ${otp}\n\nIt expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  });

  res.json({ message: 'OTP sent' });
}

async function verifyOtp(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  if (useMockAuth()) {
    if (otp !== MOCK_OTP) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    const user = {
      id: 1,
      email,
      name: email.split('@')[0],
      role: email.startsWith('admin') ? 'admin' : 'user',
    };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({ token, user });
  }

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_blocked) return res.status(403).json({ error: 'Account is blocked' });
  if (user.otp_code !== otp) return res.status(401).json({ error: 'Invalid OTP' });
  if (new Date() > new Date(user.otp_expires_at)) {
    return res.status(401).json({ error: 'OTP has expired' });
  }

  await pool.query(
    'UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
    [user.id]
  );

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

async function logout(req, res) {
  res.json({ message: 'Logged out' });
}

module.exports = { requestOtp, verifyOtp, logout };
