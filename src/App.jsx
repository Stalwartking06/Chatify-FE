import { Toaster } from 'react-hot-toast';

import {
  Suspense,
  lazy,
  useEffect,
} from 'react';

import { useAuthStore } from './store/useAuthStore.js';

import { useSocket } from './hooks/useSocket.js';

const AppRoutes = lazy(() =>
  import('./routes/AppRoutes.jsx')
);

const App = () => {

  // Select only needed state
  const isLoading =
    useAuthStore(
      (state) => state.isLoading
    );

  // Init socket
  useSocket();

  // Auth check once
  useEffect(() => {

    useAuthStore
      .getState()
      .checkAuth();

  }, []);

  // APP LOADER
  if (isLoading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">

        <div className="flex flex-col items-center space-y-4">

          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">

            <span className="text-white font-extrabold text-xl">
              C
            </span>
          </div>

          {/* Spinner */}
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

        </div>
      </div>
    );
  }

  return (
    <>

      {/* TOASTS */}
      <Toaster
        position="top-center"

        gutter={8}

        containerStyle={{
          top: 20,
        }}

        toastOptions={{

          duration: 2500,

          style: {
            background: '#0f172a',
            color: '#f3f4f6',
            border:
              '1px solid rgba(255,255,255,0.08)',

            borderRadius: '16px',

            fontSize: '12px',

            padding: '10px 14px',

            maxWidth: '90vw',
          },
        }}
      />

      {/* ROUTES */}
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">

            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

          </div>
        }
      >
        <AppRoutes />
      </Suspense>
    </>
  );
};

export default App;