import { useState, useRef, useEffect } from 'react';
import ChatHistory from '@/components/ChatHistory';
import ChatInput from '@/components/ChatInput';
import SideBar from '@/components/SideBar';
import CurrentHistory from '@/components/CurrentHistory';
import chatsDataJson from './dummyChats.json';
// import { Message } from '@/types';
type Message = {
  role: 'user' | 'assistant';
  content: string;
};



function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatsData] = useState<any[]>(chatsDataJson);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const selectedChat = chatsData.find((c: any) => c.id === selectedChatId) ?? null;

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
    <div className="min-h-screen min-w-screen bg-gray-800 flex flex-row">
      <SideBar setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} chats={chatsData} />
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center w-[60vw] min-h-screen relative">
          {selectedChat ? (
            <CurrentHistory messages={selectedChat.messages.flatMap((m: any) => [
              { role: 'user' as const, content: m.user },
              { role: 'assistant' as const, content: m.ai }
            ])} />
          ) : (
            <div className="flex flex-col items-center w-full">
              <div>
                <img src="ollama.svg" alt="Ollama Logo" className='h-50 pb-4' />
              </div>
              <div className="mb-8 text-center">
                <h2 className="text-4xl font-extrabold text-white mb-2">Private, Fast, Secure</h2>
              </div>
            </div>
          )}
          <footer className='absolute bottom-2 w-full'>
            <ChatInput onSend={sendMessage} />
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
