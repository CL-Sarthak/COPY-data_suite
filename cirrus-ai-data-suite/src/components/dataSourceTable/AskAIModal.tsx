import React, { useState, useEffect, useRef } from 'react';
import { DataSource } from '@/types/discovery';
import { 
  XMarkIcon, 
  SparklesIcon,
  PaperAirplaneIcon,
  UserIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  dataRequest?: {
    fields: string[];
    recordLimit: number;
    reason: string;
  };
}

export function AskAIModal({ isOpen, onClose, dataSource }: AskAIModalProps) {
  const sessionKey = `ai-chat-${dataSource.id}`;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainMethodology, setExplainMethodology] = useState(false);
  const [currentDataRequest, setCurrentDataRequest] = useState<{fields?: string[], recordLimit?: number} | null>(null);

  // Load messages from sessionStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = sessionStorage.getItem(sessionKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsed.map((msg: Message & { timestamp: string }) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      }
    }
  }, [sessionKey]);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      sessionStorage.setItem(sessionKey, JSON.stringify(messages));
    }
  }, [messages, sessionKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!question.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/data-sources/${dataSource.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userMessage.content,
          explainMethodology,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          ...(currentDataRequest || {})
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get answer');
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        dataRequest: data.dataRequest
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Clear current data request after use
      setCurrentDataRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setQuestion('');
    setError(null);
    setCurrentDataRequest(null);
    // Clear sessionStorage for this chat
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(sessionKey);
    }
  };

  const handleFetchMoreData = async (dataRequest: Message['dataRequest']) => {
    if (!dataRequest) return;
    
    // Set the data request parameters
    setCurrentDataRequest({
      fields: dataRequest.fields,
      recordLimit: dataRequest.recordLimit
    });
    
    // Get the last user question
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) return;
    
    // Create a new user message indicating we're fetching more data
    const fetchMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `${lastUserMessage.content} (fetching ${dataRequest.recordLimit} records with ${dataRequest.fields.join(', ')})`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, fetchMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/data-sources/${dataSource.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: lastUserMessage.content,
          explainMethodology,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          fields: dataRequest.fields,
          recordLimit: dataRequest.recordLimit
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get answer');
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        dataRequest: data.dataRequest
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Clear current data request after use
      setCurrentDataRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-gray-900/50" 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
        
        {/* Modal */}
        <div 
          className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SparklesIcon className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Ask AI about {dataSource.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Ask anything about your data!</p>
                <p className="text-sm text-gray-500">
                  I&apos;ll analyze the data in &quot;{dataSource.name}&quot; to answer your questions.
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-blue-600'
                        : 'bg-gray-100'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <UserIcon className="h-5 w-5 text-white" />
                    ) : (
                      <SparklesIcon className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.dataRequest && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800 mb-2">
                          Additional data needed for accurate calculation:
                        </p>
                        <p className="text-sm text-yellow-700 mb-2">
                          {message.dataRequest.reason}
                        </p>
                        <button
                          onClick={() => handleFetchMoreData(message.dataRequest)}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          Fetch {message.dataRequest.recordLimit} records
                          {message.dataRequest.fields.length > 0 && 
                            ` (${message.dataRequest.fields.join(', ')})`
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-gray-600 animate-pulse" />
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Form */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={explainMethodology}
                  onChange={(e) => setExplainMethodology(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>Explain methodology</span>
              </label>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about your data..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={handleReset}
                disabled={messages.length === 0}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                title="Clear conversation"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}