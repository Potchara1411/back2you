const express = require('express');
const { searchPosts } = require('../controllers/searchController');

const router = express.Router();

router.get('/', searchPosts);

module.exports = router;
