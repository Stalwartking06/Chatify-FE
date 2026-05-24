import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore.js';
import { useSocket } from './hooks/useSocket.js';
import AppRoutes from './routes/AppRoutes.jsx';

const App = () => {
  const { checkAuth, isLoading } = useAuthStore();
  
  // Initialize Socket.io listener (triggers connection on auth and binds events)
  const { socket } = useSocket();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center space-y-4">
          {/* Pulsing loading logo */}
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
            <span className="text-white font-extrabold text-xl">C</span>
          </div>
          <div className="w-10 h-1 border-t-2 border-blue-500 rounded animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Toast Notifications Provider */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f3f4f6',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            fontSize: '12px',
          },
        }}
      />
      
      {/* Layout Routes */}
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
