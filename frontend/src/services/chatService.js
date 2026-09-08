/**
 * chatService.js
 * ==============
 * Business logic hook for the CopilotChat component.
 *
 * Manages:
 *  - Message history (user + assistant bubbles)
 *  - Loading state while awaiting the RAG pipeline
 *  - Error state & display
 *  - Auto-generating a patient context string from prediction data
 *
 * Usage:
 *   const { messages, isLoading, error, sendMessage, clearChat } = useChatService(predictionResult)
 */

import { useState, useCallback } from 'react'
import { sendChatMessage } from '../api/ragApi'

/**
 * Converts a prediction result object (from the ML API) into a plain-text
 * string that the RAG analyst can reason about.
 *
 * @param {Object|null} predictionResult - Raw response from /predict endpoint
 * @returns {string}
 */
export function buildPatientContext(predictionResult) {
  if (!predictionResult) return ''

  const {
    prediction,
    probability_positive,
    input_data,
  } = predictionResult

  if (!input_data) return ''

  const riskLabel = prediction === 1 ? 'HIGH RISK' : 'LOW RISK'
  const probPct   = ((probability_positive ?? 0) * 100).toFixed(1)

  return [
    `Prediction: ${riskLabel} (${probPct}% probability)`,
    `Glucose: ${input_data.glucose ?? 'N/A'} mg/dL`,
    `BMI: ${input_data.bmi ?? 'N/A'}`,
    `Blood Pressure (diastolic): ${input_data.blood_pressure ?? 'N/A'} mm Hg`,
    `Age: ${input_data.age ?? 'N/A'} years`,
    `Insulin: ${input_data.insulin ?? 'N/A'} μU/mL`,
    `Diabetes Pedigree Function: ${input_data.dpf ?? 'N/A'}`,
    `Pregnancies: ${input_data.pregnancies ?? 'N/A'}`,
    `Skin Thickness: ${input_data.skin_thickness ?? 'N/A'} mm`,
  ].join('\n')
}

/**
 * React hook encapsulating all chat state and logic.
 *
 * @param {Object|null} predictionResult - Current patient prediction from ML model
 * @returns {{ messages, isLoading, error, sendMessage, clearChat }}
 */
export function useChatService(predictionResult = null) {
  const [messages,  setMessages]  = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState(null)

  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim() || isLoading) return

    // Append user message immediately
    const userMsg = { role: 'user', content: userText, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    try {
      const patientContext = buildPatientContext(predictionResult)
      const data = await sendChatMessage(userText, patientContext)

      const assistantMsg = {
        role:        'assistant',
        content:     data.response,
        steps_taken: data.steps_taken,
        id:          Date.now() + 1,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const errText =
        err.response?.data?.detail ??
        err.message ??
        'Unable to reach the AI assistant. Please try again.'
      setError(errText)

      // Still append an error bubble so the conversation is readable
      setMessages(prev => [
        ...prev,
        {
          role:    'assistant',
          content: `Error: ${errText}`,
          isError: true,
          id:      Date.now() + 1,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, predictionResult])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, sendMessage, clearChat }
}
