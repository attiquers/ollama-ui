// import type { Message } from '@/types/index.ts';
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatMessage({ message }: { message: Message }) {
  return (
    <div className={`p-3 my-2 rounded-xl max-w-xl ${
      message.role === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-gray-200 text-black self-start'
    }`}>
      {message.blinking ? (
        <span className="animate-pulse text-gray-400">{message.content || '▍'}</span>
      ) : (
        message.content
      )}
    </div>
  );
}
