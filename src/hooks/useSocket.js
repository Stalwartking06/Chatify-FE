import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';
import { useFriendStore } from '../store/useFriendStore.js';

import soundService from '../components/AudioNotification.js';

import toast from 'react-hot-toast';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:5000';

export const useSocket = () => {

  const user =
    useAuthStore((state) => state.user);

  const token =
    useAuthStore((state) => state.token);

  const isAuthenticated =
    useAuthStore(
      (state) => state.isAuthenticated
    );

  const socketRef = useRef(null);

  // Keep latest active chat without rerenders
  const activeChatRef = useRef(null);

  // Sync active chat ref
  useEffect(() => {

    const unsubscribe =
      useChatStore.subscribe(
        (state) => {
          activeChatRef.current =
            state.activeChat;
        }
      );

    return unsubscribe;

  }, []);

  useEffect(() => {

    // Disconnect if not authenticated
    if (
      !isAuthenticated ||
      !token ||
      !user
    ) {

      if (socketRef.current) {

        socketRef.current.disconnect();

        socketRef.current = null;
      }

      return;
    }

    // Prevent duplicate sockets
    if (socketRef.current?.connected) {
      return;
    }

    // Create socket
    const socket = io(
      SOCKET_URL,
      {
        auth: {
          token,
        },

        withCredentials: true,

        transports: [
          'websocket',
        ],

        reconnection: true,

        reconnectionAttempts: 5,

        reconnectionDelay: 1000,
      }
    );

    socketRef.current = socket;

    // CONNECT
    socket.on(
      'connect',
      () => {

        if (
          import.meta.env.DEV
        ) {
          console.log(
            'Socket connected:',
            socket.id
          );
        }
      }
    );

    // ONLINE USERS
    socket.on(
      'online-users-list',
      (usersList) => {

        useChatStore
          .getState()
          .setOnlineUsers(
            usersList
          );
      }
    );

    // USER STATUS
    socket.on(
      'user-status',
      ({
        userId,
        onlineStatus,
        lastSeen,
      }) => {

        useChatStore
          .getState()
          .setFriendOnline(
            userId,
            onlineStatus,
            lastSeen
          );
      }
    );

    // NEW MESSAGE
    socket.on(
      'new-message',
      (msg) => {

        useChatStore
          .getState()
          .addMessage(msg);

        const isSelf =
          msg.sender._id ===
          user._id;

        // RECEIVED
        if (!isSelf) {

          soundService.playReceived();

          const activeChat =
            activeChatRef.current;

          const isCurrentChat =
            activeChat?._id ===
            msg.sender._id;

          const isVisible =
            document.visibilityState ===
            'visible';

          // Auto seen
          if (
            isCurrentChat &&
            isVisible
          ) {

            socket.emit(
              'message-seen',
              {
                messageId:
                  msg._id,

                senderId:
                  msg.sender._id,
              }
            );
          }

          // Refresh session silently
          else {

            useAuthStore
              .getState()
              .checkAndRefreshSession();
          }
        }

        // SENT
        else {

          soundService.playSent();
        }
      }
    );

    // DELIVERED
    socket.on(
      'message-delivered',
      ({
        messageId,
        receiverId,
      }) => {

        useChatStore
          .getState()
          .messageDelivered({
            messageId,
            receiverId,
          });
      }
    );

    // SEEN
    socket.on(
      'message-seen',
      ({
        messageId,
        receiverId,
      }) => {

        useChatStore
          .getState()
          .messageSeen({
            messageId,
            receiverId,
          });
      }
    );

    // BULK SEEN
    socket.on(
      'messages-seen',
      ({
        senderId,
      }) => {

        useChatStore
          .getState()
          .messagesSeen({
            senderId,
          });
      }
    );

    // TYPING START
    socket.on(
      'typing-start',
      ({
        senderId,
      }) => {

        useChatStore
          .getState()
          .setFriendTyping(
            senderId,
            true
          );
      }
    );

    // TYPING STOP
    socket.on(
      'typing-stop',
      ({
        senderId,
      }) => {

        useChatStore
          .getState()
          .setFriendTyping(
            senderId,
            false
          );
      }
    );

    // FRIEND REQUEST
    socket.on(
      'friend-request-received',
      (request) => {

        useFriendStore
          .getState()
          .addIncomingRequest(
            request
          );

        soundService.playAlert();
      }
    );

    // REQUEST ACCEPTED
    socket.on(
      'friend-request-accepted',
      ({
        requestId,
        friend,
      }) => {

        useChatStore
          .getState()
          .fetchFriends();

        useFriendStore
          .getState()
          .removeRequestOnResponse(
            requestId
          );

        soundService.playAlert();

        toast.success(
          `${friend.displayName} accepted your friend request!`,
          {
            icon: '🤝',
          }
        );
      }
    );

    // REQUEST REJECTED
    socket.on(
      'friend-request-rejected',
      ({
        requestId,
      }) => {

        useFriendStore
          .getState()
          .removeRequestOnResponse(
            requestId
          );
      }
    );

    // DISCONNECT
    socket.on(
      'disconnect',
      () => {

        if (
          import.meta.env.DEV
        ) {
          console.log(
            'Socket disconnected'
          );
        }
      }
    );

    // CLEANUP
    return () => {

      socket.removeAllListeners();

      socket.disconnect();

      socketRef.current = null;
    };

  }, [
    isAuthenticated,
    token,
    user?._id,
  ]);

  // TYPING START
  const emitTypingStart = (
    receiverId
  ) => {

    socketRef.current?.emit(
      'typing-start',
      {
        receiverId,
      }
    );
  };

  // TYPING STOP
  const emitTypingStop = (
    receiverId
  ) => {

    socketRef.current?.emit(
      'typing-stop',
      {
        receiverId,
      }
    );
  };

  // MESSAGE SEEN
  const emitMessageSeen = (
    senderId
  ) => {

    socketRef.current?.emit(
      'message-seen',
      {
        senderId,
      }
    );
  };

  return {

    socket: socketRef,

    emitTypingStart,

    emitTypingStop,

    emitMessageSeen,
  };
};