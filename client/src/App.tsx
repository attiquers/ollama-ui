import { useEffect, useRef, useState, useCallback } from 'react'; // Import useCallback
import { useNavigate, useParams } from 'react-router-dom'; // useNavigate is not used but kept in import
import axios from 'axios';
import ChatInput from '@/components/ChatInput';
import CurrentHistory from '@/components/CurrentHistory';

// Define types for clarity
type ChatMessageDb = {
  user: string;
  ai: string;
  datetime: string;
};

type DisplayMessage = {
  role: 'user' | 'assistant';
  content: string;
  blinking?: boolean;
};

function App({
  chatId: propChatId,
  llms, // Not used in this component, but kept for signature
  selectedLLM,
  setSelectedLLM,
  chatsData,
  setSelectedChatId,
  selectedChatId,
  setChatsData
}: any) {
  const [currentChatMessages, setCurrentChatMessages] = useState<Array<{ user: string; ai: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false); // New state to track user interaction

  // Find the selected chat from the provided chatsData, or null if not found
  const selectedChat = chatsData.find((c: any) => c._id === selectedChatId) ?? null;

  // Scrolls to the bottom of the chat history whenever messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  // Updates selectedChatId from the URL parameter (propChatId)
  useEffect(() => {
    if (propChatId !== selectedChatId) {
      setSelectedChatId(propChatId ?? null);
    }
  }, [propChatId, selectedChatId, setSelectedChatId]);

  // Loads messages into `currentChatMessages` when `selectedChatId` or `chatsData` changes.
  // This is crucial for switching chats or initializing existing ones.
  useEffect(() => {
    const chat = chatsData.find((c: any) => c._id === selectedChatId);
    if (chat) {
      setCurrentChatMessages(chat.messages.map((m: any) => ({ user: m.user, ai: m.ai })));
      setHasInteracted(true); // If a chat is loaded, we've interacted
    } else if (!selectedChatId && !hasInteracted) {
      // Only clear messages if no chat is selected AND no interaction has occurred yet
      // This prevents clearing when a new chat is being set up.
      setCurrentChatMessages([]);
    }
    // If selectedChatId exists but chat isn't in chatsData yet (e.g., new chat pending creation)
    // we deliberately do nothing here as sendMessage directly updates currentChatMessages.
  }, [chatsData, selectedChatId, hasInteracted]); // Add hasInteracted to dependency array

  // Persists the `selectedLLM` to and from localStorage
  useEffect(() => {
    const storedLLM = localStorage.getItem('selectedLLM');
    if (storedLLM && !selectedLLM) {
      setSelectedLLM(storedLLM);
    }
  }, [selectedLLM, setSelectedLLM]);

  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem('selectedLLM', selectedLLM);
    }
  }, [selectedLLM]);

  // Updates the browser URL to reflect the currently selected chat ID
  useEffect(() => {
    if (selectedChatId && propChatId !== selectedChatId) {
      window.history.replaceState(null, '', `/chat/${selectedChatId}`);
    }
  }, [selectedChatId, propChatId]);

  // Using useCallback for sendMessage to prevent unnecessary re-renders if passed down
  const sendMessage = useCallback(async (text: string) => {
    if (!selectedLLM) {
      alert('Please select an LLM first!');
      return;
    }
    setIsLoading(true);
    setHasInteracted(true); // User has interacted, so we should show chat UI

    let currentChatId = selectedChatId;
    let chatToUpdate = selectedChat;
    let createdNewChat = false;

    const userMessageForDb: ChatMessageDb = { user: text, ai: '', datetime: new Date().toISOString() };

    // **Optimistic UI Update:** Immediately show the user's message and prepare for AI response
    setCurrentChatMessages((prev) => [
      ...prev,
      { user: text, ai: '' } // Add the user's message and an empty AI slot for streaming
    ]);


    if (!chatToUpdate) {
      // --- LOGIC FOR CREATING A NEW CHAT ---
      const newChatData = {
        name: `Chat with ${selectedLLM}`,
        datetime: userMessageForDb.datetime,
        messages: [userMessageForDb]
      };
      try {
        const res = await axios.post('http://localhost:3001/api/chats', newChatData);
        chatToUpdate = res.data;
        currentChatId = chatToUpdate._id;
        createdNewChat = true;

        if (typeof setChatsData === 'function') {
          setChatsData((prev: any[]) => [...prev, chatToUpdate]);
        }
        if (typeof setSelectedChatId === 'function') {
          setSelectedChatId(currentChatId);
        }

        // **CRITICAL FIX:** Directly set `currentChatMessages` from the new chat's data.
        // This ensures the UI reflects the new chat's state immediately and consistently.
        setCurrentChatMessages(chatToUpdate.messages.map((m: any) => ({ user: m.user, ai: m.ai })));

      } catch (error) {
        console.error("Error creating new chat:", error);
        setIsLoading(false);
        setHasInteracted(false); // Revert interaction state if creation fails
        setCurrentChatMessages((prev) => prev.slice(0, prev.length - 1)); // Revert UI
        return;
      }
    } else {
      // --- LOGIC FOR UPDATING AN EXISTING CHAT ---
      const updatedMessagesForDb: ChatMessageDb[] = [...(chatToUpdate.messages || []), userMessageForDb];
      if (typeof setChatsData === 'function') {
        setChatsData((prev: any[]) => prev.map((c: any) =>
          c._id === chatToUpdate._id ? { ...c, messages: updatedMessagesForDb } : c
        ));
      }
      try {
        await axios.put(`http://localhost:3001/api/chats/${chatToUpdate._id}`, {
          ...chatToUpdate,
          messages: updatedMessagesForDb
        });
      } catch (error) {
        console.error("Error updating existing chat:", error);
        setIsLoading(false);
        setCurrentChatMessages((prev) => prev.slice(0, prev.length - 1)); // Revert UI
        return;
      }
    }

    // --- Ollama API Call and Streaming Response Handling ---
    const response = await fetch('http://localhost:3001/api/ollama/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedLLM, prompt: text, stream: true })
    });

    if (!response.body) {
      console.error('No response body received from Ollama stream.');
      setIsLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiAccumulatedText = '';
    let buffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { value, done: doneReading } = await reader.read();
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;

        try {
          const jsonChunk = JSON.parse(line);

          if (jsonChunk.response) {
            aiAccumulatedText += jsonChunk.response;

            setCurrentChatMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  ai: aiAccumulatedText
                };
              }
              return updated;
            });
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }

          if (jsonChunk.done) {
            streamDone = true;
            break;
          }
        } catch (error) {
          console.error("Error parsing JSON chunk from stream:", error, "Line:", line);
        }
      }
      if (doneReading && buffer.trim() === '') {
        streamDone = true;
      }
    }

    // --- After streaming is complete, save the final AI response to the DB ---
    const aiMessageForDb: ChatMessageDb = {
      user: text,
      ai: aiAccumulatedText,
      datetime: new Date().toISOString()
    };

    let finalMessagesForDb: ChatMessageDb[] = [];

    if (createdNewChat) {
        finalMessagesForDb = [...(chatToUpdate?.messages || []), aiMessageForDb];
    } else if (chatToUpdate) {
      const existingMessages = chatToUpdate.messages || [];
      const indexToUpdate = existingMessages.findIndex(
        (msg: ChatMessageDb) => msg.user === text && msg.ai === ''
      );

      if (indexToUpdate !== -1) {
        finalMessagesForDb = [...existingMessages];
        finalMessagesForDb[indexToUpdate] = {
            ...finalMessagesForDb[indexToUpdate],
            ai: aiAccumulatedText,
            datetime: aiMessageForDb.datetime
        };
      } else {
          finalMessagesForDb = [...existingMessages, userMessageForDb, aiMessageForDb];
      }
    }

    if (currentChatId) {
      try {
        await axios.put(`http://localhost:3001/api/chats/${currentChatId}`, {
          ...chatToUpdate,
          messages: finalMessagesForDb,
          name: createdNewChat ? `Chat with ${selectedLLM}` : chatToUpdate.name
        });

        if (typeof setChatsData === 'function') {
          setChatsData((prev: any[]) => prev.map((c: any) =>
            c._id === currentChatId ? { ...c, messages: finalMessagesForDb } : c
          ));
        }
      } catch (error) {
        console.error("Error saving final AI response to DB:", error);
      }
    }

    setIsLoading(false);
  }, [selectedLLM, selectedChatId, selectedChat, setChatsData, setSelectedChatId, setHasInteracted]); // Add dependencies for useCallback

  return (
    <div className="flex-1 flex bg-gray-800 items-center justify-center min-h-screen w-[60vw]">
      {/*
        Always render the chat container once a chat has been initiated,
        either by selecting an existing chat or starting a new one.
        This prevents the "flicker" of the component unmounting and remounting.
      */}
      {(selectedChatId || hasInteracted || currentChatMessages.length > 0) ? (
        <div className="flex flex-col items-center justify-end pb-20 w-[60vw] min-h-screen relative">
          <CurrentHistory
            messages={
              currentChatMessages.flatMap((m) => [
                { role: 'user' as const, content: m.user },
                { role: 'assistant' as const, content: m.ai, blinking: isLoading && m.ai === '' }
              ])
            }
          />
          <div ref={chatEndRef} />
        </div>
      ) : (
        // Render the initial empty state (Ollama logo) only if no chat is selected and no interaction has occurred
        <div className="flex flex-col items-center justify-center w-[60vw] min-h-screen relative">
          <div className="flex flex-col items-center w-full justify-end pb-20">
            <div>
              <img src="ollama.svg" alt="Ollama Logo" className='h-50 pb-4' />
            </div>
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-extrabold text-white mb-2">Private, Fast, Secure</h2>
            </div>
          </div>
          <div ref={chatEndRef} />
        </div>
      )}
      <div className='fixed bottom-0 bg-gray-800 py-3 rounded-sm'>
        <footer className='w-[60vw]'>
          <ChatInput onSend={sendMessage} />
          {/* {isLoading && <div className="text-center text-gray-400 mt-2">Generating...</div>} */}
        </footer>
      </div>
    </div>
  );
}

export default App;