import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css'; // Dark theme for code highlighting

// Import icons from react-icons/md
import { MdContentCopy, MdCheck } from 'react-icons/md'; // MdContentCopy for copy, MdCheck for tick

// Define the Message type
interface Message {
  role: 'user' | 'assistant';
  content: string;
  blinking?: boolean;
}

/**
 * Helper function to copy text to the clipboard.
 * Uses document.execCommand('copy') for better compatibility in iframes.
 * @param {string} text - The text to copy.
 * @param {Function} setCopied - State setter to update the 'copied' status.
 */
const copyToClipboard = (text: string, setCopied: (status: boolean) => void) => {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Prevent scrolling to bottom
    textarea.style.opacity = '0'; // Make it invisible
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset "Copied!" message and icon after 2 seconds
  } catch (err) {
    console.error('Failed to copy text: ', err);
    // In a real application, you might show a user-friendly error message here.
  }
};

/**
 * ChatMessage Component
 * Displays a single chat message, styling it differently based on the sender (user or assistant).
 * It supports Markdown rendering, including code highlighting and copy functionality.
 *
 * @param {Object} props - The component props.
 * @param {Message} props.message - The message object containing role, content, and an optional blinking state.
 */
export default function ChatMessage({ message }: { message: Message }) {
  // State for controlling the 'Copied!' message and icon for the AI prompt button
  const [isAICopied, setIsAICopied] = useState(false);
  // State for controlling the tooltip visibility on hover for the AI prompt button
  const [showAITooltip, setShowAITooltip] = useState(false);

  // Determine the base styling for the message container based on the role.
  const messageContainerClasses = message.role === 'user'
    ? 'w-fit max-w-4xl bg-[#282A2C] text-white self-end'
    : 'w-full bg-[#1B1C1D] text-white self-start';

  return (
    // The main container for the chat message.
    <div
      className={`p-3 mb-6 my-2 rounded-xl text-xl font-sans relative group ${messageContainerClasses}`}
    >
      {message.blinking ? (
        // Display a blinking cursor or content when the message is still being generated
        <span className="animate-pulse text-gray-400">{message.content || '▍'}</span>
      ) : (
        <>
          {/* AI Prompt Copy Button - visible at bottom-left for assistant messages once complete */}
          {/* It will only show if the message role is assistant AND it's not blinking (i.e., fully generated) */}
          {message.role === 'assistant' && !message.blinking && (
            <div className="absolute -bottom-4 left-2 z-10">
              <button
                onClick={() => copyToClipboard(message.content, setIsAICopied)}
                onMouseEnter={() => setShowAITooltip(true)}
                onMouseLeave={() => setShowAITooltip(false)}
                className="relative p-2 rounded-md bg-gray-700 text-white text-sm cursor-pointer hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center"
              >
                {/* Conditionally render MdCheck when copied, otherwise MdContentCopy */}
                {isAICopied ? (
                  <MdCheck className="w-4 h-4 text-green-400" /> // Green check for copied state
                ) : (
                  <MdContentCopy className="w-4 h-4" />
                )}

                {/* Conditional rendering for "Copied!" message (tooltip) */}
                {isAICopied && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-100 transition-opacity duration-200">
                    Copied!
                  </span>
                )}
                {/* Conditional rendering for hover tooltip */}
                {!isAICopied && showAITooltip && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-100 transition-opacity duration-200">
                    Copy whole response
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Render the message content using ReactMarkdown */}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Custom component for paragraphs to add vertical margin and text color
              p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-gray-100" {...props} />,
              // Custom component for list items to add vertical margin and text color
              li: ({ node, ...props }) => <li className="mb-2 last:mb-0 text-gray-100" {...props} />,
              // Custom component for preformatted text blocks (code blocks)
              pre: ({ node, children, ...props }) => {
                const [isCodeCopied, setIsCodeCopied] = useState(false);
                // State for controlling the tooltip visibility on hover for code blocks
                const [showCodeTooltip, setShowCodeTooltip] = useState(false);

                // Extract the raw text content from the children of the pre tag
                const codeContent = Array.isArray(children)
                  ? children.map(child => {
                      if (typeof child === 'string') return child;
                      if (React.isValidElement(child) && child.props && child.props.children) {
                        return Array.isArray(child.props.children) ? child.props.children.join('') : child.props.children;
                      }
                      return '';
                    }).join('')
                  : typeof children === 'string' ? children : '';

                return (
                  <pre
                    className="relative rounded-lg p-4 my-4 shadow-md group"
                    {...props}
                  >
                    {/* Code Block Copy Button - always visible at top-right */}
                    <button
                      onClick={() => copyToClipboard(codeContent, setIsCodeCopied)}
                      onMouseEnter={() => setShowCodeTooltip(true)} // Show tooltip on hover in
                      onMouseLeave={() => setShowCodeTooltip(false)} // Hide tooltip on hover out
                      className="absolute right-4 p-2 rounded-md700 text-white text-xs opacity-100 cursor-pointer hover:bg-gray-600 transition-colors duration-200 z-10 flex items-center justify-center"
                    >
                      {/* Conditionally render MdCheck when copied, otherwise MdContentCopy */}
                      {isCodeCopied ? (
                        <MdCheck className="w-4 h-4 text-green-400" /> // Green check for copied state
                      ) : (
                        <MdContentCopy className="w-4 h-4" />
                      )}

                      {/* Conditional rendering for "Copied!" message */}
                      {isCodeCopied && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                          Copied!
                        </span>
                      )}
                      {/* Conditional rendering for hover tooltip */}
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
              // Custom component for code elements (both inline and block)
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');

                return !inline && match ? (
                  <code className={`${className} font-mono text-base`} {...props}>
                    {children}
                  </code>
                ) : (
                  // Apply consistent styling for inline code regardless of role
                  <code className={`bg-gray-700 text-gray-100 px-1 py-0.5 rounded font-mono text-base`}>
                    {children}
                  </code>
                );
              },
              // Add custom components for other elements if needed for spacing, e.g., headings
              h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 mt-6 text-white" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mb-3 mt-5 text-white" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl font-medium mb-2 mt-4 text-white" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 last:mb-0 text-gray-100" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 last:mb-0 text-gray-100" {...props} />,
              // Add a component for links to give them a distinct color
              a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
              // Add strong/bold text styling
              strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
              // Add emphasis/italic text styling
              em: ({ node, ...props }) => <em className="italic text-gray-300" {...props} />,
              // Add blockquote styling
              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-500 pl-4 py-2 my-4 text-gray-300 italic" {...props} />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </>
      )}
    </div>
  );
}