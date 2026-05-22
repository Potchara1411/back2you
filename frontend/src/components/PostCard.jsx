import { Link } from 'react-router-dom';
import { CalendarIcon, LocationIcon } from './Icons';

const statusStyles = {
  open: 'bg-red-50 text-red-700',
  claimed: 'bg-amber-50 text-amber-700',
  pending_resolution: 'bg-blue-50 text-blue-700',
  resolved: 'bg-emerald-50 text-emerald-700',
};

function formatDate(value) {
  if (!value) return 'Date unknown';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatStatus(status) {
  return status?.replaceAll('_', ' ') || 'open';
}

function getDateLabel(post) {
  if (post.type === 'found') return 'Found on';
  if (post.type === 'lost') return 'Lost on';
  return 'Date';
}

function getPostId(post) {
  return post.id ?? post.post_id ?? post.postId;
}

export default function PostCard({ post }) {
  const image = post.images?.[0];
  const statusClass = statusStyles[post.status] || statusStyles.open;
  const ownerLabel = post.type === 'found' ? 'Finder' : 'Owner';
  const postId = getPostId(post);

  return (
    <Link
      to={`/posts/${postId}`}
      className="block cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.16)] transition active:scale-[0.99]"
    >
      <div className="relative h-48 bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-slate-100" />
        )}
        <span className={`absolute right-4 top-4 rounded-full px-5 py-2 text-sm font-semibold capitalize ${statusClass}`}>
          {formatStatus(post.status === 'open' ? post.type : post.status)}
        </span>
        <span className="absolute bottom-4 right-4 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
          {ownerLabel}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <h2 className="min-w-0 flex-1 truncate text-xl font-bold text-slate-950">
            {post.title}
          </h2>
          <span className="rounded-full border border-slate-300 px-4 py-1 text-sm font-medium text-slate-600">
            {post.category || 'Item'}
          </span>
        </div>

        <div className="space-y-2 text-lg text-slate-500">
          <p className="flex items-center gap-3 truncate">
            <LocationIcon className="h-5 w-5 shrink-0 text-slate-500" />
            <span className="truncate">{post.location || 'Location unknown'}</span>
          </p>
          <p className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 shrink-0 text-slate-500" />
            <span>{getDateLabel(post)} {formatDate(post.date_occurred || post.created_at)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
