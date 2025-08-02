'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Sparkles, RotateCcw } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Loading from '@/components/ui/Loading';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { formatRelativeTime } from '@/lib/utils';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sendMessage, loadHistory, createNewThread } = useChatStore();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated, loadHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(true);

    try {
      await sendMessage(messageText);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = async () => {
    try {
      await createNewThread();
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  const suggestedQuestions = [
    'Расскажи о доступных курсах',
    'Как работает AI-ассистент?',
    'Какие навыки я могу изучить?',
    'Помоги выбрать курс для начинающих',
    'Объясни концепцию машинного обучения',
    'Как эффективно изучать программирование?',
  ];

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container-custom section-padding">
          <div className="max-w-2xl mx-auto text-center">
            <MessageCircle className="w-16 h-16 text-secondary-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">
              AI-Ассистент
            </h1>
            <p className="text-lg text-secondary-600 mb-8">
              Войдите в систему, чтобы начать общение с персональным AI-наставником
            </p>
            <Button onClick={() => window.location.href = '/auth/login'}>
              Войти в систему
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Chat Header */}
        <div className="border-b border-secondary-200 bg-white">
          <div className="container-custom py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-secondary-900">
                    AI-Ассистент
                  </h1>
                  <p className="text-sm text-secondary-600">
                    Ваш персональный наставник по обучению
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Новый чат</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-secondary-50">
          <div className="container-custom py-6">
            {messages.length === 0 ? (
              /* Welcome Screen */
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-900 mb-2">
                    Привет, {user?.name}! 👋
                  </h2>
                  <p className="text-secondary-600">
                    Я ваш AI-ассистент. Задайте любой вопрос о курсах, обучении или попросите помощи с материалом.
                  </p>
                </div>

                {/* Suggested Questions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-secondary-700 text-center">
                    Популярные вопросы:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setMessage(question)}
                        className="p-3 text-left bg-white rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Messages List */
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex space-x-3 max-w-3xl ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {msg.sender === 'user' ? (
                          <Avatar name={user?.name || 'User'} size="sm" />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Message */}
                      <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl ${
                            msg.sender === 'user'
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-secondary-200 text-secondary-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="text-xs text-secondary-500 mt-1">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {(isLoading || isTyping) && (
                  <div className="flex justify-start">
                    <div className="flex space-x-3 max-w-3xl">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white border border-secondary-200 rounded-2xl px-4 py-3">
                        <Loading size="sm" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-secondary-200 bg-white">
          <div className="container-custom py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Задайте вопрос AI-ассистенту..."
                    className="w-full px-4 py-3 pr-12 border border-secondary-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={1}
                    style={{
                      minHeight: '48px',
                      maxHeight: '120px',
                      height: 'auto',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className="px-4 py-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-xs text-secondary-500 mt-2 text-center">
                AI может делать ошибки. Проверяйте важную информацию.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

