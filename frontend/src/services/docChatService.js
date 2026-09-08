/**
 * docChatService.js
 * =================
 * React hook for the DocChat component.
 *
 * Manages:
 *   - Message history (user + assistant with citations)
 *   - Conversation history for backend memory
 *   - Loading state
 *   - Error handling
 */

import { useState, useCallback } from 'react'
import { sendDocChatMessage } from '../api/docApi'

export function useDocChatService(sessionId) {
  const [messages,             setMessages]             = useState([])
  const [isLoading,            setIsLoading]            = useState(false)
  const [conversationHistory,  setConversationHistory]  = useState([])

  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim() || isLoading || !sessionId) return

    const userMsg = {
      role:    'user',
      content: userText,
      id:      Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    // Build updated history to send (include this new user message)
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userText },
    ]

    try {
      const data = await sendDocChatMessage(sessionId, userText, updatedHistory)

      const assistantMsg = {
        role:       'assistant',
        content:    data.response,
        steps_taken: data.steps_taken,
        citations:  data.citations || [],
        id:         Date.now() + 1,
      }
      setMessages(prev => [...prev, assistantMsg])

      // Update conversation history with assistant reply
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: data.response },
      ])
    } catch (err) {
      const errText =
        err.response?.data?.detail ??
        err.message ??
        'Unable to reach the AI assistant. Please try again.'

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
  }, [isLoading, sessionId, conversationHistory])

  const clearChat = useCallback(() => {
    setMessages([])
    setConversationHistory([])
  }, [])

  return { messages, isLoading, sendMessage, clearChat }
}
