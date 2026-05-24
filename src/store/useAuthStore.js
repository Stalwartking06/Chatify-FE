import { create } from 'zustand';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import axios from 'axios';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setToken: (token) => set({ token }),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // Fetch authenticated user profile (interceptor handles refresh if expired)
      const response = await api.get('/auth/me');
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.log('App authentication boot check: user not logged in.');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  login: async (emailOrUsername, password) => {
    try {
      const response = await api.post('/auth/login', { emailOrUsername, password });
      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
      });
      toast.success(response.data.message || 'Logged in successfully!');
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg);
      return false;
    }
  },

  register: async (username, email, password, displayName) => {
    try {
      const response = await api.post('/auth/register', { username, email, password, displayName });
      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
      });
      toast.success(response.data.message || 'Registration successful!');
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed.';
      toast.error(errorMsg);
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error on server:', error);
    } finally {
      // Always clear frontend states even if server logout fails (e.g. offline status)
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      toast.success('Logged out successfully');
    }
  },

  updateProfile: async (formData) => {
    try {
      const response = await api.put('/users/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      set({ user: response.data.user });
      toast.success('Profile updated successfully!');
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to update profile.';
      toast.error(errorMsg);
      return false;
    }
  },

  checkAndRefreshSession: async () => {
    const { token, logout } = get();
    if (!token) return;
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeToExpire = payload.exp - currentTime; // in seconds

      if (timeToExpire <= 300) {
        if (timeToExpire <= 0) {
          toast.error('Your session has expired. Logging out...', { id: 'session-alert' });
          logout();
          return;
        }

        const toastId = toast.loading('Session is about to expire. Refreshing...', { id: 'session-alert' });
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          const { token: newToken } = response.data;
          set({ token: newToken });
          toast.success('Session renewed successfully!', { id: 'session-alert' });
        } catch (refreshError) {
          toast.error('Session expired. Please log in again.', { id: 'session-alert' });
          logout();
        }
      }
    } catch (e) {
      console.error('Error verifying token expiration:', e);
    }
  },
}));
