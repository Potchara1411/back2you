const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const postController = require('../controllers/postController');
const pool = require('../models/db');

router.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM categories ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/', postController.listPosts);
router.post('/', authMiddleware, postController.createPost);
router.get('/:id', authMiddleware, postController.getPostDetail);
router.put('/:id', authMiddleware, postController.editPost);
router.delete('/:id', authMiddleware, postController.deletePost);
router.patch('/:id/status', authMiddleware, postController.changePostStatus);
router.post('/:id/claims', authMiddleware, postController.createClaimRequest);

module.exports = router;
