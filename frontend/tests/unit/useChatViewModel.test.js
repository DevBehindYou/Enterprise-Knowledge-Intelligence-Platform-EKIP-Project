import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../../src/services/chatService.js', () => ({
  chatService: {
    ask: vi.fn(),
    submitFeedback: vi.fn(),
    getConversation: vi.fn(),
  },
}));

const { chatService } = await import('../../src/services/chatService.js');
const { useChatViewModel } = await import('../../src/viewmodels/useChatViewModel.js');

describe('useChatViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with an empty thread when no conversationId is given', () => {
    const { result } = renderHook(() => useChatViewModel(undefined));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoadingHistory).toBe(false);
  });

  it('loads existing history when given a conversationId', async () => {
    chatService.getConversation.mockResolvedValue({
      _id: 'convo-1',
      messages: [{ _id: 'm1', role: 'user', text: 'Hello' }],
    });

    const { result } = renderHook(() => useChatViewModel('convo-1'));

    expect(result.current.isLoadingHistory).toBe(true);
    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.conversationId).toBe('convo-1');
  });

  it('optimistically appends the user message, then the assistant answer on success', async () => {
    chatService.ask.mockResolvedValue({
      conversationId: 'convo-new',
      messageId: 'm2',
      answer: 'You get 20 days of PTO per year.',
      citations: [{ documentId: 'doc-1', documentName: 'HR_Manual.docx', chunkId: 'c1' }],
      confidence: 0.88,
    });

    const { result } = renderHook(() => useChatViewModel());

    await act(async () => {
      await result.current.sendMessage('How many vacation days do I get?');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].confidence).toBe(0.88);
    expect(result.current.conversationId).toBe('convo-new');
    expect(result.current.isAsking).toBe(false);
  });

  it('sets an error and keeps the user message visible if the ask call fails', async () => {
    chatService.ask.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useChatViewModel());

    await act(async () => {
      await result.current.sendMessage('This will fail');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.messages).toHaveLength(1); // the optimistic user message stays
    expect(result.current.messages[0].role).toBe('user');
  });

  it('does nothing for a blank message', async () => {
    const { result } = renderHook(() => useChatViewModel());
    await act(async () => {
      await result.current.sendMessage('   ');
    });
    expect(chatService.ask).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it('optimistically updates feedback before the network call resolves', async () => {
    chatService.submitFeedback.mockResolvedValue({ success: true });
    chatService.ask.mockResolvedValue({
      conversationId: 'c1',
      messageId: 'm1',
      answer: 'Answer text',
      citations: [],
      confidence: 0.7,
    });

    const { result } = renderHook(() => useChatViewModel());
    await act(async () => {
      await result.current.sendMessage('A question');
    });

    await act(async () => {
      await result.current.giveFeedback('m1', 'up');
    });

    expect(result.current.messages.find((m) => m._id === 'm1').feedback).toBe('up');
    expect(chatService.submitFeedback).toHaveBeenCalledWith('m1', 'up');
  });
});
