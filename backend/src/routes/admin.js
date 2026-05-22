const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/posts', adminController.listAllPosts);
router.patch('/posts/:id/hide', adminController.hidePostByAdmin);
router.patch('/posts/:id/unhide', adminController.unhidePostByAdmin);
router.patch('/posts/:id/reopen', adminController.reopenPostByAdmin);
router.patch('/posts/:id/resolve', adminController.resolvePostByAdmin);
router.patch('/posts/:id/reject-resolution', adminController.rejectResolutionByAdmin);
router.delete('/posts/:id', adminController.deletePostByAdmin);

router.get('/reports', adminController.listReportedPosts);
router.patch('/reports/:id/dismiss', adminController.dismissPostReports);
router.get('/resolutions', adminController.listPendingResolutions);

router.get('/users', adminController.listUsers);
router.get('/users/:id/activity', adminController.getUserActivity);
router.post('/users/:id/notice', adminController.sendNoticeToUser);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);

router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

router.get('/settings/expiration-policy', adminController.getExpirationPolicy);
router.put('/settings/expiration-policy', adminController.updateExpirationPolicy);

module.exports = router;
