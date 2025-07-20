// src/App.tsx
import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ChatInput from '@/components/ChatInput';
import CurrentHistory from '@/components/CurrentHistory';
// Removed useParams from App.tsx as it's handled in ChatRoutes.tsx
// import { useParams } from 'react-router-dom';

interface Message {
  user: string;
  ai: string;
}

interface ChatData {
  _id: string;
  name: string;
  messages: Array<{ user: string; ai: string; datetime?: string }>;
  datetime: string;
}

interface AppProps {
  chatId: string | null; // This is propChatId from ChatRoutes.tsx
  selectedLLM: string;
  setSelectedLLM: (llm: string) => void;
  chatsData: ChatData[];
  setSelectedChatId: (id: string | null) => void;
  selectedChatId: string | null;
  setChatsData: (data: ChatData[]) => void;
}

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api';

export default function App({
  chatId: propChatId, // Renamed for clarity in App.tsx to avoid confusion with internal state
  selectedLLM,
  setSelectedLLM,
  chatsData,
  setSelectedChatId,
  selectedChatId, // The central selectedChatId state from ChatRoutes.tsx
  setChatsData,
}: AppProps) {
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  // Removed the problematic useEffect that was resetting selectedChatId to null.
  // The selectedChatId is now primarily managed by the setSelectedChatId prop from ChatRoutes.tsx.
  // When navigation occurs, ChatRoutes.tsx's useParams will update its selectedChatId state,
  // which then propagates correctly to this component via the selectedChatId prop.
  // The sendMessage function will also directly update selectedChatId via setSelectedChatId prop.

  useEffect(() => {
    console.log('[App useEffect] selectedChatId for chat data fetch:', selectedChatId);
    const chat = chatsData.find(c => c._id === selectedChatId);
    if (chat) {
      console.log('[App useEffect] Found chat data for ID:', selectedChatId);
      setCurrentChatMessages(chat.messages.map(m => ({ user: m.user, ai: m.ai || '' })));
      setHasInteracted(true);
    } else if (!selectedChatId) {
      console.log('[App useEffect] No chat selected, clearing messages.');
      setCurrentChatMessages([]);
      setHasInteracted(false);
    } else {
      console.log('[App useEffect] Chat data not found for ID:', selectedChatId);
    }
  }, [selectedChatId, chatsData]);

  useEffect(() => {
    const saved = localStorage.getItem('selectedLLM');
    if (saved) {
      setSelectedLLM(saved);
      console.log('[App useEffect] Loaded selected LLM from localStorage:', saved);
    }
  }, [setSelectedLLM]);

  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem('selectedLLM', selectedLLM);
      console.log('[App useEffect] Saved selected LLM to localStorage:', selectedLLM);
    }
  }, [selectedLLM]);

  const refetchChats = useCallback(async () => {
    console.log('[App refetchChats] Attempting to refetch chats...');
    try {
      const { data } = await axios.get<ChatData[]>(`${API_BASE_URL}/chats`);
      setChatsData(data);
      console.log('[App refetchChats] Chats refetched successfully. Total chats:', data.length);
    } catch (e) {
      console.error('[App refetchChats] Error refetching chats:', e);
    }
  }, [setChatsData]);

  const stopGeneration = useCallback(() => {
    console.log('[App stopGeneration] Stopping generation...');
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      console.log('[App sendMessage] Message received:', text);
      if (!selectedLLM) {
        alert('Please select an LLM first!');
        console.warn('[App sendMessage] No LLM selected.');
        return;
      }
      if (isLoading) {
        console.log('[App sendMessage] Already loading, stopping current generation.');
        stopGeneration();
      }

      setIsLoading(true);
      setHasInteracted(true);

      const newUserMsg: Message = { user: text, ai: '' };
      setCurrentChatMessages(prev => [...prev, newUserMsg]);
      console.log('[App sendMessage] Added new user message to UI:', newUserMsg);

      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;
      console.log('[App sendMessage] AbortController created.');

      const backendMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      currentChatMessages.forEach(m => {
        backendMessages.push({ role: 'user', content: m.user });
        if (m.ai.trim()) backendMessages.push({ role: 'assistant', content: m.ai });
      });
      backendMessages.push({ role: 'user', content: text });
      console.log('[App sendMessage] Backend messages prepared. Current selectedChatId for request:', selectedChatId);


      try {
        const res = await fetch(`${API_BASE_URL}/ollama/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedLLM,
            messages: backendMessages,
            stream: true,
            chatId: selectedChatId,
          }),
          signal: abortCtrl.signal,
        });

        console.log('[App sendMessage] Fetch request sent. Response status:', res.status);

        // 🔥 NEW LOGGING HERE: Log all headers received by JavaScript
        console.log('[App sendMessage] All response headers (as seen by JS):');
        for (const [key, value] of res.headers.entries()) {
          console.log(`    ${key}: ${value}`);
        }

        const returnedChatId = res.headers.get('X-Chat-ID');
        console.log('[App sendMessage] X-Chat-ID header received:', returnedChatId);

        if (returnedChatId && !selectedChatId) {
          console.log(`[App sendMessage] New chat created! Old selectedChatId was null. Setting new ID and navigating.`);
          setSelectedChatId(returnedChatId); // Update the central state
          navigate(`/chat/${returnedChatId}`);
          console.log(`[App sendMessage] Navigation triggered to: /chat/${returnedChatId}`);
        } else if (returnedChatId && selectedChatId) {
          console.log(`[App sendMessage] Existing chat updated. Chat ID: ${returnedChatId}.`);
          // Even if chat is updated, ensure the current selected chat ID is correct
          if (returnedChatId !== selectedChatId) {
            console.warn(`[App sendMessage] Mismatch! Backend returned ${returnedChatId} but selectedChatId is ${selectedChatId}. Correcting.`);
            setSelectedChatId(returnedChatId); // Update the central state
            navigate(`/chat/${returnedChatId}`); // Re-navigate if ID changes unexpectedly
          }
        } else if (!returnedChatId) {
          console.warn('[App sendMessage] No X-Chat-ID header returned from backend for this request.');
        }


        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buffer = '';
        let ai = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[App sendMessage] AI stream finished.');
            break;
          }
          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const l of lines) {
            if (!l.trim()) continue;
            try {
              const json = JSON.parse(l);
              if (json.message?.content) {
                ai += json.message.content;
                setCurrentChatMessages(prev => {
                  const upd = [...prev];
                  if (upd.length) upd[upd.length - 1].ai = ai;
                  return upd;
                });
              }
            } catch {
              /* ignore invalid json */
              console.warn('[App sendMessage] Malformed JSON received from stream:', l);
            }
          }
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.log('[App sendMessage] Request aborted by user.');
        } else {
          console.error('[App sendMessage] Error during message sending:', e);
          setCurrentChatMessages(prev => {
            const upd = [...prev];
            if (upd.length && !upd[upd.length - 1].ai)
              upd[upd.length - 1].ai = 'Error: ' + e.message;
            return upd;
          });
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        console.log('[App sendMessage] Finalizing, refetching chats...');
        refetchChats();
      }
    },
    [selectedLLM, selectedChatId, currentChatMessages, isLoading, refetchChats, setSelectedChatId, navigate, stopGeneration]
  );

  return (
    <div className="flex-1 flex bg-[#1B1C1D] items-center justify-center min-h-screen w-[60vw]">
      {(selectedChatId || hasInteracted || currentChatMessages.length > 0) ? (
        <div className="flex flex-col items-center justify-end pb-20 w-[60vw] min-h-screen relative">
          <CurrentHistory
            messages={currentChatMessages.flatMap(m => [
              { role: 'user' as const, content: m.user },
              { role: 'assistant' as const, content: m.ai, blinking: isLoading && !m.ai },
            ])}
          />
          <div ref={chatEndRef} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-[60vw] min-h-screen relative">
          <div className="flex flex-col items-center w-full justify-end pb-20">
            <img src="ollama.svg" alt="Ollama Logo" className="h-50 pb-4" />
            <h2 className="text-4xl font-extrabold text-white mb-2">
              Private, Fast, Secure
            </h2>
          </div>
          <div ref={chatEndRef} />
        </div>
      )}
      <div className="fixed bottom-0 bg-[#1B1C1D] pb-4 rounded-sm z-30">
        <footer className="w-[60vw]">
          <ChatInput onSend={sendMessage} isLoading={isLoading} onStop={stopGeneration} />
        </footer>
      </div>
    </div>
  );
}