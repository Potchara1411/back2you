const pool = require('../models/db');
const mailer = require('../utils/mailer');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

function getPaging(query) {
  const limit = Math.min(Number(query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

function getPostFilter(filter, params) {
  switch (filter) {
    case 'reported':
      return 'EXISTS (SELECT 1 FROM reports r WHERE r.post_id = p.id)';
    case 'expired':
      return 'p.expires_at IS NOT NULL AND p.expires_at < NOW()';
    case 'hidden':
      return "p.status = 'hidden'";
    case 'resolved':
      return "p.status = 'resolved'";
    case 'pending_resolution':
      return "p.status = 'pending_resolution'";
    case 'claimed':
      return "p.status = 'claimed'";
    default:
      if (filter && filter !== 'all') {
        params.push(filter);
        return `p.status = $${params.length}`;
      }
      return '';
  }
}

async function ensureClaimRequestsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS claim_requests (
      id SERIAL PRIMARY KEY,
      post_id INT REFERENCES posts(id) ON DELETE CASCADE,
      claimant_id INT REFERENCES users(id) ON DELETE CASCADE,
      details TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function listAllPosts(req, res) {
  await ensureClaimRequestsTable();
  const params = [];
  const { limit, offset } = getPaging(req.query);
  const filter = getPostFilter(req.query.filter, params);
  const whereClause = filter ? `WHERE ${filter}` : '';

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.user_id,
          p.type,
          p.title,
          p.description,
          p.category_id,
          p.location,
          p.date_occurred,
          p.status,
          p.images,
          p.is_archived,
          p.expires_at,
          p.created_at,
          p.updated_at,
          u.email AS owner_email,
          u.name AS owner_name,
          c.name AS category_name,
          latest_claim.id AS claim_id,
          latest_claim.claimant_id,
          latest_claim.claimant_name,
          latest_claim.claimant_email,
          latest_claim.claim_status,
          latest_claim.claim_details,
          COALESCE(report_totals.report_count, 0)::int AS report_count,
          (p.expires_at IS NOT NULL AND p.expires_at < NOW()) AS is_expired
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN LATERAL (
          SELECT
            cr.id,
            cr.claimant_id,
            cu.name AS claimant_name,
            cu.email AS claimant_email,
            cr.status AS claim_status,
            cr.details AS claim_details
          FROM claim_requests cr
          LEFT JOIN users cu ON cu.id = cr.claimant_id
          WHERE cr.post_id = p.id
          ORDER BY cr.created_at DESC
          LIMIT 1
        ) latest_claim ON TRUE
        LEFT JOIN (
          SELECT post_id, COUNT(*) AS report_count
          FROM reports
          GROUP BY post_id
        ) report_totals ON report_totals.post_id = p.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      params,
    );

    res.json({ posts: rows, limit, offset });
  } catch (error) {
    console.error('Failed to list admin posts:', error);
    res.status(500).json({ error: 'Failed to load admin posts.' });
  }
}

async function listClaims(req, res) {
  await ensureClaimRequestsTable();
  const { limit, offset } = getPaging(req.query);

  try {
    const { rows } = await pool.query(
      `
        SELECT
          cr.id,
          cr.post_id,
          cr.claimant_id,
          cr.details,
          cr.status,
          cr.created_at,
          cr.updated_at,
          p.title AS post_title,
          p.type AS post_type,
          p.status AS post_status,
          owner.email AS owner_email,
          owner.name AS owner_name,
          claimant.email AS claimant_email,
          claimant.name AS claimant_name
        FROM claim_requests cr
        JOIN posts p ON p.id = cr.post_id
        LEFT JOIN users owner ON owner.id = p.user_id
        LEFT JOIN users claimant ON claimant.id = cr.claimant_id
        ORDER BY cr.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    return res.json({ claims: rows, limit, offset });
  } catch (error) {
    console.error('Failed to list claims:', error);
    return res.status(500).json({ error: 'Failed to load claims.' });
  }
}

async function sendPostDeletionNotice(post) {
  if (!post.owner_email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return false;
  }

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: post.owner_email,
    subject: '[Back2You@KAIST] Your post was removed by an admin',
    text: `Your post "${post.title}" was removed because it violated platform rules or was identified as duplicate/suspicious content.`,
  });

  return true;
}

async function sendPostHiddenNotice(post) {
  if (!post.owner_email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return false;
  }

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: post.owner_email,
    subject: '[Back2You@KAIST] Your post was hidden by an admin',
    text: `Your post "${post.title}" was hidden while an admin reviews platform rule concerns.`,
  });

  return true;
}

async function resolvePostByAdmin(req, res) {
  try {
    const { rows } = await pool.query(
      `
        UPDATE posts
        SET status = 'resolved',
            updated_at = NOW()
        WHERE id = $1
          AND status = 'pending_resolution'
        RETURNING *
      `,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Only pending resolution posts can be resolved by admin.' });
    }

    return res.json({ post: rows[0] });
  } catch (error) {
    console.error('Failed to resolve admin post:', error);
    return res.status(500).json({ error: 'Failed to resolve post.' });
  }
}

async function updateClaimStatus(req, res) {
  await ensureClaimRequestsTable();
  const nextStatus = req.params.status;
  if (!['approved', 'rejected'].includes(nextStatus)) {
    return res.status(400).json({ error: 'Claim status must be approved or rejected.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE claim_requests
       SET status = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, nextStatus],
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim not found.' });
    }

    if (nextStatus === 'approved') {
      await client.query(
        `UPDATE posts SET status = 'claimed', updated_at = NOW() WHERE id = $1`,
        [rows[0].post_id],
      );
    }

    await client.query('COMMIT');
    return res.json({ claim: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update claim:', error);
    return res.status(500).json({ error: 'Failed to update claim.' });
  } finally {
    client.release();
  }
}

async function deletePostByAdmin(req, res) {
  const client = await pool.connect();
  let deletedPost;

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        SELECT
          p.id,
          p.title,
          p.user_id,
          u.email AS owner_email
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = $1
        FOR UPDATE OF p
      `,
      [req.params.id],
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'This post has already been removed.' });
    }

    deletedPost = rows[0];
    await client.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to delete admin post:', error);
    return res.status(500).json({ error: 'Failed to delete post.' });
  } finally {
    client.release();
  }

  let noticeSent = false;
  try {
    noticeSent = await sendPostDeletionNotice(deletedPost);
  } catch (error) {
    console.error('Failed to send post deletion notice:', error);
  }

  return res.json({
    message: 'Post deleted.',
    post: { id: deletedPost.id, title: deletedPost.title },
    noticeSent,
  });
}

