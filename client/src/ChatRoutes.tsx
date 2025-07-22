import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from './App';
import Header from './components/Header';
import SideBar from './components/SideBar';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api';

export default function ChatRoutes() {
  const [llms, setLlms] = useState<string[]>([]);
  const [selectedLLM, setSelectedLLM] = useState<string>(() => {
    // Initialize selectedLLM from localStorage on first render
    return localStorage.getItem('selectedLLM') || '';
  });
  const [chatsData, setChatsData] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => {
    // Initialize selectedChatId from localStorage on first render
    return localStorage.getItem('selectedChatId') || null;
  });

  useEffect(() => {
    axios.get(`${API_BASE_URL}/ollama/list`)
      .then(res => setLlms(res.data.models))
      .catch(e => {
        console.error('[ROUTES] error loading models', e);
        setLlms([]);
      });

    // Fetch chats and try to set selectedChatId from localStorage or first chat
    axios.get(`${API_BASE_URL}/chats`)
      .then(res => {
        setChatsData(res.data);
        const storedChatId = localStorage.getItem('selectedChatId');
        if (storedChatId && res.data.some((chat: any) => chat._id === storedChatId)) {
          setSelectedChatId(storedChatId);
        } else if (res.data.length > 0) {
          // If stored ID is invalid or no stored ID, default to the first chat
          setSelectedChatId(res.data[0]._id);
          localStorage.setItem('selectedChatId', res.data[0]._id);
        } else {
          // If no chats exist, ensure selectedChatId is null
          setSelectedChatId(null);
          localStorage.removeItem('selectedChatId');
        }
      })
      .catch(e => {
        console.error('[ROUTES] error loading chats', e);
        setChatsData([]);
        setSelectedChatId(null); // Clear selected chat on error
        localStorage.removeItem('selectedChatId');
      });
  }, []); // Run only once on component mount

  // Effect to save selectedLLM to localStorage whenever it changes
  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem('selectedLLM', selectedLLM);
    } else {
      localStorage.removeItem('selectedLLM');
    }
  }, [selectedLLM]);

  // Effect to save selectedChatId to localStorage whenever it changes
  useEffect(() => {
    if (selectedChatId) {
      localStorage.setItem('selectedChatId', selectedChatId);
    } else {
      localStorage.removeItem('selectedChatId');
    }
  }, [selectedChatId]);

  return (
    <Router>
      <div className='fixed top-0 left-1/2 z-50 transform -translate-x-1/2'>
        <Header selectedLLM={selectedLLM} setSelectedLLM={setSelectedLLM} llms={llms} />
      </div>
      <div className="flex flex-row flex-1">
        <SideBar setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} chats={chatsData} />
        <Routes>
          <Route
            path="/chat/:chatId"
            element={
              <App
                selectedLLM={selectedLLM}
                setSelectedLLM={setSelectedLLM}
                chatsData={chatsData}
                setSelectedChatId={setSelectedChatId}
                selectedChatId={selectedChatId} // This will be managed by App component from URL
                setChatsData={setChatsData}
              />
            }
          />
          <Route
            path="/"
            element={
              <App
                selectedLLM={selectedLLM}
                setSelectedLLM={setSelectedLLM}
                chatsData={chatsData}
                setSelectedChatId={setSelectedChatId}
                selectedChatId={selectedChatId} // This will be null initially, unless a chat is persisted
                setChatsData={setChatsData}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Use replace to avoid bad history states */}
        </Routes>
      </div>
    </Router>
  );
}