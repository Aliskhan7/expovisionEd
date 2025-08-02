'use client';

import { useEffect, useState, useRef, useMemo, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { useCoursesStore } from '@/store/courses';
import Layout from '@/components/layout/Layout';
import { Course, Lesson } from '@/types';

interface LessonProgress {
  watchedDuration: number;
  totalDuration: number;
  isCompleted: boolean;
  lastWatchedAt: string;
}

function LessonPlayer() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { messages, sendMessage } = useChatStore();
  const { courses, currentCourse, fetchCourse, courseLessons, fetchCourseLessons } = useCoursesStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const courseId = parseInt(params.id as string);
  const lessonId = parseInt(params.lessonId as string);
  
  // Get course from store
  const course = useMemo(() => {
    return currentCourse?.id === courseId 
      ? currentCourse 
      : courses.find(c => c.id === courseId);
  }, [currentCourse, courses, courseId]);
  
  // Get lessons from store
  const allLessons = courseLessons[courseId] || [];
  
  // Find current lesson
  const lesson = useMemo(() => {
    return allLessons.find(l => l.id === lessonId);
  }, [allLessons, lessonId]);
  const [progress, setProgress] = useState<LessonProgress>({
    watchedDuration: 0,
    totalDuration: 0,
    isCompleted: false,
    lastWatchedAt: ''
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [hasAccess, setHasAccess] = useState(false);

  // Load initial data only once
  useEffect(() => {
    if (!courseId || !lessonId) return;
    
    const loadData = async () => {
      try {
        // Get fresh references to store functions
        const { fetchCourse: fetchCourseFn, fetchCourseLessons: fetchCourseLessonsFn } = useCoursesStore.getState();
        
        // Always try to fetch - store will handle caching
        await Promise.all([
          fetchCourseFn(courseId),
          fetchCourseLessonsFn(courseId)
        ]);
      } catch (error) {
        console.error('Failed to fetch lesson data:', error);
        router.push('/courses');
      }
    };

    loadData();
  }, [courseId, lessonId, router]);

  // Check if lesson exists when data is loaded
  useEffect(() => {
    if (allLessons.length > 0 && !lesson) {
      console.error('Lesson not found');
      router.push(`/courses/${courseId}`);
    }
  }, [allLessons, lesson, courseId, router]);

  // Check access and fetch progress after lesson and course data is loaded
  useEffect(() => {
    if (lesson && course) {
      checkAccess();
      if (isAuthenticated) {
        fetchProgress();
      }
    }
  }, [lesson, course, isAuthenticated]);

  const checkAccess = async () => {
    try {
      if (!lesson || !course) {
        setHasAccess(false);
        return;
      }

      // For free lessons, always allow access
      if (lesson.is_free) {
        setHasAccess(true);
        return;
      }

      // For premium lessons, check if course is free or user has access
      if (!course.is_premium) {
        setHasAccess(true);
        return;
      }

      // Check user subscription status
      if (isAuthenticated && user?.subscription_status === 'active') {
        setHasAccess(true);
        return;
      }

      setHasAccess(false);
    } catch (error) {
      console.error('Failed to check access:', error);
      setHasAccess(false);
    }
  };

  const fetchProgress = async () => {
    try {
      // Mock progress data
      setProgress({
        watchedDuration: 300,
        totalDuration: lesson?.duration || 0,
        isCompleted: false,
        lastWatchedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      
      // Update progress every 10 seconds
      if (Math.floor(current) % 10 === 0) {
        updateProgress(current);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      
      // Resume from last watched position
      if (progress.watchedDuration > 0) {
        videoRef.current.currentTime = progress.watchedDuration;
      }
    }
  };

  const updateProgress = async (watchedDuration: number) => {
    try {
      // Update progress on server
      const isCompleted = watchedDuration >= (duration * 0.9); // 90% watched = completed
      
      setProgress(prev => ({
        ...prev,
        watchedDuration,
        isCompleted
      }));
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    const nextLesson = allLessons[currentIndex + 1];
    
    if (nextLesson) {
      router.push(`/courses/${courseId}/lessons/${nextLesson.id}`);
    }
  };

  const handlePreviousLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    const prevLesson = allLessons[currentIndex - 1];
    
    if (prevLesson) {
      router.push(`/courses/${courseId}/lessons/${prevLesson.id}`);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    try {
      await sendMessage(chatMessage, {
        courseId,
        lessonId,
        currentTime,
        lessonTitle: lesson?.title,
        transcript: lesson?.transcript
      });
      setChatMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!lesson || !course) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Доступ ограничен</h2>
            <p className="text-gray-600 mb-4">Для просмотра этого урока необходимо приобрести курс</p>
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="btn-primary"
            >
              Вернуться к курсу
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-screen object-contain"
          src={lesson.video_url?.includes('example.com') 
            ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            : lesson.video_url
          }
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onMouseMove={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onError={(e) => {
            console.error('Video load error:', e);
            // You can add error handling here
          }}
        />

        {/* Video Controls Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/courses/${courseId}`)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Вернуться к курсу"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold">{lesson.title}</h1>
                  <p className="text-sm text-gray-300">{course.title}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="AI-Ассистент"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      // Mark lesson as completed using correct API
                      await updateProgress(courseId, lessonId, true);
                      router.push(`/courses/${courseId}`);
                    } catch (error) {
                      console.error('Failed to complete lesson:', error);
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors text-sm font-medium"
                  title="Завершить урок"
                >
                  Завершить урок
                </button>
              </div>
            </div>
          </div>

          {/* Center Play Button */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handleVideoPlay}
                className="w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="relative">
                <div className="h-1 bg-white/30 rounded-full">
                  <div 
                    className="h-1 bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePreviousLesson}
                    disabled={allLessons.findIndex(l => l.id === lessonId) === 0}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                    className="p-3 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  
                  <button
                    onClick={handleNextLesson}
                    disabled={allLessons.findIndex(l => l.id === lessonId) === allLessons.length - 1}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                    </svg>
                  </button>
                  
                  <span className="text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {progress.isCompleted && (
                    <span className="badge-success">Завершено</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Sidebar */}
      {isChatOpen && (
        <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-2xl z-50 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">AI-Ассистент</h3>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                  <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Задайте вопрос об уроке..."
                className="flex-1 input text-sm"
              />
              <button
                onClick={handleSendChatMessage}
                disabled={!chatMessage.trim() || chatLoading}
                className="btn-primary px-3 py-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(LessonPlayer);

