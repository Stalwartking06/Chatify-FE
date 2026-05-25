import { emitTypingStart, emitTypingStop, emitMessageSeen, getSocket } from '../socket/socketService.js';

export const useSocket = () => {
  return {
    socket: {
      get current() {
        return getSocket();
      }
    },
    emitTypingStart,
    emitTypingStop,
    emitMessageSeen,
  };
};