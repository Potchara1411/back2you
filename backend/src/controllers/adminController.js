const pool = require('../models/db');
const mailer = require('../utils/mailer');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const DEFAULT_EXPIRATION_POLICY = {
  hideAfterDays: 45,
  deleteAfterDays: 60,
};

async function ensureSystemSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

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
    case 'old_unresolved':
      return "p.status IN ('open', 'claimed', 'pending_resolution') AND p.updated_at < NOW() - INTERVAL '30 days'";
    default:
      if (filter && filter !== 'all') {
        params.push(filter);
        return `p.status = $${params.length}`;
      }
      return '';
  }
}

async function listAllPosts(req, res) {
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
          COALESCE(report_totals.report_count, 0)::int AS report_count,
          (p.expires_at IS NOT NULL AND p.expires_at < NOW()) AS is_expired
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN categories c ON c.id = p.category_id
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

async function sendAdministrativeNotice({ email, subject, text }) {
  if (!email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return false;
  }

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text,
  });

  return true;
}

function sendPostDeletionNotice(post) {
  return sendAdministrativeNotice({
    email: post.owner_email,
    subject: '[Back2You@KAIST] Your post was removed by an admin',
    text: `Your post "${post.title}" was removed because it violated platform rules or was identified as duplicate/suspicious content.`,
  });
}

