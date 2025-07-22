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

interface Message {
  user: string;
  ai: string;
  image?: string;
  document?: {
    name: string;
    content?: string;
  };
}

interface ChatData {
  _id: string;
  name: string;
  messages: Array<{ user: string; ai: string; datetime?: string; image?: string; document?: { name: string; content?: string } }>;
  datetime: string;
}

interface AppProps {
  selectedLLM: string;
  setSelectedLLM: (llm: string) => void;
  chatsData: ChatData[];
  setSelectedChatId: (id: string | null) => void;
  selectedChatId: string | null;
  setChatsData: (data: ChatData[]) => void;
}

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api';

export default function App({
  selectedLLM,
  setSelectedLLM,
  chatsData,
  setSelectedChatId,
  selectedChatId,
  setChatsData,
}: AppProps) {
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const prevSelectedChatIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  // Define stopGeneration *before* any useEffect that depends on it
  const stopGeneration = useCallback(() => {
    console.log('[App stopGeneration] Stopping generation...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null; // Clear the ref after aborting
    }
    setIsLoading(false); // Ensure loading state is false
  }, []); // No dependencies here since abortControllerRef and setIsLoading are states/refs

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  useEffect(() => {
    console.log('[App useEffect] selectedChatId for chat data fetch:', selectedChatId);
    const chat = chatsData.find(c => c._id === selectedChatId);
    if (chat) {
      console.log('[App useEffect] Found chat data for ID:', selectedChatId);
      setCurrentChatMessages(chat.messages.map(m => ({
        user: m.user,
        ai: m.ai || '',
        image: m.image,
        document: m.document
      })));
      setHasInteracted(true);
    } else if (!selectedChatId) {
      console.log('[App useEffect] No chat selected, clearing messages.');
      setCurrentChatMessages([]);
      setHasInteracted(false);
    } else {
      console.log('[App useEffect] Chat data not found for ID:', selectedChatId);
    }
  }, [selectedChatId, chatsData]);

  // This useEffect now comes after stopGeneration is defined
  useEffect(() => {
    // If there was a previous chat selected and it's different from the current one,
    // AND there's an ongoing loading process, then abort.
    // This specifically prevents aborting the *first* message of a *new* chat.
    if (
      isLoading &&
      abortControllerRef.current &&
      prevSelectedChatIdRef.current !== null && // Ensures we had a chat selected previously
      prevSelectedChatIdRef.current !== selectedChatId // Ensures the chat actually changed
    ) {
      console.log('[App useEffect] selectedChatId changed, aborting current generation due to chat switch.');
      stopGeneration();
    }
    prevSelectedChatIdRef.current = selectedChatId; // Update the ref for the next render
  }, [selectedChatId, isLoading, stopGeneration]); // stopGeneration is now accessible

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


  const sendMessage = useCallback(
    async (text: string, image?: string, documentFile?: File) => {
      console.log('[App sendMessage] Message received:', text, 'Image present:', !!image, 'Document present:', !!documentFile);
      if (!selectedLLM) {
        alert('Please select an LLM first!');
        console.warn('[App sendMessage] No LLM selected.');
        return;
      }

      // If a generation is already in progress due to a *previous* message in the *same* chat,
      // stop it before starting a new one. This is distinct from switching chats.
      if (isLoading && abortControllerRef.current) {
        console.log('[App sendMessage] An AI generation is already in progress for the current chat. Aborting previous and starting new.');
        stopGeneration(); // This will also set isLoading to false and clear abortControllerRef
      }

      setIsLoading(true); // Set loading for the new request
      setHasInteracted(true);

      const newUserMsg: Message = {
        user: text,
        ai: '',
        image: image,
        document: documentFile ? { name: documentFile.name } : undefined
      };
      setCurrentChatMessages(prev => [...prev, newUserMsg]);
      console.log('[App sendMessage] Added new user message to UI:', newUserMsg);

      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl; // Set the new abort controller for this request
      console.log('[App sendMessage] New AbortController created for this request.');

      const backendMessages: Array<{ role: 'user' | 'assistant'; content: string; images?: string[] }> = [];
      currentChatMessages.forEach(m => {
        const userMessage: { role: 'user'; content: string; images?: string[] } = { role: 'user', content: m.user };
        if (m.image) {
          userMessage.images = [m.image.split(',')[1]];
        }
        backendMessages.push(userMessage);
        if (m.ai.trim()) backendMessages.push({ role: 'assistant', content: m.ai });
      });

      const currentUserMessage: { role: 'user'; content: string; images?: string[] } = { role: 'user', content: text };
      if (image) {
        currentUserMessage.images = [image.split(',')[1]];
      }
      backendMessages.push(currentUserMessage);
      console.log('[App sendMessage] Backend messages prepared. Current selectedChatId for request:', selectedChatId);

      const formData = new FormData();
      formData.append('model', selectedLLM);
      formData.append('messages', JSON.stringify(backendMessages));
      if (selectedChatId) {
        formData.append('chatId', selectedChatId);
      }
      if (documentFile) {
        formData.append('document', documentFile, documentFile.name);
      }

      try {
        const res = await fetch(`${API_BASE_URL}/ollama/chat`, {
          method: 'POST',
          body: formData,
          signal: abortCtrl.signal,
        });

        console.log('[App sendMessage] Fetch request sent. Response status:', res.status);

        const returnedChatId = res.headers.get('X-Chat-ID');
        console.log('[App sendMessage] X-Chat-ID header received:', returnedChatId);

        if (returnedChatId && !selectedChatId) {
          console.log(`[App sendMessage] New chat created! Old selectedChatId was null. Setting new ID and navigating.`);
          setSelectedChatId(returnedChatId);
          navigate(`/chat/${returnedChatId}`);
          console.log(`[App sendMessage] Navigation triggered to: /chat/${returnedChatId}`);
        } else if (returnedChatId && selectedChatId) {
          console.log(`[App sendMessage] Existing chat updated. Chat ID: ${returnedChatId}.`);
          if (returnedChatId !== selectedChatId) {
            console.warn(`[App sendMessage] Mismatch! Backend returned ${returnedChatId} but selectedChatId is ${selectedChatId}. Correcting.`);
            setSelectedChatId(returnedChatId);
            navigate(`/chat/${returnedChatId}`);
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
                  // Ensure we are updating the last message added by this specific send action
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
          console.log('[App sendMessage] Request aborted by user (new message sent or chat switched).');
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
        abortControllerRef.current = null; // Clear the ref, indicating no active request
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
              { role: 'user' as const, content: m.user, image: m.image, document: m.document },
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