import { create } from 'zustand';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export const useChatStore = create((set, get) => ({
  activeChat: null,
  messages: [],
  friends: [],
  onlineUsers: [],
  typingUsers: {}, // Map of userId -> boolean
  unreadCounts: {}, // Map of userId -> count
  isChatLoading: false,

  setFriends: (friends) => set({ friends }),
  
  setActiveChat: (friend) => {
    set({ activeChat: friend });
    if (friend) {
      // Clear unread counts
      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [friend._id]: 0 },
      }));
      // Fetch conversation history
      get().fetchMessages(friend._id);
    } else {
      set({ messages: [] });
    }
  },

  fetchFriends: async () => {
    try {
      const response = await api.get('/friends/list');
      set({ friends: response.data.friends });
    } catch (error) {
      console.error('Fetch friends error:', error);
    }
  },

  fetchMessages: async (friendId) => {
    set({ isChatLoading: true });
    try {
      const response = await api.get(`/messages/history/${friendId}`);
      set({ messages: response.data.messages, isChatLoading: false });
    } catch (error) {
      console.error('Fetch messages error:', error);
      set({ isChatLoading: false });
      toast.error('Failed to load message history.');
    }
  },

  sendMessage: async (friendId, text, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('receiverId', friendId);
      if (text) formData.append('text', text);
      if (imageFile) formData.append('image', imageFile);

      const response = await api.post('/messages/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // The new message is returned. Note: our socket handler also broadcasts this
      // back to the sender, but we can append it directly or let the socket handler
      // append it when it receives it. To prevent duplication, we let the socket handle it,
      // OR we add it locally immediately and check for duplicates. Adding it via socket only
      // is clean, but adding locally immediately feels faster.
      // Let's check for duplicates inside addMessage to get instant UI response without duplication!
      const newMsg = response.data.message;
      get().addMessage(newMsg);
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send message.';
      toast.error(errorMsg);
      return false;
    }
  },

  addMessage: (msg) => {
    const { messages, activeChat, unreadCounts } = get();
    
    // Avoid appending duplicate messages
    if (messages.some((m) => m._id === msg._id)) {
      return;
    }

    const isCurrentActiveChat = activeChat && (activeChat._id === msg.sender._id || activeChat._id === msg.receiver._id);

    if (isCurrentActiveChat) {
      set({ messages: [...messages, msg] });
    } else if (msg.sender._id !== useAuthStore.getState().user?._id) {
      // Message is from another friend and not sent by self: Increment unread count
      const senderId = msg.sender._id;
      const currentCount = unreadCounts[senderId] || 0;
      set({
        unreadCounts: {
          ...unreadCounts,
          [senderId]: currentCount + 1,
        },
      });
      
      // Update last message preview in friends list
      set((state) => ({
        friends: state.friends.map((f) => {
          if (f._id === senderId) {
            return { ...f, lastMessage: msg };
          }
          return f;
        }),
      }));
    }
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setFriendOnline: (userId, onlineStatus, lastSeen) => {
    set((state) => ({
      onlineUsers: onlineStatus
        ? [...new Set([...state.onlineUsers, userId])]
        : state.onlineUsers.filter((id) => id !== userId),
      friends: state.friends.map((f) => {
        if (f._id === userId) {
          return { ...f, onlineStatus, lastSeen };
        }
        return f;
      }),
      activeChat: state.activeChat?._id === userId 
        ? { ...state.activeChat, onlineStatus, lastSeen }
        : state.activeChat
    }));
  },

  setFriendTyping: (userId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: isTyping,
      },
    }));
  },

  messageDelivered: ({ messageId, receiverId }) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m._id === messageId) {
          return { ...m, status: 'delivered' };
        }
        return m;
      }),
    }));
  },

  messageSeen: ({ messageId, receiverId }) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m._id === messageId) {
          return { ...m, status: 'seen' };
        }
        return m;
      }),
    }));
  },

  messagesSeen: ({ senderId }) => {
    // If the active chat is with the user whose messages were seen, update all sent messages
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.receiver === senderId || m.receiver?._id === senderId) {
          return { ...m, status: 'seen' };
        }
        return m;
      }),
    }));
  },
}));
