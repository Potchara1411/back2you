const pool = require('../models/db');

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const STATUS_TRANSITIONS = {
  open: new Set(['hidden', 'claimed']),
  hidden: new Set(['open']),
  claimed: new Set(['pending_resolution']),
  pending_resolution: new Set(['resolved']),
  resolved: new Set([]),
};

function sanitizeText(value) {
  if (value === undefined || value === null) return value;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

function normalizeImages(images) {
  if (!images) return [];
  const list = Array.isArray(images) ? images : [images];

  if (list.length > MAX_IMAGES) {
    const error = new Error('A post can include up to 3 images');
    error.status = 400;
    throw error;
  }

  const totalBytes = list.reduce((sum, image) => {
    const value = String(image);
    const base64 = value.includes(',') ? value.split(',').pop() : value;
    return sum + Buffer.byteLength(base64, 'base64');
  }, 0);

  if (totalBytes > MAX_IMAGE_BYTES) {
    const error = new Error('Images must be 15MB or less in total');
    error.status = 400;
    throw error;
  }

  return list.map(sanitizeText);
}

function parsePostBody(body) {
  return {
    type: sanitizeText(body.type),
    title: sanitizeText(body.title),
    description: sanitizeText(body.description || ''),
    category_id: body.category_id || null,
    location: sanitizeText(body.location || ''),
    date_occurred: body.date_occurred || null,
    images: normalizeImages(body.images),
  };
}

function canModify(user, post) {
  return Number(user.id) === Number(post.user_id);
}

function handleError(res, error) {
  return res.status(error.status || 500).json({ error: error.message || 'Post request failed' });
}

async function createPost(req, res) {
  try {
    const input = parsePostBody(req.body);

    if (!['lost', 'found'].includes(input.type)) {
      return res.status(400).json({ error: 'type must be lost or found' });
    }
    if (!input.title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO posts
        (user_id, type, title, description, category_id, location, date_occurred, status, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)
       RETURNING *`,
      [
        req.user.id,
        input.type,
        input.title,
        input.description,
        input.category_id,
        input.location,
        input.date_occurred,
        input.images,
      ],
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    return handleError(res, error);
  }
}

async function getPostDetail(req, res) {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name, u.name AS author_name
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [req.params.id],
  );

  if (!rows.length) return res.status(404).json({ error: 'Post not found' });
  return res.json(rows[0]);
}

async function editPost(req, res) {
  try {
    const post = await findPost(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!canModify(req.user, post)) return res.status(403).json({ error: 'Only the owner can edit this post' });

    const input = parsePostBody(req.body);
    const { rows } = await pool.query(
      `UPDATE posts
       SET type = $1,
           title = $2,
           description = $3,
           category_id = $4,
           location = $5,
           date_occurred = $6,
           images = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        input.type,
        input.title,
        input.description,
        input.category_id,
        input.location,
        input.date_occurred,
        input.images,
        req.params.id,
      ],
    );

    return res.json(rows[0]);
  } catch (error) {
    return handleError(res, error);
  }
}

async function deletePost(req, res) {
  const post = await findPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (!canModify(req.user, post)) return res.status(403).json({ error: 'Only the owner can delete this post' });

  await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  return res.status(204).send();
}

async function changePostStatus(req, res) {
  const post = await findPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (!canModify(req.user, post)) return res.status(403).json({ error: 'Only the owner can change this status' });

  const nextStatus = sanitizeText(req.body.status);
  const allowedNextStatuses = STATUS_TRANSITIONS[post.status] || new Set();

  if (!allowedNextStatuses.has(nextStatus)) {
    return res.status(400).json({
      error: `Invalid status transition from ${post.status} to ${nextStatus}`,
      allowed: [...allowedNextStatuses],
    });
  }

  const { rows } = await pool.query(
    'UPDATE posts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [nextStatus, req.params.id],
  );
  return res.json(rows[0]);
}

async function findPost(id) {
  const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  return rows[0];
}

module.exports = {
  createPost,
  getPostDetail,
  editPost,
  deletePost,
  changePostStatus,
};
