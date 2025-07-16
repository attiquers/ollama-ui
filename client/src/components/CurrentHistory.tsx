import ChatHistory from './ChatHistory';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};
export default function CurrentHistory({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col w-full overflow-hidden ">
      <ChatHistory messages={messages} />
    </div>
  );
}
