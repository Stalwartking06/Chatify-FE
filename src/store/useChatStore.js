import { create } from 'zustand';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { useAuthStore } from './useAuthStore.js';

export const useChatStore = create((set, get) => ({

  activeChat: null,

  messages: [],

  friends: [],

  onlineUsers: [],

  typingUsers: {},

  unreadCounts: {},

  isChatLoading: false,

  setFriends: (friends) => {
    set({ friends });
  },

  // ACTIVE CHAT
  setActiveChat: async (friend) => {

    if (!friend) {
      set({
        activeChat: null,
        messages: [],
      });

      return;
    }

    set((state) => ({
      activeChat: friend,

      unreadCounts: {
        ...state.unreadCounts,
        [friend._id]: 0,
      },
    }));

    // Fetch messages
    await get().fetchMessages(friend._id);
  },

  // FETCH FRIENDS
  fetchFriends: async () => {

    try {

      const response =
        await api.get('/friends/list');

      const friends =
        response.data.friends || [];

      // Sort once only
      friends.sort((a, b) => {

        const timeA = new Date(
          a.lastMessage?.createdAt ||
          a.updatedAt ||
          0
        ).getTime();

        const timeB = new Date(
          b.lastMessage?.createdAt ||
          b.updatedAt ||
          0
        ).getTime();

        return timeB - timeA;
      });

      set({
        friends,
      });

    } catch (error) {

      console.error(
        'Fetch friends error:',
        error.message
      );
    }
  },

  // FETCH MESSAGES
  fetchMessages: async (friendId) => {

    set({
      isChatLoading: true,
    });

    try {

      const response =
        await api.get(
          `/messages/history/${friendId}`
        );

      set({
        messages:
          response.data.messages || [],
        isChatLoading: false,
      });

    } catch (error) {

      console.error(
        'Fetch messages error:',
        error.message
      );

      set({
        isChatLoading: false,
      });

      toast.error(
        'Failed to load message history.'
      );
    }
  },

  // SEND MESSAGE
  sendMessage: async (
    friendId,
    text,
    imageFile
  ) => {

    try {

      const formData = new FormData();

      formData.append(
        'receiverId',
        friendId
      );

      if (text?.trim()) {
        formData.append(
          'text',
          text.trim()
        );
      }

      if (imageFile) {
        formData.append(
          'image',
          imageFile
        );
      }

      await api.post(
        '/messages/send',
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      // Socket will handle realtime insert
      return true;

    } catch (error) {

      const errorMsg =
        error.response?.data?.message ||
        'Failed to send message.';

      toast.error(errorMsg);

      return false;
    }
  },

  // ADD MESSAGE
  addMessage: (msg) => {

    const state = get();

    const {
      activeChat,
      unreadCounts,
      friends,
    } = state;

    const selfId =
      useAuthStore.getState().user?._id;

    // Prevent duplicates
    const alreadyExists =
      state.messages.some(
        (m) => m._id === msg._id
      );

    if (alreadyExists) {
      return;
    }

    const senderId =
      msg.sender?._id ||
      msg.sender;

    const receiverId =
      msg.receiver?._id ||
      msg.receiver;

    const friendId =
      senderId === selfId
        ? receiverId
        : senderId;

    const isCurrentChat =
      activeChat?._id === friendId;

    // Update unread counts
    const updatedUnreadCounts = {
      ...unreadCounts,
    };

    if (
      !isCurrentChat &&
      senderId !== selfId
    ) {
      updatedUnreadCounts[friendId] =
        (updatedUnreadCounts[
          friendId
        ] || 0) + 1;
    }

    // Update friends
    let updatedFriends =
      friends.map((friend) => {

        if (friend._id === friendId) {

          return {
            ...friend,
            lastMessage: msg,
            updatedAt:
              msg.createdAt,
          };
        }

        return friend;
      });

    // Sort only once
    updatedFriends.sort((a, b) => {

      const timeA = new Date(
        a.lastMessage?.createdAt ||
        a.updatedAt ||
        0
      ).getTime();

      const timeB = new Date(
        b.lastMessage?.createdAt ||
        b.updatedAt ||
        0
      ).getTime();

      return timeB - timeA;
    });

    set((state) => ({

      messages: isCurrentChat
        ? [...state.messages, msg]
        : state.messages,

      unreadCounts:
        updatedUnreadCounts,

      friends:
        updatedFriends,
    }));
  },

  // ONLINE USERS
  setOnlineUsers: (users) => {

    set({
      onlineUsers:
        [...new Set(users)],
    });
  },

  // FRIEND ONLINE STATUS
  setFriendOnline: (
    userId,
    onlineStatus,
    lastSeen
  ) => {

    set((state) => {

      const onlineUsers =
        onlineStatus
          ? [
              ...new Set([
                ...state.onlineUsers,
                userId,
              ]),
            ]
          : state.onlineUsers.filter(
              (id) => id !== userId
            );

      return {

        onlineUsers,

        friends:
          state.friends.map((f) => {

            if (f._id === userId) {

              return {
                ...f,
                onlineStatus,
                lastSeen,
              };
            }

            return f;
          }),

        activeChat:
          state.activeChat?._id ===
          userId
            ? {
                ...state.activeChat,
                onlineStatus,
                lastSeen,
              }
            : state.activeChat,
      };
    });
  },

  // TYPING STATUS
  setFriendTyping: (
    userId,
    isTyping
  ) => {

    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: isTyping,
      },
    }));
  },

  // MESSAGE DELIVERED
  messageDelivered: ({
    messageId,
  }) => {

    set((state) => ({
      messages:
        state.messages.map((m) => {

          if (m._id === messageId) {

            return {
              ...m,
              status: 'delivered',
            };
          }

          return m;
        }),
    }));
  },

  // MESSAGE SEEN
  messageSeen: ({
    messageId,
  }) => {

    set((state) => ({
      messages:
        state.messages.map((m) => {

          if (m._id === messageId) {

            return {
              ...m,
              status: 'seen',
            };
          }

          return m;
        }),
    }));
  },

  // BULK SEEN
  messagesSeen: ({
    senderId,
  }) => {

    set((state) => ({
      messages:
        state.messages.map((m) => {

          const receiver =
            m.receiver?._id ||
            m.receiver;

          if (receiver === senderId) {

            return {
              ...m,
              status: 'seen',
            };
          }

          return m;
        }),
    }));
  },
}));