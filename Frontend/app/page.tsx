'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, ChevronDown, Loader2, Lightbulb, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface Entity {
  entity: string;
  value: string;
}

interface Candidate {
  ee_code: string;
  score: number;
  bands?: { name: string }[];
}

interface PlanStep {
  step: number;
  description: string;
  instruction: string;
}

interface Critique {
  confidence: number;
  improve: string;
}

interface SelfEval {
  confidence: number;
  notes: string;
}

interface APIResponse {
  normalizedQuery: string;
  filteredTokens: string[];
  intent: string;
  entities: Entity[];
  candidates: Candidate[];
  distilledFacts: string;
  plan: PlanStep[];
  answer: string;
  critique: Critique;
  selfEval: SelfEval;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  apiResponse?: APIResponse;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [visibleDatasets, setVisibleDatasets] = useState<{[key: string]: number}>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showShortcutHints, setShowShortcutHints] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group messages by date
  const groupMessages = (messages: Message[]) => {
    return messages.reduce((groups, message) => {
      const date = message.timestamp.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {} as { [key: string]: Message[] });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus input with /
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Submit with Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && input.trim()) {
        e.preventDefault();
        handleSubmit(e as any);
      }

      // Toggle sidebar with ⌘K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }

      // Toggle keyboard shortcuts with ⌘L
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input]);

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        setShowScrollTop(scrollTop > 300);
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
      }
    };

    const container = messagesContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleSection = (messageId: string, section: string) => {
    const key = `${messageId}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const loadMoreDatasets = (messageId: string) => {
    setVisibleDatasets(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || 5) + 5
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://zenithbackend.vercel.app/rag-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const apiResponse: APIResponse = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: apiResponse.answer,
        timestamp: new Date(),
        apiResponse,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderExpandableSection = (
    messageId: string,
    title: string,
    content: React.ReactNode,
    count?: number
  ) => {
    const key = `${messageId}-${title.toLowerCase()}`;
    const isExpanded = expandedSections[key];

    return (
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(messageId, title.toLowerCase())}
          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-zinc-900/50 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-zinc-300">{title}</span>
            {count && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-zinc-800">
            {content}
          </div>
        )}
      </div>
    );
  };

  // Add animations
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes slide-in-right {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slide-in-left {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slide-up {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .animate-slide-in-right {
        animation: slide-in-right 0.3s ease-out;
      }

      .animate-slide-in-left {
        animation: slide-in-left 0.3s ease-out;
      }

      .animate-slide-up {
        animation: slide-up 0.3s ease-out;
      }

      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  return (
    <div className="min-h-screen max-h-screen bg-gradient-to-b from-slate-950 via-zinc-950 to-slate-950 text-zinc-100 flex">
      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-zinc-900/90 backdrop-blur-xl rounded-xl border border-zinc-800/50 p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-zinc-100">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="p-2 hover:bg-zinc-800/50 rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-300">Focus input</span>
                <kbd className="px-2 py-1 bg-zinc-800/50 rounded text-sm text-zinc-300">/</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-300">Submit message</span>
                <kbd className="px-2 py-1 bg-zinc-800/50 rounded text-sm text-zinc-300">⌘ + Enter</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-300">Toggle sidebar</span>
                <kbd className="px-2 py-1 bg-zinc-800/50 rounded text-sm text-zinc-300">⌘ + K</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-300">Show shortcuts</span>
                <kbd className="px-2 py-1 bg-zinc-800/50 rounded text-sm text-zinc-300">⌘ + L</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-zinc-900/80 backdrop-blur-xl border-r border-zinc-800/30 transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">ZENITH</h2>
            <p className="text-sm text-zinc-500">Navigation</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-zinc-800/50 rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="Close sidebar"
          >
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav className="p-4 space-y-2">
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-all duration-200 hover:scale-[1.02] text-sm">
            Recent Queries
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-all duration-200 hover:scale-[1.02] text-sm">
            Saved Datasets
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-all duration-200 hover:scale-[1.02] text-sm">
            Analysis History
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen w-full">
        {/* Header */}
        <header className="border-b border-zinc-800/30 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-20 w-full">
          <div className="max-w-3xl mx-auto w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-zinc-800/50 rounded-lg transition-all duration-200 hover:scale-105"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-5 h-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-medium bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">Zenith</h1>
                <p className="text-sm text-zinc-500">Geospatial analysis assistant</p>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col w-full min-h-0">
          {/* Messages - Scrollable */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 min-h-0 relative w-full">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-20 animate-fade-in">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-zinc-800/30">
                    <div className="w-8 h-8 bg-zinc-600 rounded-full animate-pulse"></div>
                  </div>
                  <h2 className="text-2xl font-medium mb-3 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">Welcome to Zenith</h2>
                  <p className="text-zinc-400 max-w-md mx-auto mb-12">
                    Ask me about geospatial analysis, Earth Engine datasets, or ecosystem service calculations.
                  </p>
                  
                  {/* Demo Questions */}
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-sm font-medium text-zinc-400 mb-4">Try these examples:</h3>
                    <div className="flex gap-4 max-w-xl mx-auto">
                      <button
                        onClick={() => setInput("How to calculate ESV values of Bangladesh?")}
                        className="group flex-1 p-4 bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl border border-zinc-800/50 transition-all duration-200 hover:border-zinc-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-zinc-900/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800/50 rounded-lg group-hover:bg-zinc-700/50 transition-all duration-200">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-zinc-300">ESV Calculation</p>
                            <p className="text-xs text-zinc-500">Calculate ecosystem service values</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setInput("What are the best datasets for vegetation analysis in South Asia?")}
                        className="group flex-1 p-4 bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl border border-zinc-800/50 transition-all duration-200 hover:border-zinc-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-zinc-900/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800/50 rounded-lg group-hover:bg-zinc-700/50 transition-all duration-200">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-zinc-300">Dataset Analysis</p>
                            <p className="text-xs text-zinc-500">Find optimal datasets</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {Object.entries(groupMessages(messages)).map(([date, msgs]) => (
                <div key={date} className="space-y-4">
                  <div className="text-center">
                    <span className="text-xs text-zinc-500 bg-zinc-900/50 px-3 py-1 rounded-full">
                      {new Date(date).toLocaleDateString()}
                    </span>
                  </div>
                  {msgs.map((message) => (
                    <div key={message.id} className="space-y-4">
                      {message.type === 'user' ? (
                        <div className="flex justify-end w-full animate-slide-in-right">
                          <div className="flex items-start gap-2 max-w-[85%]">
                            <div className="min-w-0 flex-1">
                              <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl px-3 py-2 break-words shadow-lg shadow-blue-900/10 border border-blue-500/20">
                                <p className="text-sm break-words">{message.content}</p>
                                <p className="text-xs text-zinc-500 mt-2">{formatTime(message.timestamp)}</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1 sticky top-4 border border-blue-500/30">
                              <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 w-full animate-slide-in-left">
                          {/* Main Answer with Markdown */}
                          <div className="flex items-start gap-2 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1 sticky top-4 border border-purple-500/30">
                              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                                <path d="M12 8v8" />
                                <path d="M5 3a2 2 0 0 0-2 2v1c0 2.5 1.5 3 3 3l1-1c0-1.5 1-2 2-2h2c1 0 2 .5 2 2l1 1c1.5 0 3-.5 3-3V5a2 2 0 0 0-2-2H5z" />
                                <path d="M6 12h.01" />
                                <path d="M12 12h.01" />
                                <path d="M18 12h.01" />
                                <path d="M6 16h.01" />
                                <path d="M12 16h.01" />
                                <path d="M18 16h.01" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg shadow-purple-900/10 border border-purple-500/20">
                                <div className="prose prose-invert prose-sm max-w-none prose-zinc break-words">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ children }) => <h1 className="text-xl font-semibold text-zinc-100 mb-4">{children}</h1>,
                                      h2: ({ children }) => <h2 className="text-lg font-semibold text-zinc-200 mb-3">{children}</h2>,
                                      h3: ({ children }) => <h3 className="text-base font-semibold text-zinc-300 mb-2">{children}</h3>,
                                      p: ({ children }) => <p className="text-zinc-200 leading-relaxed mb-4">{children}</p>,
                                      ul: ({ children }) => <ul className="list-disc list-inside text-zinc-200 space-y-1 mb-4">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal list-inside text-zinc-200 space-y-1 mb-4">{children}</ol>,
                                      li: ({ children }) => <li className="text-zinc-200">{children}</li>,
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-purple-500/30 pl-4 italic text-zinc-300 my-4 bg-purple-500/5 py-2 px-3 rounded-r">
                                          {children}
                                        </blockquote>
                                      ),
                                      strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                                      em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
                                      code: ({ node, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const codeId = `${message.id}-code-${Math.random()}`;
                                        
                                        return !className?.includes('inline') && match ? (
                                          <div className="relative group overflow-x-auto my-4">
                                            <SyntaxHighlighter
                                              language={match[1]}
                                              PreTag="div"
                                              customStyle={{
                                                margin: 0,
                                                padding: '1rem',
                                                background: '#18181b',
                                                borderRadius: '0.5rem',
                                                border: '1px solid rgba(139, 92, 246, 0.1)'
                                              }}
                                              className="rounded-lg shadow-lg shadow-purple-900/10"
                                            >
                                              {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                            <button
                                              className="absolute top-3 right-3 p-2 hover:bg-zinc-800/50 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
                                              onClick={() => copyCode(String(children), codeId)}
                                            >
                                              {copiedCode === codeId ? (
                                                <Check className="h-4 w-4 text-green-400" />
                                              ) : (
                                                <Copy className="h-4 w-4 text-zinc-500" />
                                              )}
                                            </button>
                                          </div>
                                        ) : (
                                          <code className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-sm break-words font-mono" {...props}>
                                            {children}
                                          </code>
                                        );
                                      },
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                              <p className="text-xs text-zinc-500 mt-3">{formatTime(message.timestamp)}</p>
                            </div>
                          </div>

                          {/* API Response Details */}
                          {message.apiResponse && (
                            <div className="space-y-2 max-w-[85%] break-words">
                              {/* Execution Plan */}
                              {message.apiResponse.plan && message.apiResponse.plan.length > 0 && renderExpandableSection(
                                message.id,
                                'Plan',
                                <div className="space-y-3 pt-3">
                                  {message.apiResponse.plan.map((step, index) => (
                                    <div key={index} className="flex gap-3">
                                      <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                                        <span className="text-xs text-purple-300">{step.step}</span>
                                      </div>
                                      <p className="text-sm text-zinc-300 leading-relaxed">{step.instruction}</p>
                                    </div>
                                  ))}
                                </div>,
                                message.apiResponse.plan.length
                              )}

                              {/* Dataset Candidates */}
                              {message.apiResponse.candidates && message.apiResponse.candidates.length > 0 && renderExpandableSection(
                                message.id,
                                'Datasets',
                                <div className="space-y-2 pt-3">
                                  {message.apiResponse.candidates.slice(0, visibleDatasets[message.id] || 5).map((candidate, index) => (
                                    <div key={index} className="p-3 bg-zinc-900/50 rounded border border-zinc-800/50 hover:border-purple-500/30 transition-colors">
                                      <div className="flex justify-between items-start gap-3">
                                        <code className="text-xs text-zinc-300 flex-1 break-all">
                                          {candidate.ee_code}
                                        </code>
                                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                                          {(candidate.score * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      {candidate.bands && candidate.bands.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-zinc-800/50">
                                          <span className="text-xs text-zinc-500">Bands:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {candidate.bands.map((band, bandIndex) => (
                                              <span key={bandIndex} className="text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded border border-blue-500/20">
                                                {band.name}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {message.apiResponse.candidates.length > (visibleDatasets[message.id] || 5) && (
                                    <button
                                      onClick={() => loadMoreDatasets(message.id)}
                                      className="w-full p-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors border border-purple-500/20"
                                    >
                                      Load More
                                    </button>
                                  )}
                                </div>,
                                message.apiResponse.candidates.length
                              )}

                              {/* Assessment */}
                              {renderExpandableSection(
                                message.id,
                                'Assessment',
                                <div className="prose prose-invert prose-sm max-w-none pt-3">
                                  <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800/50">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs text-zinc-500 uppercase tracking-wide">Confidence</span>
                                      <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                                        {(message.apiResponse.critique.confidence * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        p: ({ children }) => <p className="text-sm text-zinc-300">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc list-inside text-zinc-300 space-y-1 mt-2">{children}</ul>,
                                        li: ({ children }) => <li className="text-sm text-zinc-300">{children}</li>,
                                      }}
                                    >
                                      {message.apiResponse.critique.improve}
                                    </ReactMarkdown>
                                  </div>
                                  <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800/50 mt-3">
                                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Notes</span>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        p: ({ children }) => <p className="text-sm text-zinc-300 mt-1">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc list-inside text-zinc-300 space-y-1 mt-2">{children}</ul>,
                                        li: ({ children }) => <li className="text-sm text-zinc-300">{children}</li>,
                                      }}
                                    >
                                      {message.apiResponse.selfEval.notes}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-rose-500/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg shadow-rose-900/10 border border-rose-500/20">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-rose-300">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Keyboard Shortcut Hints */}
          {showShortcutHints && (
            <div className="absolute bottom-20 right-4 flex flex-col gap-2 animate-fade-in z-[100]">
              <div className="bg-zinc-900/80 backdrop-blur-xl rounded-lg p-2 text-xs text-zinc-400 border border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">/</kbd>
                  <span>Focus input</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">⌘ + Enter</kbd>
                  <span>Send message</span>
                </div>
                <button
                  onClick={() => setShowShortcutHints(false)}
                  className="absolute top-1 right-1 p-1 hover:bg-zinc-800/50 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-zinc-500" />
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="relative w-full">
            {messages.length > 0 && showSuggestions && (
              <div className="absolute bottom-full left-0 right-0 mb-1 animate-slide-up">
                <div className="max-w-3xl mx-auto px-4">
                  <div className="bg-zinc-900/40 backdrop-blur-xl rounded-lg border border-zinc-800/30 flex items-center justify-between p-1.5 shadow-lg shadow-zinc-900/20">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setInput("How to calculate ESV values of Bangladesh?")}
                        className="px-2 py-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 rounded transition-all duration-200 hover:scale-105 border border-blue-500/20"
                      >
                        ESV Calculation
                      </button>
                      <button
                        onClick={() => setInput("What are the best datasets for vegetation analysis in South Asia?")}
                        className="px-2 py-1 text-xs bg-purple-500/10 hover:bg-purple-500/20 rounded transition-all duration-200 hover:scale-105 border border-purple-500/20"
                      >
                        Dataset Analysis
                      </button>
                    </div>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="p-1 hover:bg-zinc-800/50 rounded transition-all duration-200 hover:scale-105"
                      aria-label="Hide suggestions"
                    >
                      <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="relative">
              {/* Input Form - Fixed at bottom */}
              <div className="border-t border-zinc-800/30 bg-zinc-950/30 backdrop-blur-xl p-4 sticky bottom-0 w-full">
                <div className="max-w-3xl mx-auto">
                  <div className="border border-zinc-800/30 rounded-xl bg-zinc-900/40 backdrop-blur-xl w-full shadow-lg shadow-zinc-900/20 group focus-within:border-blue-500/30 transition-all duration-200">
                    <form onSubmit={handleSubmit} className="flex items-center p-3 gap-2 w-full">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about ESV calculations, Earth Engine datasets... (Press / to focus)"
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none text-sm focus:ring-1 focus:ring-blue-500/50 rounded-lg transition-all duration-200"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(true)}
                          className="p-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-all duration-200"
                        >
                          <Lightbulb className="w-4 h-4" />
                        </button>
                        <button
                          type="submit"
                          disabled={!input.trim() || isLoading}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 hover:scale-105 border border-blue-500/20"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          ) : (
                            <Send className="h-4 w-4 text-blue-400" />
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Buttons */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 p-2 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-zinc-800/50 hover:bg-zinc-800/80 transition-all duration-200 hover:scale-105 shadow-lg shadow-zinc-900/20 z-30"
            aria-label="Scroll to top"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}

        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-4 p-2 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-zinc-800/50 hover:bg-zinc-800/80 transition-all duration-200 hover:scale-105 shadow-lg shadow-zinc-900/20 z-30"
            aria-label="Scroll to bottom"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </main>
    </div>
  );
}