// ChatInput.tsx
import { useState, useRef, useEffect } from 'react';
import { FiSend, FiPlus, FiStopCircle } from 'react-icons/fi';

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onStop: () => void;
}

export default function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = window.innerHeight * 0.2;
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <div className="bg-[#1B1C1D] border-2 border-[#393c3f] px-4 py-2 rounded-4xl flex items-end gap-2 w-full">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Type your message..."
          rows={1}
          className="flex-grow max-h-[20vh] p-2 border-none rounded-full text-white resize-none overflow-y-auto min-h-[44px] focus:outline-none bg-transparent"
          style={{ lineHeight: '1.5' }}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="text-red-500 p-3 rounded-full hover:bg-[#282A2C] flex items-center justify-center ml-2"
            aria-label="Stop Generation"
          >
            <FiStopCircle size={24} />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="hover:bg-[#282A2C] text-white p-2 rounded-full flex items-center justify-center mb-1"
              aria-label="Add"
            >
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
