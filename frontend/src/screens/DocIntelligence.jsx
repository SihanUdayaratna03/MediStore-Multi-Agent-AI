/**
 * DocIntelligence.jsx
 * ====================
 * Full-page Medical Document Intelligence screen.
 *
 * Layout (two-column on desktop, stacked on mobile):
 *   ┌─────────────────────────────────────────────────────┐
 *   │  TopBar (back button + title)                       │
 *   ├──────────────────────┬──────────────────────────────┤
 *   │  DocUpload / Viewer  │  DocChat (messages + input)  │
 *   │  (left panel)        │  (right panel)               │
 *   │                      │                              │
 *   │                      │  CitationPanel (expandable)  │
 *   └──────────────────────┴──────────────────────────────┘
 *
 * State machine:
 *   'idle'      → Upload zone shown, no session
 *   'uploading' → Loading spinner, progress bar
 *   'ready'     → DocViewer + DocChat enabled
 */

import { useState, useCallback } from 'react'
import { FileCheck2, Sparkles } from 'lucide-react'
import DocUpload from '../components/DocUpload/DocUpload'
import DocViewer from '../components/DocViewer/DocViewer'
import DocChat   from '../components/DocChat/DocChat'
import Reveal    from '../components/ui/Reveal'
import TopBar    from '../components/ui/TopBar'
import { uploadDocument } from '../api/docApi'
import './DocIntelligence.css'

export default function DocIntelligence({ onBack, onNavigate }) {
  const [uploadState, setUploadState] = useState('idle')  // 'idle' | 'uploading' | 'ready' | 'error'
  const [sessionData, setSessionData] = useState(null)    // UploadResponse from backend
  const [uploadError, setUploadError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleUpload = useCallback(async (file) => {
    setUploadState('uploading')
    setUploadError(null)
    setUploadProgress(0)

    // Simulate progress during upload
    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 8, 85))
    }, 400)

    try {
      const data = await uploadDocument(file)
      clearInterval(progressInterval)
      setUploadProgress(100)
      setTimeout(() => {
        setSessionData(data)
        setUploadState('ready')
      }, 600)
    } catch (err) {
      clearInterval(progressInterval)
      setUploadError(err.message || 'Upload failed. Please try again.')
      setUploadState('error')
    }
  }, [])

  const handleReset = useCallback(() => {
    setUploadState('idle')
    setSessionData(null)
    setUploadError(null)
    setUploadProgress(0)
  }, [])

  return (
    <div className="doc-intel-screen">
      <TopBar
        moduleName="Document Intelligence"
        accent="sky"
        activeModule="doc-intelligence"
        onNavigate={onNavigate}
        onBack={onBack}
        status={uploadState === 'ready' ? 'Document indexed' : 'Secure analysis workspace'}
      />

      <div className="doc-intel-context" role="status" aria-live="polite">
        <span className="doc-intel-context__icon"><FileCheck2 size={17} aria-hidden="true" /></span>
        <span>
          <strong>{uploadState === 'ready' ? sessionData?.filename : 'Clinical document workspace'}</strong>
          <small>{uploadState === 'ready' ? 'Ready for evidence-linked questions' : 'Upload a PDF or medical image to begin'}</small>
        </span>
        <span className="doc-intel-context__badge"><Sparkles size={13} aria-hidden="true" /> Source-grounded answers</span>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <main className="doc-intel-main" id="main">
        {/* LEFT PANEL: Upload zone or Document Viewer */}
        <section className="doc-intel-left-panel" aria-label="Document panel">
          {uploadState === 'idle' || uploadState === 'error' ? (
            <Reveal>
              <DocUpload
                onUpload={handleUpload}
                error={uploadError}
              />
            </Reveal>
          ) : uploadState === 'uploading' ? (
            <div className="doc-intel-uploading">
              <div className="doc-intel-upload-progress">
                <div
                  className="doc-intel-upload-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="doc-intel-upload-status">
                {uploadProgress < 60
                  ? 'Uploading document…'
                  : uploadProgress < 90
                  ? 'Extracting text & running OCR…'
                  : 'Building knowledge index…'}
              </p>
            </div>
          ) : (
            <DocViewer sessionData={sessionData} />
          )}
        </section>

        {/* RIGHT PANEL: Chat */}
        <section className="doc-intel-right-panel" aria-label="Chat panel">
          <DocChat
            sessionData={sessionData}
            isReady={uploadState === 'ready'}
            onReset={handleReset}
          />
        </section>
      </main>
    </div>
  )
}
