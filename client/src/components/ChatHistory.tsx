import ChatMessage from './ChatMessage';
// import { Message } from '@/types';
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatHistory({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-4 flex-grow">
      {messages.map((msg, i) => (
        <ChatMessage key={i} message={msg} />
      ))}
    </div>
  );
}
