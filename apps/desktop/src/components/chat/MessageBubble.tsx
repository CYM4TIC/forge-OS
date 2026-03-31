import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../hooks/useChat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-bg-elevated text-text-primary rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-bg-secondary [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-accent-hover [&_code]:text-xs [&_a]:text-accent-hover [&_a]:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
        {!isUser && message.status === 'complete' && message.model && (
          <div className="mt-2 pt-1.5 border-t border-border-subtle text-text-muted text-xs flex gap-3">
            <span>{message.model}</span>
            {message.tokens_in != null && message.tokens_out != null && (
              <span>
                {message.tokens_in}↓ {message.tokens_out}↑
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
