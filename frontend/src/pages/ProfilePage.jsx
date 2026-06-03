import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileLayout from '../components/MobileLayout';
import { RefreshIcon } from '../components/Icons';
import api from '../services/api';

const STATUS_LABEL = {
  open: { text: 'Open', cls: 'bg-green-100 text-green-700' },
  claimed: { text: 'Claimed', cls: 'bg-yellow-100 text-yellow-700' },
  hidden: { text: 'Hidden', cls: 'bg-gray-100 text-gray-500' },
  pending_resolution: { text: 'Pending', cls: 'bg-orange-100 text-orange-700' },
  resolved: { text: 'Resolved', cls: 'bg-blue-100 text-blue-700' },
};

export default function ProfilePage() {
  const { login, logout, token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/me/posts'),
      ]);
      setProfile(profileRes.data);
      setPosts(postsRes.data);
      return profileRes.data;
    } catch {
      setError('Failed to load profile. Please refresh.');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().then((data) => {
      if (data) setEditName(data.name || '');
    });
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/users/me', { name: editName.trim() });
      setProfile(res.data);
      login(token, res.data);
      setEditing(false);
      setSuccess('Name updated!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update name.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!profile) {
    return (
      <MobileLayout showHeader={false}>
        <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
          <p>{error || 'Loading...'}</p>
          {error && (
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              <RefreshIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader={false}>
      <div className="px-5 pb-6 pt-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-950">My Profile</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              aria-label="Refresh profile"
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              <RefreshIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
              {(profile.name || profile.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-950">{profile.name || '(no name set)'}</p>
              <p className="text-sm text-slate-500">{profile.email}</p>
              {profile.role === 'admin' && (
                <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Admin</span>
              )}
            </div>
          </div>

          {success && <p className="mb-2 text-sm text-green-600">{success}</p>}
          {error && <p className="mb-2 text-sm text-red-500">{error}</p>}

          {editing ? (
            <form onSubmit={handleSave} className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Your name"
                maxLength={80}
                autoFocus
              />
              <button type="submit" disabled={saving}
                className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button"
                onClick={() => { setEditing(false); setEditName(profile.name || ''); setError(''); }}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
                Cancel
              </button>
            </form>
          ) : (
            <button onClick={() => { setEditing(true); setSuccess(''); }}
              className="text-sm font-medium text-blue-600 hover:underline">
              Edit name
            </button>
          )}
        </div>

        <h2 className="mb-3 text-base font-semibold text-slate-950">My Posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-400">You haven't posted anything yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map(post => {
              const badge = STATUS_LABEL[post.status] || STATUS_LABEL.open;
              return (
                <li key={post.id}>
                  <button
                    onClick={() => navigate(`/posts/${post.id}`)}
                    className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm text-slate-950">{post.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MobileLayout>
  );
}
