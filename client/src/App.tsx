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
  selectedChatId,
  setChatsData // <-- add setChatsData here
}: any) {
  // Remove messages and currentChat, use chatArray for all rendering
  const [chatArray, setChatArray] = useState<Array<{ user: string; ai: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    } else if (selectedChatId) {
      // Don't clear chatArray if a chat was just created but not yet in chatsData
      // (prevents flicker)
      // Do nothing
    } else {
      setChatArray([]);
    }
  }, [chatsData, selectedChatId]);

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
    setIsLoading(true);

    let chatId = selectedChatId;
    let chat = selectedChat;
    let createdNewChat = false;
    const userMsg = { user: text, ai: '', datetime: new Date().toISOString() };
    if (!chat) {
      // Create new chat with the user message already included
      const newChatData = {
        name: `Chat with ${selectedLLM}`,
        datetime: new Date().toISOString(),
        messages: [userMsg]
      };
      try {
        const res = await axios.post('http://localhost:3001/api/chats', newChatData);
        const backendChat = res.data;
        // First update chatsData and selectedChatId, then set chatArray
        if (typeof setChatsData === 'function') {
          setChatsData((prev: any[]) => [...prev, backendChat]);
        }
        if (typeof setSelectedChatId === 'function') {
          setSelectedChatId(backendChat._id);
        }
        chatId = backendChat._id;
        chat = backendChat;
        createdNewChat = true;
        // Now set chatArray after state updates
        setTimeout(() => {
          setChatArray(backendChat.messages.map((m: any) => ({ user: m.user, ai: m.ai })));
        }, 0);
      } catch (error) {
        console.error("Error creating new chat:", error);
        setIsLoading(false);
        return;
      }
    } else {
      // Existing chat: update chatArray and chatsData
      setChatArray((prev) => [
        ...prev,
        { user: text, ai: '' }
      ]);
      const userMessages = [...(chat?.messages || []), userMsg];
      if (typeof setChatsData === 'function') {
        setChatsData((prev: any[]) => prev.map((c: any) =>
          c._id === chat._id ? { ...c, messages: userMessages } : c
        ));
      }
      try {
        await axios.put(`http://localhost:3001/api/chats/${chat._id}`, {
          ...chat,
          messages: userMessages
        });
      } catch (error) {
        console.error("Error updating existing chat:", error);
        setIsLoading(false);
        return;
      }
    }

    // Call Ollama API and stream response
    const response = await fetch('http://localhost:3001/api/ollama/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedLLM, prompt: text, stream: true })
    });

    if (!response.body) {
      setIsLoading(false);
      return;
    }

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
    // For both new and existing chat, update messages
    let currentChat = chat;
    let updatedMessages: any[] = [];
    if (currentChat) {
      updatedMessages = [...(currentChat.messages || [])];
      updatedMessages[updatedMessages.length - 1] = {
        ...updatedMessages[updatedMessages.length - 1],
        ai: aiText
      };
      await axios.put(`http://localhost:3001/api/chats/${currentChat._id}`, {
        ...currentChat,
        messages: updatedMessages
      });
      // Immediately update chatsData with the assistant response for instant UI feedback
      if (typeof setChatsData === 'function') {
        setChatsData((prev: any[]) => prev.map((c: any) =>
          c._id === currentChat._id ? { ...c, messages: updatedMessages } : c
        ));
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen w-[60vw]">
      {(chatArray.length > 0 || selectedChatId) ? (
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
        {isLoading && <div className="text-center text-gray-400 mt-2">Loading...</div>}
      </footer>
    </div>
  );
}

export default App;
