import ChatMessage from './ChatMessage';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// Dummy messages for testing
const dummyMessages: Message[] = [
  { role: 'user', content: 'Hello, who are you?' },
  { role: 'assistant', content: 'I am an AI assistant. How can I help you today?' },
  { role: 'user', content: 'Tell me a joke.' },
  { role: 'assistant', content: 'Why did the scarecrow win an award? Because he was outstanding in his field!' },
];

export default function ChatHistory({ messages = dummyMessages }: { messages?: Message[] }) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-4 flex-grow">
      {messages.map((msg, i) => (
        <ChatMessage key={i} message={msg} />
      ))}
    </div>
  );
}
