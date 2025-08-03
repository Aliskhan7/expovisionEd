import { create } from 'zustand';
import { ChatState, ChatMessage } from '@/types';
import { 
  getPersonalAssistantHistory, 
  sendPersonalAssistantMessage
} from '@/lib/api';

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
      thread_id: `personal_assistant_user_${Date.now()}`, // Will be replaced
      created_at: new Date().toISOString(),
    };

    set(state => ({
      messages: [...state.messages, userMessage],
    }));

    try {
      const response = await sendPersonalAssistantMessage(content);
      
      // Replace temporary user message and add assistant response
      set(state => ({
        messages: [
          ...state.messages.filter(m => m.id !== userMessage.id),
          {
            ...userMessage,
            id: response.id - 1, // Assume user message is saved right before assistant
            thread_id: response.thread_id,
          },
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
      const messages = await getPersonalAssistantHistory(50);
      set({
        messages,
        currentThread: threadId || null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading chat history:', error);
      set({ isLoading: false });
    }
  },

  createNewThread: async () => {
    // For personal assistant, we don't create new threads
    // Each user has a static thread ID
    try {
      set({
        messages: [],
        currentThread: null,
      });
    } catch (error) {
      console.error('Error creating new thread:', error);
      throw error;
    }
  },
}));

