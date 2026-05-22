import { useEffect, useMemo, useState } from 'react';
import MobileLayout from '../components/MobileLayout';
import PostCard from '../components/PostCard';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LocationIcon,
  SearchIcon,
  SortDownIcon,
  SortUpIcon,
  SparkIcon,
  TagIcon,
} from '../components/Icons';
import { getMockList, searchMockPosts } from '../data/mockPosts';
import api from '../services/api';

const PAGE_SIZE = 12;
const statusStyles = {
  lost: 'bg-red-50 text-red-700',
  found: 'bg-red-50 text-red-700',
  claimed: 'bg-amber-50 text-amber-700',
  pending_resolution: 'bg-blue-50 text-blue-700',
  resolved: 'bg-emerald-50 text-emerald-700',
};
const postFilters = [
  { label: 'Unsolved', params: { scope: 'unsolved' } },
  { label: 'Lost', params: { type: 'lost', status: 'open' } },
  { label: 'Found', params: { type: 'found', status: 'open' } },
  { label: 'Claimed', params: { status: 'claimed' } },
  { label: 'Resolved', params: { status: 'resolved' } },
];
const DEFAULT_CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Accessories', 'Keys', 'Wallet', 'ID Card', 'Other'];
const buildingsByArea = {
  North: [
    'N1 IT Convergence Building',
    'N2 Branch Administration B/D',
    'N3 Sports Complex',
    'N4 School of Humanities & Social Science B/D',
    'N5 Basic Experiement & Research B/D',
    'N6 Faculty Hall',
    'N7 Mechanical Engineering B/D',
    'N7-1 Dept. of Nuclear & Quantum Engineering',
    'N7-2 Dept. of Aerospace Engineering',
    'N7-3, 4 Dept. of Mechanical Engineering',
    'N7-5 Automobile Technology Laboratory Building',
    'N9 Practice B/D',
    'N10 Undergraduate Branch Library',
    'N11 Cafeteria',
    'N12 Student Center-2',
    'N13 Tae Wul Gwan',
    'N13-1 Chang Young Shin Student Center',
    'N14 Sarang Hall',
    'N15 Staff Accommodation',
    'N16 Somang Hall',
    'N17 Seongsil Hall',
    'N18 Jilli Hall',
    'N19 Areum Hall',
    'N20 Silloe Hall',
    'N21 Jihye Hall',
    'N22 Alumni Venture Hall',
    'N23 fMRI Center',
    'N24 LG Innovation Hall',
    'N25 Dept. of Industrial Design B/D',
    'N26 Center for High-Performance Integrated Systems',
    'N27 Eureka Hall',
    'N28 Energy & Environment Research Center',
  ],
  East: [
    'E2 Industrial Engineering & Management B/D',
    'E2-1 Dept. of Mathematical Sciences',
    'E2-2 Dept. of Industrial & Systems Engineering',
    'E2-3 Graduate School of Knowledge Service Engineering',
    'E3 Information & Electronics B/D',
    'E3-1 School of Computing',
    'E3-2 School of Electrical Engineering',
    'E3-3 Device Innovation Facility',
    'E3-4 Saeneul Dong',
    'E4 KAIST Institutes B/D',
    'E5 Faculty Club',
    'E6 Natural Science B/D',
    'E6-1 Dept. of Mathematical Sciences',
    'E6-2 Dept. of Physics',
    'E6-3 Dept. of Biological Sciences',
    'E6-4 Dept. of Chemistry',
    'E6-5 GoongNi Laboratory Building',
    'E6-6 Basic Science Building',
    'E7 Biomedical Research Center',
    'E8 Sejong Hall',
    'E9 Academic Cultural Complex',
    'E10 Storehouse',
    'E11 Creative Learning B/D',
    'E12 Energy Plant',
    'E13 Satellite Technology Research Center',
    'E14 Main Administration B/D',
    'E15 Auditorium',
    'E16 ChungMoonSoul B/D',
    'E16-1 YANG Bun Soon B/D',
    'E17 Stadium',
    'E18 Daejeon Disease-model Animal Center',
    'E18-1 Bio Model System Park',
    'E19 National Nano Fab Center',
    'E20 Kyeryong Hall',
    'E21 KAIST Clinic, Pharmacy',
  ],
  West: [
    'W1 Applied Engineering B/D',
    'W1-1 Dept. of Materials Science & Engineering',
    'W1-2 Dept. of Civil & Environmental Engineering',
    'W1-3 Dept. of Chemical & Biomolecular Engineering',
    'W2 Student Center-1',
    'W2-1 International Center',
    'W3 Galilei Hall',
    'W4-1 Yeoul Hall',
    'W4-2 Nadl Hall',
    'W4-3 Dasom Hall',
    'W4-4 Heemang Hall',
    'W5-1 Married Students Housing',
    'W5-2 Startup Village',
    'W5-3 International Village C',
    'W5-4 International Village A',
    'W5-5 International Village B',
    'W6 Mir Hall, Narae Hall',
    'W7 Nanum Hall',
    'W8 Educational Support B/D',
    'W8-1 Analysis Center for Research Advancement',
    'W9 Outdoor Theater',
    'W10 Wind Tunnel Laboratory',
    'W11 International Faculty Apartment',
    'W12 West Energy Plant',
    'W16 Geotechnical Centrifuge Testing Center',
  ],
};
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = new Date();

