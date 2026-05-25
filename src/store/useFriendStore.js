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

  // FETCH REQUESTS
  fetchRequests: async () => {

    set({
      isLoadingRequests: true,
    });

    try {

      const response =
        await api.get('/friends/requests');

      set({
        incomingRequests:
          response.data.incoming || [],

        outgoingRequests:
          response.data.outgoing || [],

        isLoadingRequests: false,
      });

    } catch (error) {

      console.error(
        'Fetch requests error:',
        error.message
      );

      set({
        isLoadingRequests: false,
      });
    }
  },

  // SEND FRIEND REQUEST
  sendRequest: async (receiverId) => {

    try {

      const response =
        await api.post(
          '/friends/request',
          {
            receiverId,
          }
        );

      const newRequest =
        response.data.friendRequest;

      // Prevent duplicates
      set((state) => {

        const alreadyExists =
          state.outgoingRequests.some(
            (r) =>
              r._id === newRequest._id
          );

        if (alreadyExists) {
          return state;
        }

        return {
          outgoingRequests: [
            ...state.outgoingRequests,
            newRequest,
          ],
        };
      });

      toast.success(
        response.data.message ||
        'Friend request sent!'
      );

      return true;

    } catch (error) {

      const errorMsg =
        error.response?.data?.message ||
        'Failed to send request.';

      toast.error(errorMsg);

      return false;
    }
  },

  // RESPOND REQUEST
  respondRequest: async (
    requestId,
    action
  ) => {

    try {

      const response =
        await api.post(
          '/friends/respond',
          {
            requestId,
            action,
          }
        );

      // Remove request
      set((state) => ({
        incomingRequests:
          state.incomingRequests.filter(
            (r) => r._id !== requestId
          ),
      }));

      // Refresh friends only on accept
      if (action === 'accepted') {

        await useChatStore
          .getState()
          .fetchFriends();
      }

      toast.success(
        response.data.message
      );

      return true;

    } catch (error) {

      const errorMsg =
        error.response?.data?.message ||
        'Failed to respond to request.';

      toast.error(errorMsg);

      return false;
    }
  },

  // SEARCH USERS
  searchUsers: async (query) => {

    const cleanQuery =
      query?.trim();

    // Empty query
    if (!cleanQuery) {

      set({
        searchResults: [],
      });

      return;
    }

    // Prevent tiny searches
    if (cleanQuery.length < 2) {

      set({
        searchResults: [],
      });

      return;
    }

    set({
      isSearching: true,
    });

    try {

      const response =
        await api.get(
          `/users/search?query=${encodeURIComponent(
            cleanQuery
          )}`
        );

      set({
        searchResults:
          response.data.users || [],

        isSearching: false,
      });

    } catch (error) {

      console.error(
        'Search users error:',
        error.message
      );

      set({
        isSearching: false,
      });
    }
  },

  // ADD INCOMING REQUEST
  addIncomingRequest: (
    request
  ) => {

    set((state) => {

      // Prevent duplicates
      const alreadyExists =
        state.incomingRequests.some(
          (r) => r._id === request._id
        );

      if (alreadyExists) {
        return state;
      }

      return {
        incomingRequests: [
          request,
          ...state.incomingRequests,
        ],
      };
    });

    toast.success(
      `New friend request from ${request.sender.displayName}!`
    );
  },

  // REMOVE REQUEST
  removeRequestOnResponse: (
    requestId
  ) => {

    set((state) => ({

      incomingRequests:
        state.incomingRequests.filter(
          (r) => r._id !== requestId
        ),

      outgoingRequests:
        state.outgoingRequests.filter(
          (r) => r._id !== requestId
        ),
    }));
  },
}));