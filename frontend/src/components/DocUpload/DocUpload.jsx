/**
 * DocUpload.jsx
 * =============
 * Premium drag-and-drop medical document upload component.
 *
 * Accepts: PDF, JPG, PNG, WEBP, TIFF (max 25MB)
 * Features: drag-over highlight, file type validation, size validation,
 *           preview of accepted file name, animated upload states.
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Image, AlertCircle } from 'lucide-react'
import './DocUpload.css'

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg':      '.jpg/.jpeg',
  'image/png':       '.png',
  'image/webp':      '.webp',
  'image/tiff':      '.tiff',
}

const MAX_SIZE_MB = 25

export default function DocUpload({ onUpload, error }) {
  const [isDragging,   setIsDragging]   = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [validationErr, setValidationErr] = useState(null)
  const fileInputRef = useRef(null)

  const validateFile = (file) => {
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return `Unsupported file type. Please upload: PDF, JPG, PNG, WEBP, or TIFF.`
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: ${MAX_SIZE_MB}MB.`
    }
    return null
  }

  const handleFile = useCallback((file) => {
    const err = validateFile(file)
    if (err) {
      setValidationErr(err)
      setSelectedFile(null)
      return
    }
    setValidationErr(null)
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true)  }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }

  const handleUploadClick = () => {
    if (selectedFile) onUpload(selectedFile)
  }

  const displayError = validationErr || error

  return (
    <div className="doc-upload-wrapper">
      <div className="doc-upload-header">
        <h2 className="doc-upload-title">Upload Medical Document</h2>
        <p className="doc-upload-desc">
          Upload a PDF or image of a doctor's report, lab results, prescription,
          discharge summary, or any medical document to start asking questions.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`doc-upload-zone ${isDragging ? 'doc-upload-zone--dragging' : ''} ${selectedFile ? 'doc-upload-zone--selected' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Click or drag a file here to upload"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif"
          onChange={handleInputChange}
          className="doc-upload-input"
          aria-hidden="true"
        />

        {selectedFile ? (
          <div className="doc-upload-selected">
            {selectedFile.type === 'application/pdf'
              ? <FileText size={40} className="doc-upload-icon doc-upload-icon--file" />
              : <Image    size={40} className="doc-upload-icon doc-upload-icon--image" />}
            <p className="doc-upload-filename">{selectedFile.name}</p>
            <p className="doc-upload-filesize">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="doc-upload-empty">
            <div className="doc-upload-icon-wrapper">
              <Upload size={32} className="doc-upload-icon" />
            </div>
            <p className="doc-upload-cta">
              <strong>Drag & drop your medical document here</strong>
            </p>
            <p className="doc-upload-hint">
              or <span className="doc-upload-link">browse files</span>
            </p>
            <div className="doc-upload-types">
              {Object.values(ACCEPTED_TYPES).map(ext => (
                <span key={ext} className="doc-upload-type-badge">{ext}</span>
              ))}
              <span className="doc-upload-type-badge">Max {MAX_SIZE_MB}MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {displayError && (
        <div className="doc-upload-error" role="alert">
          <AlertCircle size={16} />
          <span>{displayError}</span>
        </div>
      )}

      {/* Supported document types info */}
      <div className="doc-upload-supported">
        <p className="doc-upload-supported-title">What can I upload?</p>
        <ul className="doc-upload-supported-list">
          <li>Doctor's reports and clinical notes</li>
          <li>Lab results and blood test reports</li>
          <li>Prescription documents</li>
          <li>Discharge summaries</li>
          <li>Imaging reports (MRI, X-ray, CT descriptions)</li>
          <li>Medical report photos (JPG, PNG)</li>
        </ul>
      </div>

      {/* Upload button */}
      {selectedFile && !validationErr && (
        <button
          className="doc-upload-btn"
          onClick={handleUploadClick}
          id="doc-upload-submit"
        >
          <Upload size={16} aria-hidden="true" />
          Analyse This Document
        </button>
      )}
    </div>
  )
}
