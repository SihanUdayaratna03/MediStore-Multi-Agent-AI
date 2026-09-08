import { useState, useRef, useEffect } from 'react'
import { useChatService } from '../../services/chatService'
import { Stethoscope } from 'lucide-react'
import './CopilotChat.css'

/**
 * CopilotChat
 * ===========
 * A premium glassmorphism chat panel that connects to the MediStore
 * Multi-Agent RAG pipeline. Accepts an optional `predictionResult` prop
 * so the patient's biomarker data is automatically woven into every query.
 *
 * @param {Object}  props
 * @param {Object}  props.predictionResult  - ML prediction output (auto-context)
 * @param {boolean} props.defaultOpen       - Start with chat panel open
 */
export default function CopilotChat({ predictionResult = null, defaultOpen = false }) {
  const [isOpen,     setIsOpen]     = useState(defaultOpen)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef              = useRef(null)
  const inputRef                    = useRef(null)

  const { messages, isLoading, sendMessage, clearChat } = useChatService(predictionResult)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue.trim())
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Suggested starter questions
  const suggestions = [
    'What do my results mean?',
    'What are my main risk factors?',
    'What lifestyle changes should I make?',
    'When should I see a doctor?',
  ]

  return (
    <>
      {/* ── Floating toggle button ───────────────────────────────────── */}
      <button
        className={`copilot-fab ${isOpen ? 'copilot-fab--open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        title="MediStore AI Assistant"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.96 9.96 0 0 1-5.06-1.37L2 22l1.37-4.94A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            <path d="M8 10h8M8 14h5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      <div className={`copilot-panel ${isOpen ? 'copilot-panel--open' : ''}`} role="dialog" aria-label="AI Clinical Assistant">

        {/* Header */}
        <div className="copilot-header">
          <div className="copilot-header__left">
            <div className="copilot-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
              </svg>
            </div>
            <div>
              <h3 className="copilot-header__title">MediStore AI</h3>
              <span className="copilot-header__subtitle">Clinical Assistant · Powered by Gemini</span>
            </div>
          </div>
          <div className="copilot-header__actions">
            {messages.length > 0 && (
              <button className="copilot-icon-btn" onClick={clearChat} title="Clear chat" aria-label="Clear chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            )}
            <button className="copilot-icon-btn" onClick={() => setIsOpen(false)} title="Close" aria-label="Close chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Context badge */}
        {predictionResult && (
          <div className="copilot-context-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Patient data loaded — questions are personalised to your results
          </div>
        )}

        {/* Messages area */}
        <div className="copilot-messages" role="log" aria-live="polite">

          {/* Welcome state */}
          {messages.length === 0 && (
            <div className="copilot-welcome">
              <div className="copilot-welcome__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.96 9.96 0 0 1-5.06-1.37L2 22l1.37-4.94A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z"/>
                  <path d="M8 10h8M8 14h5" strokeLinecap="round"/>
                </svg>
              </div>
              <h4>How can I help you today?</h4>
              <p>
                Ask me anything about diabetes risk, your results, or clinical guidelines.
                {predictionResult
                  ? ' Your prediction data is already loaded as context.'
                  : ' Run a prediction first to get personalised answers.'}
              </p>
              <div className="copilot-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="copilot-suggestion-btn"
                    onClick={() => { setInputValue(s); inputRef.current?.focus() }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`copilot-msg copilot-msg--${msg.role} ${msg.isError ? 'copilot-msg--error' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="copilot-msg__avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
                  </svg>
                </div>
              )}
              <div className="copilot-msg__bubble">
                <p className="copilot-msg__text">{msg.content}</p>
                {msg.steps_taken && msg.steps_taken.length > 0 && (
                  <div className="copilot-msg__trace">
                    {msg.steps_taken.map((s, i) => (
                      <span key={i} className="copilot-msg__step">{s.replace('_node', '')}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="copilot-msg copilot-msg--assistant">
              <div className="copilot-msg__avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
                </svg>
              </div>
              <div className="copilot-msg__bubble copilot-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Disclaimer */}
        <div className="copilot-disclaimer">
          <Stethoscope size={14} aria-hidden="true" /> AI analysis only — always consult a qualified healthcare professional
        </div>

        {/* Input area */}
        <div className="copilot-input-area">
          <textarea
            ref={inputRef}
            className="copilot-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your results, risk factors, or treatment options…"
            rows={1}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            className={`copilot-send-btn ${isLoading || !inputValue.trim() ? 'copilot-send-btn--disabled' : ''}`}
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <svg className="copilot-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* Backdrop for mobile */}
      {isOpen && <div className="copilot-backdrop" onClick={() => setIsOpen(false)} />}
    </>
  )
}
