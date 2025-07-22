import ChatMessage from './ChatMessage';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Added image property
  blinking?: boolean; // Keep blinking for assistant messages
};

export default function CurrentHistory({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto w-full">
      {messages.map((msg, i) => (
        <ChatMessage key={i} message={msg} />
      ))}
    </div>
  );
}