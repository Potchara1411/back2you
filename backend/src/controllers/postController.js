const pool = require('../models/db');
const mockPosts = require('../data/mockPosts');
const mailer = require('../utils/mailer');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const STATUS_TRANSITIONS = {
  hidden: new Set([]),
  open: new Set(['hidden']),
  claimed: new Set(['pending_resolution']),
  pending_resolution: new Set([]),
  resolved: new Set([]),
};
const CLAIMABLE_STATUSES = new Set(['open', 'claimed']);

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

async function sendClaimReviewNotice({ claim, post, status }) {
  if (!claim?.claimant_email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return false;
  }

  const accepted = status === 'accepted';
  const subject = accepted
    ? '[Back2You@KAIST] Your claim was accepted'
    : '[Back2You@KAIST] Your claim was rejected';
  const text = accepted
    ? `Your claim for "${post.title}" was accepted. Please coordinate with the post owner to complete the return.`
    : `Your claim for "${post.title}" was rejected. You can review the item details or submit a new claim if you have clearer proof.`;

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: claim.claimant_email,
    subject,
    text,
  });

  return true;
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

function canViewPending(user, post) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (canModify(user, post)) return true;
  return Number(user.id) === Number(post.claimant_user_id || post.claimant_id);
}

function isFinalizedStatus(status) {
  return ['claimed', 'pending_resolution', 'resolved', 'hidden'].includes(status);
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
  const occurredAt = new Date(input.date_occurred);
  if (Number.isNaN(occurredAt.getTime())) {
    res.status(400).json({ error: 'date is invalid' });
    return false;
  }
  if (occurredAt > new Date()) {
    res.status(400).json({ error: 'date cannot be in the future' });
    return false;
  }
  return true;
}

function handleError(res, error) {
  return res.status(error.status || 500).json({ error: error.message || 'Post request failed' });
}

function normalizeProofImages(images) {
  if (!images) return [];
  const list = Array.isArray(images) ? images : [images];

  if (list.length > 1) {
    const error = new Error('A claim can include one proof image');
    error.status = 400;
    throw error;
  }

  return normalizeImages(list);
}

function parseClaimBody(body) {
  const message = sanitizeText(body.message || body.details || '');
  const foundLocation = sanitizeText(body.found_location || body.foundLocation || '');
  const foundDate = body.found_date || body.foundDate || null;
  const proofImages = normalizeProofImages(body.proof_images || body.proofImages || body.proof_image || body.proofImage);

  return { message, foundLocation, foundDate, proofImages };
}

function validateClaimInput(input, res) {
  if (!input.message) {
    res.status(400).json({ error: 'Claim message is required' });
    return false;
  }
  if (!input.foundLocation) {
    res.status(400).json({ error: 'Found location is required' });
    return false;
  }
  if (!input.foundDate) {
    res.status(400).json({ error: 'Found date and time are required' });
    return false;
  }
  const foundAt = new Date(input.foundDate);
  if (Number.isNaN(foundAt.getTime())) {
    res.status(400).json({ error: 'Found date is invalid' });
    return false;
  }
  if (foundAt > new Date()) {
    res.status(400).json({ error: 'Found date cannot be in the future' });
    return false;
  }
  return true;
}

