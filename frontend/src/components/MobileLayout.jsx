import { NavLink } from 'react-router-dom';
import { HomeIcon, PlusIcon, SearchIcon, UserIcon } from './Icons';

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/search', label: 'Search', icon: SearchIcon },
  { to: '/posts/new', label: 'Post', icon: PlusIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-[74px] max-w-md items-center justify-center gap-3 px-5">
        <img
          alt="KAIST"
          className="h-8 w-24 shrink-0 object-contain"
          src="/kaist-logo.svg"
        />
        <div className="text-xl font-semibold tracking-normal text-slate-950">
          KAIST Lost & Found
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur sm:absolute sm:bottom-0">
      <div className="mx-auto grid h-24 max-w-md grid-cols-4 px-5 pb-4 pt-3">
        {navItems.map(({ to, label, icon: NavIcon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (
              `flex flex-col items-center justify-center gap-1 text-sm font-medium ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`
            )}
          >
            <NavIcon className="h-7 w-7" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function MobileLayout({ children, showHeader = true, showNav = true }) {
  return (
    <main className="min-h-screen bg-white text-slate-950 sm:flex sm:items-center sm:justify-center sm:bg-slate-50 sm:p-8">
      <div className="pointer-events-none hidden sm:absolute sm:bottom-3 sm:h-8 sm:w-[360px] sm:rounded-full sm:bg-slate-950/20 sm:blur-xl sm:content-['']" />
      <div className="relative mx-auto min-h-screen max-w-md bg-white shadow-none sm:h-[860px] sm:min-h-0 sm:w-[430px] sm:overflow-hidden sm:rounded-[3.25rem] sm:border-[14px] sm:border-slate-950 sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
        <div className="pointer-events-none absolute left-1/2 top-4 z-40 hidden h-7 w-32 -translate-x-1/2 rounded-full bg-slate-950 sm:block" />
        <div className="flex min-h-screen flex-col bg-white sm:h-full sm:min-h-0 sm:rounded-[2.35rem] sm:pt-12">
          {showHeader && <AppHeader />}
          <div className={`flex-1 sm:min-h-0 sm:overflow-y-auto ${showNav ? 'pb-28' : ''}`}>
            {children}
          </div>
        </div>
        {showNav && <BottomNav />}
      </div>
    </main>
  );
}
