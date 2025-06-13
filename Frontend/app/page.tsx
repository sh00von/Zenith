'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, ChevronDown, Loader2 } from 'lucide-react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop } = messagesContainerRef.current;
        setShowScrollTop(scrollTop > 300);
      }
    };

    const container = messagesContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

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
      const response = await fetch('https://gee-brain-ai-agent-backend.vercel.app/rag-query', {
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

  return (
    <div className="min-h-screen max-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Geo-Brain</h2>
            <p className="text-sm text-zinc-500">Navigation</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
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
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm">
            Recent Queries
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm">
            Saved Datasets
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm">
            Analysis History
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
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
                <h1 className="text-lg font-medium">Geo-Brain</h1>
                <p className="text-sm text-zinc-500">Geospatial analysis assistant</p>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full min-h-0">
          {/* Messages - Scrollable */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-8 min-h-0 relative">
            {showScrollTop && messages.length > 1 && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-24 right-6 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-50"
                aria-label="Back to top"
              >
                <ChevronDown className="h-5 w-5 text-zinc-300 rotate-180" />
              </button>
            )}
            <div className="space-y-8">
              {messages.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 bg-zinc-600 rounded-full"></div>
                  </div>
                  <h2 className="text-xl font-medium mb-2">Welcome to Geo-Brain</h2>
                  <p className="text-zinc-500 max-w-md mx-auto mb-12">
                    Ask me about geospatial analysis, Earth Engine datasets, or ecosystem service calculations.
                  </p>
                  
                  {/* Demo Questions */}
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-sm font-medium text-zinc-400 mb-4">Try these examples:</h3>
                    <div className="flex gap-4 max-w-xl mx-auto">
                      <button
                        onClick={() => setInput("How to calculate ESV values of Bangladesh?")}
                        className="group flex-1 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-all duration-200 hover:border-zinc-700 hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
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
                        className="group flex-1 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-all duration-200 hover:border-zinc-700 hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
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

              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  {message.type === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-zinc-800 rounded-2xl px-4 py-3">
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-zinc-500 mt-2">{formatTime(message.timestamp)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Main Answer with Markdown */}
                      <div className="max-w-[90%]">
                        <div className="prose prose-invert prose-sm max-w-none prose-zinc">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeId = `${message.id}-code-${Math.random()}`;
                                
                                return !className?.includes('inline') && match ? (
                                  <div className="relative">
                                    <SyntaxHighlighter
                                      style={oneDark as any}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{
                                        margin: 0,
                                        padding: '1rem',
                                        background: '#18181b'
                                      }}
                                      className="rounded-lg !bg-zinc-900 !border !border-zinc-800"
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                    <button
                                      className="absolute top-3 right-3 p-2 hover:bg-zinc-800 rounded transition-colors"
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
                                  <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              h1: ({ children }) => <h1 className="text-xl font-semibold text-zinc-100 mb-4">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-semibold text-zinc-200 mb-3">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-semibold text-zinc-300 mb-2">{children}</h3>,
                              p: ({ children }) => <p className="text-zinc-200 leading-relaxed mb-4">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside text-zinc-200 space-y-1 mb-4">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside text-zinc-200 space-y-1 mb-4">{children}</ol>,
                              li: ({ children }) => <li className="text-zinc-200">{children}</li>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-300 my-4">
                                  {children}
                                </blockquote>
                              ),
                              strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                              em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        <p className="text-xs text-zinc-500 mt-3">{formatTime(message.timestamp)}</p>
                      </div>

                      {/* API Response Details */}
                      {message.apiResponse && (
                        <div className="space-y-3 max-w-[90%]">
                          {/* Query Analysis */}
                          {renderExpandableSection(
                            message.id,
                            'Analysis',
                            <div className="space-y-3 pt-3">
                              <div>
                                <span className="text-xs text-zinc-500 uppercase tracking-wide">Intent</span>
                                <p className="text-sm text-zinc-300 mt-1">{message.apiResponse.intent}</p>
                              </div>
                              {message.apiResponse.entities.length > 0 && (
                                <div>
                                  <span className="text-xs text-zinc-500 uppercase tracking-wide">Entities</span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {message.apiResponse.entities.map((entity, index) => (
                                      <span key={index} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                                        {entity.entity}: {entity.value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {message.apiResponse.filteredTokens.length > 0 && (
                                <div>
                                  <span className="text-xs text-zinc-500 uppercase tracking-wide">Keywords</span>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {message.apiResponse.filteredTokens.map((token, index) => (
                                      <span key={index} className="text-xs bg-zinc-900 text-zinc-400 px-2 py-1 rounded">
                                        {token}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Execution Plan */}
                          {message.apiResponse.plan && message.apiResponse.plan.length > 0 && renderExpandableSection(
                            message.id,
                            'Plan',
                            <div className="space-y-3 pt-3">
                              {message.apiResponse.plan.map((step, index) => (
                                <div key={index} className="flex gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center">
                                    <span className="text-xs text-zinc-400">{step.step}</span>
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
                                <div key={index} className="flex justify-between items-center p-3 bg-zinc-900 rounded border border-zinc-800">
                                  <code className="text-xs text-zinc-300 flex-1 mr-3 truncate">
                                    {candidate.ee_code}
                                  </code>
                                  <span className="text-xs text-zinc-500">
                                    {(candidate.score * 100).toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                              {message.apiResponse.candidates.length > (visibleDatasets[message.id] || 5) && (
                                <button
                                  onClick={() => loadMoreDatasets(message.id)}
                                  className="w-full p-2 text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
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
                            <div className="space-y-3 pt-3">
                              <div className="p-3 bg-zinc-900 rounded border border-zinc-800">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs text-zinc-500 uppercase tracking-wide">Confidence</span>
                                  <span className="text-xs text-zinc-400">
                                    {(message.apiResponse.critique.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-sm text-zinc-300">{message.apiResponse.critique.improve}</p>
                              </div>
                              <div className="p-3 bg-zinc-900 rounded border border-zinc-800">
                                <span className="text-xs text-zinc-500 uppercase tracking-wide">Notes</span>
                                <p className="text-sm text-zinc-300 mt-1">{message.apiResponse.selfEval.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    <span className="text-sm text-zinc-400">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="relative">
            {messages.length > 0 && showSuggestions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setInput("How to calculate ESV values of Bangladesh?")}
                    className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    ESV Calculation
                  </button>
                  <button
                    onClick={() => setInput("What are the best datasets for vegetation analysis in South Asia?")}
                    className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    Dataset Analysis
                  </button>
                </div>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
                  aria-label="Hide suggestions"
                >
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="relative">
              {/* Input Form - Fixed at bottom */}
              <div className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-xl p-6 sticky bottom-0">
                <div className="border border-zinc-800 rounded-xl bg-zinc-900/50 backdrop-blur-sm">
                  <form onSubmit={handleSubmit} className="flex items-center p-4 gap-3">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about ESV calculations, Earth Engine datasets..."
                      disabled={isLoading}
                      className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                      ) : (
                        <Send className="h-4 w-4 text-zinc-300" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}