'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Sparkles, RotateCcw, Plus, Trash2, Edit2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Loading from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth';
import { formatRelativeTime } from '@/lib/utils';
import { 
  getPersonalChats, 
  createPersonalChat, 
  updatePersonalChat, 
  deletePersonalChat,
  getPersonalChatHistory,
  sendPersonalChatMessage 
} from '@/lib/api';
import { PersonalChat, ChatMessage } from '@/types';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chats, setChats] = useState<PersonalChat[]>([]);
  const [currentChat, setCurrentChat] = useState<PersonalChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, user } = useAuthStore();

  // Load chats on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadChats();
    }
  }, [isAuthenticated]);

  // Load messages when current chat changes
  useEffect(() => {
    if (currentChat) {
      loadChatHistory(currentChat.id);
    }
  }, [currentChat]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChats = async () => {
    try {
      setIsChatsLoading(true);
      const chatList = await getPersonalChats();
      setChats(chatList);
      
      // Select first chat if available
      if (chatList.length > 0 && !currentChat) {
        setCurrentChat(chatList[0]);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsChatsLoading(false);
    }
  };

  const loadChatHistory = async (chatId: number) => {
    try {
      setIsLoading(true);
      const history = await getPersonalChatHistory(chatId);
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const newChat = await createPersonalChat();
      setChats(prev => [newChat, ...prev]);
      setCurrentChat(newChat);
      setMessages([]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !currentChat || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      content: message.trim(),
      thread_id: currentChat.thread_id,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    try {
      const response = await sendPersonalChatMessage(currentChat.id, userMessage.content);
      setMessages(prev => [
        ...prev.filter(m => m.id !== userMessage.id),
        { ...userMessage, id: response.id - 1 },
        response
      ]);
      
      // Update chat timestamp
      setChats(prev => prev.map(chat => 
        chat.id === currentChat.id 
          ? { ...chat, updated_at: new Date().toISOString(), message_count: (chat.message_count || 0) + 2 }
          : chat
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
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

  const handleEditChatTitle = async (chatId: number, newTitle: string) => {
    try {
      const updatedChat = await updatePersonalChat(chatId, { title: newTitle });
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? updatedChat : chat
      ));
      if (currentChat?.id === chatId) {
        setCurrentChat(updatedChat);
      }
      setEditingChatId(null);
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    if (!confirm('Удалить этот чат?')) return;
    
    try {
      await deletePersonalChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (currentChat?.id === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        setCurrentChat(remainingChats[0] || null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleQuickMessage = (text: string) => {
    setMessage(text);
    if (currentChat) {
      handleSendMessage();
    }
  };

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
              Войдите в систему для доступа к персональному AI-ассистенту
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar with chat list */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">История чатов</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNewChat}
                className="flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Новый</span>
              </Button>
            </div>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {isChatsLoading ? (
              <div className="p-4">
                <Loading />
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Нет чатов</p>
                <p className="text-sm">Создайте первый чат</p>
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.id}
                  className={`group p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    currentChat?.id === chat.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setCurrentChat(chat)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleEditChatTitle(chat.id, editingTitle)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEditChatTitle(chat.id, editingTitle);
                            }
                          }}
                          className="w-full text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {chat.title}
                        </h3>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {chat.message_count || 0} сообщений
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(chat.last_message_at || chat.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(chat.id);
                          setEditingTitle(chat.title);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(chat.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              {/* Chat header */}
              <div className="bg-white shadow-sm border-b p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">{currentChat.title}</h1>
                    <p className="text-sm text-gray-500">AI-Ассистент готов помочь</p>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <div className="max-w-4xl mx-auto px-4 py-6">
                    {messages.length === 0 && !isLoading ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Добро пожаловать! Я ваш персональный AI-ассистент
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Анализирую ваш прогресс по курсам и помогаю с обучением. 
                          Спрашивайте о чем угодно - дам конкретные рекомендации!
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                          <button
                            onClick={() => handleQuickMessage('Покажи мой прогресс по курсам')}
                            className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-gray-900">📊 Мой прогресс</div>
                            <div className="text-sm text-gray-600">Посмотреть статистику обучения</div>
                          </button>
                          <button
                            onClick={() => handleQuickMessage('Какой курс мне изучать дальше?')}
                            className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-gray-900">🎯 Рекомендации</div>
                            <div className="text-sm text-gray-600">Что изучать дальше</div>
                          </button>
                          <button
                            onClick={() => handleQuickMessage('Где я допускаю ошибки?')}
                            className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-gray-900">⚠️ Анализ сложностей</div>
                            <div className="text-sm text-gray-600">Найти проблемные места</div>
                          </button>
                          <button
                            onClick={() => handleQuickMessage('Мотивируй меня продолжать учиться')}
                            className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-gray-900">💪 Мотивация</div>
                            <div className="text-sm text-gray-600">Получить поддержку</div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {messages.map((msg, index) => (
                          <div
                            key={msg.id || index}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex space-x-3 max-w-3xl ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Avatar
                                name={msg.sender === 'user' ? user?.name : 'AI-Ассистент'}
                                size="sm"
                                className={msg.sender === 'user' ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'}
                              />
                              <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {msg.sender === 'user' ? user?.name || 'Вы' : 'AI-Ассистент'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatRelativeTime(msg.created_at)}
                                  </span>
                                </div>
                                <div className={`inline-block px-4 py-2 rounded-lg ${
                                  msg.sender === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-900'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="flex space-x-3 max-w-3xl">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex flex-col items-start">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">AI-Ассистент</span>
                                </div>
                                <div className="inline-block px-4 py-2 rounded-lg bg-gray-100">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isLoading && (
                      <div className="flex justify-center py-4">
                        <Loading />
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              {/* Input area */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Напишите сообщение..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={1}
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isTyping}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Выберите чат</h3>
                <p className="text-gray-500 mb-4">Выберите существующий чат или создайте новый</p>
                <Button onClick={handleCreateNewChat} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Создать новый чат</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

