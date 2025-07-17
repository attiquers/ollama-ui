import type { Message } from '@/types/index.ts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
// CRITICAL CHANGE: Import a dark highlight.js theme instead of github.css
import 'highlight.js/styles/atom-one-dark.css'; // Or 'dracula.css', 'monokai.css', 'vs2015.css', 'dark.css' etc.

type Message = {
  role: 'user' | 'assistant';
  content: string;
  blinking?: boolean;
};

export default function ChatMessage({ message }: { message: Message }) {
  const textColorClass = message.role === 'user' ? 'text-white' : 'text-gray-100';

  return (
    <div className={`p-3 my-2 rounded-xl max-w-xl ${
      message.role === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-gray-800 text-white self-start'
    }`}>
      {message.blinking ? (
        <span className="animate-pulse text-gray-400">{message.content || '▍'}</span>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // ... (rest of your component definitions remain the same) ...

            // Custom styling for code blocks (pre-formatted text)
            // Ensure this has the desired background color for the overall block.
            // highlight.js will style the <code> inside it.
            pre: ({ node, ...props }) => <pre className="overflow-auto rounded-lg bg-gray-900 p-4 my-4 shadow-md" {...props} />,

            // Custom styling for inline code
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                // This 'code' is inside 'pre' and will be styled by highlight.js theme
                <code className={className} {...props}>
                  {children}
                </code>
              ) : (
                // This is inline code, apply explicit Tailwind classes
                <code className={`${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-yellow-300'} px-1 py-0.5 rounded font-mono text-sm`}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}
    </div>
  );
}