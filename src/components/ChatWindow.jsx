import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { MessagesSkeleton } from './SkeletonLoader.jsx';
import {
  Send,
  Image as ImageIcon,
  Smile,
  X,
  Check,
  CheckCheck,
  ArrowLeft,
  Info,
  User,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
} from 'lucide-react';

const EMOJIS = [
  '😀', '😂', '😊', '😍', '😘', '😜', '😎', '🥺', '😭', '👍', '👎', '❤️',
  '🔥', '✨', '🎉', '🙌', '👏', '🙏', '💡', '💯', '🚀', '⭐', '💥', '👀',
];

const formatLastSeen = (lastSeenDate) => {
  if (!lastSeenDate) return 'Offline';
  const date = new Date(lastSeenDate);
  const now = new Date();
  
  const diffMs = now - date;
  if (diffMs < 60000) return 'Last seen just now';
  
  // If today
  if (date.toDateString() === now.toDateString()) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  }
  
  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  }
  
  return `Last seen on ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

// Memoized MessageBubble to optimize rendering of large message history lists
const MessageBubble = React.memo(({ msg, isSelf, isLastInGroup, msgTime, activeChat, onDelete }) => {
  const editMessage = useChatStore((state) => state.editMessage);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || '');
  const [showMenu, setShowMenu] = useState(false);

  const isDeleted = msg.text === "This message was deleted" || msg.deletedForEveryone;
  const canEdit = isSelf && !isDeleted && (Date.now() - new Date(msg.createdAt).getTime() < 300000); // 5 minutes limit

  const handleSaveEdit = async () => {
    if (!editText.trim() && !msg.image) return;
    if (editText.trim() === msg.text) {
      setIsEditing(false);
      return;
    }
    const success = await editMessage(msg._id, editText);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    onDelete(msg._id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text || '');
    toast.success("Message copied");
  };

  return (
    <div
      className={`flex items-end gap-2.5 max-w-[85%] md:max-w-[70%] group relative ${
        isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'
      }`}
    >
      {/* Friend avatar on left for grouped message endpoints */}
      {!isSelf && (
        <div className="w-7 h-7 flex-shrink-0">
          {isLastInGroup && (
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-800 bg-slate-800 flex items-center justify-center font-bold text-[9px]">
              {activeChat.avatar ? (
                <img
                  src={
                    activeChat.avatar.startsWith('/')
                      ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${activeChat.avatar}`
                      : activeChat.avatar
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                activeChat.displayName.slice(0, 2).toUpperCase()
              )}
            </div>
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className="flex flex-col">
        <div
          className={`glass-card p-3 shadow-md transition-all duration-200 ${
            isDeleted
              ? 'bg-slate-900/40 text-slate-500 border border-slate-800/60 italic rounded-2xl'
              : isSelf
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white rounded-2xl rounded-br-none border border-blue-500/20 shadow-md shadow-blue-900/10'
                : 'bg-slate-800/85 text-slate-100 rounded-2xl rounded-bl-none border border-slate-700/60 shadow-sm'
          }`}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[180px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(msg.text || '');
                  }}
                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-350 transition-all cursor-pointer border border-slate-750"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={(!editText.trim() && !msg.image) || editText.trim() === msg.text}
                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Optional Image */}
              {msg.image && !isDeleted && (
                <div className="mb-1.5 max-w-full rounded-xl overflow-hidden border border-slate-900/50 bg-[#080c14]/40">
                  <img
                    src={
                      msg.image.startsWith('/')
                        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${msg.image}`
                        : msg.image
                    }
                    alt="Chat attachment"
                    className="max-h-60 object-contain w-full"
                    loading="lazy"
                  />
                </div>
              )}
              
              {/* Message Text */}
              {msg.text && <p className="text-xs break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
            </>
          )}
        </div>

        {/* Metadata Footer */}
        {isLastInGroup && (
          <div
            className={`flex items-center gap-1 mt-1 text-[9px] text-slate-500 ${
              isSelf ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.edited && !isDeleted && <span className="text-[8px] text-slate-500 italic mr-0.5">(edited)</span>}
            <span>{msgTime}</span>
            {isSelf && (
              <span className="scale-90">
                {msg.status === 'seen' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                ) : msg.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-slate-500" />
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover Action Menu Trigger */}
      {isSelf && !isDeleted && !isEditing && (
        <div
          onMouseLeave={() => setShowMenu(false)}
          className="relative opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 flex items-center self-center px-1"
        >
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-all cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <div className="absolute bottom-6 right-0 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 py-1 min-w-[80px] animate-slide-up">
              {canEdit && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  handleDelete();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Receiver actions: Copy */}
      {!isSelf && !isDeleted && (
        <div
          onMouseLeave={() => setShowMenu(false)}
          className="relative opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 flex items-center self-center px-1"
        >
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-all cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <div className="absolute bottom-6 left-0 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 py-1 min-w-[80px] animate-slide-up">
              <button
                onClick={() => {
                  handleCopy();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const ConfirmModal = ({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, isDanger }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0f172a]/95 border border-slate-800/80 rounded-3xl p-6 flex flex-col shadow-2xl relative animate-slide-up">
        <h3 className="text-lg font-bold text-slate-200">{title}</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all cursor-pointer border border-slate-750"
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl text-white active:scale-95 transition-all cursor-pointer ${
              isDanger ? 'bg-red-650 hover:bg-red-650/80 shadow-lg shadow-red-950/20' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

MessageBubble.displayName = 'MessageBubble';

const ChatWindow = ({ onBack }) => {
  // Zustand specific selectors to prevent re-rendering when unrelated state changes
  const user = useAuthStore((state) => state.user);
  const activeChat = useChatStore((state) => state.activeChat);
  const messages = useChatStore((state) => state.messages);
  const isChatLoading = useChatStore((state) => state.isChatLoading);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const hasMoreMessages = useChatStore((state) => state.hasMoreMessages);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const removeFriend = useChatStore((state) => state.removeFriend);
  const blockUser = useAuthStore((state) => state.blockUser);
  const deleteMessage = useChatStore((state) => state.deleteMessage);

  const { emitTypingStart, emitTypingStop, emitMessageSeen } = useSocket();

  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFriendProfile, setShowFriendProfile] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
    isDanger: false
  });

  const handleDelete = (msgId) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Message?',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        await deleteMessage(msgId);
      }
    });
  };

  const handleRemoveFriend = () => {
    setModalConfig({
      isOpen: true,
      title: 'Remove Friend?',
      message: `Are you sure you want to remove ${activeChat.displayName} from your friends list?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        await removeFriend(activeChat._id);
      }
    });
  };

  const handleBlockUser = () => {
    setModalConfig({
      isOpen: true,
      title: 'Block User?',
      message: `Are you sure you want to block ${activeChat.displayName}? You will no longer receive messages from this user.`,
      confirmText: 'Block',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        await blockUser(activeChat);
      }
    });
  };

  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const isOnline = activeChat && onlineUsers.includes(activeChat._id);
  const isTyping = activeChat && typingUsers[activeChat._id];

  // Smart auto-scroll: Scroll only if near bottom or it's current user's message
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer && !isFetchingMore) {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 250;
      
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage && (lastMessage.sender === user?._id || lastMessage.sender?._id === user?._id);

      if (isNearBottom || isMyMessage || messages.length <= 1) {
        const scrollBehavior = messages.length <= 1 ? 'auto' : 'smooth';
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: scrollBehavior
        });
      }
    }
  }, [messages, isTyping, user?._id, isFetchingMore]);

  // Mark incoming messages as seen when chat becomes active or messages update
  useEffect(() => {
    if (activeChat) {
      emitMessageSeen(activeChat._id);
    }
  }, [activeChat, messages.length, emitMessageSeen]);

  // Cleanup typing timeout and status on unmount
  useEffect(() => {
    return () => {
      if (isTypingRef.current && activeChat) {
        emitTypingStop(activeChat._id);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeChat?._id, emitTypingStop]);

  // Handle typing state transitions (debounced start/stop)
  const handleInputChange = (e) => {
    setText(e.target.value);

    if (!isTypingRef.current && activeChat) {
      isTypingRef.current = true;
      emitTypingStart(activeChat._id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && activeChat) {
        isTypingRef.current = false;
        emitTypingStop(activeChat._id);
      }
    }, 2000);
  };

  // Scroll to top handler for cursor-based message pagination
  const handleScroll = async (e) => {
    const container = e.currentTarget;
    if (container.scrollTop === 0 && messages.length > 0 && hasMoreMessages && !isFetchingMore) {
      setIsFetchingMore(true);
      const firstMessageTime = messages[0].createdAt;
      const oldScrollHeight = container.scrollHeight;

      await fetchMessages(activeChat._id, firstMessageTime);

      // Adjust scroll position to maintain scroll location relative to content
      setTimeout(() => {
        if (scrollRef.current) {
          const newScrollHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = newScrollHeight - oldScrollHeight;
        }
      }, 50);

      setIsFetchingMore(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleEmojiClick = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedImage) return;

    // Stop typing indicator immediately
    if (isTypingRef.current && activeChat) {
      isTypingRef.current = false;
      emitTypingStop(activeChat._id);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const currentText = text;
    const currentImage = selectedImage;

    // Optimistically clear fields
    setText('');
    clearSelectedImage();

    await sendMessage(activeChat._id, currentText, currentImage);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19]/40 relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl pointer-events-none"></div>
        <div className="w-16 h-16 rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/10 animate-pulse">
          <Send className="w-8 h-8 rotate-45" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">Start Messaging</h3>
        <p className="text-slate-400 text-xs mt-1.5 max-w-xs">
          Select a friend from the contacts sidebar to exchange messages securely in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080c14]/40 relative z-10">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div 
            onClick={() => setShowFriendProfile(true)}
            className="flex items-center gap-3 min-w-0 cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center font-bold text-sm">
                {activeChat.avatar ? (
                  <img
                    src={
                      activeChat.avatar.startsWith('/')
                        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${activeChat.avatar}`
                        : activeChat.avatar
                    }
                    alt={activeChat.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  activeChat.displayName.slice(0, 2).toUpperCase()
                )}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#080c14] shadow-lg flex items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate text-slate-200 group-hover:text-blue-400 transition-colors">{activeChat.displayName}</h3>
              {isTyping ? (
                <span className="text-[10px] text-blue-400 font-medium animate-pulse">typing...</span>
              ) : (
                <span className="text-[10px] text-slate-500 font-medium truncate block">
                  {isOnline ? 'Online' : formatLastSeen(activeChat.lastSeen)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowFriendProfile(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
            title="View Contact Profile"
          >
            <User className="w-4 h-4 text-slate-400 hover:text-blue-400 transition-colors" />
          </button>

          <div className="flex items-center text-slate-500" title="All chat history is auto-deleted after 24h">
            <Info className="w-4 h-4 mr-1 text-slate-600 flex-shrink-0" />
            <span className="text-[9px] uppercase tracking-wider font-semibold hidden sm:inline">24h History</span>
          </div>
        </div>
      </header>

      {/* Message List */}
      {isChatLoading ? (
        <MessagesSkeleton />
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0b0f19]/35"
        >
          {isFetchingMore && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-8">
              <p className="text-xs font-semibold">No messages yet</p>
              <p className="text-[10px] mt-1">Send a greeting to start your conversation.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSelf = msg.sender === user?._id || msg.sender?._id === user?._id;
              
              // Group logic: check if next message is sent by same user within 2 minutes
              const nextMsg = messages[index + 1];
              const isNextSameSender = nextMsg && (nextMsg.sender === msg.sender || nextMsg.sender?._id === msg.sender?._id);
              const isTimeDifferenceSmall = nextMsg && (new Date(nextMsg.createdAt) - new Date(msg.createdAt) < 120000);
              const isLastInGroup = !(isNextSameSender && isTimeDifferenceSmall);

              const msgTime = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <MessageBubble
                  key={msg._id}
                  msg={msg}
                  isSelf={isSelf}
                  isLastInGroup={isLastInGroup}
                  msgTime={msgTime}
                  activeChat={activeChat}
                  onDelete={handleDelete}
                />
              );
            })
          )}
        </div>
      )}

      {/* Input panel wrapper (Safe Area Bottom Spacing Added) */}
      <footer className="p-3 border-t border-slate-800 bg-[#0f172a]/70 backdrop-blur-md relative pb-[calc(12px+env(safe-area-inset-bottom))]">
        {/* Emoji Selector Overlay */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 right-4 md:right-auto max-w-[280px] p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-30 grid grid-cols-6 gap-1.5 animate-slide-up">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-800 rounded-lg active:scale-95 transition-all cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Selected Image Preview */}
        {imagePreview && (
          <div className="mb-3 p-2 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 animate-slide-up">
            <div className="flex items-center gap-3">
              <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-800" />
              <div>
                <span className="text-xs font-semibold text-slate-300">Ready to send image</span>
                <p className="text-[10px] text-slate-500">{(selectedImage.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <button
              onClick={clearSelectedImage}
              className="p-1.5 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex items-center gap-2.5">
          {/* Actions */}
          <div className="flex gap-1">
            {/* Emojis toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showEmojiPicker
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Image Upload toggle */}
            <button
              type="button"
              onClick={handleImageClick}
              className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer ${
                selectedImage ? 'bg-blue-600/15 text-blue-400' : ''
              }`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 text-xs rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={!text.trim() && !selectedImage}
            className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none disabled:scale-100"
          >
            <Send className="w-4 h-4 rotate-45" />
          </button>
        </form>
      </footer>

      {/* FRIEND PROFILE MODAL */}
      {showFriendProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0f172a]/95 border border-slate-800/80 rounded-3xl p-6 flex flex-col items-center shadow-2xl relative animate-slide-up">
            {/* Close Button */}
            <button
              onClick={() => setShowFriendProfile(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-800 flex items-center justify-center font-bold text-3xl text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
              {activeChat.avatar ? (
                <img
                  src={
                    activeChat.avatar.startsWith('/')
                      ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${activeChat.avatar}`
                      : activeChat.avatar
                  }
                  alt={activeChat.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                activeChat.displayName.slice(0, 2).toUpperCase()
              )}
            </div>

            {/* User Details */}
            <h3 className="text-xl font-bold text-slate-200">{activeChat.displayName}</h3>
            <p className="text-sm text-slate-400 mt-0.5">@{activeChat.username}</p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-slate-900 border border-slate-800/50">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-xs text-slate-300 font-medium">
                {isOnline ? 'Online' : formatLastSeen(activeChat.lastSeen)}
              </span>
            </div>

            {/* Bio info */}
            <div className="w-full mt-6 pt-5 border-t border-slate-800/60 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1.5">Bio</p>
              <p className="text-sm text-slate-300 italic px-2">
                {activeChat.bio || "No bio written yet."}
              </p>
            </div>

            {/* Actions */}
            <div className="w-full mt-6 pt-5 border-t border-slate-800/60 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRemoveFriend}
                className="w-full py-2 rounded-xl bg-red-650 hover:bg-red-650/80 text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-md shadow-red-950/20"
              >
                Remove Friend
              </button>
              <button
                type="button"
                onClick={handleBlockUser}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all active:scale-95 cursor-pointer border border-slate-750"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        isDanger={modalConfig.isDanger}
      />
    </div>
  );
};

export default ChatWindow;