async function sendPostHiddenNotice(post) {
  return sendAdministrativeNotice({
    email: post.owner_email,
    subject: '[Back2You@KAIST] Your post was hidden by an admin',
    text: `Your post "${post.title}" was hidden while an admin reviews platform rule concerns.`,
  });
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

async function unhidePostByAdmin(req, res) {
  try {
    const { rows } = await pool.query(
      `
        UPDATE posts p
        SET status = 'open',
            updated_at = NOW()
        FROM users u
        WHERE p.id = $1
          AND p.status = 'hidden'
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
      return res.status(404).json({ error: 'Hidden post not found.' });
    }

    let noticeSent = false;
    try {
      noticeSent = await sendAdministrativeNotice({
        email: rows[0].owner_email,
        subject: '[Back2You@KAIST] Your post is visible again',
        text: `Your post "${rows[0].title}" was restored after admin review.`,
      });
    } catch (error) {
      console.error('Failed to send post unhidden notice:', error);
    }

    return res.json({ post: rows[0], noticeSent });
  } catch (error) {
    console.error('Failed to unhide admin post:', error);
    return res.status(500).json({ error: 'Failed to unhide post.' });
  }
}

async function reopenPostByAdmin(req, res) {
  const nextStatus = ['open', 'claimed'].includes(req.body.status) ? req.body.status : 'open';

  try {
    const { rows } = await pool.query(
      `
        UPDATE posts p
        SET status = $2,
            updated_at = NOW()
        FROM users u
        WHERE p.id = $1
          AND p.status = 'resolved'
          AND u.id = p.user_id
        RETURNING p.id, p.title, p.status, p.updated_at, u.email AS owner_email
      `,
      [req.params.id, nextStatus],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Resolved post not found.' });
    }

    let noticeSent = false;
    try {
      noticeSent = await sendAdministrativeNotice({
        email: rows[0].owner_email,
        subject: '[Back2You@KAIST] Your post was reopened by an admin',
        text: `Your post "${rows[0].title}" was reopened after admin review.`,
      });
    } catch (error) {
      console.error('Failed to send reopen notice:', error);
    }

    return res.json({ post: rows[0], noticeSent });
  } catch (error) {
    console.error('Failed to reopen post:', error);
    return res.status(500).json({ error: 'Failed to reopen post.' });
  }
}

async function resolvePostByAdmin(req, res) {
  try {
    const { rows } = await pool.query(
      `
        UPDATE posts p
        SET status = 'resolved',
            updated_at = NOW()
        FROM users u
        WHERE p.id = $1
          AND p.status = 'pending_resolution'
          AND u.id = p.user_id
        RETURNING p.id, p.title, p.status, p.updated_at, u.email AS owner_email
      `,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Pending resolution post not found.' });
    }

    let noticeSent = false;
    try {
      noticeSent = await sendAdministrativeNotice({
        email: rows[0].owner_email,
        subject: '[Back2You@KAIST] Your post was resolved',
        text: `Your post "${rows[0].title}" was marked resolved after admin verification.`,
      });
    } catch (error) {
      console.error('Failed to send resolution notice:', error);
    }

    return res.json({ post: rows[0], noticeSent });
  } catch (error) {
    console.error('Failed to resolve post:', error);
    return res.status(500).json({ error: 'Failed to resolve post.' });
  }
}

async function rejectResolutionByAdmin(req, res) {
  try {
    const { rows } = await pool.query(
      `
        UPDATE posts p
        SET status = 'claimed',
            updated_at = NOW()
        FROM users u
        WHERE p.id = $1
          AND p.status = 'pending_resolution'
          AND u.id = p.user_id
        RETURNING p.id, p.title, p.status, p.updated_at, u.email AS owner_email
      `,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Pending resolution post not found.' });
    }

    let noticeSent = false;
    try {
      noticeSent = await sendAdministrativeNotice({
        email: rows[0].owner_email,
        subject: '[Back2You@KAIST] Resolution proof needs review',
        text: `Your resolution proof for "${rows[0].title}" was rejected. Please submit clearer verification.`,
      });
    } catch (error) {
      console.error('Failed to send resolution rejection notice:', error);
    }

    return res.json({ post: rows[0], noticeSent });
  } catch (error) {
    console.error('Failed to reject resolution:', error);
    return res.status(500).json({ error: 'Failed to reject resolution.' });
  }
}

async function listReportedPosts(req, res) {
  const { limit, offset } = getPaging(req.query);

  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.user_id,
          p.type,
          p.title,
          p.description,
          p.location,
          p.status,
          p.images,
          p.created_at,
          u.email AS owner_email,
          u.name AS owner_name,
          c.name AS category_name,
          COUNT(r.id)::int AS report_count,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', r.id,
                'reason', r.reason,
                'created_at', r.created_at,
                'reported_by', reporter.email
              )
              ORDER BY r.created_at DESC
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'::json
          ) AS reports
        FROM reports r
        JOIN posts p ON p.id = r.post_id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN users reporter ON reporter.id = r.reported_by
        LEFT JOIN categories c ON c.id = p.category_id
        GROUP BY p.id, u.email, u.name, c.name
        ORDER BY MAX(r.created_at) DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    return res.json({ reports: rows, limit, offset });
  } catch (error) {
    console.error('Failed to list reported posts:', error);
    return res.status(500).json({ error: 'Failed to load reported content.' });
  }
}

async function dismissPostReports(req, res) {
  try {
    const { rowCount } = await pool.query('DELETE FROM reports WHERE post_id = $1', [req.params.id]);
    return res.json({ message: 'Report dismissed.', dismissedCount: rowCount });
  } catch (error) {
    console.error('Failed to dismiss reports:', error);
    return res.status(500).json({ error: 'Failed to dismiss report.' });
  }
}

async function listPendingResolutions(req, res) {
  const { limit, offset } = getPaging(req.query);

  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.user_id,
          p.type,
          p.title,
          p.description,
          p.location,
          p.status,
          p.images,
          p.created_at,
          p.updated_at,
          u.email AS owner_email,
          u.name AS owner_name,
          c.name AS category_name
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'pending_resolution'
        ORDER BY p.updated_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    return res.json({ posts: rows, limit, offset });
  } catch (error) {
    console.error('Failed to list pending resolutions:', error);
    return res.status(500).json({ error: 'Failed to load pending resolutions.' });
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

    let noticeSent = false;
    try {
      noticeSent = await sendAdministrativeNotice({
        email: rows[0].email,
        subject: isBlocked
          ? '[Back2You@KAIST] Your account was blocked'
          : '[Back2You@KAIST] Your account was unblocked',
        text: isBlocked
          ? 'Your account has been blocked by an admin due to platform rule concerns.'
          : 'Your posting and commenting privileges have been restored.',
      });
    } catch (error) {
      console.error('Failed to send user block notice:', error);
    }

    return res.json({ user: rows[0], noticeSent });
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

async function getUserActivity(req, res) {
  try {
    const user = await pool.query('SELECT id, email, name, role, is_blocked FROM users WHERE id = $1', [req.params.id]);

    if (!user.rows.length) {
      return res.status(404).json({ error: 'User activity is no longer available.' });
    }

    const [posts, comments, reports] = await Promise.all([
      pool.query(
        `
          SELECT id, title AS label, status, created_at
          FROM posts
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `,
        [req.params.id],
      ),
      pool.query(
        `
          SELECT c.id, p.title AS post_title, c.content AS label, c.created_at
          FROM comments c
          LEFT JOIN posts p ON p.id = c.post_id
          WHERE c.user_id = $1
          ORDER BY c.created_at DESC
          LIMIT 20
        `,
        [req.params.id],
      ),
      pool.query(
        `
          SELECT r.id, p.title AS post_title, r.reason AS label, r.created_at
          FROM reports r
          LEFT JOIN posts p ON p.id = r.post_id
          WHERE r.reported_by = $1
          ORDER BY r.created_at DESC
          LIMIT 20
        `,
        [req.params.id],
      ),
    ]);

    const activity = [
      ...posts.rows.map((item) => ({ ...item, type: 'post' })),
      ...comments.rows.map((item) => ({ ...item, type: 'comment' })),
      ...reports.rows.map((item) => ({ ...item, type: 'report' })),
    ].sort((first, second) => new Date(second.created_at) - new Date(first.created_at));

    return res.json({ user: user.rows[0], activity });
  } catch (error) {
    console.error('Failed to load user activity:', error);
    return res.status(500).json({ error: 'Failed to load user activity.' });
  }
}

async function sendNoticeToUser(req, res) {
  const message = String(req.body.message || '').trim();

  if (!message) {
    return res.status(400).json({ error: 'Notice message is required.' });
  }

  try {
    const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let noticeSent = false;
    try {
      noticeSent = await sendAdministrativeNotice({
        email: rows[0].email,
        subject: '[Back2You@KAIST] Administrative notice',
        text: message,
      });
    } catch (error) {
      console.error('Failed to send administrative notice:', error);
    }

    return res.json({
      message: noticeSent ? 'Notice sent.' : 'Notice saved, but email delivery is unavailable.',
      noticeSent,
      user: rows[0],
    });
  } catch (error) {
    console.error('Failed to send user notice:', error);
    return res.status(500).json({ error: 'Failed to send notice.' });
  }
}

async function listCategories(req, res) {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          c.id,
          c.name,
          c.created_at,
          COUNT(p.id) FILTER (WHERE p.status <> 'resolved' AND p.is_archived = FALSE)::int AS active_post_count,
          COUNT(p.id)::int AS total_post_count
        FROM categories c
        LEFT JOIN posts p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
      `,
    );

    return res.json({ categories: rows });
  } catch (error) {
    console.error('Failed to load categories:', error);
    return res.status(500).json({ error: 'Failed to load categories.' });
  }
}

async function createCategory(req, res) {
  const name = String(req.body.name || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id],
    );

    return res.status(201).json({ category: rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category already exists.' });
    }
    console.error('Failed to create category:', error);
    return res.status(500).json({ error: 'Failed to create category.' });
  }
}

