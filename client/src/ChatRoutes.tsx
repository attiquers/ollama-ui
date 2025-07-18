import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import App from './App';
import Header from './components/Header';
import SideBar from './components/SideBar';
import { useState, useEffect } from 'react';
import axios from 'axios';

function ChatAppWrapper({
  llms, selectedLLM, setSelectedLLM, chatsData, setSelectedChatId, selectedChatId
}: any) {
  const { chatId } = useParams<{ chatId?: string }>();
  return <App
    chatId={chatId || null}
    llms={llms}
    selectedLLM={selectedLLM}
    setSelectedLLM={setSelectedLLM}
    chatsData={chatsData}
    setSelectedChatId={setSelectedChatId}
    selectedChatId={selectedChatId}
  />;
}

export default function ChatRoutes() {
  const [llms, setLlms] = useState<string[]>([]);
  const [selectedLLM, setSelectedLLM] = useState<string>("");
  const [chatsData, setChatsData] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    axios.get('http://localhost:3001/api/ollama/list')
      .then(res => setLlms(res.data.models))
      .catch(() => setLlms([]));
    axios.get('http://localhost:3001/api/chats')
      .then(res => setChatsData(res.data))
      .catch(() => setChatsData([]));
  }, []);

  return (
    <Router>
      <div className='fixed top-0 left-1/2 z-50 transform -translate-x-1/2'>
        <Header selectedLLM={selectedLLM} setSelectedLLM={setSelectedLLM} llms={llms} />
      </div>
      <div className="flex flex-row flex-1">
        <SideBar setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} chats={chatsData} />
        <Routes>
          <Route path="/chat/:chatId" element={<ChatAppWrapper llms={llms} selectedLLM={selectedLLM} setSelectedLLM={setSelectedLLM} chatsData={chatsData} setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} />} />
          <Route path="/" element={<App chatId={null} llms={llms} selectedLLM={selectedLLM} setSelectedLLM={setSelectedLLM} chatsData={chatsData} setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}