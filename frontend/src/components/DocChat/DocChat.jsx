/**
 * DocChat.jsx
 * ============
 * Full-panel chat interface for document Q&A.
 *
 * Features:
 *   - Message history with user/assistant bubbles
 *   - Citation badges on each assistant message
 *   - Conversation memory (history sent to backend)
 *   - Typing indicator
 *   - Suggested starter questions
 */

import { useState, useRef, useEffect } from 'react'
import { useDocChatService } from '../../services/docChatService'
import CitationPanel from '../CitationPanel/CitationPanel'
import { Send, RotateCcw, FileQuestion, FolderOpen, CheckCircle2, Paperclip, ChevronUp, ChevronDown, Stethoscope } from 'lucide-react'
import './DocChat.css'

const DOC_SUGGESTIONS = [
  'What are the main findings in this document?',
  'Are there any critical values that need attention?',
  'What medications are mentioned in this report?',
  'What are the recommended next steps?',
  'Summarise this document for me.',
]

export default function DocChat({ sessionData, isReady, onReset }) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const [expandedCitation, setExpandedCitation] = useState(null)

  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
  } = useDocChatService(sessionData?.session_id)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isReady) setTimeout(() => inputRef.current?.focus(), 200)
  }, [isReady])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading || !isReady) return
    sendMessage(inputValue.trim())
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="doc-chat-wrapper">
      {/* Header */}
      <div className="doc-chat-header">
        <div className="doc-chat-header-left">
          <div className="doc-chat-avatar">
            <FileQuestion size={18} />
          </div>
          <div>
            <h3 className="doc-chat-title">Ask About Your Document</h3>
            <span className="doc-chat-subtitle">
              {isReady
                ? `Analysing: ${sessionData?.filename}`
                : 'Upload a document to begin'}
            </span>
          </div>
        </div>

        <div className="doc-chat-header-actions">
          {messages.length > 0 && (
            <button type="button" className="doc-chat-clear-btn" onClick={clearChat} title="Clear conversation" aria-label="Clear conversation">
              <RotateCcw size={15} />
            </button>
          )}
          {isReady && (
            <button type="button" className="doc-chat-new-btn" onClick={onReset}>
              <FolderOpen size={14} aria-hidden="true" /> New document
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="doc-chat-messages" role="log" aria-live="polite">
        {/* Welcome / not ready state */}
        {!isReady && (
          <div className="doc-chat-welcome doc-chat-welcome--waiting">
            <div className="doc-chat-welcome-icon"><FolderOpen size={26} aria-hidden="true" /></div>
            <h4>Upload a document to start</h4>
            <p>
              Once you upload a medical document, you can ask questions about
              its contents and get AI-powered answers with precise page citations.
            </p>
          </div>
        )}

        {/* Ready state — no messages yet */}
        {isReady && messages.length === 0 && (
          <div className="doc-chat-welcome">
            <div className="doc-chat-welcome-icon"><CheckCircle2 size={26} aria-hidden="true" /></div>
            <h4>Document ready — ask anything!</h4>
            <p>
              Your document has been indexed. Ask questions about diagnoses,
              test results, medications, recommendations, or anything else in the document.
            </p>
            <div className="doc-chat-suggestions">
              {DOC_SUGGESTIONS.map((s, i) => (
                <button
                  type="button"
                  key={i}
                  className="doc-chat-suggestion"
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
            className={`doc-chat-msg doc-chat-msg--${msg.role} ${msg.isError ? 'doc-chat-msg--error' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="doc-chat-msg-avatar">AI</div>
            )}
            <div className="doc-chat-msg-bubble">
              <p className="doc-chat-msg-text">{msg.content}</p>

              {/* Citation badges */}
              {msg.citations && msg.citations.length > 0 && (
                <button
                  type="button"
                  className="doc-chat-citation-toggle"
                  onClick={() => setExpandedCitation(
                    expandedCitation === msg.id ? null : msg.id
                  )}
                >
                  <Paperclip size={13} aria-hidden="true" /> {msg.citations.length} source{msg.citations.length > 1 ? 's' : ''} cited
                  {expandedCitation === msg.id ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
                </button>
              )}

              {/* Expanded citation panel */}
              {expandedCitation === msg.id && msg.citations && (
                <CitationPanel citations={msg.citations} />
              )}

              {/* Agent steps trace */}
              {msg.steps_taken && msg.steps_taken.length > 0 && (
                <div className="doc-chat-steps">
                  {msg.steps_taken.map((s, i) => (
                    <span key={i} className="doc-chat-step-badge">
                      {s.replace('_node', '')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="doc-chat-msg doc-chat-msg--assistant">
            <div className="doc-chat-msg-avatar">AI</div>
            <div className="doc-chat-msg-bubble doc-chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="doc-chat-disclaimer">
        <Stethoscope size={14} aria-hidden="true" /> AI analysis only — always consult a qualified healthcare professional
      </div>

      {/* Input */}
      <div className="doc-chat-input-area">
        <textarea
          ref={inputRef}
          className="doc-chat-input"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isReady
            ? "Ask about your document…"
            : "Upload a document first to enable chat…"}
          rows={1}
          disabled={!isReady || isLoading}
          aria-label="Document question input"
        />
        <button
          className={`doc-chat-send-btn ${(!isReady || isLoading || !inputValue.trim()) ? 'doc-chat-send-btn--disabled' : ''}`}
          onClick={handleSend}
          disabled={!isReady || isLoading || !inputValue.trim()}
          aria-label="Send question"
          id="doc-chat-send"
        >
          {isLoading
            ? <svg className="doc-chat-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}
