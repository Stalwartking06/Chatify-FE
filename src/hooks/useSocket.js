import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';
import { useFriendStore } from '../store/useFriendStore.js';
import soundService from '../components/AudioNotification.js';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const { user, token, isAuthenticated } = useAuthStore();
  const {
    addMessage,
    setOnlineUsers,
    setFriendOnline,
    setFriendTyping,
    messageDelivered,
    messageSeen,
    messagesSeen,
    activeChat,
    fetchFriends,
  } = useChatStore();
  
  const {
    addIncomingRequest,
    removeRequestOnResponse,
  } = useFriendStore();

  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize socket connection with token
    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
    });

    // Real-time online list sync
    socket.on('online-users-list', (usersList) => {
      setOnlineUsers(usersList);
    });

    // Individual friend status updates
    socket.on('user-status', ({ userId, onlineStatus, lastSeen }) => {
      setFriendOnline(userId, onlineStatus, lastSeen);
    });

    // Receives a new message (either from self on another tab, or from a friend)
    socket.on('new-message', (msg) => {
      addMessage(msg);

      // Handle sound play and seen status
      const isSelf = msg.sender._id === user._id;
      if (!isSelf) {
        // Always play received sound for any incoming message
        soundService.playReceived();

        const isCurrentActiveChat = activeChat && activeChat._id === msg.sender._id;
        const isUserOnChat = isCurrentActiveChat && document.visibilityState === 'visible';
        
        if (isUserOnChat) {
          // Emit seen event immediately back to the sender
          socket.emit('message-seen', { messageId: msg._id, senderId: msg.sender._id });
        } else {
          // Check session token status and refresh if close to expiration
          useAuthStore.getState().checkAndRefreshSession();
        }
      } else {
        // Play click sound when user sends a message
        soundService.playSent();
      }
    });

    // Message ticks updates
    socket.on('message-delivered', ({ messageId, receiverId }) => {
      messageDelivered({ messageId, receiverId });
    });

    socket.on('message-seen', ({ messageId, receiverId }) => {
      messageSeen({ messageId, receiverId });
    });

    socket.on('messages-seen', ({ senderId }) => {
      messagesSeen({ senderId });
    });

    // Typing states
    socket.on('typing-start', ({ senderId }) => {
      setFriendTyping(senderId, true);
    });

    socket.on('typing-stop', ({ senderId }) => {
      setFriendTyping(senderId, false);
    });

    // Friend requests notifications
    socket.on('friend-request-received', (request) => {
      addIncomingRequest(request);
      soundService.playAlert();
    });

    socket.on('friend-request-accepted', ({ requestId, friend }) => {
      // Re-fetch friends list, update states
      fetchFriends();
      removeRequestOnResponse(requestId);
      soundService.playAlert();
      toast.success(`${friend.displayName} accepted your friend request!`, { icon: '🤝' });
    });

    socket.on('friend-request-rejected', ({ requestId }) => {
      removeRequestOnResponse(requestId);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    return () => {
      socket.off('connect');
      socket.off('online-users-list');
      socket.off('user-status');
      socket.off('new-message');
      socket.off('message-delivered');
      socket.off('message-seen');
      socket.off('messages-seen');
      socket.off('typing-start');
      socket.off('typing-stop');
      socket.off('friend-request-received');
      socket.off('friend-request-accepted');
      socket.off('friend-request-rejected');
      socket.off('disconnect');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    isAuthenticated,
    token,
    user?._id,
    activeChat?._id,
    addMessage,
    setOnlineUsers,
    setFriendOnline,
    setFriendTyping,
    messageDelivered,
    messageSeen,
    messagesSeen,
    addIncomingRequest,
    removeRequestOnResponse,
    fetchFriends,
  ]);

  // Utility emit commands to call from views
  const emitTypingStart = (receiverId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-start', { receiverId });
    }
  };

  const emitTypingStop = (receiverId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-stop', { receiverId });
    }
  };

  const emitMessageSeen = (senderId) => {
    if (socketRef.current) {
      socketRef.current.emit('message-seen', { senderId });
    }
  };

  return {
    socket: socketRef.current,
    emitTypingStart,
    emitTypingStop,
    emitMessageSeen,
  };
};
