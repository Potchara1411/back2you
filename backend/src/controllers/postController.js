const pool = require('../models/db');
const mockPosts = require('../data/mockPosts');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

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

module.exports = {
  listPosts,
};
