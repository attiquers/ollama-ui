import { useState, useEffect } from 'react';
import { MdHistory, MdAdd, MdSearch, MdClose, MdEdit, MdCheck } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // ADDED: axios for API call

type ChatListItem = {
  _id: string;
  name: string;
  datetime: string;
  messages: any[];
};

type SideBarProps = {
  setSelectedChatId: (id: string | null) => void;
  selectedChatId: string | null;
  chats: ChatListItem[];
};

// Define the base API URL using Vite's environment variable.
const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api'; // ADDED: API_BASE_URL

export default function SideBar({ setSelectedChatId, selectedChatId, chats }: SideBarProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const navigate = useNavigate();

  // FIX: Implement actual rename logic and use 'id' and 'newName' parameters
  const handleRename = async (id: string, newName: string) => { // CHANGED: Renamed 'name' to 'newName' for clarity
    if (newName.trim() === '') {
      alert('Chat name cannot be empty.'); // Or use a more sophisticated UI notification
      return;
    }
    try {
      // API call to update the chat name in MongoDB
      await axios.put(`${API_BASE_URL}/chats/${id}`, { name: newName }); // CHANGED: Use API_BASE_URL
      // After successful update, reset editing state
      setEditingId(null);
      setEditValue('');
      // In a real application, you would typically trigger a re-fetch of chatsData in a parent component
      // or pass a `setChatsData` prop down to SideBar to update the local state directly.
      // For this example, we'll assume a re-fetch happens or it's handled upstream.
    } catch (error) {
      console.error(`Error renaming chat ${id}:`, error);
      alert('Failed to rename chat.');
    }
  };


  // Close sidebar when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const sidebar = document.getElementById('sidebar-panel');
      const button = document.getElementById('sidebar-btn');
      if (sidebar && !sidebar.contains(e.target as Node) && button && !button.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div
      className={`fixed top-0 left-0 h-full z-40 flex`}
      onMouseEnter={() => setOpen(true)} // Open sidebar on hover
      onMouseLeave={() => setOpen(false)} // Collapse sidebar on mouse leave
    >
      {/* Sidebar section with icons and chat list */}
      <div
        id="sidebar-panel"
        className={`py-6 px-2 h-full transition-all duration-500 ${open ? 'w-64 bg-[#282A2C] border-r border-gray-800 shadow-2xl' : 'w-16 bg-[#1B1C1D] border-r-2 border-[#2c2e30]'} relative`}
        style={{ zIndex: 1 }}
      >
        {/* Absolute icons and labels */}
        <div className={`absolute left-4 top-0 flex flex-col w-64 h-full py-6 gap-6 overflow-hidden`} style={{ zIndex: 2 }}>
          <button
            id="sidebar-btn"
            className={`text-white flex items-center gap-3 relative group`}
            onClick={() => setOpen(!open)}
            aria-label="Toggle sidebar"
          >
            {open ? <MdClose size={28} /> : <MdHistory size={28} />}
            <span className={`text-base text-white ml-2 transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}>History</span>
            {!open && (
              <span
                className="absolute left-full top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2 pointer-events-none"
                style={{ zIndex: 99999, position: 'fixed' }}
              >
                Open/Close Sidebar
              </span>
            )}
          </button>
          <button
            className={`text-white flex items-center gap-3 relative group`}
            onClick={() => { setSelectedChatId(null); navigate(`/`); }}
            aria-label="New Chat"
          >
            <MdAdd size={28} />
            <span className={`text-base text-white ml-2 transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}>New Chat</span>
            {!open && (
              <span
                className="absolute left-full top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2 pointer-events-none z-50"
              >
                Start a new chat
              </span>
            )}
          </button>
          <button
            className={`text-white flex items-center gap-3 relative group`}
            aria-label="Search"
          >
            <MdSearch size={28} />
            <span className={`text-base text-white ml-2 transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}>Search</span>
            {!open && (
              <span
                className="absolute left-full top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2 pointer-events-none"
                style={{ zIndex: 99999, position: 'fixed' }}
              >
                Search chats
              </span>
            )}
          </button>
        </div>
        {/* Chat History title and chat list */}
        <div
          className={`absolute left-0 top-40 w-full transition-opacity duration-500 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          style={{ zIndex: 50, height: 'calc(100% - 10rem)' }} // Adjust height to fill remaining space
        >
          <div className="p-4 border-b border-gray-800 text-xl font-bold text-white whitespace-nowrap">Chat History</div>
          <ul
            className="p-2 h-full overflow-y-auto" // Keep overflow-y-auto to enable scrolling
            // REMOVED: Custom scrollbar styles that hide scrollbar by default (not needed for Docker)
          >
            {[...chats]
              .sort((a, b) => {
                // Sort by most recent message datetime, fallback to chat datetime
                const aTime = a.messages?.length > 0 ? new Date(a.messages[a.messages.length - 1].datetime).getTime() : new Date(a.datetime).getTime();
                const bTime = b.messages?.length > 0 ? new Date(b.messages[b.messages.length - 1].datetime).getTime() : new Date(b.datetime).getTime();
                return bTime - aTime;
              })
              .map(chat => (
                <li
                  key={chat._id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2 transition-colors group cursor-pointer hover:bg-[#313336]
                  ${selectedChatId === chat._id ? 'bg-[#1F3760]' : ''}`}
                  style={{ minWidth: '120px', whiteSpace: 'nowrap' }}
                  onClick={() => { setSelectedChatId(chat._id); navigate(`/chat/${chat._id}`); }}
                >
                  {editingId === chat._id ? (
                    <>
                      <input
                        className="text-white rounded px-2 py-1 w-full mr-2 outline-none border"
                        style={{ backgroundColor: '#232f4b', borderColor: '#34406a' }}
                        value={editValue}
                        autoFocus
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(chat._id, editValue);
                        }}
                      />
                      <button
                        className="ml-2 text-green-400 hover:text-green-600 transition-colors"
                        onClick={() => handleRename(chat._id, editValue)}
                        aria-label="Save chat name"
                      >
                        <MdCheck size={20} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-white ml-2">{chat.name}</span>
                      <button
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                        onClick={() => { setEditingId(chat._id); setEditValue(chat.name); }}
                        aria-label="Rename chat"
                      >
                        <MdEdit size={18} />
                      </button>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
