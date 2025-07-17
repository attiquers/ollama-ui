import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ChatInput from '@/components/ChatInput';
import Header from '@/components/Header';
import SideBar from '@/components/SideBar';
import CurrentHistory from '@/components/CurrentHistory';
// import chatsDataJson from './dummyChats.json';
// import { Message } from '@/types';
type Message = {
  role: 'user' | 'assistant';
  content: string;
};



function App() {
  const [llms, setLlms] = useState<string[]>([]);
  useEffect(() => {
    axios.get('http://localhost:3001/api/ollama-list')
      .then(res => setLlms(res.data.models))
      .catch(() => setLlms([]));
  }, []);
  const [selectedLLM, setSelectedLLM] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatsData, setChatsData] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const selectedChat = chatsData.find((c: any) => c.id === selectedChatId) ?? null;

  // Fetch chats from server
  useEffect(() => {
    axios.get('http://localhost:3001/api/chats')
      .then(res => setChatsData(res.data))
      .catch(() => setChatsData([]));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Call Ollama API (local or remote)
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({ model: 'llama3', prompt: text }),
    });
    const reader = res.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullResponse = '';
    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      try {
        const json = JSON.parse(chunk.split('\n').filter(Boolean).pop() || '{}');
        fullResponse += json.response || '';
      } catch {}
    }

    const assistantMsg: Message = { role: 'assistant', content: fullResponse };
    setMessages((prev) => [...prev, assistantMsg]);
  };

  return (
    <div className="min-h-screen min-w-screen bg-gray-800 flex flex-col">
      <Header selectedLLM={selectedLLM} setSelectedLLM={setSelectedLLM} llms={llms} />
      <div className="flex flex-row flex-1">
        <SideBar setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} chats={chatsData} />
        <div className="flex-1 flex items-center justify-center min-h-screen w-[60vw]">
          {selectedChat ? (
            <div className="flex flex-col items-center justify-end pb-20 w-[60vw] min-h-screen relative">
              <CurrentHistory messages={selectedChat.messages.flatMap((m: any) => [
                { role: 'user' as const, content: m.user },
                { role: 'assistant' as const, content: m.ai }
              ])} />
            </div>  
          ) : (
            <div className="flex flex-col items-center justify-center w-[60vw] min-h-screen relative">
              <div className="flex flex-col items-center w-full justify-end pb-20">
                <div>
                  <img src="ollama.svg" alt="Ollama Logo" className='h-50 pb-4' />
                </div>
                <div className="mb-8 text-center">
                  <h2 className="text-4xl font-extrabold text-white mb-2">Private, Fast, Secure</h2>
                </div>
              </div>
              </div>
          )}
          <footer className='absolute bottom-2 w-[60vw]'>
            <ChatInput onSend={sendMessage} />
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
