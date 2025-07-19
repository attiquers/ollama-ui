// ChatInput.tsx
import { useState, useRef, useEffect } from 'react';
import { FiSend, FiPlus, FiStopCircle } from 'react-icons/fi'; // Import FiStopCircle

export default function ChatInput({ onSend, isLoading, onStop }: { onSend: (text: string) => void; isLoading: boolean; onStop: () => void; }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) { // Prevent sending new messages while loading
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) { // Prevent sending new messages while loading
        handleSubmit(e as any);
      }
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeightPx = window.innerHeight * 0.20;
      if (scrollHeight > maxHeightPx) {
        textarea.style.height = maxHeightPx + 'px';
      } else {
        textarea.style.height = scrollHeight + 'px';
      }
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col ">
      <div className="bg-[#1B1C1D] border-2 border-[#393c3f] px-4 py-2 rounded-4xl flex items-end gap-2 w-full">
        <textarea
          ref={textareaRef}
          className="max-h-[20vh] flex-grow p-2 border-none rounded-full active:outline-none focus:outline-none  text-white resize-none min-h-[44px] overflow-y-auto"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{ lineHeight: '1.5' }}
          disabled={isLoading} // Disable input while loading
        />
        {/* Conditionally render Stop button or Send/Plus buttons */}
        {isLoading ? (
          <button
            type="button" // Important: not submit
            onClick={onStop}
            className="text-red-500 p-3 rounded-full hover:bg-[#282A2C] flex items-center justify-center ml-2"
            aria-label="Stop Generation"
          >
            <FiStopCircle size={24} />
          </button>
        ) : (
          <>
            <button type="button" className="hover:bg-[#282A2C] text-white p-2 rounded-full flex items-center justify-center mb-1" aria-label="Add">
              <FiPlus size={24} />
            </button>
            <button
              type="submit"
              className="text-white p-3 rounded-full hover:bg-[#282A2C] flex items-center justify-center ml-2"
              aria-label="Send"
            >
              <FiSend size={20} />
            </button>
          </>
        )}
      </div>
    </form>
  );
}