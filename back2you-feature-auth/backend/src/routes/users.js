const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role',
      [name.trim(), req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /me error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/me/posts', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, status, created_at FROM posts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /me/posts error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

module.exports = router;
