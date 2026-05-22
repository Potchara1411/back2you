import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const linkClass = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 text-xs px-3 py-1 rounded-md transition-colors ${
      isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-blue-500'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-16 z-50">
      <NavLink to="/" end className={linkClass}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25h-7.5V21.75H3.75A.75.75 0 013 21V9.75z" />
        </svg>
        Home
      </NavLink>

      <NavLink to="/search" className={linkClass}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
        </svg>
        Search
      </NavLink>

      <NavLink to="/posts/new" className={linkClass}>
        <span className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md -mt-5">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
        <span className="mt-0.5">Post</span>
      </NavLink>

      <NavLink to="/profile" className={linkClass}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        Profile
      </NavLink>

      <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 text-xs px-3 py-1 text-gray-500 hover:text-red-500 transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        Logout
      </button>
    </nav>
  );
}
