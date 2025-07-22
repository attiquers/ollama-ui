import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { FiSend, FiImage, FiPaperclip, FiStopCircle, FiX, FiPlus } from 'react-icons/fi'; // Import FiPlus

interface ChatInputProps {
  onSend: (text: string, image?: string, documentFile?: File) => void;
  isLoading: boolean;
  onStop: () => void;
}

export default function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [documentFile, setDocumentFile] = useState<File | undefined>(undefined);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false); // New state for dropdown

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const attachmentButtonRef = useRef<HTMLButtonElement>(null); // Ref for the + button

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

  // Close attachment options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        attachmentButtonRef.current &&
        !attachmentButtonRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.attachment-options') // Check if click is inside options
      ) {
        setShowAttachmentOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setDocumentFile(undefined); // Clear document if image is selected
        setShowAttachmentOptions(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      setImage(undefined); // Clear image if document is selected
      setShowAttachmentOptions(false);
    }
  };

  const handleAttachmentButtonClick = () => {
    setShowAttachmentOptions((prev) => !prev);
  };

  const handleImageUploadClick = () => {
    imageInputRef.current?.click();
  };

  const handleDocumentUploadClick = () => {
    documentInputRef.current?.click();
  };

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();

    // Allow sending only if there's text, an image, OR a document
    if (!trimmed && !image && !documentFile) return;

    // If currently loading, stop the ongoing generation first
    if (isLoading) {
      onStop(); // Call onStop to abort the current generation
      // The onSend will be called immediately after this, initiating a new request.
    }

    onSend(trimmed, image, documentFile); // Proceed to send the new message
    setInput('');
    setImage(undefined);
    setDocumentFile(undefined);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      {image && (
        <div className="relative mb-2 self-start rounded-md overflow-hidden border border-gray-600">
          <img src={image} alt="Preview" className="max-h-32 object-contain" />
          <button
            type="button"
            onClick={() => setImage(undefined)}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
            aria-label="Remove image"
          >
            <FiX size={16} />
          </button>
        </div>
      )}
      {documentFile && (
        <div className="relative mb-2 self-start flex items-center bg-[#282A2C] text-white px-3 py-1 rounded-md border border-gray-600">
          <FiPaperclip size={18} className="mr-2" />
          <span>{documentFile.name}</span>
          <button
            type="button"
            onClick={() => setDocumentFile(undefined)}
            className="ml-3 bg-red-500 text-white rounded-full p-0.5 text-xs flex items-center justify-center"
            aria-label="Remove document"
          >
            <FiX size={16} />
          </button>
        </div>
      )}
      <div className="bg-[#1B1C1D] border-2 border-[#393c3f] px-4 py-2 rounded-4xl flex items-end gap-2 w-full relative"> {/* Added relative for dropdown positioning */}
        {/* Hidden file inputs */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={documentInputRef}
          accept=".pdf,.txt,.docx"
          onChange={handleDocumentChange}
          style={{ display: 'none' }}
        />

        {/* Plus button for attachments */}
        <button
          type="button"
          ref={attachmentButtonRef}
          onClick={handleAttachmentButtonClick}
          className="hover:bg-[#282A2C] text-white p-2 rounded-full flex items-center justify-center mb-1"
          aria-label="Attach file"
        >
          <FiPlus size={24} />
        </button>

        {/* Attachment Options Dropdown */}
        {showAttachmentOptions && (
          <div className="attachment-options absolute bottom-full left-0 mb-2  bg-[#282A2C] border border-gray-600 rounded-md shadow-lg z-10">
            <button
              type="button"
              onClick={handleImageUploadClick}
              className="flex items-center w-full px-4 py-2 text-white hover:bg-[#393c3f] rounded-t-md"
            >
              <FiImage size={20} className="mr-2" /> Upload Image
            </button>
            <button
              type="button"
              onClick={handleDocumentUploadClick}
              className="flex items-center w-full px-4 py-2 text-white hover:bg-[#393c3f] rounded-b-md"
            >
              <FiPaperclip size={20} className="mr-2" /> Upload Document
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or add a file..."
          rows={1}
          className="flex-grow max-h-[20vh] p-2 border-none rounded-full text-white resize-none overflow-y-auto min-h-[44px] focus:outline-none bg-transparent text-lg" // Added text-2xl here
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
          <button
            type="submit"
            className="text-white p-3 rounded-full hover:bg-[#282A2C] flex items-center justify-center ml-2"
            aria-label="Send"
          >
            <FiSend size={20} />
          </button>
        )}
      </div>
    </form>
  );
}