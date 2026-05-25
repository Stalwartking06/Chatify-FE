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

  hasMoreMessages: false,

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
  fetchMessages: async (friendId, before = null) => {

    if (!before) {
      set({
        isChatLoading: true,
        messages: [],
      });
    }

    try {

      const url = `/messages/history/${friendId}${
        before ? `?before=${encodeURIComponent(before)}` : ''
      }`;
      const response = await api.get(url);

      const fetchedMessages =
        response.data.messages || [];

      set((state) => {
        const newMessages = before
          ? [...fetchedMessages, ...state.messages]
          : fetchedMessages;
        return {
          messages: newMessages,
          isChatLoading: false,
          hasMoreMessages: fetchedMessages.length === 50,
        };
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

    const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const selfUser = useAuthStore.getState().user;

    // Optimistically insert temporary message for instant UI rendering
    const optimisticMessage = {
      _id: `temp-${clientMessageId}`,
      sender: {
        _id: selfUser?._id,
        username: selfUser?.username,
        displayName: selfUser?.displayName,
        avatar: selfUser?.avatar,
      },
      receiver: {
        _id: friendId,
      },
      text: text?.trim() || '',
      image: imageFile ? URL.createObjectURL(imageFile) : '',
      status: 'sent',
      clientMessageId,
      isOptimistic: true,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {

      const formData = new FormData();

      formData.append(
        'receiverId',
        friendId
      );

      formData.append(
        'clientMessageId',
        clientMessageId
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

      return true;

    } catch (error) {

      // Remove optimistic message on failure (rollback)
      set((state) => ({
        messages: state.messages.filter(
          (m) => m.clientMessageId !== clientMessageId
        ),
      }));

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

    // Prevent duplicates by DB ID
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

    // Resolve optimistic UI message
    let optimisticFound = false;
    let updatedMessages = state.messages;

    if (msg.clientMessageId && isCurrentChat) {
      updatedMessages = state.messages.map((m) => {
        if (m.clientMessageId === msg.clientMessageId) {
          optimisticFound = true;
          return {
            ...msg,
            image: msg.image || m.image, // retain object URL if uploaded
          };
        }
        return m;
      });
    }

    if (!optimisticFound && isCurrentChat) {
      updatedMessages = [...state.messages, msg];
    }

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

    // Sort friends list by latest message timestamp
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

    set({
      messages: updatedMessages,
      unreadCounts:
        updatedUnreadCounts,
      friends:
        updatedFriends,
    });
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