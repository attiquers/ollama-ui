import type { Message } from '@/types/index.ts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // Or your preferred highlight.js theme

type Message = {
  role: 'user' | 'assistant';
  content: string;
  blinking?: boolean;
};

export default function ChatMessage({ message }: { message: Message }) {
  return (
    <div className={`p-3 my-2 rounded-xl max-w-xl ${
      message.role === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-gray-200 text-black self-start'
    }`}>
      {message.blinking ? (
        <span className="animate-pulse text-gray-400">{message.content || '▍'}</span>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Custom styling for headings
            h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-3" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-5 mb-2 border-b pb-1 border-gray-300" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xl font-medium mt-4 mb-2 text-blue-700" {...props} />,
            h4: ({ node, ...props }) => <h4 className="text-lg font-medium mt-3 mb-1" {...props} />,
            h5: ({ node, ...props }) => <h5 className="text-base font-medium mt-2 mb-1" {...props} />,
            h6: ({ node, ...props }) => <h6 className="text-sm font-medium mt-1 mb-1" {...props} />,

            // Custom styling for paragraphs
            p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,

            // Custom styling for strong (bold) text
            strong: ({ node, ...props }) => <strong className="font-extrabold text-gray-800" {...props} />,

            // Custom styling for emphasis (italic) text
            em: ({ node, ...props }) => <em className="italic text-gray-600" {...props} />,

            // Custom styling for unordered lists
            ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-4 space-y-1" {...props} />,

            // Custom styling for ordered lists
            ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-4 space-y-1" {...props} />,

            // Custom styling for list items (can be combined with ul/ol for more control)
            li: ({ node, ...props }) => <li className="mb-1" {...props} />,

            // Custom styling for links
            a: ({ node, ...props }) => <a className="text-blue-600 hover:underline break-words" target="_blank" rel="noopener noreferrer" {...props} />,

            // Custom styling for blockquotes
            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-400 pl-4 py-2 italic text-gray-700 my-4" {...props} />,

            // Custom styling for code blocks (pre-formatted text)
            pre: ({ node, ...props }) => <pre className="overflow-auto rounded-lg bg-gray-800 text-white p-4 my-4 shadow-md" {...props} />,

            // Custom styling for inline code
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                // Render code block with highlighting
                <code className={className} {...props}>
                  {children}
                </code>
              ) : (
                // Render inline code
                <code className="bg-gray-300 px-1 py-0.5 rounded text-red-700 font-mono text-sm" {...props}>
                  {children}
                </code>
              );
            },
            // Add other HTML elements as needed for more specific styling
            // table: ({ node, ...props }) => <table className="table-auto w-full my-4 border-collapse border border-gray-400" {...props} />,
            // th: ({ node, ...props }) => <th className="px-4 py-2 bg-gray-200 border border-gray-300 text-left font-bold" {...props} />,
            // td: ({ node, ...props }) => <td className="px-4 py-2 border border-gray-300" {...props} />,
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}
    </div>
  );
}