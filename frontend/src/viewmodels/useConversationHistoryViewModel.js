import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService.js';

export function useConversationHistoryViewModel() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items } = await chatService.listConversations();
      setConversations(items);
    } catch {
      setError('Could not load your conversations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rename = useCallback(async (id, title) => {
    await chatService.updateConversation(id, { title });
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, title } : c)));
  }, []);

  const remove = useCallback(async (id) => {
    await chatService.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c._id !== id));
  }, []);

  return { conversations, isLoading, error, rename, remove, reload: load };
}
