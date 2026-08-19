import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService.js';

/**
 * ViewModel backing the Chat page and ChatMessageBubble components.
 * Views read {messages, isAsking, error} and call {sendMessage, giveFeedback} —
 * they never call chatService directly (docs/07-component-library.md §4).
 */
export function useChatViewModel(initialConversationId) {
  const [conversationId, setConversationId] = useState(initialConversationId ?? null);
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(initialConversationId));
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialConversationId) return;
    (async () => {
      setIsLoadingHistory(true);
      try {
        const convo = await chatService.getConversation(initialConversationId);
        setMessages(convo.messages);
        setConversationId(convo._id);
      } catch (err) {
        setError('Could not load this conversation.');
      } finally {
        setIsLoadingHistory(false);
      }
    })();
  }, [initialConversationId]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim()) return;
      setError(null);
      const optimisticUserMessage = { _id: `temp-${Date.now()}`, role: 'user', text };
      setMessages((prev) => [...prev, optimisticUserMessage]);
      setIsAsking(true);
      try {
        const result = await chatService.ask(text, conversationId);
        setConversationId(result.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            _id: result.messageId,
            role: 'assistant',
            text: result.answer,
            citations: result.citations,
            confidence: result.confidence,
            feedback: null,
          },
        ]);
      } catch (err) {
        setError('Something went wrong getting an answer. Please try again.');
      } finally {
        setIsAsking(false);
      }
    },
    [conversationId]
  );

  const giveFeedback = useCallback(async (messageId, rating) => {
    setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, feedback: rating } : m)));
    try {
      await chatService.submitFeedback(messageId, rating);
    } catch {
      // Non-critical — feedback failing silently is preferable to blocking the chat UI.
    }
  }, []);

  return { conversationId, messages, isLoadingHistory, isAsking, error, sendMessage, giveFeedback };
}
