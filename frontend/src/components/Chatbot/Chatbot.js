import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Mic, MicOff, Brain } from 'lucide-react';
import chatService from '../../services/chatService';
import './Chatbot.css';

const WELCOME = "Bonjour ! Je suis votre assistant Med Oil 🤖\n\nJe peux répondre à vos questions sur les **stocks**, **produits**, **alertes** et **prévisions**.\n\nExemples :\n• « Combien y a-t-il d'huile d'olive ? »\n• « Y a-t-il des ruptures de stock ? »\n• « Quelle est la prévision de demande ? »\n\nTapez **aide** pour voir toutes mes commandes, ou utilisez le micro 🎙️";

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// Simple markdown-like formatter: **bold** and bullet lines
const formatMessage = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Parse **bold**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <div key={i} className={line.startsWith('•') || line.startsWith('  ') ? 'msg-bullet' : ''}>{parts}</div>;
  });
};

const Chatbot = () => {
  const [isOpen, setIsOpen]     = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: WELCOME, sender: 'bot' }
  ]);
  const [loading, setLoading]         = useState(false);
  const [listening, setListening]     = useState(false);
  const [voiceSupported]              = useState(!!SpeechRecognitionAPI);

  const messagesEndRef  = useRef(null);
  const recognitionRef  = useRef(null);
  const inputRef        = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatService.sendMessage(text);
      const botMsg = { id: Date.now() + 1, text: res.data.response, sender: 'bot' };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'erreur réseau';
      const errMsg = {
        id: Date.now() + 1,
        text: `⚠️ Impossible de joindre le backend (${detail}). Vérifiez que le serveur Java est démarré sur le port 8080.`,
        sender: 'bot',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleVoice = () => {
    if (!voiceSupported) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang           = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onerror  = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      // Auto-send voice message
      sendMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <>
      {/* FAB */}
      <button
        className={`chatbot-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Assistant Med Oil"
      >
        {isOpen ? <X size={28} /> : <Brain size={28} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window glass">
          {/* Header */}
          <div className="chatbot-header">
            <div className="bot-info">
              <div className="bot-avatar">
                <Bot size={20} color="white" />
              </div>
              <div>
                <h4>Med Oil Assistant</h4>
                <div className="status-indicator">
                  <span className="dot" /> En ligne
                </div>
              </div>
            </div>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                <div className="message-icon">
                  {msg.sender === 'bot' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="message-text">
                  {formatMessage(msg.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-wrapper bot">
                <div className="message-icon"><Bot size={14} /></div>
                <div className="message-text typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {listening && (
              <div className="message-wrapper bot">
                <div className="message-icon"><Mic size={14} /></div>
                <div className="message-text voice-listening">
                  🎙️ Écoute en cours… parlez maintenant
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="chatbot-suggestions">
            {['Alertes stock', 'Prévision demande', 'Tous les stocks', 'Aide'].map(s => (
              <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)} disabled={loading}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Posez votre question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading || listening}
            />
            {voiceSupported && (
              <button
                type="button"
                className={`mic-btn ${listening ? 'listening' : ''}`}
                onClick={toggleVoice}
                title={listening ? 'Arrêter l\'écoute' : 'Dicter votre question'}
                disabled={loading}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button type="submit" disabled={!input.trim() || loading || listening}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