async function hidePostByAdmin(req, res) {
  try {
    const { rows } = await pool.query(
      `
        UPDATE posts p
        SET status = 'hidden',
            updated_at = NOW()
        FROM users u
        WHERE p.id = $1
          AND u.id = p.user_id
        RETURNING
          p.id,
          p.title,
          p.status,
          p.updated_at,
          u.email AS owner_email
      `,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'This post has already been removed.' });
    }

    let noticeSent = false;
    try {
      noticeSent = await sendPostHiddenNotice(rows[0]);
    } catch (error) {
      console.error('Failed to send post hidden notice:', error);
    }

    return res.json({ post: rows[0], noticeSent });
  } catch (error) {
    console.error('Failed to hide admin post:', error);
    return res.status(500).json({ error: 'Failed to hide post.' });
  }
}

async function listUsers(req, res) {
  const { limit, offset } = getPaging(req.query);

  try {
    const { rows } = await pool.query(
      `
        SELECT
          u.id,
          u.email,
          u.name,
          u.role,
          u.is_blocked,
          u.created_at,
          COUNT(DISTINCT p.id)::int AS post_count
        FROM users u
        LEFT JOIN posts p ON p.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    return res.json({ users: rows, limit, offset });
  } catch (error) {
    console.error('Failed to list admin users:', error);
    return res.status(500).json({ error: 'Failed to load users.' });
  }
}

async function setUserBlockedState(req, res, isBlocked) {
  try {
    const target = await pool.query(
      'SELECT id, role, is_blocked FROM users WHERE id = $1',
      [req.params.id],
    );

    if (!target.rows.length) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (target.rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Admin users cannot be blocked.' });
    }

    const { rows } = await pool.query(
      `
        UPDATE users
        SET is_blocked = $2
        WHERE id = $1
        RETURNING id, email, name, role, is_blocked, created_at
      `,
      [req.params.id, isBlocked],
    );

    return res.json({ user: rows[0] });
  } catch (error) {
    console.error('Failed to update admin user block state:', error);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
}

function blockUser(req, res) {
  return setUserBlockedState(req, res, true);
}

function unblockUser(req, res) {
  return setUserBlockedState(req, res, false);
}

module.exports = {
  listAllPosts,
  listClaims,
  deletePostByAdmin,
  hidePostByAdmin,
  resolvePostByAdmin,
  updateClaimStatus,
  listUsers,
  blockUser,
  unblockUser,
};
