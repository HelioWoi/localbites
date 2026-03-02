import React from 'react';
import { X } from 'lucide-react';
import { ContentPanelData } from '../../types/chat';
import ReactMarkdown from 'react-markdown';

interface ContentSlidePanelProps {
  content: ContentPanelData | null;
  isOpen: boolean;
  onClose: () => void;
}

const ContentSlidePanel: React.FC<ContentSlidePanelProps> = ({ content, isOpen, onClose }) => {
  if (!content) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed top-4 right-[420px] bottom-4 w-[500px] bg-white rounded-2xl shadow-xl z-50 transition-all duration-300 overflow-hidden ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">{content.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-112px)] px-6 py-6 bg-gradient-to-b from-zinc-50 to-white">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-zinc-900 mb-4 mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-zinc-900 mb-3 mt-6">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-zinc-800 mb-2 mt-4">{children}</h3>
                ),
                p: ({ children }) => <p className="text-zinc-700 mb-4 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                li: ({ children }) => <li className="text-zinc-700">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-zinc-100 px-2 py-1 rounded text-sm font-mono text-orange-600">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-orange-500 pl-4 italic text-zinc-600 my-4">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content.content}
            </ReactMarkdown>
          </div>

          {/* Actions */}
          {content.actions && content.actions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-zinc-200 flex gap-3">
              {content.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContentSlidePanel;
