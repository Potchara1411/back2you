import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const previewPosts = [
  {
    id: 'preview-1',
    type: 'lost',
    title: 'Black KAIST hoodie',
    description: 'Left near the library reading room. The front has a small KAIST logo.',
    location: 'Main Library',
    status: 'open',
    category_name: 'Clothing',
    owner_name: 'Minjun',
    owner_email: 'minjun@kaist.ac.kr',
    report_count: 0,
    is_expired: false,
    created_at: '2026-05-11T09:30:00Z',
  },
  {
    id: 'preview-2',
    type: 'found',
    title: 'Student ID card',
    description: 'Found on the path between N1 and the cafeteria.',
    location: 'N1',
    status: 'hidden',
    category_name: 'Cards',
    owner_name: 'Admin review',
    owner_email: 'owner@kaist.ac.kr',
    report_count: 3,
    is_expired: false,
    created_at: '2026-05-10T04:20:00Z',
  },
  {
    id: 'preview-3',
    type: 'lost',
    title: 'Silver laptop charger',
    description: 'USB-C charger, possibly left in a seminar room.',
    location: 'E3-1',
    status: 'resolved',
    category_name: 'Electronics',
    owner_name: 'Jiyoon',
    owner_email: 'jiyoon@kaist.ac.kr',
    report_count: 1,
    is_expired: true,
    created_at: '2026-04-28T15:15:00Z',
  },
];

const previewUsers = [
  {
    id: '20230012',
    email: 'yilei@kaist.ac.kr',
    name: 'Yilei Yan',
    role: 'user',
    is_blocked: false,
    post_count: 4,
  },
  {
    id: '20230045',
    email: 'gosu@kaist.ac.kr',
    name: 'Gosu Choi',
    role: 'user',
    is_blocked: false,
    post_count: 2,
  },
  {
    id: '20230078',
    email: 'hugo@kaist.ac.kr',
    name: 'Hugo Tarczynski',
    role: 'user',
    is_blocked: true,
    post_count: 5,
  },
  {
    id: '20230091',
    email: 'feiying@kaist.ac.kr',
    name: 'Feiying Huang',
    role: 'user',
    is_blocked: false,
    post_count: 1,
  },
  {
    id: '20230102',
    email: 'eric@kaist.ac.kr',
    name: 'Eric Kim',
    role: 'user',
    is_blocked: false,
    post_count: 3,
  },
];

const filters = [
  { id: 'all', label: 'All' },
  { id: 'reported', label: 'Reported' },
  { id: 'expired', label: 'Expired' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'resolved', label: 'Resolved' },
];

const avatarTones = [
  'bg-blue-100',
  'bg-green-100',
  'bg-red-100',
  'bg-purple-100',
  'bg-amber-100',
  'bg-pink-100',
];

const statusClasses = {
  open: 'bg-green-100 text-green-700',
  hidden: 'bg-gray-100 text-gray-700',
  claimed: 'bg-blue-100 text-blue-700',
  pending_resolution: 'bg-amber-100 text-amber-800',
  resolved: 'bg-purple-100 text-purple-700',
};