function getFloorLabel(floor) {
  if (floor === 1) return '1st floor';
  if (floor === 2) return '2nd floor';
  if (floor === 3) return '3rd floor';
  return `${floor}th floor`;
}

function guessFloorCount(buildingName) {
  if (/Outdoor|Stadium|Plant|Storehouse|Tunnel/i.test(buildingName)) return 1;
  if (/Hall|Accommodation|Village|Apartment|Housing/i.test(buildingName)) return 10;
  if (/Center|Complex|Library|Student Center|Clinic|Administration/i.test(buildingName)) return 5;
  if (/Dept\.|School|Engineering|Science|Research|Institute|Building|B\/D/i.test(buildingName)) return 7;
  return 4;
}

function getLocationDetails(buildingName) {
  return [
    'Near entrance',
    ...Array.from({ length: guessFloorCount(buildingName) }, (_, index) => getFloorLabel(index + 1)),
  ];
}

function getMonthDays(monthDate) {
  return Array.from(
    { length: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate() },
    (_, index) => index + 1,
  );
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getActiveParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value.trim() !== ''),
  );
}

function getStatusLabel(post) {
  return post.status === 'open' ? post.type : post.status?.replaceAll('_', ' ');
}

function getStatusClass(post) {
  const statusKey = post.status === 'open' ? post.type : post.status;
  return statusStyles[statusKey] || 'bg-slate-100 text-slate-600';
}

