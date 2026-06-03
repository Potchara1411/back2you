const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../models/db');
const transporter = require('../utils/mailer');

const OTP_EXPIRY_MINUTES = 10;
const MOCK_OTP = '123456';

function useMockAuth() {
  return process.env.MOCK_AUTH !== 'false' || process.env.USE_MOCK_DATA === 'true';
}

async function requestOtp(req, res) {
  const { email } = req.body;

  if (!email || !email.endsWith('@kaist.ac.kr')) {
    return res.status(400).json({ error: 'Must use a @kaist.ac.kr email' });
  }

  try {
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
      from: `"Back2You@KAIST" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Back2You — Your One-Time Login Code',
      text: `
Hello,

You requested a one-time login code for Back2You@KAIST Lost & Found.

Your code is: ${otp}

This code will expire in ${OTP_EXPIRY_MINUTES} minutes.

If you did not request this code, please ignore this email. Your account will remain secure.

---
Back2You@KAIST
CS350 Lost & Found Platform | KAIST
This is an automated message. Please do not reply to this email.
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#2563eb;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Back2You@KAIST</h1>
              <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Lost & Found Platform</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 8px;font-size:15px;color:#475569;">Hello,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                You requested a one-time login code for <strong>Back2You@KAIST</strong>. Use the code below to sign in to your account.
              </p>

              <div style="background:#eff6ff;border:2px dashed #93c5fd;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Your One-Time Code</p>
                <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#1d4ed8;">${otp}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Expires in ${OTP_EXPIRY_MINUTES} minutes</p>
              </div>

              <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.6;">
                If you did not request this code, you can safely ignore this email. Your account will not be affected.
              </p>
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">
                For security, never share this code with anyone.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Back2You@KAIST &nbsp;·&nbsp; CS350 Lost & Found Platform<br/>
                Korea Advanced Institute of Science and Technology<br/>
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('requestOtp error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
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

    const role = email.startsWith('admin') ? 'admin' : 'user';
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE
         SET name = COALESCE(users.name, EXCLUDED.name),
             role = users.role
       RETURNING id, email, name, role`,
      [email, email.split('@')[0], role],
    );
    const user = rows[0];
    const { name, ...tokenPayload } = user;
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({ token, user });
  }

  try {
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

    const defaultName = user.name || email.split('@')[0];

    await pool.query(
      'UPDATE users SET otp_code = NULL, otp_expires_at = NULL, name = COALESCE(name, $2) WHERE id = $1',
      [user.id, defaultName]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: defaultName, role: user.role },
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

async function logout(req, res) {
  res.json({ message: 'Logged out' });
}

module.exports = { requestOtp, verifyOtp, logout };
