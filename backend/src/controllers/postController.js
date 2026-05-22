const pool = require('../models/db');
const mockPosts = require('../data/mockPosts');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const STATUS_TRANSITIONS = {
  open: new Set(['hidden', 'claimed']),
  hidden: new Set([]),
  claimed: new Set(['pending_resolution']),
  pending_resolution: new Set(['resolved']),
  resolved: new Set([]),
};

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildPostListResponse(rows, page, limit) {
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    items: rows.map(({ total_count: totalCount, ...post }) => post),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    },
  };
}

function paginatePosts(posts, page, limit) {
  const start = (page - 1) * limit;
  const items = posts.slice(start, start + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total: posts.length,
      totalPages: Math.ceil(posts.length / limit),
      hasNextPage: page * limit < posts.length,
    },
  };
}

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

function validatePostInput(input, res) {
  if (!['lost', 'found'].includes(input.type)) {
    res.status(400).json({ error: 'type must be lost or found' });
    return false;
  }
  if (!input.title) {
    res.status(400).json({ error: 'title is required' });
    return false;
  }
  if (!input.category_id) {
    res.status(400).json({ error: 'category is required' });
    return false;
  }
  if (!input.date_occurred) {
    res.status(400).json({ error: 'date is required' });
    return false;
  }
  return true;
}

function handleError(res, error) {
  return res.status(error.status || 500).json({ error: error.message || 'Post request failed' });
}

async function listPosts(req, res) {
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;
  const type = req.query.type?.trim();
  const status = req.query.status?.trim();

  if (!process.env.DATABASE_URL || process.env.USE_MOCK_DATA === 'true') {
    const visiblePosts = mockPosts
      .filter((post) => post.status !== 'hidden')
      .filter((post) => post.status !== 'pending_resolution')
      .filter((post) => status || post.status !== 'resolved')
      .filter((post) => !type || post.type === type)
      .filter((post) => !status || post.status === status)
      .sort((firstPost, secondPost) => new Date(secondPost.created_at) - new Date(firstPost.created_at));

    return res.json(paginatePosts(visiblePosts, page, limit));
  }

  const conditions = ['p.is_archived = FALSE', "p.status <> 'hidden'", "p.status <> 'pending_resolution'"];
  const values = [];

  if (type) {
    values.push(type);
    conditions.push(`p.type = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`p.status = $${values.length}`);
  } else {
    conditions.push("p.status <> 'resolved'");
  }

  values.push(limit, offset);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.type,
          p.title,
          p.description,
          p.location,
          p.date_occurred,
          p.status,
          COALESCE(p.images, ARRAY[]::TEXT[]) AS images,
          p.created_at,
          p.updated_at,
          c.name AS category,
          u.name AS owner_name,
          COUNT(*) OVER() AS total_count
        FROM posts p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      values,
    );

    res.json(buildPostListResponse(rows, page, limit));
  } catch (error) {
    console.error('Failed to list posts:', error);
    res.status(500).json({ message: 'Failed to list posts' });
  }
}

async function createPost(req, res) {
  try {
    const input = parsePostBody(req.body);

    if (!validatePostInput(input, res)) return;

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
    if (!validatePostInput(input, res)) return;

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
  listPosts,
  createPost,
  getPostDetail,
  editPost,
  deletePost,
  changePostStatus,
};
