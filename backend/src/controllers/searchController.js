const pool = require('../models/db');
const mockPosts = require('../data/mockPosts');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildSearchResponse(rows, page, limit) {
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

function includesText(value, searchValue) {
  return value?.toLowerCase().includes(searchValue.toLowerCase());
}

function getKeywordTerms(keyword) {
  const aliases = {
    laptop: ['laptop', 'macbook', 'computer'],
    macbook: ['macbook', 'laptop', 'computer'],
    computer: ['computer', 'laptop', 'macbook'],
    wallet: ['wallet', 'card', 'cards'],
    card: ['card', 'cards', 'wallet', 'id'],
    id: ['id', 'card', 'cards'],
    umbrella: ['umbrella', 'rain'],
    notebook: ['notebook', 'book', 'stationery'],
    book: ['book', 'notebook', 'stationery'],
  };
  const normalized = keyword.trim().toLowerCase();

  return [...new Set([normalized, ...(aliases[normalized] || [])])];
}

function getRelevanceScore(post, keyword) {
  if (!keyword) return 0;

  const normalizedKeyword = keyword.toLowerCase();
  const title = post.title.toLowerCase();
  const description = post.description.toLowerCase();
  const category = post.category.toLowerCase();
  const location = post.location.toLowerCase();

  if (title === normalizedKeyword) return 100;
  if (title.startsWith(normalizedKeyword)) return 90;
  if (title.includes(normalizedKeyword)) return 80;
  if (description.includes(normalizedKeyword)) return 50;
  if (category.includes(normalizedKeyword)) return 35;
  if (location.includes(normalizedKeyword)) return 20;
  return 0;
}

function isWithinThreeDays(postDate, searchDate) {
  if (!searchDate) return true;

  const postTime = new Date(postDate).setHours(0, 0, 0, 0);
  const searchTime = new Date(searchDate).setHours(0, 0, 0, 0);
  const diffDays = Math.abs(postTime - searchTime) / (1000 * 60 * 60 * 24);

  return diffDays <= 3;
}

async function searchPosts(req, res) {
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const keyword = req.query.keyword?.trim();
  const category = req.query.category?.trim();
  const location = req.query.location?.trim();
  const date = req.query.date?.trim();
  const type = req.query.type?.trim();
  const status = req.query.status?.trim();
  const scope = req.query.scope?.trim();

  if (!process.env.DATABASE_URL || process.env.USE_MOCK_DATA === 'true') {
    const keywordTerms = keyword ? getKeywordTerms(keyword) : [];
    const filteredPosts = mockPosts
      .filter((post) => post.status !== 'hidden')
      .filter((post) => {
        const matchesKeyword = !keyword || keywordTerms.some((term) => (
          includesText(post.title, term)
          || includesText(post.description, term)
          || includesText(post.location, term)
          || includesText(post.category, term)
        ));
        const matchesCategory = !category || includesText(post.category, category);
        const matchesLocation = !location || includesText(post.location, location);
        const matchesDate = isWithinThreeDays(post.date_occurred, date);
        const matchesType = !type || post.type === type;
        const matchesStatus = !status || post.status === status;
        const matchesScope = scope !== 'unsolved' || post.status !== 'resolved';

        return matchesKeyword
          && matchesCategory
          && matchesLocation
          && matchesDate
          && matchesType
          && matchesStatus
          && matchesScope;
      })
      .sort((firstPost, secondPost) => {
        const scoreDifference = getRelevanceScore(secondPost, keyword || '') - getRelevanceScore(firstPost, keyword || '');
        if (scoreDifference !== 0) return scoreDifference;
        return new Date(secondPost.created_at) - new Date(firstPost.created_at);
      });

    return res.json(paginatePosts(filteredPosts, page, limit));
  }

  const conditions = ['p.is_archived = FALSE', "p.status <> 'hidden'"];
  const values = [];

  if (keyword) {
    const keywordConditions = getKeywordTerms(keyword).map((term) => {
      values.push(`%${term}%`);
      return `(
        p.title ILIKE $${values.length}
        OR p.description ILIKE $${values.length}
        OR p.location ILIKE $${values.length}
        OR c.name ILIKE $${values.length}
      )`;
    });
    conditions.push(`(${keywordConditions.join(' OR ')})`);
  }

  if (category) {
    values.push(category);
    conditions.push(`(c.name ILIKE $${values.length} OR c.id::TEXT = $${values.length})`);
  }

  if (location) {
    values.push(`%${location}%`);
    conditions.push(`p.location ILIKE $${values.length}`);
  }

  if (date) {
    values.push(date);
    conditions.push(`p.date_occurred BETWEEN ($${values.length}::DATE - INTERVAL '3 days') AND ($${values.length}::DATE + INTERVAL '3 days')`);
  }

  if (type) {
    values.push(type);
    conditions.push(`p.type = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`p.status = $${values.length}`);
  }

  if (scope === 'unsolved') {
    conditions.push("p.status <> 'resolved'");
  }

  let orderBy = 'p.created_at DESC';
  if (keyword) {
    const normalizedKeyword = keyword.toLowerCase();
    values.push(normalizedKeyword, `${normalizedKeyword}%`, `%${normalizedKeyword}%`);
    const exactKeywordParam = values.length - 2;
    const prefixKeywordParam = values.length - 1;
    const containsKeywordParam = values.length;
    orderBy = `
      CASE
        WHEN LOWER(p.title) = $${exactKeywordParam} THEN 100
        WHEN LOWER(p.title) LIKE $${prefixKeywordParam} THEN 90
        WHEN LOWER(p.title) LIKE $${containsKeywordParam} THEN 80
        WHEN LOWER(p.description) LIKE $${containsKeywordParam} THEN 50
        WHEN LOWER(c.name) LIKE $${containsKeywordParam} THEN 35
        WHEN LOWER(p.location) LIKE $${containsKeywordParam} THEN 20
        ELSE 0
      END DESC,
      p.created_at DESC
    `;
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
        ORDER BY ${orderBy}
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      values,
    );

    res.json(buildSearchResponse(rows, page, limit));
  } catch (error) {
    console.error('Failed to search posts:', error);
    res.status(500).json({ message: 'Failed to search posts' });
  }
}

module.exports = {
  searchPosts,
};