function SearchField({ value, onChange, placeholder = 'Search for items...' }) {
  return (
    <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-400">
      <SearchIcon className="h-5 w-5 shrink-0" />
      <input
        className="min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
        name="keyword"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

function formatResultDate(value) {
  if (!value) return 'Date unknown';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getDateLabel(post) {
  if (post.type === 'found') return 'Found on';
  if (post.type === 'lost') return 'Lost on';
  return 'Date';
}

function getRelevanceScore(post, keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return 0;

  const title = post.title?.toLowerCase() || '';
  const description = post.description?.toLowerCase() || '';
  const category = post.category?.toLowerCase() || '';
  const location = post.location?.toLowerCase() || '';

  if (title === normalizedKeyword) return 100;
  if (title.startsWith(normalizedKeyword)) return 90;
  if (title.includes(normalizedKeyword)) return 80;
  if (description.includes(normalizedKeyword)) return 50;
  if (category.includes(normalizedKeyword)) return 35;
  if (location.includes(normalizedKeyword)) return 20;
  return 0;
}

function SearchResultCard({ post, viewMode }) {
  if (viewMode === 'large') {
    return <PostCard post={post} />;
  }

  const image = post.images?.[0];
  const ownerLabel = post.type === 'found' ? 'Finder' : 'Owner';
  const statusLabel = getStatusLabel(post);
  const statusClass = getStatusClass(post);

  if (viewMode === 'list') {
    return (
      <a className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" href={`/posts/${post.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-950">{post.title}</h2>
            <p className="mt-1 truncate text-xs text-slate-500">{post.category} · {ownerLabel}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{post.location}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </a>
    );
  }

  return (
    <a className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" href={`/posts/${post.id}`}>
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {image && <img alt={post.title} className="h-full w-full object-cover" src={image} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-base font-bold text-slate-950">{post.title}</h2>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <p className="truncate text-xs font-medium text-slate-500">{post.category} · {ownerLabel}</p>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.location}</p>
        <p className="mt-1 text-xs text-slate-400">
          {getDateLabel(post)} {formatResultDate(post.date_occurred || post.created_at)}
        </p>
      </div>
    </a>
  );
}

export default function SearchPage() {
  const [filters, setFilters] = useState({
    keyword: '',
    category: '',
    location: '',
    date: '',
    type: '',
    status: '',
    scope: 'unsolved',
  });
  const [area, setArea] = useState('North');
  const [building, setBuilding] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('compact');
  const [openFilter, setOpenFilter] = useState('');
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, hasNextPage: false, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    api.get('/posts/categories')
      .then(({ data }) => setCategories(data.map(c => c.name)))
      .catch(() => {});
  }, []);

  const visiblePosts = useMemo(() => {
    if (sortBy === 'oldest') {
      return [...posts].reverse();
    }
    if (sortBy === 'relevance') {
      return [...posts].sort((firstPost, secondPost) => {
        const scoreDifference = getRelevanceScore(secondPost, filters.keyword) - getRelevanceScore(firstPost, filters.keyword);
        if (scoreDifference !== 0) return scoreDifference;
        return new Date(secondPost.created_at) - new Date(firstPost.created_at);
      });
    }
    return posts;
  }, [filters.keyword, posts, sortBy]);
  const calendarMonthLabel = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth);
  const calendarDays = getMonthDays(calendarMonth);
  const firstWeekday = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  const isNextMonthInFuture = nextMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const currentLocationDetails = building ? getLocationDetails(building) : [];

  async function runSearch(page = 1, nextFilters = filters) {
    const setLoading = page === 1 ? setIsLoading : setIsLoadingMore;
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/search', {
        params: { ...getActiveParams(nextFilters), page, limit: PAGE_SIZE },
      });

      setPosts((currentPosts) => (
        page === 1 ? data.items : [...currentPosts, ...data.items]
      ));
      setPagination(data.pagination);
    } catch {
      const fallbackData = searchMockPosts(nextFilters, page, PAGE_SIZE);
      setPosts((currentPosts) => (
        page === 1 ? fallbackData.items : [...currentPosts, ...fallbackData.items]
      ));
      setPagination(fallbackData.pagination);
      setError('');
    } finally {
      setLoading(false);
    }
  }

  function updateKeyword(event) {
    const nextFilters = { ...filters, keyword: event.target.value };
    setFilters(nextFilters);
  }

  function submitSearch(event) {
    event.preventDefault();
    runSearch(1, filters);
  }

  function selectCategory(category) {
    const nextFilters = { ...filters, category };
    setFilters(nextFilters);
    runSearch(1, nextFilters);
  }

  function selectPostFilter(filter) {
    const nextFilters = {
      ...filters,
      type: filter.params.type || '',
      status: filter.params.status || '',
      scope: filter.params.scope || '',
    };
    setFilters(nextFilters);
    runSearch(1, nextFilters);
  }

  function clearFilters() {
    const emptyFilters = {
      keyword: '',
      category: '',
      location: '',
      date: '',
      type: '',
      status: '',
      scope: 'unsolved',
    };
    setFilters(emptyFilters);
    setArea('North');
    setBuilding('');
    setLocationDetail('');
    setSortBy('newest');
    setOpenFilter('');
    runSearch(1, emptyFilters);
  }

  function applyLocation(nextArea = area, nextBuilding = building, nextLocationDetail = locationDetail) {
    let location = nextArea;
    if (nextArea && nextBuilding) {
      location = `${nextArea} - ${nextBuilding}`;
    }
    if (nextArea && nextBuilding && nextLocationDetail) {
      location = `${nextArea} - ${nextBuilding}, ${nextLocationDetail}`;
    }

    const nextFilters = {
      ...filters,
      location,
    };
    setFilters(nextFilters);
    runSearch(1, nextFilters);
  }

  function selectDate(day) {
    const selectedDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    if (selectedDate > today) return;

    const nextFilters = {
      ...filters,
      date: formatDateValue(selectedDate),
    };
    setFilters(nextFilters);
    runSearch(1, nextFilters);
  }

  useEffect(() => {
    let isActive = true;

    api.get('/search', {
      params: { scope: 'unsolved', page: 1, limit: PAGE_SIZE },
    })
      .then(({ data }) => {
        if (!isActive) return;
        setPosts(data.items);
        setPagination(data.pagination);
      })
      .catch(() => {
        if (!isActive) return;
        const fallbackData = getMockList(1, PAGE_SIZE);
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
  }, []);

  return (
    <MobileLayout>
      <section className="px-5 py-5">
        <form onSubmit={submitSearch}>
          <SearchField value={filters.keyword} onChange={updateKeyword} />
        </form>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { key: 'newest', label: 'Newest First', icon: SortDownIcon },
            { key: 'oldest', label: 'Oldest First', icon: SortUpIcon },
            { key: 'relevance', label: 'Relevance', icon: SparkIcon },
          ].map(({ key, label, icon: SortIcon }) => (
            <button
              key={key}
              className={`rounded-xl border px-2 py-2 text-xs font-medium ${
                sortBy === key
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
              type="button"
              onClick={() => setSortBy(key)}
            >
              <SortIcon className="mx-auto mb-1 h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {postFilters.map((filter) => (
            <button
              key={filter.label}
              className={`rounded-full px-1.5 py-2 text-[11px] font-semibold ${
                filters.type === (filter.params.type || '')
                  && filters.status === (filter.params.status || '')
                  && filters.scope === (filter.params.scope || '')
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
              type="button"
              onClick={() => selectPostFilter(filter)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { key: 'category', label: filters.category || 'Category', icon: TagIcon, selected: Boolean(filters.category) },
            { key: 'date', label: filters.date || 'Date', icon: CalendarIcon, selected: Boolean(filters.date) },
            { key: 'location', label: filters.location || 'Location', icon: LocationIcon, selected: Boolean(filters.location) },
          ].map(({ key, label, icon: FilterIcon, selected }) => (
            <button
              key={key}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                openFilter === key
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : selected
                    ? 'border-blue-100 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600'
              }`}
              type="button"
              onClick={() => setOpenFilter((currentFilter) => (currentFilter === key ? '' : key))}
            >
              <FilterIcon className="mx-auto mb-1 h-4 w-4" />
              <span className="block truncate">{label}</span>
            </button>
          ))}
          <button
            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600"
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>

        {openFilter && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            {openFilter === 'category' && (
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                value={filters.category}
                onChange={(event) => selectCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}

            {openFilter === 'date' && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <button
                    className="rounded-full p-1 text-slate-600"
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <h2 className="text-sm font-semibold text-slate-950">{calendarMonthLabel}</h2>
                  <button
                    className="rounded-full p-1 text-slate-600 disabled:text-slate-300"
                    type="button"
                    aria-label="Next month"
                    disabled={isNextMonthInFuture}
                    onClick={() => setCalendarMonth(nextMonth)}
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center">
                  {weekDays.map((day) => (
                    <div key={day} className="text-[11px] font-medium text-slate-400">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: firstWeekday }).map((_, index) => (
                    <div key={`blank-${index}`} />
                  ))}
                  {calendarDays.map((day) => {
                    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const isFuture = date > today;
                    const isSelected = filters.date === formatDateValue(date);

                    return (
                      <button
                        key={day}
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : isFuture
                              ? 'text-slate-300'
                              : 'text-slate-700'
                        }`}
                        type="button"
                        disabled={isFuture}
                        onClick={() => selectDate(day)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {openFilter === 'location' && (
              <div className="space-y-2">
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                value={area}
                onChange={(event) => {
                  const nextArea = event.target.value;
                  setArea(nextArea);
                  setBuilding('');
                  setLocationDetail('');
                  applyLocation(nextArea, '', '');
                }}
              >
                <option value="">Any area</option>
                {Object.keys(buildingsByArea).map((areaOption) => (
                  <option key={areaOption}>{areaOption}</option>
                ))}
              </select>
              {area && (
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                  value={building}
                  onChange={(event) => {
                    const nextBuilding = event.target.value;
                    setBuilding(nextBuilding);
                    setLocationDetail('');
                    applyLocation(area, nextBuilding, '');
                  }}
                >
                  <option value="">Any building in {area}</option>
                  {buildingsByArea[area].map((buildingOption) => (
                    <option key={buildingOption}>{buildingOption}</option>
                  ))}
                </select>
              )}
              {building && (
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                  value={locationDetail}
                  onChange={(event) => {
                    setLocationDetail(event.target.value);
                    applyLocation(area, building, event.target.value);
                  }}
                >
                  <option value="">Any floor / entrance</option>
                  {currentLocationDetails.map((locationDetailOption) => (
                    <option key={locationDetailOption}>{locationDetailOption}</option>
                  ))}
                </select>
              )}
            </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          {isLoading ? (
            <div className="space-y-5">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h2 className="text-lg font-semibold text-slate-950">No items found</h2>
              <p className="mt-2 text-sm text-slate-600">Try another keyword, date, category, or location.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">
                  {pagination.total} result{pagination.total === 1 ? '' : 's'}
                </span>
                <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {[
                    { key: 'large', label: 'Large' },
                    { key: 'compact', label: 'Compact' },
                    { key: 'list', label: 'List' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={`rounded-lg px-2 py-1.5 ${
                        viewMode === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                      }`}
                      type="button"
                      onClick={() => setViewMode(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={viewMode === 'large' ? 'space-y-6' : 'space-y-3'}>
                {visiblePosts.map((post) => (
                  <SearchResultCard key={post.id} post={post} viewMode={viewMode} />
                ))}
              </div>
            </>
          )}

          {pagination.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <button
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoadingMore}
                type="button"
                onClick={() => runSearch(pagination.page + 1)}
              >
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </section>
    </MobileLayout>
  );
}
