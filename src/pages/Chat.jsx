import React from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import { useChatStore } from '../store/useChatStore.js';

const Chat = () => {
  const { activeChat, setActiveChat } = useChatStore();

  return (
    <div className="min-h-screen max-h-screen bg-[#0b0f19] flex relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full flex h-screen overflow-hidden relative z-10">
        {/* On mobile: if activeChat is selected, hide the sidebar, else show it */}
        <div
          className={`h-full ${
            activeChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-auto md:flex-shrink-0`}
        >
          <Sidebar />
        </div>

        {/* On mobile: if activeChat is not selected, hide the chat window, else show it */}
        <div
          className={`h-full flex-1 ${
            activeChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ChatWindow onBack={() => setActiveChat(null)} />
        </div>
      </div>
    </div>
  );
};

export default Chat;
