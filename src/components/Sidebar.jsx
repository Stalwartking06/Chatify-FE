import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';
import { useFriendStore } from '../store/useFriendStore.js';
import { ContactsSkeleton } from './SkeletonLoader.jsx';
import {
  MessageSquare,
  UserPlus,
  Inbox,
  Search,
  UserCheck,
  Hourglass,
  Check,
  X,
  Settings,
  LogOut,
  Image as ImageIcon,
} from 'lucide-react';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  // If today, return HH:MM
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If yesterday, return "Yesterday"
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Otherwise return date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    friends,
    activeChat,
    setActiveChat,
    onlineUsers,
    unreadCounts,
    fetchFriends,
  } = useChatStore();

  const {
    incomingRequests,
    outgoingRequests,
    searchResults,
    isLoadingRequests,
    isSearching,
    fetchRequests,
    sendRequest,
    respondRequest,
    searchUsers,
  } = useFriendStore();

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'search' | 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchFriends();
      await fetchRequests();
      setIsLoading(false);
    };
    init();
  }, [fetchFriends, fetchRequests]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    searchUsers(val);
  };

  // Helper to check if a user in search is already a friend
  const isFriend = (userId) => friends.some((f) => f._id === userId);

  // Helper to check if a request is pending
  const getRequestStatus = (userId) => {
    const sent = outgoingRequests.find((r) => r.receiver._id === userId || r.receiver === userId);
    if (sent) return 'sent';

    const received = incomingRequests.find((r) => r.sender._id === userId || r.sender === userId);
    if (received) return 'received';

    return null;
  };

  return (
    <aside className="w-full md:w-80 h-full flex flex-col border-r border-slate-800 bg-[#0f172a]/90 backdrop-blur-xl relative z-20">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 cursor-pointer bg-slate-800 flex items-center justify-center font-bold text-blue-400 flex-shrink-0"
          >
            {user?.avatar ? (
              <img
                src={
                  user.avatar.startsWith('/')
                    ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${user.avatar}`
                    : user.avatar
                }
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.displayName?.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-none truncate text-slate-200">{user?.displayName}</h2>
            <span className="text-xs text-slate-400 truncate block mt-1">@{user?.username}</span>
          </div>
        </div>
        
        {/* Settings & Logout */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => navigate('/profile')}
            title="Edit Profile"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/50 p-2 gap-1 bg-slate-900/30">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'chats'
              ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chats
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'search'
              ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Add Friend
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all relative whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Requests
          {incomingRequests.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          )}
        </button>
      </div>

      {/* List content panel */}
      <div className="flex-1 overflow-y-auto bg-[#0b101c]/30">
        {isLoading ? (
          <ContactsSkeleton />
        ) : (
          <>
            {/* 1. CHATS TAB */}
            {activeTab === 'chats' && (
              <div className="divide-y divide-slate-800/40">
                {friends.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <p className="text-sm font-medium">No friends added yet</p>
                    <p className="text-xs mt-1">Go to "Add Friend" tab to find users.</p>
                  </div>
                ) : (
                  friends.map((friend) => {
                    const isOnline = onlineUsers.includes(friend._id);
                    const unread = unreadCounts[friend._id] || 0;
                    const isActive = activeChat?._id === friend._id;
                    const lastMsg = friend.lastMessage;

                    return (
                      <div
                        key={friend._id}
                        onClick={() => setActiveChat(friend)}
                        className={`flex items-center gap-3 p-3.5 cursor-pointer hover:bg-slate-800/20 active:bg-slate-800/45 transition-all ${
                          isActive ? 'bg-blue-600/5 border-l-2 border-blue-500' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center font-bold">
                            {friend.avatar ? (
                              <img
                                src={
                                  friend.avatar.startsWith('/')
                                    ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${friend.avatar}`
                                    : friend.avatar
                                }
                                alt={friend.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              friend.displayName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0f172a] shadow-sm animate-pulse"></span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h3 className="text-sm font-semibold truncate text-slate-200">
                              {friend.displayName}
                            </h3>
                            <span className="text-[10px] text-slate-500">
                              {formatTime(lastMsg?.createdAt || friend.updatedAt)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs text-slate-400 truncate flex-1 leading-normal">
                              {lastMsg?.image ? (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  Image
                                </span>
                              ) : (
                                lastMsg?.text || friend.bio || 'Say hello!'
                              )}
                            </p>

                            {unread > 0 && (
                              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full scale-95 shadow-lg shadow-blue-500/20">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 2. ADD FRIEND TAB */}
            {activeTab === 'search' && (
              <div className="p-3 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search username or display name..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {isSearching ? (
                  <ContactsSkeleton />
                ) : (
                  <div className="space-y-2">
                    {searchResults.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">
                        {searchQuery ? 'No users match your query' : 'Type to search users'}
                      </p>
                    ) : (
                      searchResults.map((searchUser) => {
                        const isAlreadyFriend = isFriend(searchUser._id);
                        const status = getRequestStatus(searchUser._id);

                        return (
                          <div
                            key={searchUser._id}
                            className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-800/10 border border-slate-800/40"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                                {searchUser.avatar ? (
                                  <img
                                    src={
                                      searchUser.avatar.startsWith('/')
                                        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${searchUser.avatar}`
                                        : searchUser.avatar
                                    }
                                    alt={searchUser.displayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  searchUser.displayName.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-semibold text-slate-200 truncate">
                                  {searchUser.displayName}
                                </h4>
                                <p className="text-[10px] text-slate-500 truncate">@{searchUser.username}</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div>
                              {isAlreadyFriend ? (
                                <button
                                  onClick={() => {
                                    setActiveChat(searchUser);
                                    setActiveTab('chats');
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 active:scale-95 transition-all"
                                >
                                  Chat
                                </button>
                              ) : status === 'sent' ? (
                                <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded-lg">
                                  <Hourglass className="w-3 h-3" />
                                  Pending
                                </span>
                              ) : status === 'received' ? (
                                <button
                                  onClick={() => {
                                    setActiveTab('requests');
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all"
                                >
                                  Respond
                                </button>
                              ) : (
                                <button
                                  onClick={() => sendRequest(searchUser._id)}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all"
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. REQUESTS TAB */}
            {activeTab === 'requests' && (
              <div className="p-3 space-y-4">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Incoming ({incomingRequests.length})
                  </h4>

                  {incomingRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2 text-center">No incoming requests</p>
                  ) : (
                    incomingRequests.map((req) => (
                      <div
                        key={req._id}
                        className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-800/10 border border-slate-800/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                            {req.sender.avatar ? (
                              <img
                                src={
                                  req.sender.avatar.startsWith('/')
                                    ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${req.sender.avatar}`
                                    : req.sender.avatar
                                }
                                alt={req.sender.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              req.sender.displayName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-slate-200 truncate">
                              {req.sender.displayName}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate">@{req.sender.username}</p>
                          </div>
                        </div>

                        {/* Accept / Decline actions */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => respondRequest(req._id, 'accepted')}
                            title="Accept"
                            className="p-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/30 text-emerald-400 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => respondRequest(req._id, 'rejected')}
                            title="Decline"
                            className="p-1 rounded-lg bg-red-600/10 hover:bg-red-600/30 text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-slate-850 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Outgoing ({outgoingRequests.length})
                  </h4>

                  {outgoingRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2 text-center">No pending outgoing requests</p>
                  ) : (
                    outgoingRequests.map((req) => (
                      <div
                        key={req._id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center font-semibold text-[10px] flex-shrink-0">
                            {req.receiver.avatar ? (
                              <img
                                src={
                                  req.receiver.avatar.startsWith('/')
                                    ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${req.receiver.avatar}`
                                    : req.receiver.avatar
                                }
                                alt={req.receiver.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              req.receiver.displayName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-medium text-slate-300 truncate">
                              {req.receiver.displayName}
                            </h4>
                          </div>
                        </div>
                        <span className="text-[9px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md font-medium">
                          Sent
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
