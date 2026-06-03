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
    updated_at: timestampOffset(0, 9),
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
    updated_at: timestampOffset(-1, 14),
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
    updated_at: timestampOffset(-2, 18),
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
    updated_at: timestampOffset(-3, 10),
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
    updated_at: timestampOffset(-4, 12),
  },
];

module.exports = mockPosts;
