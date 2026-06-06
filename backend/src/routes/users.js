const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, name, role FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.get('/me/posts', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.type, p.title, p.status, p.created_at
     FROM posts p
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

router.put('/me', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role',
    [name.trim(), req.user.id]
  );
  res.json(rows[0]);
});

router.patch('/me', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role',
    [name.trim(), req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;
