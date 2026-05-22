const now = new Date();

function dateOffset(days) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function timestampOffset(days, hour) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const mockPosts = [
  {
    id: 1,
    type: 'lost',
    title: 'Black Leather Wallet',
    description: 'Black wallet with cards inside.',
    category: 'Wallets & Cards',
    location: 'East - E11 Creative Learning B/D, 1st floor',
    date_occurred: dateOffset(0),
    status: 'open',
    images: ['/post-images/black-leather-wallet.jpg'],
    owner_name: 'Owner',
    created_at: timestampOffset(0, 9),
  },
  {
    id: 2,
    type: 'found',
    title: 'Macbook',
    description: 'Macbook found after class.',
    category: 'Electronics',
    location: 'North - N1 IT Convergence Building, 2nd floor',
    date_occurred: dateOffset(-1),
    status: 'resolved',
    images: ['/post-images/macbook.jpg'],
    owner_name: 'Finder',
    created_at: timestampOffset(-1, 14),
  },
  {
    id: 3,
    type: 'lost',
    title: 'Blue Umbrella',
    description: 'Umbrella left near the cafeteria.',
    category: 'Umbrellas',
    location: 'North - N11 Cafeteria, Near entrance',
    date_occurred: dateOffset(-2),
    status: 'claimed',
    images: ['/post-images/blue-umbrella.jpg'],
    owner_name: 'Owner',
    created_at: timestampOffset(-2, 18),
  },
  {
    id: 4,
    type: 'found',
    title: 'KAIST ID Card',
    description: 'ID card found on a study table.',
    category: 'Wallets & Cards',
    location: 'West - W2 Student Center-1, 1st floor',
    date_occurred: dateOffset(-3),
    status: 'open',
    images: ['/post-images/kaist-id-card.png'],
    owner_name: 'Finder',
    created_at: timestampOffset(-3, 10),
  },
  {
    id: 5,
    type: 'lost',
    title: 'Calculus Notebook',
    description: 'Blue notebook with lecture notes.',
    category: 'Stationery & Books',
    location: 'East - E9 Academic Cultural Complex, 3rd floor',
    date_occurred: dateOffset(-4),
    status: 'open',
    images: ['/post-images/calculus-notebook.jpg'],
    owner_name: 'Owner',
    created_at: timestampOffset(-4, 12),
  },
];

export function getMockPost(id) {
  return mockPosts.find((post) => String(post.id) === String(id));
}

function paginate(posts, page, limit) {
  const start = (page - 1) * limit;

  return {
    items: posts.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: posts.length,
      totalPages: Math.ceil(posts.length / limit),
      hasNextPage: page * limit < posts.length,
    },
  };
}

function isWithinThreeDays(postDate, searchDate) {
  if (!searchDate) return true;

  const postTime = new Date(postDate).setHours(0, 0, 0, 0);
  const searchTime = new Date(searchDate).setHours(0, 0, 0, 0);
  const diffDays = Math.abs(postTime - searchTime) / (1000 * 60 * 60 * 24);

  return diffDays <= 3;
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

export function getMockList(page = 1, limit = 12, filters = {}) {
  const type = filters.type || '';
  const status = filters.status || '';
  const results = mockPosts.filter((post) => (
    (!type || post.type === type)
    && (!status || post.status === status)
    && post.status !== 'pending_resolution'
    && (status || post.status !== 'resolved')
  ));

  return paginate(results, page, limit);
}

function getRelevanceScore(post, keyword) {
  if (!keyword) return 0;

  const title = post.title.toLowerCase();
  const description = post.description.toLowerCase();
  const category = post.category.toLowerCase();
  const location = post.location.toLowerCase();

  if (title === keyword) return 100;
  if (title.startsWith(keyword)) return 90;
  if (title.includes(keyword)) return 80;
  if (description.includes(keyword)) return 50;
  if (category.includes(keyword)) return 35;
  if (location.includes(keyword)) return 20;
  return 0;
}

export function searchMockPosts(filters, page = 1, limit = 12) {
  const keyword = filters.keyword.trim().toLowerCase();
  const keywordTerms = keyword ? getKeywordTerms(keyword) : [];
  const category = filters.category.trim().toLowerCase();
  const location = filters.location.trim().toLowerCase();
  const date = filters.date.trim();
  const type = filters.type.trim();
  const status = filters.status.trim();
  const scope = filters.scope.trim();

  const results = mockPosts.filter((post) => {
    const matchesKeyword = !keyword || keywordTerms.some((term) => (
      post.title.toLowerCase().includes(term)
      || post.description.toLowerCase().includes(term)
      || post.location.toLowerCase().includes(term)
      || post.category.toLowerCase().includes(term)
    ));
    const matchesCategory = !category || post.category.toLowerCase() === category;
    const matchesLocation = !location || post.location.toLowerCase().includes(location);
    const matchesDate = isWithinThreeDays(post.date_occurred, date);
    const matchesType = !type || post.type === type;
    const matchesStatus = !status || post.status === status;
    const matchesScope = scope !== 'unsolved' || post.status !== 'resolved';

    return post.status !== 'pending_resolution'
      && matchesKeyword
      && matchesCategory
      && matchesLocation
      && matchesDate
      && matchesType
      && matchesStatus
      && matchesScope;
  }).sort((firstPost, secondPost) => {
    const scoreDifference = getRelevanceScore(secondPost, keyword) - getRelevanceScore(firstPost, keyword);
    if (scoreDifference !== 0) return scoreDifference;
    return new Date(secondPost.created_at) - new Date(firstPost.created_at);
  });

  return paginate(results, page, limit);
}
