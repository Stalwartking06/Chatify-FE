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

const ChatWindow = ({ onBack }) => {
  const { user } = useAuthStore();
  const {
    activeChat,
    messages,
    isChatLoading,
    sendMessage,
    typingUsers,
    onlineUsers,
  } = useChatStore();

  const { emitTypingStart, emitTypingStop, emitMessageSeen } = useSocket();

  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const isOnline = activeChat && onlineUsers.includes(activeChat._id);
  const isTyping = activeChat && typingUsers[activeChat._id];

  // Auto scroll to latest message when messages array updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Mark incoming messages as seen when chat becomes active or messages update
  useEffect(() => {
    if (activeChat) {
      emitMessageSeen(activeChat._id);
    }
  }, [activeChat, messages.length, emitMessageSeen]);

  // Handle typing state transitions
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
            className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="relative">
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
            <h3 className="text-sm font-semibold truncate text-slate-200">{activeChat.displayName}</h3>
            {isTyping ? (
              <span className="text-[10px] text-blue-400 font-medium animate-pulse">typing...</span>
            ) : (
              <span className="text-[10px] text-slate-500 font-medium truncate block">
                {isOnline ? 'Online' : formatLastSeen(activeChat.lastSeen)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center text-slate-500 flex-shrink-0" title="All chat history is auto-deleted after 24h">
          <Info className="w-4 h-4 mr-1 text-slate-600 flex-shrink-0" />
          <span className="text-[9px] uppercase tracking-wider font-semibold hidden sm:inline">24h History</span>
        </div>
      </header>

      {/* Message List */}
      {isChatLoading ? (
        <MessagesSkeleton />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0b0f19]/35"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-8">
              <p className="text-xs font-semibold">No messages yet</p>
              <p className="text-[10px] mt-1">Send a greeting to start your conversation.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSelf = msg.sender === user._id || msg.sender?._id === user._id;
              
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
                <div
                  key={msg._id}
                  className={`flex items-end gap-2.5 max-w-[85%] md:max-w-[70%] ${
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
                        isSelf
                          ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white rounded-2xl rounded-br-none border border-blue-500/20 shadow-md shadow-blue-900/10'
                          : 'bg-slate-800/85 text-slate-100 rounded-2xl rounded-bl-none border border-slate-700/60 shadow-sm'
                      }`}
                    >
                      {/* Optional Image */}
                      {msg.image && (
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
                    </div>

                    {/* Metadata Footer */}
                    {isLastInGroup && (
                      <div
                        className={`flex items-center gap-1 mt-1 text-[9px] text-slate-500 ${
                          isSelf ? 'justify-end' : 'justify-start'
                        }`}
                      >
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
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Input panel wrapper */}
      <footer className="p-3 border-t border-slate-800 bg-[#0f172a]/70 backdrop-blur-md relative">
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
              className="p-1.5 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-all"
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
    </div>
  );
};

export default ChatWindow;