async function updateCategory(req, res) {
  const name = String(req.body.name || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE categories SET name = $2 WHERE id = $1 RETURNING *',
      [req.params.id, name],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    return res.json({ category: rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category already exists.' });
    }
    console.error('Failed to update category:', error);
    return res.status(500).json({ error: 'Failed to update category.' });
  }
}

async function deleteCategory(req, res) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const category = await client.query('SELECT id, name FROM categories WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!category.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Category not found.' });
    }

    const fallbackName = category.rows[0].name === 'Other' ? 'Uncategorized' : 'Other';
    const fallback = await client.query(
      `
        INSERT INTO categories (name, created_by)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name
      `,
      [fallbackName, req.user.id],
    );

    const reassigned = await client.query(
      'UPDATE posts SET category_id = $2 WHERE category_id = $1',
      [req.params.id, fallback.rows[0].id],
    );
    await client.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    return res.json({
      message: 'Category deleted.',
      reassignedCount: reassigned.rowCount,
      fallbackCategory: fallback.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to delete category:', error);
    return res.status(500).json({ error: 'Failed to delete category.' });
  } finally {
    client.release();
  }
}

async function getExpirationPolicy(req, res) {
  try {
    await ensureSystemSettingsTable();
    const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = 'expiration_policy'");
    const policy = rows[0] ? JSON.parse(rows[0].value) : DEFAULT_EXPIRATION_POLICY;
    return res.json({ policy });
  } catch (error) {
    console.error('Failed to load expiration policy:', error);
    return res.status(500).json({ error: 'Failed to load expiration policy.' });
  }
}

async function updateExpirationPolicy(req, res) {
  const hideAfterDays = Number(req.body.hideAfterDays);
  const deleteAfterDays = Number(req.body.deleteAfterDays);

  if (!Number.isInteger(hideAfterDays) || !Number.isInteger(deleteAfterDays) || hideAfterDays <= 0 || deleteAfterDays <= 0) {
    return res.status(400).json({ error: 'Please enter a valid timeframe.' });
  }

  if (deleteAfterDays < hideAfterDays) {
    return res.status(400).json({ error: 'Delete timeframe must be after hide timeframe.' });
  }

  const policy = { hideAfterDays, deleteAfterDays };

  try {
    await ensureSystemSettingsTable();
    await pool.query(
      `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('expiration_policy', $1, NOW())
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value,
              updated_at = NOW()
      `,
      [JSON.stringify(policy)],
    );

    return res.json({ policy });
  } catch (error) {
    console.error('Failed to update expiration policy:', error);
    return res.status(500).json({ error: 'Failed to save expiration policy.' });
  }
}

module.exports = {
  listAllPosts,
  deletePostByAdmin,
  hidePostByAdmin,
  unhidePostByAdmin,
  reopenPostByAdmin,
  resolvePostByAdmin,
  rejectResolutionByAdmin,
  listReportedPosts,
  dismissPostReports,
  listPendingResolutions,
  listUsers,
  blockUser,
  unblockUser,
  getUserActivity,
  sendNoticeToUser,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getExpirationPolicy,
  updateExpirationPolicy,
};