function formatDate(value) {
  if (!value) return 'No date';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function matchesFilter(post, filter) {
  if (filter === 'reported') return Number(post.report_count) > 0;
  if (filter === 'expired') return Boolean(post.is_expired);
  if (filter === 'hidden') return post.status === 'hidden';
  if (filter === 'resolved') return post.status === 'resolved';
  return true;
}

function userDisplayId(user) {
  return String(user.id).replace(/^user-/, '');
}

export default function AdminPage() {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('users');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  async function loadPosts({ showLoading = true } = {}) {
    if (showLoading) setLoading(true);
    setNotice('');

    try {
      const { data } = await api.get('/admin/posts');
      setPosts(data.posts || []);
      setIsPreview(false);
    } catch (error) {
      setPosts(previewPosts);
      setIsPreview(true);
      setNotice(error.response?.data?.error || 'Showing preview data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || []);
    } catch {
      setUsers(previewUsers);
      setIsPreview(true);
    }
  }

  async function loadAdminData(options) {
    await Promise.all([loadPosts(options), loadUsers()]);
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadAdminData({ showLoading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPosts = useMemo(
    () => posts.filter((post) => matchesFilter(post, activeFilter)),
    [activeFilter, posts],
  );

  async function hidePost(post) {
    const confirmed = window.confirm('Hide this post from general users?');
    if (!confirmed) return;

    if (isPreview) {
      setPosts((currentPosts) =>
        currentPosts.map((item) => (item.id === post.id ? { ...item, status: 'hidden' } : item)),
      );
      setNotice('Preview post hidden locally.');
      return;
    }

    try {
      await api.patch(`/admin/posts/${post.id}/hide`);
      setPosts((currentPosts) =>
        currentPosts.map((item) => (item.id === post.id ? { ...item, status: 'hidden' } : item)),
      );
      setNotice('Post hidden.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to hide post.');
    }
  }

  async function deletePost(post) {
    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (!confirmed) return;

    if (isPreview) {
      setPosts((currentPosts) => currentPosts.filter((item) => item.id !== post.id));
      setNotice('Preview post removed locally.');
      return;
    }

    try {
      await api.delete(`/admin/posts/${post.id}`);
      setPosts((currentPosts) => currentPosts.filter((item) => item.id !== post.id));
      setNotice('Post deleted.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to delete post.');
    }
  }

  async function toggleUserBlock(user) {
    if (user.role === 'admin') {
      setNotice('Admin users cannot be blocked.');
      return;
    }

    const action = user.is_blocked ? 'unblock' : 'block';
    const confirmed = window.confirm(`${user.is_blocked ? 'Unblock' : 'Block'} ${user.email}?`);
    if (!confirmed) return;

    if (isPreview) {
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === user.id ? { ...item, is_blocked: !item.is_blocked } : item)),
      );
      setNotice(`Preview user ${action}ed locally.`);
      return;
    }

    try {
      const { data } = await api.patch(`/admin/users/${user.id}/${action}`);
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === user.id ? { ...item, ...data.user } : item)),
      );
      setNotice(`User ${action}ed.`);
    } catch (error) {
      setNotice(error.response?.data?.error || `Failed to ${action} user.`);
    }
  }

  function showActivity(user) {
    setNotice(`${user.name || user.email}: ${user.post_count || 0} posts`);
  }

  return (
    <main className="min-h-screen bg-white text-[#101828]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex min-h-screen items-center justify-center px-0 py-0 sm:px-6 sm:py-6">
        <div className="box-border flex h-[min(844px,100vh)] w-[min(390px,100vw)] flex-col overflow-hidden bg-[#F9FAFB] shadow-2xl sm:h-[844px] sm:w-[390px] sm:rounded-[48px] sm:border-[14px] sm:border-[#101828]">
          <PhoneStatusBar />

          <div className="flex min-h-0 flex-1 flex-col bg-white">
            <AppHeader onRefresh={() => loadAdminData()} />
            <SectionHeader
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />

            {notice && (
              <div className="mx-5 mt-3 rounded-[10px] bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                {notice}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
              {activeSection === 'users' ? (
                <UsersPanel
                  users={users}
                  loading={loading}
                  onShowActivity={showActivity}
                  onToggleBlock={toggleUserBlock}
                />
              ) : (
                <PostsPanel
                  posts={filteredPosts}
                  activeFilter={activeFilter}
                  loading={loading}
                  onFilterChange={setActiveFilter}
                  onHide={hidePost}
                  onDelete={deletePost}
                />
              )}
            </div>
          </div>

          <BottomNav />
          <HomeIndicator />
        </div>
      </div>
    </main>
  );
}

function PhoneStatusBar() {
  return (
    <div className="flex h-11 shrink-0 items-start justify-center bg-white pt-2">
      <div className="h-6 w-32 rounded-full bg-[#101828]" />
    </div>
  );
}

function AppHeader({ onRefresh }) {
  return (
    <header className="flex h-[61px] shrink-0 items-center border-b border-[#F3F4F6] bg-white px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-[18px] w-16 items-center justify-center rounded-sm bg-[#155DFC] text-[10px] font-bold tracking-wide text-white">
          KAIST
        </div>
        <h1 className="truncate text-[18px] font-medium leading-7 tracking-normal text-[#101828]">
          KAIST Lost & Found
        </h1>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh admin data"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#155DFC]"
      >
        <IconRefresh />
      </button>
    </header>
  );
}

function SectionHeader({ activeSection, onSectionChange }) {
  return (
    <div className="flex h-[49px] shrink-0 items-center gap-3 border-b border-[#F3F4F6] bg-white pl-5 pr-4">
      <button
        type="button"
        aria-label="Show users"
        onClick={() => onSectionChange('users')}
        className="flex h-5 w-5 items-center justify-center text-[#155DFC]"
      >
        <IconArrowLeft />
      </button>
      <h2 className="min-w-0 flex-1 text-[16px] font-medium leading-6 tracking-normal text-[#101828]">
        {activeSection === 'users' ? 'Manage Users' : 'Manage Posts'}
      </h2>
      <div className="flex rounded-[10px] bg-[#F3F4F6] p-1">
        {[
          { id: 'users', label: 'Users' },
          { id: 'posts', label: 'Posts' },
        ].map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`rounded-md px-2 py-1 text-[12px] font-medium ${
              activeSection === item.id ? 'bg-white text-[#155DFC] shadow-sm' : 'text-[#6A7282]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function UsersPanel({ users, loading, onShowActivity, onToggleBlock }) {
  if (loading) {
    return <EmptyState label="Loading users..." />;
  }

  if (!users.length) {
    return <EmptyState label="No users found." />;
  }

  return (
    <section className="flex flex-col gap-3">
      {users.map((user, index) => (
        <UserCard
          key={user.id}
          user={user}
          tone={avatarTones[index % avatarTones.length]}
          onShowActivity={onShowActivity}
          onToggleBlock={onToggleBlock}
        />
      ))}
    </section>
  );
}

function UserCard({ user, tone, onShowActivity, onToggleBlock }) {
  const blocked = Boolean(user.is_blocked);

  return (
    <article className="flex min-h-[154px] flex-col gap-3 rounded-[14px] border border-[#E5E7EB] bg-white px-[17px] pb-3 pt-[17px] shadow-sm">
      <div className="flex h-[60px] items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone} text-[#364153]`}>
          <IconUser />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-medium leading-5 tracking-normal text-[#101828]">
            {user.name || 'Unnamed user'}
          </h3>
          <p className="truncate text-[12px] leading-4 text-[#6A7282]">ID: {userDisplayId(user)}</p>
          <span
            className={`mt-1 inline-flex rounded px-2 py-0.5 text-[12px] leading-4 ${
              blocked ? 'bg-[#FFE2E2] text-[#C10007]' : 'bg-[#DCFCE7] text-[#008236]'
            }`}
          >
            {blocked ? 'Blocked' : 'Active'}
          </span>
        </div>
      </div>

      <div className="grid h-12 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onShowActivity(user)}
          className="flex items-center justify-center gap-2 rounded-[10px] bg-[#EFF6FF] px-3 text-center text-[12px] font-medium leading-4 text-[#1447E6]"
        >
          <IconClipboard />
          <span className="max-w-[72px]">View User Activity</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleBlock(user)}
          disabled={user.role === 'admin'}
          className="flex items-center justify-center gap-2 rounded-[10px] bg-[#FEF2F2] px-3 text-center text-[12px] font-medium leading-4 text-[#C10007] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconBlock />
          <span>{blocked ? 'Unblock' : 'Block'}</span>
        </button>
      </div>
    </article>
  );
}

function PostsPanel({ posts, activeFilter, loading, onFilterChange, onHide, onDelete }) {
  if (loading) {
    return <EmptyState label="Loading posts..." />;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {filters.map((filter) => (
          <button
            type="button"
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`shrink-0 rounded-[10px] px-3 py-2 text-[12px] font-medium ${
              activeFilter === filter.id ? 'bg-[#155DFC] text-white' : 'bg-[#F3F4F6] text-[#6A7282]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {posts.length ? (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onHide={onHide} onDelete={onDelete} />
        ))
      ) : (
        <EmptyState label="No posts found." />
      )}
    </section>
  );
}

function PostCard({ post, onHide, onDelete }) {
  return (
    <article className="rounded-[14px] border border-[#E5E7EB] bg-white p-[17px] shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase leading-4 text-[#6A7282]">{post.type}</p>
          <h3 className="mt-1 break-words text-[14px] font-medium leading-5 text-[#101828]">{post.title}</h3>
          <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-[#6A7282]">
            {post.description || 'No description.'}
          </p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[12px] leading-4 ${statusClasses[post.status] || 'bg-gray-100 text-gray-700'}`}>
          {post.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] leading-4 text-[#6A7282]">
        <p className="truncate">{post.location || 'No location'}</p>
        <p className="truncate text-right">{post.category_name || 'Uncategorized'}</p>
        <p>{formatDate(post.created_at)}</p>
        <p className="text-right">{post.report_count || 0} reports</p>
      </div>

      <div className="mt-3 grid h-12 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onHide(post)}
          disabled={post.status === 'hidden'}
          className="flex items-center justify-center gap-2 rounded-[10px] bg-[#EFF6FF] px-3 text-[12px] font-medium text-[#1447E6] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconEyeOff />
          <span>Hide</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(post)}
          className="flex items-center justify-center gap-2 rounded-[10px] bg-[#FEF2F2] px-3 text-[12px] font-medium text-[#C10007]"
        >
          <IconTrash />
          <span>Delete</span>
        </button>
      </div>
    </article>
  );
}

function BottomNav() {
  const items = [
    { label: 'Home', icon: <IconHome />, active: false },
    { label: 'Search', icon: <IconSearch />, active: false },
    { label: 'Post', icon: <IconPlus />, active: false },
    { label: 'Profile', icon: <IconUser />, active: true },
  ];

  return (
    <nav className="h-[69px] shrink-0 border-t border-[#E5E7EB] bg-white">
      <div className="flex h-full items-center justify-between px-7">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex w-10 flex-col items-center gap-1 text-[12px] leading-4 ${
              item.active ? 'text-[#155DFC]' : 'text-[#99A1AF]'
            }`}
          >
            <div className="h-6 w-6">{item.icon}</div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}

function HomeIndicator() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center bg-white">
      <div className="h-1 w-32 rounded-full bg-[#101828]" />
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-[14px] border border-[#E5E7EB] bg-white p-6 text-center text-[12px] text-[#6A7282]">
      {label}
    </div>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5h6" />
      <path d="M9 12h6" />
      <path d="M9 17h4" />
      <path d="M7 3h10v4H7z" />
      <path d="M6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

function IconBlock() {
  return (
    <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6 18.4 18.4" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 5.1A10.8 10.8 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-2 3.2" />
      <path d="M6.6 6.6C3.6 8.5 2 12 2 12s3 7 10 7a10.5 10.5 0 0 0 4.4-.9" />
      <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18 9 12l6-6" />
      <path d="M9 12h12" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
