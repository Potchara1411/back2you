const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const postController = require('../controllers/postController');

router.get('/', postController.listPosts);
router.post('/', authMiddleware, postController.createPost);
router.get('/:id', authMiddleware, postController.getPostDetail);
router.put('/:id', authMiddleware, postController.editPost);
router.delete('/:id', authMiddleware, postController.deletePost);
router.patch('/:id/status', authMiddleware, postController.changePostStatus);
router.post('/:id/claims', authMiddleware, postController.createClaimRequest);

module.exports = router;