async function ensureClaimRequestsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS claim_requests (
      id SERIAL PRIMARY KEY,
      post_id INT REFERENCES posts(id) ON DELETE CASCADE,
      claimant_user_id INT REFERENCES users(id) ON DELETE CASCADE,
      claimant_id INT REFERENCES users(id) ON DELETE CASCADE,
      message TEXT,
      details TEXT,
      found_location VARCHAR(255),
      found_date TIMESTAMP,
      proof_images TEXT[],
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS claimant_user_id INT REFERENCES users(id) ON DELETE CASCADE');
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS claimant_id INT REFERENCES users(id) ON DELETE CASCADE');
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS message TEXT');
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS details TEXT');
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS found_location VARCHAR(255)');
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS found_date TIMESTAMP');
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS proof_images TEXT[]');
  await pool.query("ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'");
  await pool.query('ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
  await pool.query(`
    UPDATE claim_requests
    SET claimant_user_id = COALESCE(claimant_user_id, claimant_id),
        claimant_id = COALESCE(claimant_id, claimant_user_id),
        message = COALESCE(message, details),
        details = COALESCE(details, message)
  `);
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
  await ensureClaimRequestsTable();
  const { rows } = await pool.query(
    `SELECT
       p.*,
       c.name AS category_name,
       u.name AS author_name
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [req.params.id],
  );

  if (!rows.length) return res.status(404).json({ error: 'Post not found' });
  const post = rows[0];

  if (post.status === 'pending_resolution' && !canModify(req.user, post) && req.user.role !== 'admin') {
    const claimant = await pool.query(
      `SELECT 1
       FROM claim_requests
       WHERE post_id = $1
         AND COALESCE(claimant_user_id, claimant_id) = $2
         AND status = 'accepted'
       LIMIT 1`,
      [req.params.id, req.user.id],
    );
    if (!claimant.rows.length) {
      return res.status(404).json({ error: 'Post not found' });
    }
  }

  const claimParams = [req.params.id];
  let claimVisibility = '';

  if (!canModify(req.user, post) && req.user.role !== 'admin') {
    claimParams.push(req.user.id);
    claimVisibility = `AND COALESCE(cr.claimant_user_id, cr.claimant_id) = $${claimParams.length}`;
  }

  const claimRows = await pool.query(
    `SELECT
       cr.id,
       cr.post_id,
       COALESCE(cr.claimant_user_id, cr.claimant_id) AS claimant_user_id,
       cr.message,
       COALESCE(cr.details, cr.message) AS details,
       cr.found_location,
       cr.found_date,
       COALESCE(cr.proof_images, ARRAY[]::TEXT[]) AS proof_images,
       cr.status,
       cr.created_at,
       cr.updated_at,
       u.name AS claimant_name,
       u.email AS claimant_email
     FROM claim_requests cr
     LEFT JOIN users u ON u.id = COALESCE(cr.claimant_user_id, cr.claimant_id)
     WHERE cr.post_id = $1
       ${claimVisibility}
     ORDER BY cr.created_at DESC`,
    claimParams,
  );

  if (post.status === 'pending_resolution' && !canViewPending(req.user, {
    ...post,
    claimant_user_id: claimRows.rows.find((claim) => claim.status === 'accepted')?.claimant_user_id,
  })) {
    return res.status(404).json({ error: 'Post not found' });
  }

  return res.json({
    ...post,
    claim_requests: claimRows.rows,
    latest_claim: claimRows.rows[0] || null,
  });
}

async function editPost(req, res) {
  try {
    const post = await findPost(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!canModify(req.user, post)) return res.status(403).json({ error: 'Only the owner can edit this post' });
    if (isFinalizedStatus(post.status)) {
      return res.status(400).json({ error: 'This post can no longer be edited after it is claimed or resolved' });
    }

    const input = parsePostBody(req.body);
    if (!validatePostInput(input, res)) return;
    const existingImages = Array.isArray(post.images) ? post.images.filter(Boolean) : [];

    if (input.images.length > existingImages.length) {
      return res.status(400).json({ error: 'You can replace existing photos, but cannot add more photos while editing' });
    }

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

async function createClaimRequest(req, res) {
  const client = await pool.connect();

  try {
    await ensureClaimRequestsTable();
    const input = parseClaimBody(req.body);
    if (!validateClaimInput(input, res)) return;

    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM posts WHERE id = $1 FOR UPDATE', [req.params.id]);
    const post = rows[0];

    if (!post) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found' });
    }
    if (canModify(req.user, post)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Owners cannot claim their own posts' });
    }
    if (!CLAIMABLE_STATUSES.has(post.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This post is not accepting new claims right now' });
    }

    const duplicate = await client.query(
      `SELECT id
       FROM claim_requests
       WHERE post_id = $1
         AND COALESCE(claimant_user_id, claimant_id) = $2
         AND status IN ('pending', 'accepted')
       LIMIT 1`,
      [req.params.id, req.user.id],
    );

    if (duplicate.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already have an active claim request for this post' });
    }

    const claimResult = await client.query(
      `INSERT INTO claim_requests
        (post_id, claimant_user_id, claimant_id, message, details, found_location, found_date, proof_images, status)
       VALUES ($1, $2, $2, $3, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.params.id, req.user.id, input.message, input.foundLocation, input.foundDate, input.proofImages],
    );

    await client.query('COMMIT');
    return res.status(201).json({ claim: claimResult.rows[0], post });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
}

async function listClaimRequests(req, res) {
  await ensureClaimRequestsTable();
  const post = await findPost(req.params.id);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  const params = [req.params.id];
  let visibility = '';

  if (!canModify(req.user, post) && req.user.role !== 'admin') {
    params.push(req.user.id);
    visibility = `AND COALESCE(cr.claimant_user_id, cr.claimant_id) = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
       cr.id,
       cr.post_id,
       COALESCE(cr.claimant_user_id, cr.claimant_id) AS claimant_user_id,
       cr.message,
       COALESCE(cr.details, cr.message) AS details,
       cr.found_location,
       cr.found_date,
       COALESCE(cr.proof_images, ARRAY[]::TEXT[]) AS proof_images,
       cr.status,
       cr.created_at,
       cr.updated_at,
       u.name AS claimant_name,
       u.email AS claimant_email
     FROM claim_requests cr
     LEFT JOIN users u ON u.id = COALESCE(cr.claimant_user_id, cr.claimant_id)
     WHERE cr.post_id = $1
       ${visibility}
     ORDER BY cr.created_at DESC`,
    params,
  );

  return res.json({ claims: rows });
}

async function updateClaimRequest(req, res) {
  const client = await pool.connect();
  const nextStatus = sanitizeText(req.body.status || req.body.action);

  if (!['accepted', 'rejected'].includes(nextStatus)) {
    return res.status(400).json({ error: 'Claim status must be accepted or rejected' });
  }

  try {
    await ensureClaimRequestsTable();
    await client.query('BEGIN');

    const postResult = await client.query('SELECT * FROM posts WHERE id = $1 FOR UPDATE', [req.params.id]);
    const post = postResult.rows[0];

    if (!post) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found' });
    }
    if (!canModify(req.user, post) && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the owner or admin can review claim requests' });
    }

    const claimResult = await client.query(
      `SELECT *
       FROM claim_requests
       WHERE id = $1 AND post_id = $2
       FOR UPDATE`,
      [req.params.claimId, req.params.id],
    );
    const claim = claimResult.rows[0];

    if (!claim) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim request not found' });
    }
    if (claim.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This claim request has already been reviewed' });
    }
    if (nextStatus === 'accepted' && !CLAIMABLE_STATUSES.has(post.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only open or claimed posts can accept claim requests' });
    }

    const updatedClaim = await client.query(
      `UPDATE claim_requests
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *,
         (SELECT email
          FROM users
          WHERE id = COALESCE(claim_requests.claimant_user_id, claim_requests.claimant_id)) AS claimant_email`,
      [nextStatus, req.params.claimId],
    );

    let updatedPost = post;

    if (nextStatus === 'accepted') {
      const postUpdate = await client.query(
        `UPDATE posts
         SET status = 'claimed',
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [req.params.id],
      );
      updatedPost = postUpdate.rows[0];
    }

    await client.query('COMMIT');

    let noticeSent = false;
    try {
      noticeSent = await sendClaimReviewNotice({
        claim: updatedClaim.rows[0],
        post: updatedPost,
        status: nextStatus,
      });
    } catch (noticeError) {
      console.error('Failed to send claim review notice:', noticeError);
    }

    return res.json({ claim: updatedClaim.rows[0], post: updatedPost, noticeSent });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
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
  createClaimRequest,
  listClaimRequests,
  updateClaimRequest,
};
