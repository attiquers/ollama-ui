import { useState, useRef, useEffect } from 'react';
import ChatHistory from '@/components/ChatHistory';
import ChatInput from '@/components/ChatInput';
// import { Message } from '@/types';
type Message = {
  role: 'user' | 'assistant';
  content: string;
};


function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen min-w-screen w-full bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center w-full">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-2">Private, Fast, Secure</h2>
        </div>

        
         
        <footer className='w-[80vw] absolute bottom-0 '>
            <ChatInput onSend={sendMessage} />
        </footer>
      </div>
    </div>
  );
}

export default App;
