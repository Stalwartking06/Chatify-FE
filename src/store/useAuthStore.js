import { create } from 'zustand';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { connectSocket, disconnectSocket } from '../socket/socketService.js';

let isRefreshing = false;

export const useAuthStore = create((set, get) => ({

  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  blockedUsers: [],

  setToken: (token) => {
    set({ token });
  },

  loadBlockedUsers: () => {
    const user = get().user;
    if (user) {
      const stored = localStorage.getItem(`blocked_users_${user._id}`);
      if (stored) {
        set({ blockedUsers: JSON.parse(stored) });
      } else {
        set({ blockedUsers: [] });
      }
    }
  },

  // CHECK AUTH
  checkAuth: async () => {

    try {

      const response = await api.get('/auth/me');

      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      connectSocket(get().token);
      get().loadBlockedUsers();

    } catch (error) {

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          'App authentication boot check: user not logged in.'
        );
      }
    }
  },

  // LOGIN
  login: async (emailOrUsername, password) => {

    try {

      const response = await api.post('/auth/login', {
        emailOrUsername,
        password,
      });

      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
      });

      toast.success(
        response.data.message || 'Logged in successfully!'
      );

      connectSocket(response.data.token);
      get().loadBlockedUsers();

      return true;

    } catch (error) {

      const errorMsg =
        error.response?.data?.message ||
        'Login failed. Please check your credentials.';

      toast.error(errorMsg);

      return false;
    }
  },

  // REGISTER
  register: async (
    username,
    email,
    password,
    displayName
  ) => {

    try {

      const response = await api.post('/auth/register', {
        username,
        email,
        password,
        displayName,
      });

      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
      });

      toast.success(
        response.data.message || 'Registration successful!'
      );

      connectSocket(response.data.token);
      get().loadBlockedUsers();

      return true;

    } catch (error) {

      const errorMsg =
        error.response?.data?.message ||
        'Registration failed.';

      toast.error(errorMsg);

      return false;
    }
  },

  // LOGOUT
  logout: async () => {

    try {

      await api.post('/auth/logout');

    } catch (error) {

      if (process.env.NODE_ENV !== 'production') {
        console.error(
          'Logout error on server:',
          error.message
        );
      }

    } finally {

      disconnectSocket();

      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });

      toast.success('Logged out successfully');
    }
  },

  // UPDATE PROFILE
  updateProfile: async (formData) => {

    try {

      const response = await api.put(
        '/users/update',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      set({
        user: response.data.user,
      });

      toast.success(
        'Profile updated successfully!'
      );

      return true;

    } catch (error) {

      const errorMsg =
        error.response?.data?.message ||
        'Failed to update profile.';

      toast.error(errorMsg);

      return false;
    }
  },

  // SESSION REFRESH
  checkAndRefreshSession: async () => {

    const { token, logout } = get();

    // Prevent duplicate refresh
    if (!token || isRefreshing) {
      return;
    }

    try {

      const payload = jwtDecode(token);

      const currentTime = Math.floor(Date.now() / 1000);

      const timeToExpire =
        payload.exp - currentTime;

      // Already expired
      if (timeToExpire <= 0) {

        toast.error(
          'Session expired. Please login again.',
          {
            id: 'session-alert',
          }
        );

        await logout();

        return;
      }

      // Refresh only near expiry
      if (timeToExpire <= 300) {

        isRefreshing = true;

        try {

          const response = await axios.post(
            `${
              import.meta.env.VITE_API_URL ||
              'http://localhost:5000/api'
            }/auth/refresh`,
            {},
            {
              withCredentials: true,
            }
          );

          const newToken = response.data.token;

          set({
            token: newToken,
          });

        } catch (error) {

          toast.error(
            'Session expired. Please login again.',
            {
              id: 'session-alert',
            }
          );

          await logout();

        } finally {

          isRefreshing = false;
        }
      }

    } catch (error) {

      if (process.env.NODE_ENV !== 'production') {
        console.error(
          'Session validation failed:',
          error.message
        );
      }
    }
  },

  blockUser: async (targetUser) => {
    const toastId = toast.loading('Updating...');
    try {
      const response = await api.post('/users/block', { userId: targetUser._id });
      
      const user = get().user;
      if (user) {
        const updatedBlocked = [...get().blockedUsers, targetUser];
        localStorage.setItem(`blocked_users_${user._id}`, JSON.stringify(updatedBlocked));
        set({ blockedUsers: updatedBlocked });
      }

      toast.success('User blocked', { id: toastId });

      const { useChatStore } = await import('./useChatStore.js');
      useChatStore.getState().handleFriendRemoved(targetUser._id);

      return true;
    } catch (error) {
      toast.error('Failed to block user', { id: toastId });
      return false;
    }
  },

  unblockUser: async (targetUserId) => {
    const toastId = toast.loading('Updating...');
    try {
      const response = await api.post('/users/unblock', { userId: targetUserId });

      const user = get().user;
      if (user) {
        const updatedBlocked = get().blockedUsers.filter(u => u._id !== targetUserId);
        localStorage.setItem(`blocked_users_${user._id}`, JSON.stringify(updatedBlocked));
        set({ blockedUsers: updatedBlocked });
      }

      toast.success('User unblocked', { id: toastId });
      return true;
    } catch (error) {
      toast.error('Failed to unblock user', { id: toastId });
      return false;
    }
  },
}));