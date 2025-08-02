import { create } from 'zustand';
import { ChatState, ChatMessage } from '@/types';
import { apiClient } from '@/lib/api';

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentThread: null,
  isLoading: false,

  sendMessage: async (content: string) => {
    set({ isLoading: true });
    
    // Add user message immediately for better UX
    const userMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      sender: 'user',
      content,
      thread_id: get().currentThread || '',
      created_at: new Date().toISOString(),
    };

    set(state => ({
      messages: [...state.messages, userMessage],
    }));

    try {
      const response = await apiClient.sendMessage(content);
      
      // Replace temporary user message and add assistant response
      set(state => ({
        messages: [
          ...state.messages.filter(m => m.id !== userMessage.id),
          userMessage,
          response,
        ],
        currentThread: response.thread_id,
        isLoading: false,
      }));
    } catch (error) {
      // Remove temporary message on error
      set(state => ({
        messages: state.messages.filter(m => m.id !== userMessage.id),
        isLoading: false,
      }));
      throw error;
    }
  },

  loadHistory: async (threadId?: string) => {
    set({ isLoading: true });
    try {
      const messages = await apiClient.getChatHistory({
        thread_id: threadId,
        limit: 50,
      });
      
      set({
        messages,
        currentThread: threadId || null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createNewThread: async () => {
    try {
      const thread = await apiClient.createNewThread();
      set({
        messages: [],
        currentThread: thread.thread_id,
      });
    } catch (error) {
      throw error;
    }
  },
}));

