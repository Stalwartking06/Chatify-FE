import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';
import { useFriendStore } from '../store/useFriendStore.js';
import soundService from '../components/AudioNotification.js';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let reconnectSyncNeeded = false;

export const connectSocket = (token) => {
  if (socket?.connected) {
    return;
  }

  // If socket exists but disconnected, disconnect fully first
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: (cb) => {
      // Always fetch latest token dynamically from store to handle expiry on reconnect
      cb({ token: useAuthStore.getState().token });
    },
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  // CONNECT
  socket.on('connect', () => {
    if (import.meta.env.DEV) {
      console.log('Socket connected:', socket.id);
    }
    
    // If this is a reconnect, sync message history and friends
    if (reconnectSyncNeeded) {
      syncOnReconnect();
      reconnectSyncNeeded = false;
    }
  });

  // RECONNECTING / DISCONNECT
  socket.on('disconnect', (reason) => {
    if (import.meta.env.DEV) {
      console.log('Socket disconnected:', reason);
    }
    if (reason === 'io server disconnect' || reason === 'transport close') {
      reconnectSyncNeeded = true;
    }
  });

  // ONLINE USERS
  socket.on('online-users-list', (usersList) => {
    useChatStore.getState().setOnlineUsers(usersList);
  });

  // USER STATUS (online status of friends)
  socket.on('user-status', ({ userId, onlineStatus, lastSeen }) => {
    useChatStore.getState().setFriendOnline(userId, onlineStatus, lastSeen);
  });

  // NEW MESSAGE
  socket.on('new-message', (msg) => {
    const chatStore = useChatStore.getState();
    const selfId = useAuthStore.getState().user?._id;

    chatStore.addMessage(msg);

    const isSelf = msg.sender === selfId || msg.sender?._id === selfId;

    if (!isSelf) {
      soundService.playReceived();

      const activeChat = chatStore.activeChat;
      const isCurrentChat = activeChat?._id === (msg.sender?._id || msg.sender);
      const isVisible = document.visibilityState === 'visible';

      // Auto seen if open and active
      if (isCurrentChat && isVisible) {
        socket.emit('message-seen', {
          messageId: msg._id,
          senderId: msg.sender?._id || msg.sender,
        });
      } else {
        useAuthStore.getState().checkAndRefreshSession();
      }
    } else {
      soundService.playSent();
    }
  });

  // DELIVERED
  socket.on('message-delivered', ({ messageId, receiverId }) => {
    useChatStore.getState().messageDelivered({ messageId, receiverId });
  });

  // SEEN
  socket.on('message-seen', ({ messageId, receiverId }) => {
    useChatStore.getState().messageSeen({ messageId, receiverId });
  });

  // BULK SEEN
  socket.on('messages-seen', ({ senderId }) => {
    useChatStore.getState().messagesSeen({ senderId });
  });

  // TYPING START
  socket.on('typing-start', ({ senderId }) => {
    useChatStore.getState().setFriendTyping(senderId, true);
  });

  // TYPING STOP
  socket.on('typing-stop', ({ senderId }) => {
    useChatStore.getState().setFriendTyping(senderId, false);
  });

  // FRIEND REQUEST
  socket.on('friend-request-received', (request) => {
    useFriendStore.getState().addIncomingRequest(request);
    soundService.playAlert();
  });

  // REQUEST ACCEPTED
  socket.on('friend-request-accepted', ({ requestId, friend }) => {
    useChatStore.getState().fetchFriends();
    useFriendStore.getState().removeRequestOnResponse(requestId);
    soundService.playAlert();
    toast.success(`${friend.displayName} accepted your friend request!`, {
      icon: '🤝',
    });
  });

  // REQUEST REJECTED
  socket.on('friend-request-rejected', ({ requestId }) => {
    useFriendStore.getState().removeRequestOnResponse(requestId);
  });

  // MESSAGE EDITED
  socket.on('message-edited', ({ messageId, text, edited, editedAt }) => {
    useChatStore.getState().messageEdited({ messageId, text, edited, editedAt });
  });

  // MESSAGE DELETED
  socket.on('message-deleted', ({ messageId }) => {
    useChatStore.getState().messageDeleted({ messageId });
  });

  // FRIEND REMOVED
  socket.on('friend-removed', ({ friendId }) => {
    useChatStore.getState().handleFriendRemoved(friendId);
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

// Reconnect Recovery Sync Helper
const syncOnReconnect = () => {
  const activeChat = useChatStore.getState().activeChat;
  
  // Refresh friends list to check statuses and get latest messages
  useChatStore.getState().fetchFriends();
  useFriendStore.getState().fetchRequests();

  // If there's an active chat, reload its history to get any messages sent while offline
  if (activeChat) {
    useChatStore.getState().fetchMessages(activeChat._id);
  }
};

// EMIT WRAPPER ACTIONS
export const emitTypingStart = (receiverId) => {
  socket?.emit('typing-start', { receiverId });
};

export const emitTypingStop = (receiverId) => {
  socket?.emit('typing-stop', { receiverId });
};

export const emitMessageSeen = (senderId) => {
  socket?.emit('message-seen', { senderId });
};

export const getSocket = () => socket;
