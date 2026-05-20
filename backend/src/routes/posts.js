const express = require('express');
const { listPosts } = require('../controllers/postController');

const router = express.Router();

router.get('/', listPosts);

module.exports = router;
