// User types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'admin';
  is_active: boolean;
  subscription_status: 'active' | 'inactive' | 'expired';
  subscription_expiry?: string;
  created_at: string;
  updated_at: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserRegister {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number; // Token expiration time in seconds
}

// Course types
export interface Course {
  id: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  price?: number;
  is_premium: boolean;
  is_published: boolean;
  access_type?: string;
  total_duration?: number;
  total_lessons?: number;
  instructor_name?: string;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

export interface CourseProgress {
  course_id: number;
  completed_lessons: number;
  total_lessons: number;
  progress_percentage: number;
  last_lesson_id?: number;
  completed_at?: string;
}

// Lesson types
export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  video_url: string;
  duration?: number;
  transcript?: string;
  content?: string;
  order_index: number;
  is_free?: boolean;
  is_preview?: boolean;
  is_completed?: boolean;
  has_access?: boolean; // Whether user has access to this lesson
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  lesson_id: number;
  watched_duration: number;
  completed: boolean;
}

// Chat types
export interface ChatMessage {
  id: number;
  sender: 'user' | 'assistant';
  content: string;
  thread_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatThread {
  thread_id: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// UI Component types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Store types
export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean; // Add hydration state
  login: (credentials: UserLogin) => Promise<void>;
  register: (userData: UserRegister) => Promise<void>;
  logout: (showMessage?: boolean) => Promise<void>;
  setTokens: (tokens: AuthTokens) => void;
  refreshToken: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  userProgress: Record<number, CourseProgress>;
  isLoading: boolean;
  loading: boolean;
  fetchCourses: (forceRefresh?: boolean) => Promise<void>;
  fetchCourse: (id: number) => Promise<void>;
  deleteCourse: (id: number) => Promise<void>;
  updateProgress: (courseId: number, lessonId: number, completed: boolean) => Promise<void>;
  clearCache: () => void;
}

export interface ChatState {
  messages: ChatMessage[];
  currentThread: string | null;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: (threadId?: string) => Promise<void>;
  createNewThread: () => Promise<void>;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

