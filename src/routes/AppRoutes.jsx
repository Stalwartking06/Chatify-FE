import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';
import { PageLoader } from '../components/SkeletonLoader.jsx';
// Lazy loading pages for code splitting and optimized rendering
const Chat = lazy(() => import('../pages/Chat.jsx'));
const Profile = lazy(() => import('../pages/Profile.jsx'));
const Login = lazy(() => import('../pages/Login.jsx'));
const Register = lazy(() => import('../pages/Register.jsx'));

// Route guard for authenticated users
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
 if (isLoading) {
  return <PageLoader text="Securing connection..." />;
}

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Route guard for unauthenticated users (redirects to home if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
if (isLoading) {
  return <PageLoader />;
}
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        {/* Wildcard redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
