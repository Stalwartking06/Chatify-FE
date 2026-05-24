import { create } from 'zustand';
import api from '../services/api.js';
import { useChatStore } from './useChatStore.js';
import toast from 'react-hot-toast';

export const useFriendStore = create((set, get) => ({
  incomingRequests: [],
  outgoingRequests: [],
  searchResults: [],
  isLoadingRequests: false,
  isSearching: false,

  fetchRequests: async () => {
    set({ isLoadingRequests: true });
    try {
      const response = await api.get('/friends/requests');
      set({
        incomingRequests: response.data.incoming,
        outgoingRequests: response.data.outgoing,
        isLoadingRequests: false,
      });
    } catch (error) {
      console.error('Fetch requests error:', error);
      set({ isLoadingRequests: false });
    }
  },

  sendRequest: async (receiverId) => {
    try {
      const response = await api.post('/friends/request', { receiverId });
      toast.success(response.data.message || 'Friend request sent!');
      
      // Update outgoing requests list
      set((state) => ({
        outgoingRequests: [...state.outgoingRequests, response.data.friendRequest],
      }));
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send request.';
      toast.error(errorMsg);
      return false;
    }
  },

  respondRequest: async (requestId, action) => {
    try {
      const response = await api.post('/friends/respond', { requestId, action });
      toast.success(response.data.message);

      // Remove from incoming requests list
      set((state) => ({
        incomingRequests: state.incomingRequests.filter((r) => r._id !== requestId),
      }));

      // If accepted, fetch updated friends list in useChatStore
      if (action === 'accepted') {
        useChatStore.getState().fetchFriends();
      }
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to respond to request.';
      toast.error(errorMsg);
      return false;
    }
  },

  searchUsers: async (query) => {
    if (!query || query.trim() === '') {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const response = await api.get(`/users/search?query=${query}`);
      set({ searchResults: response.data.users, isSearching: false });
    } catch (error) {
      console.error('Search users error:', error);
      set({ isSearching: false });
    }
  },

  addIncomingRequest: (request) => {
    set((state) => ({
      incomingRequests: [...state.incomingRequests, request],
    }));
    toast.success(`New friend request from ${request.sender.displayName}!`);
  },

  removeRequestOnResponse: (requestId) => {
    set((state) => ({
      incomingRequests: state.incomingRequests.filter((r) => r._id !== requestId),
      outgoingRequests: state.outgoingRequests.filter((r) => r._id !== requestId),
    }));
  },
}));
