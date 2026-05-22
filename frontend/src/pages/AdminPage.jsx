import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const previewPosts = [
  {
    id: 'preview-1',
    type: 'lost',
    title: 'Black KAIST hoodie',
    description: 'Left near the library reading room. Small KAIST logo on the front.',
    location: 'Main Library',
    status: 'open',
    category_name: 'Clothing',
    owner_name: 'Minjun',
    owner_email: 'minjun@kaist.ac.kr',
    report_count: 0,
    is_expired: false,
    created_at: '2026-05-11T09:30:00Z',
    updated_at: '2026-05-11T09:30:00Z',
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
    updated_at: '2026-05-10T04:20:00Z',
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
    updated_at: '2026-04-28T15:15:00Z',
  },
  {
    id: 'preview-4',
    type: 'found',
    title: 'AirPods case',
    description: 'Owner uploaded a photo and date for final verification.',
    location: 'N10 lobby',
    status: 'pending_resolution',
    category_name: 'Electronics',
    owner_name: 'Sora',
    owner_email: 'sora@kaist.ac.kr',
    report_count: 0,
    is_expired: false,
    created_at: '2026-05-08T12:30:00Z',
    updated_at: '2026-05-17T12:30:00Z',
  },
];

const previewUsers = [
  { id: '20230012', email: 'yilei@kaist.ac.kr', name: 'Yilei Yan', role: 'user', is_blocked: false, post_count: 4 },
  { id: '20230045', email: 'gosu@kaist.ac.kr', name: 'Gosu Choi', role: 'user', is_blocked: false, post_count: 2 },
  { id: '20230078', email: 'hugo@kaist.ac.kr', name: 'Hugo Tarczynski', role: 'user', is_blocked: true, post_count: 5 },
  { id: '20230091', email: 'feiying@kaist.ac.kr', name: 'Feiying Huang', role: 'user', is_blocked: false, post_count: 1 },
  { id: '20230102', email: 'eric@kaist.ac.kr', name: 'Eric Kim', role: 'user', is_blocked: false, post_count: 3 },
];

const previewCategories = [
  { id: 'cat-1', name: 'Electronics', active_post_count: 2, total_post_count: 2 },
  { id: 'cat-2', name: 'Clothing', active_post_count: 1, total_post_count: 1 },
  { id: 'cat-3', name: 'Other', active_post_count: 0, total_post_count: 0 },
];

const sections = [
  { id: 'posts', label: 'Posts' },
  { id: 'reports', label: 'Reports' },
  { id: 'resolutions', label: 'Resolve' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' },
];

const filters = [
  { id: 'all', label: 'All' },
  { id: 'reported', label: 'Reported' },
  { id: 'expired', label: 'Expired' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'claimed', label: 'Claimed' },
  { id: 'pending_resolution', label: 'Pending' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'pending_resolution', label: 'Pending' },
  { id: 'old_unresolved', label: 'Old' },
];

const avatarTones = ['bg-blue-100', 'bg-green-100', 'bg-red-100', 'bg-purple-100', 'bg-amber-100', 'bg-pink-100'];

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
  if (filter === 'claimed') return post.status === 'claimed';
  if (filter === 'pending_resolution') return post.status === 'pending_resolution';
  if (filter === 'resolved') return post.status === 'resolved';
  if (filter === 'pending_resolution') return post.status === 'pending_resolution';
  if (filter === 'old_unresolved') {
    const updatedAt = new Date(post.updated_at || post.created_at);
    const daysOld = (Date.now() - updatedAt.getTime()) / 86400000;
    return ['open', 'claimed', 'pending_resolution'].includes(post.status) && daysOld > 30;
  }
  return true;
}

function userDisplayId(user) {
  return String(user.id).replace(/^user-/, '');
}

function firstImage(post) {
  if (!post?.images) return '';
  if (Array.isArray(post.images)) return post.images[0] || '';
  return '';
}

