/**
 * CitationPanel.jsx
 * ==================
 * Displays source citations for an AI response.
 * Each citation card shows the page number, filename, relevance score,
 * and a text snippet from the document.
 */

import { FileText } from 'lucide-react'
import './CitationPanel.css'

export default function CitationPanel({ citations }) {
  if (!citations || citations.length === 0) return null

  return (
    <div className="citation-panel">
      <p className="citation-panel-label"><FileText size={15} aria-hidden="true" /> Sources from your document:</p>
      <div className="citation-panel-list">
        {citations.map((c, i) => (
          <div key={c.chunk_id || i} className="citation-card">
            <div className="citation-card-header">
              <span className="citation-card-page">Page {c.page_number}</span>
              <span className="citation-card-relevance">
                {Math.round(c.similarity * 100)}% match
              </span>
            </div>
            <p className="citation-card-filename">{c.filename}</p>
            <p className="citation-card-snippet">"{c.text_snippet}"</p>
          </div>
        ))}
      </div>
    </div>
  )
}
