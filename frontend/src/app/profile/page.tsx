'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/layout/Layout';
import { Course } from '@/types';
import { apiClient } from '@/lib/api';

interface UserProgress {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalWatchTime: number;
  streak: number;
  certificates: number;
}

interface CourseProgress {
  course: Course;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  lastWatchedAt: string;
  isCompleted: boolean;
}

export default function UserProfile() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated, initializeAuth } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalWatchTime: 0,
    streak: 0,
    certificates: 0
  });
  const [coursesProgress, setCoursesProgress] = useState<CourseProgress[]>([]);

  // Initialize auth on component mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Check authentication after hydration
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration
    
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchUserProgress();
  }, [isAuthenticated, isHydrated, router]);

  const fetchUserProgress = async () => {
    try {
      // Fetch real user statistics from API
      const statsResponse = await apiClient.getUserStats();
      const coursesResponse = await apiClient.getUserCoursesWithProgress();

      // Map API response to our interface
      const userStats: UserProgress = {
        totalCourses: statsResponse.total_courses || 0,
        completedCourses: statsResponse.completed_courses || 0,
        inProgressCourses: statsResponse.in_progress_courses || 0,
        totalWatchTime: statsResponse.total_watch_time_minutes || 0,
        streak: statsResponse.learning_streak_days || 0,
        certificates: statsResponse.certificates || 0
      };

      // Map courses data to our interface
      const coursesProgress: CourseProgress[] = coursesResponse.map((courseData: any) => ({
        course: courseData.course,
        completedLessons: courseData.completed_lessons || 0,
        totalLessons: courseData.total_lessons || 0,
        progressPercentage: courseData.progress_percentage || 0,
        lastWatchedAt: courseData.last_watched_at || null,
        isCompleted: courseData.is_completed || false
      }));

      setUserProgress(userStats);
      setCoursesProgress(coursesProgress);
    } catch (error) {
      console.error('Failed to fetch user progress:', error);
      
      // Fallback to empty data if API fails
      setUserProgress({
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalWatchTime: 0,
        streak: 0,
        certificates: 0
      });
      setCoursesProgress([]);
    } finally {
      setLoading(false);
    }
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getStreakText = (streak: number) => {
    if (streak === 0) return 'Начните изучение!';
    if (streak === 1) return '1 день подряд';
    if (streak < 5) return `${streak} дня подряд`;
    return `${streak} дней подряд`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Profile Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container-custom py-8">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-600">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {user?.full_name || 'Пользователь'}
                </h1>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                
                {/* Quick Stats */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="text-gray-700">{userProgress.completedCourses} курсов завершено</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                    <span className="text-gray-700">{getStreakText(userProgress.streak)}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{formatWatchTime(userProgress.totalWatchTime)} изучено</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => router.push('/profile/settings')}
                className="btn-outline hidden"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Настройки
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="container-custom">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Обзор
              </button>
              <button
                onClick={() => setActiveTab('courses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'courses'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Мои курсы ({userProgress.totalCourses})
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm hidden ${
                  activeTab === 'certificates'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Сертификаты ({userProgress.certificates})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container-custom py-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Всего курсов</p>
                      <p className="text-2xl font-bold text-gray-900">{userProgress.totalCourses}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Завершено</p>
                      <p className="text-2xl font-bold text-gray-900">{userProgress.completedCourses}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Время изучения</p>
                      <p className="text-2xl font-bold text-gray-900">{formatWatchTime(userProgress.totalWatchTime)}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Серия дней</p>
                      <p className="text-2xl font-bold text-gray-900">{userProgress.streak}</p>
                      <p className="text-sm text-gray-500">{getStreakText(userProgress.streak)}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Недавняя активность</h2>
                
                <div className="space-y-4">
                  {coursesProgress.slice(0, 3).map((progress) => (
                    <div key={progress.course.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {progress.course.cover_image_url ? (
                          <img
                            src={progress.course.cover_image_url}
                            alt={progress.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{progress.course.title}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>{progress.completedLessons} из {progress.totalLessons} уроков</span>
                              <span>{progress.progressPercentage}%</span>
                            </div>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${progress.progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          {progress.isCompleted && (
                            <span className="badge-success">Завершен</span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => router.push(`/courses/${progress.course.id}`)}
                        className="btn-outline btn-sm"
                      >
                        {progress.isCompleted ? 'Повторить' : 'Продолжить'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Мои курсы</h2>
                <button
                  onClick={() => router.push('/courses')}
                  className="btn-primary"
                >
                  Найти новые курсы
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {coursesProgress.map((progress) => (
                  <div key={progress.course.id} className="card p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {progress.course.cover_image_url ? (
                          <img
                            src={progress.course.cover_image_url}
                            alt={progress.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{progress.course.title}</h3>
                          {progress.isCompleted && (
                            <span className="badge-success">Завершен</span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {progress.course.instructor_name} • {progress.course.total_lessons} уроков
                        </p>

                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Прогресс</span>
                            <span>{progress.progressPercentage}%</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${progress.progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {progress.completedLessons} из {progress.totalLessons} уроков
                          </span>
                          <button
                            onClick={() => router.push(`/courses/${progress.course.id}`)}
                            className="btn-primary btn-sm"
                          >
                            {progress.isCompleted ? 'Повторить' : 'Продолжить'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificates Tab - Hidden */}
          {activeTab === 'certificates' && false && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Мои сертификаты</h2>
              
              {userProgress.certificates > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {coursesProgress.filter(p => p.isCompleted).map((progress) => (
                    <div key={progress.course.id} className="card p-6 text-center">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {progress.course.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-4">
                        Завершен {new Date(progress.lastWatchedAt).toLocaleDateString('ru-RU')}
                      </p>
                      
                      <button className="btn-outline btn-sm w-full">
                        Скачать сертификат
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Пока нет сертификатов</h3>
                  <p className="text-gray-600 mb-6">
                    Завершите курс, чтобы получить сертификат о прохождении
                  </p>
                  <button
                    onClick={() => router.push('/courses')}
                    className="btn-primary"
                  >
                    Найти курсы
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

