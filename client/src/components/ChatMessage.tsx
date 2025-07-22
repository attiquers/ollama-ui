import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

import { MdContentCopy, MdCheck } from 'react-icons/md';
import { FiPaperclip } from 'react-icons/fi';
import type { Components } from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  blinking?: boolean;
  image?: string;
  document?: {
    name: string;
    content?: string;
  };
}

const copyToClipboard = (text: string, setCopied: (status: boolean) => void) => {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

interface CustomCodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export default function ChatMessage({ message }: { message: Message }) {
  const [isAICopied, setIsAICopied] = useState(false);
  const [showAITooltip, setShowAITooltip] = useState(false);

  const messageContainerClasses = message.role === 'user'
    ? 'w-fit max-w-4xl bg-[#282A2C] text-white self-end'
    : 'w-full bg-[#1B1C1D] text-white self-start';

  const customComponents: Components = {
    p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-gray-100" {...props} />,
    li: ({ node, ...props }) => <li className="mb-2 last:mb-0 text-gray-100" {...props} />,
    pre: ({ node, children, ...props }) => {
      const [isCodeCopied, setIsCodeCopied] = useState(false);
      const [showCodeTooltip, setShowCodeTooltip] = useState(false);

      const codeContent = React.Children.toArray(children)
        .map(child => {
          if (
            React.isValidElement(child) &&
            typeof (child.props as { children?: string | string[] }).children === 'string'
          ) {
            return (child.props as { children: string }).children;
          }
          if (
            React.isValidElement(child) &&
            Array.isArray((child.props as { children?: string | string[] }).children)
          ) {
            return ((child.props as { children: string[] }).children).join('');
          }
          return '';
        })
        .join('');

      return (
        <pre
          className="relative rounded-lg p-4 my-4 shadow-md group"
          {...props}
        >
          <button
            onClick={() => copyToClipboard(codeContent, setIsCodeCopied)}
            onMouseEnter={() => setShowCodeTooltip(true)}
            onMouseLeave={() => setShowCodeTooltip(false)}
            className="absolute right-4 p-2 rounded-md bg-gray-700 text-white text-xs opacity-100 cursor-pointer hover:bg-gray-600 transition-colors duration-200 z-10 flex items-center justify-center"
          >
            {isCodeCopied ? (
              <MdCheck className="w-4 h-4 text-green-400" />
            ) : (
              <MdContentCopy className="w-4 h-4" />
            )}
            {isCodeCopied && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                Copied!
              </span>
            )}
            {!isCodeCopied && showCodeTooltip && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                Copy code
              </span>
            )}
          </button>
          {children}
        </pre>
      );
    },
    code: ({ node, inline, className, children, ...props }: CustomCodeProps) => {
      const match = /language-(\w+)/.exec(className || '');

      return !inline && match ? (
        <code className={`${className} font-mono text-base`} {...props}>
          {children}
        </code>
      ) : (
        <code className={`bg-gray-700 text-gray-100 px-1 py-0.5 rounded font-mono text-base`}>
          {children}
        </code>
      );
    },
    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 mt-6 text-white" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mb-3 mt-5 text-white" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-xl font-medium mb-2 mt-4 text-white" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 last:mb-0 text-gray-100" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 last:mb-0 text-gray-100" {...props} />,
    a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
    em: ({ node, ...props }) => <em className="italic text-gray-300" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-500 pl-4 py-2 my-4 text-gray-300 italic" {...props} />,
  };

  return (
    <div
      className={`p-3 mb-6 my-2 rounded-xl text-xl font-sans relative group ${messageContainerClasses}`}
    >
      {message.blinking ? (
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse"></div>
          <span className="text-gray-400">Thinking...</span>
        </div>
      ) : (
        <>
          {message.role === 'user' && message.image && (
            <div className="mb-2 max-w-full overflow-hidden rounded-md border border-gray-600">
              <img src={message.image} alt="User Upload" className="max-w-full h-auto object-contain" />
            </div>
          )}

          {message.role === 'user' && message.document && (
            <div className="mb-2 flex items-center bg-[#1B1C1D] text-gray-300 p-2 rounded-md border border-gray-700">
              <FiPaperclip size={18} className="mr-2" />
              <span>{message.document.name} attached.</span>
            </div>
          )}

          {message.role === 'assistant' && !message.blinking && (
            <div className="absolute -bottom-4 left-2 z-10">
              <button
                onClick={() => copyToClipboard(message.content, setIsAICopied)}
                onMouseEnter={() => setShowAITooltip(true)}
                onMouseLeave={() => setShowAITooltip(false)}
                className="relative p-2 rounded-md bg-gray-700 text-white text-sm cursor-pointer hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center"
              >
                {isAICopied ? (
                  <MdCheck className="w-4 h-4 text-green-400" />
                ) : (
                  <MdContentCopy className="w-4 h-4" />
                )}
                {isAICopied && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-100 transition-opacity duration-200">
                    Copied!
                  </span>
                )}
                {!isAICopied && showAITooltip && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-100 transition-opacity duration-200">
                    Copy whole response
                  </span>
                )}
              </button>
            </div>
          )}

          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={customComponents}
          >
            {message.content}
          </ReactMarkdown>
        </>
      )}
    </div>
  );
}