import ChatHistory from './ChatHistory';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};
export default function CurrentHistory({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col w-full max-w-2xl overflow-hidden  ">
      <ChatHistory messages={messages} />
    </div>
  );
}
