import { useEffect, useState } from 'react';
import MobileLayout from '../components/MobileLayout';
import PostCard from '../components/PostCard';
import { InfoIcon } from '../components/Icons';
import { getMockList } from '../data/mockPosts';
import api from '../services/api';

const PAGE_SIZE = 12;
const postFilters = [
  { label: 'Unsolved', params: {} },
  { label: 'Lost', params: { type: 'lost', status: 'open' } },
  { label: 'Found', params: { type: 'found', status: 'open' } },
  { label: 'Claimed', params: { status: 'claimed' } },
  { label: 'Resolved', params: { status: 'resolved' } },
];
const statusMeanings = [
  ['Unsolved', 'Items that are still active. This includes open lost/found posts and claimed posts.'],
  ['Lost', 'The owner lost this item and is still looking for it.'],
  ['Found', 'Someone found this item and is waiting for the owner.'],
  ['Claimed', 'Someone has started the return process, but it is not finished yet.'],
  ['Resolved', 'The item has been returned or the case is closed.'],
];
const notice = {
  title: 'Notice',
  summary: 'Posting now supports up to 3 images per item.',
  detail: 'When posting a lost or found item, add clear photos and choose the closest category, date, and campus location. This helps other KAIST members search and identify items faster.',
};

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, hasNextPage: false });
  const [activeFilter, setActiveFilter] = useState(postFilters[0]);
  const [showNotice, setShowNotice] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  async function fetchPosts(page = 1, nextFilter = activeFilter) {
    const setLoading = page === 1 ? setIsLoading : setIsLoadingMore;
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/posts', {
        params: { ...nextFilter.params, page, limit: PAGE_SIZE },
      });

      setPosts((currentPosts) => (
        page === 1 ? data.items : [...currentPosts, ...data.items]
      ));
      setPagination(data.pagination);
    } catch {
      const fallbackData = getMockList(page, PAGE_SIZE, nextFilter.params);
      setPosts((currentPosts) => (
        page === 1 ? fallbackData.items : [...currentPosts, ...fallbackData.items]
      ));
      setPagination(fallbackData.pagination);
      setError('');
    } finally {
      setLoading(false);
    }
  }

  function selectFilter(filter) {
    setActiveFilter(filter);
  }

  useEffect(() => {
    let isActive = true;

    api.get('/posts', {
      params: { ...activeFilter.params, page: 1, limit: PAGE_SIZE },
    })
      .then(({ data }) => {
        if (!isActive) return;
        setPosts(data.items);
        setPagination(data.pagination);
      })
      .catch(() => {
        if (!isActive) return;
        const fallbackData = getMockList(1, PAGE_SIZE, activeFilter.params);
        setPosts(fallbackData.items);
        setPagination(fallbackData.pagination);
        setError('');
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

  return (
    <MobileLayout>
      <section className="px-6 py-7">
        <button
          className="mb-5 w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left"
          type="button"
          onClick={() => setShowNotice((isOpen) => !isOpen)}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-950">{notice.title}</span>
            <span className="text-xs font-medium text-blue-600">{showNotice ? 'Hide' : 'More'}</span>
          </div>
          <p className="mt-1 truncate text-sm text-blue-700">{notice.summary}</p>
          {showNotice && (
            <p className="mt-2 text-sm leading-5 text-slate-600">{notice.detail}</p>
          )}
        </button>

        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-500">Recent Posts</h1>
          <button
            className="rounded-full p-1 text-slate-400"
            type="button"
            aria-label="Post status meanings"
            onClick={() => setShowInfo((isOpen) => !isOpen)}
          >
            <InfoIcon className="h-6 w-6" />
          </button>
        </div>

        {showInfo && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
            {statusMeanings.map(([term, meaning]) => (
              <p key={term} className="mb-2 last:mb-0">
                <span className="font-semibold text-slate-950">{term}:</span> {meaning}
              </p>
            ))}
          </div>
        )}

        <div className="mb-5 grid grid-cols-5 gap-1.5">
          {postFilters.map((filter) => (
            <button
              key={filter.label}
              className={`rounded-full px-1.5 py-2 text-[11px] font-semibold ${
                activeFilter.label === filter.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
              type="button"
              onClick={() => selectFilter(filter)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-96 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-950">No items found</h2>
            <p className="mt-2 text-sm text-slate-600">New lost and found posts will appear here.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {pagination.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoadingMore}
                  type="button"
                  onClick={() => fetchPosts(pagination.page + 1, activeFilter)}
                >
                  {isLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </MobileLayout>
  );
}
