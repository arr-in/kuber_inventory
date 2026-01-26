import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { getAuthHeader } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I can help you with inventory queries. Ask me about stock levels, low stock items, or product information.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/chat`,
        { message: userMessage },
        { headers: getAuthHeader() }
      );

      // Add assistant response
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.data.response }
      ]);
    } catch (error) {
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          data-testid="open-chatbot-btn"
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#00923F] hover:bg-[#007A35] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-[9999]"
          aria-label="Open chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-stone-200 flex flex-col z-[9999]"
          data-testid="chat-window"
        >
          {/* Header */}
          <div className="bg-[#00923F] text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">Inventory Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              data-testid="close-chatbot-btn"
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[#00923F] text-white'
                      : 'bg-stone-100 text-stone-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-stone-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your inventory..."
                disabled={loading}
                data-testid="chat-input"
                className="flex-1 px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00923F] disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                data-testid="send-message-btn"
                className="px-4 py-2 bg-[#00923F] hover:bg-[#007A35] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-2">Powered by AI • Uses real inventory data</p>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;