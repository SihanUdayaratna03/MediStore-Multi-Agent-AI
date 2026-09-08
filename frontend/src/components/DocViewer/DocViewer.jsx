/**
 * DocViewer.jsx
 * =============
 * Displays the uploaded document.
 *
 * For PDFs: renders using an <iframe> (browser native PDF viewer)
 * For images: renders as a scrollable <img>
 * Also shows document metadata (filename, pages, chunk count, etc.)
 */

import { useState } from 'react'
import { FileText, Image, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import './DocViewer.css'

export default function DocViewer({ sessionData }) {
  const [showPreview, setShowPreview] = useState(false)

  if (!sessionData) return null

  const { filename, doc_type, total_pages, chunk_count, preview_text, extraction_method } = sessionData

  return (
    <div className="doc-viewer-wrapper">
      {/* Document info card */}
      <div className="doc-viewer-info-card">
        <div className="doc-viewer-file-icon">
          {doc_type === 'pdf'
            ? <FileText size={24} className="doc-viewer-icon doc-viewer-icon--pdf" />
            : <Image    size={24} className="doc-viewer-icon doc-viewer-icon--image" />}
        </div>
        <div className="doc-viewer-meta">
          <p className="doc-viewer-filename" title={filename}>{filename}</p>
          <div className="doc-viewer-tags">
            <span className="doc-viewer-tag">
              {doc_type === 'pdf' ? `${total_pages} page${total_pages !== 1 ? 's' : ''}` : 'Image'}
            </span>
            <span className="doc-viewer-tag">
              {chunk_count} passages indexed
            </span>
            <span className="doc-viewer-tag">
              {extraction_method.includes('gemini') ? 'Gemini Vision' : 'Native extraction'}
            </span>
          </div>
        </div>
        <div className="doc-viewer-status">
          <CheckCircle2 size={18} className="doc-viewer-ready-icon" />
          <span>Ready</span>
        </div>
      </div>

      {/* Text preview (collapsible) */}
      {preview_text && (
        <div className="doc-viewer-preview">
          <button
            className="doc-viewer-preview-toggle"
            onClick={() => setShowPreview(v => !v)}
            aria-expanded={showPreview}
          >
            <span>Document Preview</span>
            {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showPreview && (
            <div className="doc-viewer-preview-text">
              <pre>{preview_text}</pre>
            </div>
          )}
        </div>
      )}

      {/* Ready to chat hint */}
      <div className="doc-viewer-ready-hint">
        <CheckCircle2 size={18} aria-hidden="true" />
        <p>
          Your document has been processed and indexed. Ask any question about it
          in the chat panel on the right!
        </p>
      </div>
    </div>
  )
}
