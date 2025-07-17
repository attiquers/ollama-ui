import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ChatInput from '@/components/ChatInput';
// Header and SideBar are now rendered in ChatRoutes
import CurrentHistory from '@/components/CurrentHistory';
// import chatsDataJson from './dummyChats.json';
// import { Message } from '@/types';
type Message = {
  role: 'user' | 'assistant';
  content: string;
  blinking?: boolean;
};



function App({
  chatId: propChatId,
  llms,
  selectedLLM,
  setSelectedLLM,
  chatsData,
  setSelectedChatId,
  selectedChatId
}: any) {
  // Remove messages and currentChat, use chatArray for all rendering
  const [chatArray, setChatArray] = useState<Array<{ user: string; ai: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const selectedChat = chatsData.find((c: any) => c._id === selectedChatId) ?? null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatArray]);

  // When route changes, update selectedChatId
  useEffect(() => {
    if (propChatId !== selectedChatId) setSelectedChatId(propChatId ?? null);
  }, [propChatId]);

  // When selectedChatId changes, update chatArray from DB
  useEffect(() => {
    const chat = chatsData.find((c: any) => c._id === selectedChatId);
    if (chat) {
      setChatArray(chat.messages.map((m: any) => ({ user: m.user, ai: m.ai })));
    } else {
      setChatArray([]);
    }
  }, [selectedChatId, chatsData]);

  // Persist selectedLLM in localStorage
  useEffect(() => {
    const storedLLM = localStorage.getItem('selectedLLM');
    if (storedLLM && !selectedLLM) {
      setSelectedLLM(storedLLM);
    }
  }, []);
  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem('selectedLLM', selectedLLM);
    }
  }, [selectedLLM]);

  // When a new chat is created, navigate to its route
  useEffect(() => {
    if (selectedChatId && propChatId !== selectedChatId) {
      window.history.replaceState(null, '', `/chat/${selectedChatId}`);
    }
  }, [selectedChatId]);

  const sendMessage = async (text: string) => {
    if (!selectedLLM) {
      alert('Please select an LLM first!');
      return;
    }

    let chatId = selectedChatId;
    let chat = selectedChat;
    let updatedChat;
    if (!chat) {
      const newChat = {
        name: `Chat with ${selectedLLM}`,
        datetime: new Date().toISOString(),
        messages: []
      };
      const res = await axios.post('http://localhost:3001/api/chats', newChat);
      updatedChat = res.data;
      if (typeof setSelectedChatId === 'function') setSelectedChatId(updatedChat._id);
      chatId = updatedChat._id;
      chat = updatedChat;
    }

    // Always update local selectedChat reference for new/existing chat
    chat = chatsData.find((c: any) => c._id === chatId) ?? chat;

    // Add user message to local chatArray and DB immediately
    setChatArray((prev) => [
      ...prev,
      { user: text, ai: '' }
    ]);
    const userMsg = { user: text, ai: '', datetime: new Date().toISOString() };
    const userMessages = [...(chat?.messages || []), userMsg];
    await axios.put(`http://localhost:3001/api/chats/${chat._id}`, {
      ...chat,
      messages: userMessages
    });

    // Call Ollama API and stream response
    const response = await fetch('http://localhost:3001/api/ollama/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedLLM, prompt: text, stream: true })
    });

    if (!response.body) return;
    const reader = response.body.getReader();
    let aiText = '';
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = new TextDecoder().decode(value);
        aiText += chunk;
        setChatArray((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], ai: aiText };
          }
          return updated;
        });
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Save assistant response in DB immediately
    const updatedMessages = [...userMessages];
    updatedMessages[updatedMessages.length - 1].ai = aiText;
    await axios.put(`http://localhost:3001/api/chats/${chat._id}`, {
      ...chat,
      messages: updatedMessages
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen w-[60vw]">
      {chatArray.length > 0 ? (
        <div className="flex flex-col items-center justify-end pb-20 w-[60vw] min-h-screen relative">
          <CurrentHistory
            messages={
              chatArray.flatMap((m) => [
                { role: 'user' as const, content: m.user },
                { role: 'assistant' as const, content: m.ai }
              ])
            }
          />
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
  );
}

export default App;
