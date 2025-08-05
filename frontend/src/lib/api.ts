import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  AuthTokens, User, Course, Lesson, ChatMessage, UserLogin, UserRegister,
  PersonalChat, PersonalChatCreate, PersonalChatUpdate
} from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    // If NEXT_PUBLIC_API_URL is empty, use relative paths (nginx will proxy)
    // Otherwise use the provided URL (for development)
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle 401 errors and auto-refresh tokens
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If we're already refreshing, wait for it to complete with timeout
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
              
              // Add timeout to prevent infinite waiting
              setTimeout(() => {
                reject(new Error('Token refresh timeout'));
              }, 15000); // 15 second timeout
            }).then(() => {
              originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`;
              return this.client(originalRequest);
            }).catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            // Try to refresh the token with timeout
            const response = await this.client.post('/api/auth/refresh', {}, {
              headers: { Authorization: `Bearer ${refreshToken}` },
              timeout: 10000 // 10 second timeout for refresh
            });

            const newTokens = response.data;
            this.storeTokens(newTokens);

            // Update auth store with new tokens
            if (typeof window !== 'undefined') {
              try {
                const { useAuthStore } = await import('../store/auth');
                const store = useAuthStore.getState();
                store.setTokens(newTokens);
                console.info('Токен автоматически обновлен');
              } catch (storeError) {
                console.warn('Could not update auth store with new tokens');
              }
            }

            // Update the failed requests with new token
            this.processQueue(null, newTokens.access_token);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
            return this.client(originalRequest);

          } catch (refreshError) {
            // Refresh failed, handle gracefully
            this.processQueue(refreshError, null);
            this.clearTokens();
            
            // Show user-friendly notification
            console.warn('Сессия истекла. Пожалуйста, войдите в систему заново.');
            
            // Gracefully logout through auth store if available
            if (typeof window !== 'undefined') {
              try {
                // Use timeout for logout to prevent hanging
                const { useAuthStore } = await import('../store/auth');
                const logout = useAuthStore.getState().logout;
                
                // Don't await logout to prevent hanging
                logout(true).catch(() => {
                  // If logout fails, fallback to direct redirect
                  if (!window.location.pathname.includes('/auth/')) {
                    window.location.href = '/auth/login?message=session_expired';
                  }
                });
              } catch (storeError) {
                console.warn('Could not access auth store, using direct redirect');
                // Fallback to direct redirect only if auth store fails
                if (!window.location.pathname.includes('/auth/')) {
                  window.location.href = '/auth/login?message=session_expired';
                }
              }
            }
            
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Process queued requests after token refresh
  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  // Token management - sync with auth store
  private getStoredTokens(): AuthTokens | null {
    try {
      const access_token = localStorage.getItem('access_token');
      const refresh_token = localStorage.getItem('refresh_token');
      
      if (access_token && refresh_token) {
        return {
          access_token,
          refresh_token,
          token_type: 'bearer'
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    
    // Store token expiration time for proactive refresh
    if (tokens.expires_in) {
      const expirationTime = Date.now() + (tokens.expires_in * 1000);
      localStorage.setItem('token_expires_at', expirationTime.toString());
    }
  }

  // Check if token will expire soon (within 5 minutes)
  public isTokenExpiringSoon(): boolean {
    try {
      const expirationTime = localStorage.getItem('token_expires_at');
      if (!expirationTime) return false;
      
      const timeUntilExpiry = parseInt(expirationTime) - Date.now();
      return timeUntilExpiry < 5 * 60 * 1000; // 5 minutes
    } catch {
      return false;
    }
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    // Also clear auth store
    localStorage.removeItem('auth-storage');
  }

  // Auth endpoints
  async login(credentials: UserLogin): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/api/auth/login', credentials);
    this.storeTokens(response.data);
    return response.data;
  }

  async register(userData: UserRegister): Promise<User> {
    const response = await this.client.post<User>('/api/auth/register', userData);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>(
      '/api/auth/refresh',
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  // User endpoints
  async getProfile(): Promise<User> {
    const response = await this.client.get<User>('/api/users/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.client.put<User>('/api/users/profile', data);
    return response.data;
  }

  async getUserProgress(): Promise<any[]> {
    const response = await this.client.get('/api/users/progress');
    return response.data;
  }

  async getUserStats(): Promise<any> {
    const response = await this.client.get('/api/users/stats');
    return response.data;
  }

  async getUserCoursesWithProgress(): Promise<any[]> {
    const response = await this.client.get('/api/users/courses-with-progress');
    return response.data;
  }



  // Course endpoints
  async getCourses(params?: {
    skip?: number;
    limit?: number;
    level?: string;
  }): Promise<Course[]> {
    const response = await this.client.get<Course[]>('/api/courses/', { params });
    return response.data;
  }

  async getAdminCourses(): Promise<Course[]> {
    const response = await this.client.get<Course[]>('/api/admin/courses');
    return response.data;
  }

  async getPublicCourses(params?: {
    skip?: number;
    limit?: number;
    level?: string;
  }): Promise<Course[]> {
    // For public courses, we don't need authentication
    const response = await axios.get<Course[]>(`${this.baseURL}/api/courses/public`, { params });
    return response.data;
  }

  async getCourse(id: number): Promise<Course> {
    const response = await this.client.get<Course>(`/api/courses/${id}`);
    return response.data;
  }

  async getNextLesson(courseId: number): Promise<any> {
    const response = await this.client.get(`/api/courses/${courseId}/next-lesson`);
    return response.data;
  }

  async deleteCourse(id: number): Promise<void> {
    await this.client.delete(`/api/admin/courses/${id}`);
  }

  async createCourse(courseData: any): Promise<any> {
    const response = await this.client.post('/api/courses', courseData);
    return response.data;
  }

  async updateCourse(id: number, courseData: any): Promise<any> {
    const response = await this.client.put(`/api/admin/courses/${id}`, courseData);
    return response.data;
  }

  async getCourseLessons(courseId: number): Promise<Lesson[]> {
    const response = await this.client.get<Lesson[]>(`/api/courses/${courseId}/lessons`);
    return response.data;
  }

  // Lesson endpoints
  async getLesson(id: number): Promise<Lesson> {
    const response = await this.client.get<Lesson>(`/api/lessons/${id}`);
    return response.data;
  }

  async updateLessonProgress(
    lessonId: number,
    data: { watched_duration?: number; completed: boolean }
  ): Promise<any> {
    const requestData = {
      lesson_id: lessonId,
      watched_duration: data.watched_duration || 0,
      completed: data.completed
    };
    const response = await this.client.post(`/api/lessons/${lessonId}/progress`, requestData);
    return response.data;
  }

  // Chat endpoints
  async getChatHistory(params?: {
    thread_id?: string;
    limit?: number;
  }): Promise<ChatMessage[]> {
    const response = await this.client.get<ChatMessage[]>('/api/chat/history', { params });
    return response.data;
  }

  async sendMessage(content: string): Promise<ChatMessage> {
    const response = await this.client.post<ChatMessage>('/api/chat/message', { content });
    return response.data;
  }

  async createNewThread(): Promise<{ thread_id: string; created_at: string }> {
    const response = await this.client.post('/api/chat/new-thread', {});
    return response.data;
  }

  // Lesson Chat endpoints
  async getLessonChatHistory(lessonId: number): Promise<{
    messages: ChatMessage[];
    lesson_title: string;
    course_title: string;
    total_course_messages: number;
  }> {
    const response = await this.client.get(`/api/chat/lesson/${lessonId}/history`);
    return response.data;
  }

  async sendLessonMessage(lessonId: number, data: {
    content: string;
    lesson_id: number;
    course_id: number;
  }): Promise<ChatMessage> {
    const response = await this.client.post<ChatMessage>(`/api/chat/lesson/${lessonId}/message`, data);
    return response.data;
  }

  // Personal Assistant (Jarvis) methods
  async getPersonalAssistantHistory(limit: number = 50): Promise<ChatMessage[]> {
    const response = await this.client.get<ChatMessage[]>('/api/chat/personal/history', {
      params: { limit }
    });
    return response.data;
  }

  async sendPersonalAssistantMessage(content: string): Promise<ChatMessage> {
    const response = await this.client.post<ChatMessage>('/api/chat/personal/message', { content });
    return response.data;
  }

  // Admin endpoints
  async getAdminStats(): Promise<any> {
    const response = await this.client.get('/api/admin/dashboard-stats');
    return response.data;
  }



  async getAllCourses(params?: {
    skip?: number;
    limit?: number;
    include_unpublished?: boolean;
  }): Promise<Course[]> {
    const response = await this.client.get<Course[]>('/api/admin/courses', { params });
    return response.data;
  }

  async updateUserSubscription(
    userId: number,
    subscriptionStatus: string
  ): Promise<any> {
    const response = await this.client.put(`/api/admin/users/${userId}/subscription`, {
      subscription_status: subscriptionStatus,
    });
    return response.data;
  }

  async updateUserRole(userId: number, role: string): Promise<any> {
    const response = await this.client.put(`/api/admin/users/${userId}/role`, { role });
    return response.data;
  }

  // File upload
  async uploadFile(file: File, type: 'course' | 'lesson' | 'avatar'): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await this.client.post<{ url: string }>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  }

  // WebSocket connection
  createWebSocketConnection(userId: number): WebSocket {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    return new WebSocket(`${wsUrl}/api/chat/ws/${userId}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Debug method to test API connection
  async testConnection(): Promise<{ success: boolean; baseURL: string; error?: string }> {
    try {
      await this.healthCheck();
      return { 
        success: true, 
        baseURL: this.baseURL || 'relative paths' 
      };
    } catch (error) {
      return { 
        success: false, 
        baseURL: this.baseURL || 'relative paths',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Course access management
  async getAllUsers(): Promise<any[]> {
    const response = await this.client.get('/api/admin/users');
    return response.data;
  }

  async getCourseAccessList(courseId: number): Promise<any[]> {
    const response = await this.client.get(`/api/admin/course-access/${courseId}`);
    return response.data;
  }

  async grantCourseAccess(userId: number, courseId: number): Promise<any> {
    const response = await this.client.post(`/api/admin/grant-course-access?user_id=${userId}&course_id=${courseId}`);
    return response.data;
  }

  async revokeCourseAccess(userId: number, courseId: number): Promise<any> {
    const response = await this.client.delete(`/api/admin/revoke-course-access?user_id=${userId}&course_id=${courseId}`);
    return response.data;
  }

  // Personal Chats Management
  async getPersonalChats(): Promise<PersonalChat[]> {
    const response = await this.client.get<PersonalChat[]>('/api/chat/personal/chats');
    return response.data;
  }

  async createPersonalChat(chatData?: PersonalChatCreate): Promise<PersonalChat> {
    const response = await this.client.post<PersonalChat>('/api/chat/personal/chats', chatData || {});
    return response.data;
  }

  async updatePersonalChat(chatId: number, updateData: PersonalChatUpdate): Promise<PersonalChat> {
    const response = await this.client.put<PersonalChat>(`/api/chat/personal/chats/${chatId}`, updateData);
    return response.data;
  }

  async deletePersonalChat(chatId: number): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/api/chat/personal/chats/${chatId}`);
    return response.data;
  }

  async getPersonalChatHistory(chatId: number, limit: number = 50): Promise<ChatMessage[]> {
    const response = await this.client.get<ChatMessage[]>(`/api/chat/personal/chats/${chatId}/history`, {
      params: { limit }
    });
    return response.data;
  }

  async sendPersonalChatMessage(chatId: number, content: string): Promise<ChatMessage> {
    const response = await this.client.post<ChatMessage>(`/api/chat/personal/chats/${chatId}/message`, { content });
    return response.data;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export individual methods for convenience with proper context binding
export const login = apiClient.login.bind(apiClient);
export const register = apiClient.register.bind(apiClient);
export const logout = apiClient.logout.bind(apiClient);
export const getProfile = apiClient.getProfile.bind(apiClient);
export const updateProfile = apiClient.updateProfile.bind(apiClient);
export const getCourses = apiClient.getCourses.bind(apiClient);
export const getPublicCourses = apiClient.getPublicCourses.bind(apiClient);
export const getCourse = apiClient.getCourse.bind(apiClient);
export const getCourseLessons = apiClient.getCourseLessons.bind(apiClient);
export const getLesson = apiClient.getLesson.bind(apiClient);
export const updateLessonProgress = apiClient.updateLessonProgress.bind(apiClient);
export const getUserProgress = apiClient.getUserProgress.bind(apiClient);
export const getChatHistory = apiClient.getChatHistory.bind(apiClient);
export const sendMessage = apiClient.sendMessage.bind(apiClient);
export const createNewThread = apiClient.createNewThread.bind(apiClient);
export const getLessonChatHistory = apiClient.getLessonChatHistory.bind(apiClient);
export const sendLessonMessage = apiClient.sendLessonMessage.bind(apiClient);
export const getPersonalAssistantHistory = apiClient.getPersonalAssistantHistory.bind(apiClient);
export const sendPersonalAssistantMessage = apiClient.sendPersonalAssistantMessage.bind(apiClient);
export const uploadFile = apiClient.uploadFile.bind(apiClient);
export const createWebSocketConnection = apiClient.createWebSocketConnection.bind(apiClient);
export const healthCheck = apiClient.healthCheck.bind(apiClient);
export const testConnection = apiClient.testConnection.bind(apiClient);

// Personal Chats exports
export const getPersonalChats = apiClient.getPersonalChats.bind(apiClient);
export const createPersonalChat = apiClient.createPersonalChat.bind(apiClient);
export const updatePersonalChat = apiClient.updatePersonalChat.bind(apiClient);
export const deletePersonalChat = apiClient.deletePersonalChat.bind(apiClient);
export const getPersonalChatHistory = apiClient.getPersonalChatHistory.bind(apiClient);
export const sendPersonalChatMessage = apiClient.sendPersonalChatMessage.bind(apiClient);

