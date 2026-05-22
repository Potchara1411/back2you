import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import CreatePostPage from './pages/CreatePostPage';
import PostDetailPage from './pages/PostDetailPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

function AppLayout({ children }) {
  return (
    <>
      {children}
      <Navbar />
    </>
  );
}

function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <AppLayout><HomePage /></AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><AppLayout><SearchPage /></AppLayout></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><AppLayout><CreatePostPage /></AppLayout></ProtectedRoute>} />
          <Route path="/posts/new" element={<ProtectedRoute><AppLayout><CreatePostPage /></AppLayout></ProtectedRoute>} />
          <Route path="/post/:id" element={<ProtectedRoute><AppLayout><PostDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/posts/:id" element={<ProtectedRoute><AppLayout><PostDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminPage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
