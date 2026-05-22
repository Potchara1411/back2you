const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/posts', adminController.listAllPosts);
router.get('/claims', adminController.listClaims);
router.patch('/posts/:id/hide', adminController.hidePostByAdmin);
router.patch('/posts/:id/resolve', adminController.resolvePostByAdmin);
router.delete('/posts/:id', adminController.deletePostByAdmin);
router.patch('/claims/:id/:status', adminController.updateClaimStatus);

router.get('/users', adminController.listUsers);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);

module.exports = router;