function userAvatarUrl(user) {
  return user.avatar_url || user.profile_image || user.image_url || '';
}

function normalizeReportRows(rows) {
  return rows.map((item) => ({
    ...item,
    reports: item.reports || [
      {
        reason: 'Reported by a user',
        reported_by: 'anonymous',
        created_at: item.updated_at || item.created_at,
      },
    ],
  }));
}

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [resolutions, setResolutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [policy, setPolicy] = useState({ hideAfterDays: 45, deleteAfterDays: 60 });
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [activity, setActivity] = useState(null);

  const reportedPreview = useMemo(
    () => normalizeReportRows(previewPosts.filter((post) => Number(post.report_count) > 0)),
    [],
  );

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
      setNotice(error.response?.data?.error || 'Showing preview admin data.');
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

  async function loadReports() {
    try {
      const { data } = await api.get('/admin/reports');
      setReports(normalizeReportRows(data.reports || []));
    } catch {
      setReports(reportedPreview);
      setIsPreview(true);
    }
  }

  async function loadResolutions() {
    try {
      const { data } = await api.get('/admin/resolutions');
      setResolutions(data.posts || []);
    } catch {
      setResolutions(previewPosts.filter((post) => post.status === 'pending_resolution'));
      setIsPreview(true);
    }
  }

  async function loadSettings() {
    try {
      const [categoryResponse, policyResponse] = await Promise.all([
        api.get('/admin/categories'),
        api.get('/admin/settings/expiration-policy'),
      ]);
      setCategories(categoryResponse.data.categories || []);
      setPolicy(policyResponse.data.policy || { hideAfterDays: 45, deleteAfterDays: 60 });
    } catch {
      setCategories(previewCategories);
      setPolicy({ hideAfterDays: 45, deleteAfterDays: 60 });
      setIsPreview(true);
    }
  }

  async function loadAdminData(options) {
    await Promise.all([loadPosts(options), loadUsers(), loadReports(), loadResolutions(), loadSettings()]);
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadAdminData({ showLoading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSection === 'settings') loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const filteredPosts = useMemo(
    () => posts.filter((post) => matchesFilter(post, activeFilter)),
    [activeFilter, posts],
  );

  function updatePostEverywhere(postId, updater) {
    setPosts((current) => current.map((item) => (item.id === postId ? updater(item) : item)));
    setReports((current) => current.map((item) => (item.id === postId ? updater(item) : item)));
    setResolutions((current) => current.map((item) => (item.id === postId ? updater(item) : item)));
  }

  function removePostEverywhere(postId) {
    setPosts((current) => current.filter((item) => item.id !== postId));
    setReports((current) => current.filter((item) => item.id !== postId));
    setResolutions((current) => current.filter((item) => item.id !== postId));
  }

  async function hidePost(post) {
    const confirmed = window.confirm('Hide this post from general users?');
    if (!confirmed) return;

    if (isPreview) {
      updatePostEverywhere(post.id, (item) => ({ ...item, status: 'hidden' }));
      setNotice('Preview post hidden locally.');
      return;
    }

    try {
      const { data } = await api.patch(`/admin/posts/${post.id}/hide`);
      updatePostEverywhere(post.id, (item) => ({ ...item, ...data.post, status: 'hidden' }));
      setNotice(data.noticeSent ? 'Post hidden and owner notified.' : 'Post hidden.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to hide post.');
    }
  }

  async function resolvePost(post) {
    const confirmed = window.confirm('Mark this pending post as resolved?');
    if (!confirmed) return;

    if (isPreview) {
      setPosts((currentPosts) =>
        currentPosts.map((item) => (item.id === post.id ? { ...item, status: 'resolved' } : item)),
      );
      setNotice('Preview post resolved locally.');
      return;
    }

    try {
      const { data } = await api.patch(`/admin/posts/${post.id}/resolve`);
      setPosts((currentPosts) =>
        currentPosts.map((item) => (item.id === post.id ? { ...item, ...data.post } : item)),
      );
      setNotice('Post resolved.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to resolve post.');
    }
  }

  async function deletePost(post) {
    const confirmed = window.confirm('Delete this post permanently?');
    if (!confirmed) return;

    if (isPreview) {
      removePostEverywhere(post.id);
      setNotice('Preview post removed locally.');
      return;
    }

    try {
      const { data } = await api.delete(`/admin/posts/${post.id}`);
      removePostEverywhere(post.id);
      setNotice(data.noticeSent ? 'Post deleted and owner notified.' : 'Post deleted.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to delete post.');
    }
  }

  async function dismissReport(post) {
    const confirmed = window.confirm('Dismiss all reports for this post?');
    if (!confirmed) return;

    if (isPreview) {
      setReports((current) => current.filter((item) => item.id !== post.id));
      updatePostEverywhere(post.id, (item) => ({ ...item, report_count: 0 }));
      setNotice('Preview report dismissed.');
      return;
    }

    try {
      const { data } = await api.patch(`/admin/reports/${post.id}/dismiss`);
      setReports((current) => current.filter((item) => item.id !== post.id));
      updatePostEverywhere(post.id, (item) => ({ ...item, report_count: 0 }));
      setNotice(`${data.dismissedCount || 0} report(s) dismissed.`);
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to dismiss report.');
    }
  }

  async function unhidePost(post) {
    const confirmed = window.confirm('Unhide this post and make it visible again?');
    if (!confirmed) return;

    if (isPreview) {
      updatePostEverywhere(post.id, (item) => ({ ...item, status: 'open' }));
      setNotice('Preview post unhidden locally.');
      return;
    }

    try {
      const { data } = await api.patch(`/admin/posts/${post.id}/unhide`);
      updatePostEverywhere(post.id, (item) => ({ ...item, ...data.post, status: 'open' }));
      setNotice(data.noticeSent ? 'Post unhidden and owner notified.' : 'Post unhidden.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to unhide post.');
    }
  }

  async function reopenPost(post) {
    const confirmed = window.confirm('Reopen this resolved post?');
    if (!confirmed) return;

    if (isPreview) {
      updatePostEverywhere(post.id, (item) => ({ ...item, status: 'open' }));
      setNotice('Preview post reopened.');
      return;
    }

    try {
      const { data } = await api.patch(`/admin/posts/${post.id}/reopen`, { status: 'open' });
      updatePostEverywhere(post.id, (item) => ({ ...item, ...data.post }));
      setNotice(data.noticeSent ? 'Post reopened and owner notified.' : 'Post reopened.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to reopen post.');
    }
  }

  async function resolvePost(post) {
    const confirmed = window.confirm('Mark this pending post as resolved?');
    if (!confirmed) return;

    if (isPreview) {
      setResolutions((current) => current.filter((item) => item.id !== post.id));
      updatePostEverywhere(post.id, (item) => ({ ...item, status: 'resolved' }));
      setNotice('Preview post resolved.');
      return;
    }

    try {
      const { data } = await api.patch(`/admin/posts/${post.id}/resolve`);
      setResolutions((current) => current.filter((item) => item.id !== post.id));
      updatePostEverywhere(post.id, (item) => ({ ...item, ...data.post }));
      setNotice(data.noticeSent ? 'Post resolved and owner notified.' : 'Post resolved.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to resolve post.');
    }
  }

  async function rejectResolution(post) {
    const confirmed = window.confirm('Reject this resolution proof and ask for clearer verification?');
    if (!confirmed) return;

    if (isPreview) {
      setResolutions((current) => current.filter((item) => item.id !== post.id));
      updatePostEverywhere(post.id, (item) => ({ ...item, status: 'claimed' }));
      setNotice('Preview resolution rejected.');
      return;
    }

    try {
      const { data } = await api.patch(`/admin/posts/${post.id}/reject-resolution`);
      setResolutions((current) => current.filter((item) => item.id !== post.id));
      updatePostEverywhere(post.id, (item) => ({ ...item, ...data.post }));
      setNotice(data.noticeSent ? 'Resolution rejected and owner notified.' : 'Resolution rejected.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to reject resolution.');
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
      setNotice(data.noticeSent ? `User ${action}ed and notified.` : `User ${action}ed.`);
    } catch (error) {
      setNotice(error.response?.data?.error || `Failed to ${action} user.`);
    }
  }

  async function showActivity(user) {
    if (isPreview) {
      setActivity({
        user,
        activity: [
          { id: 'a1', type: 'post', label: `${user.post_count || 0} posts`, created_at: new Date().toISOString() },
          { id: 'a2', type: 'report', label: 'No recent reports in preview', created_at: new Date().toISOString() },
        ],
      });
      setNotice('');
      return;
    }

    try {
      const { data } = await api.get(`/admin/users/${user.id}/activity`);
      setActivity(data);
      setNotice('');
    } catch (error) {
      setActivity(null);
      setNotice(error.response?.data?.error || 'Failed to load user activity.');
    }
  }

  async function sendNotice(user) {
    const message = window.prompt(`Administrative notice for ${user.email}`);
    if (!message?.trim()) return;

    if (isPreview) {
      setNotice('Preview notice composed locally.');
      return;
    }

    try {
      const { data } = await api.post(`/admin/users/${user.id}/notice`, { message: message.trim() });
      setNotice(data.message || 'Notice sent.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to send notice.');
    }
  }

  async function addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const { data } = await api.post('/admin/categories', { name: trimmed });
      setCategories((current) => [...current, { ...data.category, active_post_count: 0, total_post_count: 0 }]);
      setNotice('Category added.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to add category.');
    }
  }

  async function editCategory(category) {
    const nextName = window.prompt('Rename category', category.name);
    if (!nextName?.trim() || nextName.trim() === category.name) return;
    try {
      const { data } = await api.patch(`/admin/categories/${category.id}`, { name: nextName.trim() });
      setCategories((current) => current.map((item) => (item.id === category.id ? { ...item, ...data.category } : item)));
      setNotice('Category updated.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to update category.');
    }
  }

  async function deleteCategory(category) {
    const confirmed = window.confirm(`Delete ${category.name}? Active posts will be reassigned to Other.`);
    if (!confirmed) return;
    try {
      const { data } = await api.delete(`/admin/categories/${category.id}`);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setNotice(`${data.reassignedCount || 0} post(s) reassigned to ${data.fallbackCategory?.name || 'Other'}.`);
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to delete category.');
    }
  }

  async function savePolicy(nextPolicy) {
    try {
      const { data } = await api.put('/admin/settings/expiration-policy', nextPolicy);
      setPolicy(data.policy);
      setNotice('Expiration policy saved.');
    } catch (error) {
      setNotice(error.response?.data?.error || 'Failed to save expiration policy.');
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#101828] sm:flex sm:items-center sm:justify-center sm:bg-slate-50 sm:p-8" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="relative mx-auto min-h-screen max-w-md bg-white sm:h-[860px] sm:min-h-0 sm:w-[430px] sm:overflow-hidden sm:rounded-[3.25rem] sm:border-[14px] sm:border-slate-950 sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
        <div className="pointer-events-none absolute left-1/2 top-4 z-40 hidden h-7 w-32 -translate-x-1/2 rounded-full bg-slate-950 sm:block" />
        <div className="flex min-h-screen flex-col bg-white sm:h-full sm:min-h-0 sm:rounded-[2.35rem] sm:pt-12">

          <div className="flex min-h-0 flex-1 flex-col bg-white">
            <AppHeader onRefresh={() => loadAdminData()} onLogout={async () => { await logout(); navigate('/login', { replace: true }); }} />
            <SectionHeader activeSection={activeSection} />

            {notice && (
              <div className="mx-5 mt-3 rounded-[10px] bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                {notice}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
              {activeSection === 'posts' && (
                <PostsPanel
                  posts={filteredPosts}
                  activeFilter={activeFilter}
                  loading={loading}
                  onFilterChange={setActiveFilter}
                  onHide={hidePost}
                  onUnhide={unhidePost}
                  onResolve={resolvePost}
                  onDelete={deletePost}
                  onReopen={reopenPost}
                />
              )}
              {activeSection === 'reports' && (
                <ReportsPanel
                  reports={reports}
                  loading={loading}
                  onHide={hidePost}
                  onUnhide={unhidePost}
                  onDelete={deletePost}
                  onDismiss={dismissReport}
                />
              )}
              {activeSection === 'resolutions' && (
                <ResolutionsPanel
                  posts={resolutions}
                  loading={loading}
                  onResolve={resolvePost}
                  onReject={rejectResolution}
                />
              )}
              {activeSection === 'users' && (
                <UsersPanel
                  users={users}
                  loading={loading}
                  activity={activity}
                  onCloseActivity={() => setActivity(null)}
                  onShowActivity={showActivity}
                  onToggleBlock={toggleUserBlock}
                  onSendNotice={sendNotice}
                />
              )}
              {activeSection === 'settings' && (
                <SettingsPanel
                  key={`${policy.hideAfterDays}-${policy.deleteAfterDays}`}
                  categories={categories}
                  policy={policy}
                  onAddCategory={addCategory}
                  onEditCategory={editCategory}
                  onDeleteCategory={deleteCategory}
                  onSavePolicy={savePolicy}
                />
              )}
            </div>
          </div>

          <BottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
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

function AppHeader({ onRefresh, onLogout }) {
  return (
    <header className="flex h-[61px] shrink-0 items-center border-b border-[#F3F4F6] bg-white px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-[18px] w-16 items-center justify-center rounded-sm bg-[#155DFC] text-[10px] font-bold tracking-wide text-white">
          KAIST
        </div>
        <h1 className="truncate text-[18px] font-medium leading-7 tracking-normal text-[#101828]">
          Admin Console
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh admin data"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#155DFC]"
        >
          <IconRefresh />
        </button>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Logout"
          className="flex h-8 items-center gap-1 rounded-full bg-[#FEF2F2] px-3 text-[12px] font-medium text-[#C10007]"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

function SectionHeader({ activeSection }) {
  const current = sections.find((item) => item.id === activeSection);

  return (
    <div className="shrink-0 border-b border-[#F3F4F6] bg-white px-5 py-3">
      <h2 className="text-[16px] font-medium leading-6 tracking-normal text-[#101828]">
        {current?.label || 'Admin'}
      </h2>
    </div>
  );
}

function UsersPanel({ users, loading, activity, onCloseActivity, onShowActivity, onToggleBlock, onSendNotice }) {
  const [query, setQuery] = useState('');
  const filteredUsers = users.filter((user) => {
    const target = `${user.name || ''} ${user.email || ''} ${user.id || ''}`.toLowerCase();
    return target.includes(query.toLowerCase());
  });

  if (loading) {
    return <EmptyState label="Loading users..." />;
  }

  return (
    <section className="flex flex-col gap-3">
      <input
        className="h-11 rounded-[12px] border border-[#E5E7EB] px-3 text-[13px] outline-none focus:border-[#155DFC]"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by ID, name, or email"
      />

      {activity && <ActivityPanel activity={activity} onClose={onCloseActivity} />}

      {filteredUsers.length ? (
        filteredUsers.map((user, index) => (
          <UserCard
            key={user.id}
            user={user}
            tone={avatarTones[index % avatarTones.length]}
            onShowActivity={onShowActivity}
            onToggleBlock={onToggleBlock}
            onSendNotice={onSendNotice}
          />
        ))
      ) : (
        <EmptyState label="No users found." />
      )}
    </section>
  );
}

function ActivityPanel({ activity, onClose }) {
  return (
    <section className="rounded-[14px] border border-[#BFDBFE] bg-[#EFF6FF] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase text-[#155DFC]">User Activity</p>
          <h3 className="mt-1 text-[14px] font-semibold text-[#101828]">{activity.user?.name || activity.user?.email}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#155DFC]">
          Close
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {(activity.activity || []).length ? (
          activity.activity.map((item) => (
            <div key={`${item.type}-${item.id}`} className="rounded-[10px] bg-white px-3 py-2">
              <p className="text-[12px] font-medium capitalize text-[#101828]">{item.type}</p>
              <p className="mt-1 text-[12px] leading-4 text-[#6A7282]">{item.label || item.post_title || 'No details'}</p>
              <p className="mt-1 text-[11px] text-[#99A1AF]">{formatDate(item.created_at)}</p>
            </div>
          ))
        ) : (
          <p className="text-[12px] text-[#6A7282]">No recent activity.</p>
        )}
      </div>
    </section>
  );
}

function UserCard({ user, tone, onShowActivity, onToggleBlock, onSendNotice }) {
  const blocked = Boolean(user.is_blocked);
  const avatarUrl = userAvatarUrl(user);

  return (
    <article className="flex min-h-[174px] flex-col gap-3 rounded-[14px] border border-[#E5E7EB] bg-white px-[17px] pb-3 pt-[17px] shadow-sm">
      <div className="flex h-[60px] items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${user.name || user.email || 'User'} profile`}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone} text-[#364153]`}>
            <span className="text-[16px] font-semibold">
              {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-medium leading-5 tracking-normal text-[#101828]">
            {user.name || 'Unnamed user'}
          </h3>
          <p className="truncate text-[12px] leading-4 text-[#6A7282]">ID: {userDisplayId(user)}</p>
          <p className="truncate text-[12px] leading-4 text-[#6A7282]">{user.email}</p>
          <span
            className={`mt-1 inline-flex rounded px-2 py-0.5 text-[12px] leading-4 ${
              blocked ? 'bg-[#FFE2E2] text-[#C10007]' : 'bg-[#DCFCE7] text-[#008236]'
            }`}
          >
            {blocked ? 'Blocked' : user.role === 'admin' ? 'Admin' : 'Active'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SmallActionButton onClick={() => onShowActivity(user)} label="Activity" icon={<IconClipboard />} tone="blue" />
        <SmallActionButton onClick={() => onSendNotice(user)} label="Notice" icon={<IconMail />} tone="gray" />
        <SmallActionButton
          onClick={() => onToggleBlock(user)}
          label={blocked ? 'Unblock' : 'Block'}
          icon={<IconBlock />}
          tone="red"
          disabled={user.role === 'admin'}
        />
      </div>
    </article>
  );
}

function PostsPanel({ posts, activeFilter, loading, onFilterChange, onHide, onUnhide, onResolve, onDelete }) {
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
          <PostCard key={post.id} post={post} onHide={onHide} onUnhide={onUnhide} onResolve={onResolve} onDelete={onDelete} />
        ))
      ) : (
        <EmptyState label="No posts found." />
      )}
    </section>
  );
}

function PostCard({ post, onHide, onUnhide, onResolve, onDelete }) {
  return (
    <article className="rounded-[14px] border border-[#E5E7EB] bg-white p-[17px] shadow-sm">
      <PostSummary post={post} />
      {post.claim_details && (
        <div className="mt-3 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[12px] leading-4 text-[#364153]">
          <p className="font-medium text-[#101828]">
            Claim by {post.claimant_name || post.claimant_email || `User #${post.claimant_id}`}
          </p>
          <p className="mt-1 line-clamp-2">{post.claim_details}</p>
        </div>
      )}
      <div className="mt-3 grid min-h-12 grid-cols-2 gap-2">
        {post.status === 'hidden' ? (
          <button
            type="button"
            onClick={() => onUnhide(post)}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-[#EFF6FF] px-3 text-[12px] font-medium text-[#1447E6]"
          >
            <IconEye />
            <span>Unhide</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onHide(post)}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-[#EFF6FF] px-3 text-[12px] font-medium text-[#1447E6]"
          >
            <IconEyeOff />
            <span>Hide</span>
          </button>
        )}
        {post.status === 'pending_resolution' ? (
          <button
            type="button"
            onClick={() => onResolve(post)}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-[#EFF6FF] px-3 text-[12px] font-medium text-[#1447E6]"
          >
            <IconClipboard />
            <span>Resolve</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(post)}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-[#FEF2F2] px-3 text-[12px] font-medium text-[#C10007]"
          >
            <IconTrash />
            <span>Delete</span>
          </button>
        )}
      </div>
    </article>
  );
}

function ReportCard({ post, onHide, onUnhide, onDelete, onDismiss }) {
  return (
    <article className="rounded-[14px] border border-[#FECACA] bg-white p-[17px] shadow-sm">
      <PostSummary post={post} />
      <div className="mt-3 rounded-[10px] bg-[#FEF2F2] px-3 py-2">
        {(post.reports || []).slice(0, 2).map((report, index) => (
          <p key={report.id || index} className="text-[12px] leading-4 text-[#991B1B]">
            {report.reason || 'No reason'} {report.reported_by ? `- ${report.reported_by}` : ''}
          </p>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {post.status === 'hidden' ? (
          <SmallActionButton onClick={() => onUnhide(post)} label="Unhide" icon={<IconEye />} tone="blue" />
        ) : (
          <SmallActionButton onClick={() => onHide(post)} label="Hide" icon={<IconEyeOff />} tone="blue" />
        )}
        <SmallActionButton onClick={() => onDismiss(post)} label="Dismiss" icon={<IconCheck />} tone="gray" />
        <SmallActionButton onClick={() => onDelete(post)} label="Delete" icon={<IconTrash />} tone="red" />
      </div>
    </article>
  );
}

function ResolutionCard({ post, onResolve, onReject }) {
  return (
    <article className="rounded-[14px] border border-[#FDE68A] bg-white p-[17px] shadow-sm">
      <PostSummary post={post} />
      <div className="mt-3 rounded-[10px] bg-[#FFFBEB] px-3 py-2 text-[12px] leading-4 text-[#92400E]">
        Review owner, date, and uploaded images before finalizing resolution.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallActionButton onClick={() => onResolve(post)} label="Resolve" icon={<IconCheck />} tone="blue" />
        <SmallActionButton onClick={() => onReject(post)} label="Reject" icon={<IconBlock />} tone="red" />
      </div>
    </article>
  );
}

function PostSummary({ post }) {
  const image = firstImage(post);

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-[#F3F4F6]">
          {image ? (
            <img src={image} alt={post.title || 'Item'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#99A1AF]">
              <IconImage />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
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
        <p className="truncate text-right">{post.category_name || post.category || 'Uncategorized'}</p>
        <p>{formatDate(post.created_at)}</p>
        <p className="text-right">{post.report_count || 0} reports</p>
      </div>
    </>
  );
}

function SmallActionButton({ onClick, label, icon, tone, disabled }) {
  const toneClasses = {
    blue: 'bg-[#EFF6FF] text-[#1447E6]',
    gray: 'bg-[#F3F4F6] text-[#364153]',
    red: 'bg-[#FEF2F2] text-[#C10007]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses[tone] || toneClasses.gray}`}
    >
      <span className="h-[14px] w-[14px] shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ReportsPanel({ reports, loading, onHide, onUnhide, onDelete, onDismiss }) {
  if (loading) return <EmptyState label="Loading reports..." />;
  if (!reports.length) return <EmptyState label="No reported posts." />;
  return (
    <section className="flex flex-col gap-3">
      {reports.map((post) => (
        <ReportCard key={post.id} post={post} onHide={onHide} onUnhide={onUnhide} onDelete={onDelete} onDismiss={onDismiss} />
      ))}
    </section>
  );
}

function ResolutionsPanel({ posts, loading, onResolve, onReject }) {
  if (loading) return <EmptyState label="Loading resolutions..." />;
  if (!posts.length) return <EmptyState label="No posts pending resolution." />;
  return (
    <section className="flex flex-col gap-3">
      {posts.map((post) => (
        <ResolutionCard key={post.id} post={post} onResolve={onResolve} onReject={onReject} />
      ))}
    </section>
  );
}

function SettingsPanel({ categories, policy, onAddCategory, onEditCategory, onDeleteCategory, onSavePolicy }) {
  const [newName, setNewName] = useState('');
  const [hideAfterDays, setHideAfterDays] = useState(policy.hideAfterDays);
  const [deleteAfterDays, setDeleteAfterDays] = useState(policy.deleteAfterDays);
  const [saving, setSaving] = useState(false);

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAddCategory(newName);
    setNewName('');
  }

  async function handleSavePolicy(e) {
    e.preventDefault();
    setSaving(true);
    await onSavePolicy({ hideAfterDays: Number(hideAfterDays), deleteAfterDays: Number(deleteAfterDays) });
    setSaving(false);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-[#E5E7EB] bg-white p-[17px] shadow-sm">
        <h2 className="mb-3 text-[14px] font-semibold text-[#101828]">Categories</h2>
        <form onSubmit={handleAddCategory} className="mb-3 flex gap-2">
          <input
            className="h-10 flex-1 rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] outline-none focus:border-[#155DFC]"
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="h-10 rounded-[10px] bg-[#155DFC] px-3 text-[12px] font-medium text-white">
            Add
          </button>
        </form>
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between rounded-[10px] bg-[#F9FAFB] px-3 py-2">
              <span className="text-[12px] text-[#101828]">{cat.name}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => onEditCategory(cat)} className="text-[12px] font-medium text-[#155DFC]">Edit</button>
                <button type="button" onClick={() => onDeleteCategory(cat)} className="text-[12px] font-medium text-[#C10007]">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[14px] border border-[#E5E7EB] bg-white p-[17px] shadow-sm">
        <h2 className="mb-3 text-[14px] font-semibold text-[#101828]">Expiration Policy</h2>
        <form onSubmit={handleSavePolicy} className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] text-[#6A7282]">Hide posts after (days)</label>
            <input
              type="number"
              min={1}
              className="h-10 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] outline-none focus:border-[#155DFC]"
              value={hideAfterDays}
              onChange={(e) => setHideAfterDays(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[#6A7282]">Delete posts after (days)</label>
            <input
              type="number"
              min={1}
              className="h-10 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] outline-none focus:border-[#155DFC]"
              value={deleteAfterDays}
              onChange={(e) => setDeleteAfterDays(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-10 w-full rounded-[10px] bg-[#155DFC] text-[12px] font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Policy'}
          </button>
        </form>
      </div>
    </section>
  );
}

function BottomNav({ activeSection, onSectionChange }) {
  const items = [
    { id: 'posts', label: 'Posts', icon: <IconClipboard /> },
    { id: 'reports', label: 'Reports', icon: <IconFlag /> },
    { id: 'resolutions', label: 'Resolve', icon: <IconCheck /> },
    { id: 'users', label: 'Users', icon: <IconUser /> },
    { id: 'settings', label: 'Settings', icon: <IconSettings /> },
  ];

  return (
    <nav className="h-[69px] shrink-0 border-t border-[#E5E7EB] bg-white">
      <div className="flex h-full items-center justify-between px-7">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`flex w-12 flex-col items-center gap-1 text-[11px] leading-4 ${
              activeSection === item.id ? 'text-[#155DFC]' : 'text-[#99A1AF]'
            }`}
          >
            <div className="h-6 w-6">{item.icon}</div>
            <span>{item.label}</span>
          </button>
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

function IconEye() {
  return (
    <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
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

function IconRefresh() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 15-4.5-4.5L9 18" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22V15" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
