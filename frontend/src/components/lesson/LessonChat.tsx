'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Bot, User, Loader2 } from 'lucide-react';
import { getLessonChatHistory, sendLessonMessage } from '@/lib/api';

interface LessonChatMessage {
  id: number;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface LessonChatProps {
  lessonId: number;
  courseId: number;
  lessonTitle: string;
  courseTitle: string;
}

const LessonChat: React.FC<LessonChatProps> = ({ 
  lessonId, 
  courseId, 
  lessonTitle, 
  courseTitle 
}) => {
  const [messages, setMessages] = useState<LessonChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when component mounts
  useEffect(() => {
    loadChatHistory();
  }, [lessonId]);

  const loadChatHistory = async () => {
    try {
      console.log('Loading chat history for lesson:', lessonId);
      const data = await getLessonChatHistory(lessonId);
      console.log('Chat history loaded:', data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        lessonId
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    console.log('Sending message:', {
      content: messageContent,
      lessonId,
      courseId
    });

    // Add user message to UI immediately
    const userMessage: LessonChatMessage = {
      id: Date.now(),
      sender: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const assistantMessage = await sendLessonMessage(lessonId, {
        content: messageContent,
        lesson_id: lessonId,
        course_id: courseId,
      });
      console.log('Received assistant message:', assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Failed to send message:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        lessonId,
        courseId,
        messageContent
      });
      
      // Add error message
      const errorMessage: LessonChatMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        content: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}. Проверьте консоль для подробностей.`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Задать вопрос по уроку</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Чат по уроку</h4>
              <p className="text-sm text-gray-500">{lessonTitle}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Привет! Я готов ответить на ваши вопросы по этому уроку.
            </p>
            <p className="text-xs mt-1">
              Я помню всю историю нашего общения по курсу "{courseTitle}".
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0">
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 mt-0.5" />
                  ) : (
                    <Bot className="w-4 h-4 mt-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <div className="flex items-center space-x-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Печатаю...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Задайте вопрос по уроку..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
            className="flex-shrink-0 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Нажмите Enter для отправки. ИИ помнит историю всех чатов по курсу.
        </p>
      </div>
    </div>
  );
};

export default LessonChat; 