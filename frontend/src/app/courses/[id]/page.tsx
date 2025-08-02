'use client';

import { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useCoursesStore } from '@/store/courses';
import Layout from '@/components/layout/Layout';
import LessonModal from '@/components/lesson/LessonModal';
import { Course, Lesson } from '@/types';

interface CourseProgress {
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  lastWatchedLesson?: number;
}

function CourseDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { courses, currentCourse, fetchCourse, loading, courseLessons, fetchCourseLessons, userProgress } = useCoursesStore();
  
  const [progress, setProgress] = useState<CourseProgress>({
    completedLessons: 0,
    totalLessons: 0,
    progressPercentage: 0
  });
  const [hasAccess, setHasAccess] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [accessType, setAccessType] = useState<'free' | 'subscription' | 'admin' | 'none'>('none');
  
  const courseId = parseInt(params.id as string);
  const lessons = courseLessons[courseId] || [];
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Get course from store or current course
  const course = useMemo(() => {
    return currentCourse?.id === courseId 
      ? currentCourse 
      : courses.find(c => c.id === courseId);
  }, [currentCourse, courses, courseId]);





  const checkCourseAccess = useCallback(() => {
    if (!course) return;
    
    try {
      // Check if user has access to the course
      if (!course.is_premium) {
        setHasAccess(true);
        setAccessType('free');
      } else if (user?.subscription_status === 'active') {
        setHasAccess(true);
        setAccessType('subscription');
      } else if (userProgress[courseId]) {
        // User has individual access granted by admin
        setHasAccess(true);
        setAccessType('admin');
      } else {
        setHasAccess(false);
        setAccessType('none');
      }
    } catch (error) {
      console.error('Failed to check course access:', error);
      setHasAccess(false);
      setAccessType('none');
    }
  }, [course, user?.subscription_status, userProgress, courseId]);

  const calculateProgress = useCallback(() => {
    try {
      const courseProgress = userProgress[courseId];
      
      if (courseProgress && lessons.length > 0) {
        // Use actual data from backend
        setProgress({
          completedLessons: courseProgress.completed_lessons || 0,
          totalLessons: courseProgress.total_lessons || lessons.length,
          progressPercentage: courseProgress.progress_percentage || 0,
          lastWatchedLesson: courseProgress.last_lesson_id
        });
      } else {
        // Default progress if no data available
        setProgress({
          completedLessons: 0,
          totalLessons: lessons.length,
          progressPercentage: 0,
          lastWatchedLesson: undefined
        });
      }
      
      console.log('Progress calculated:', {
        courseId,
        completedLessons: courseProgress?.completed_lessons || 0,
        totalLessons: courseProgress?.total_lessons || lessons.length,
        progressPercentage: courseProgress?.progress_percentage || 0
      });
    } catch (error) {
      console.error('Failed to calculate progress:', error);
    }
  }, [lessons.length, userProgress, courseId]);

  // Fetch course data when courseId changes
  useEffect(() => {
    if (!courseId) return;
    
    // Reset load state when courseId changes
    setInitialLoadDone(false);
    setIsLoading(true);
    
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
        console.error('Failed to load course data:', error);
        router.push('/courses');
      } finally {
        setIsLoading(false);
        setInitialLoadDone(true);
      }
    };

    loadData();
  }, [courseId, router]);

  // Check access when course or auth state changes
  useEffect(() => {
    if (course && !loading) {
      checkCourseAccess();
    }
  }, [course, isAuthenticated, checkCourseAccess, loading]);

  // Calculate progress when lessons change or userProgress updates
  useEffect(() => {
    if (lessons.length > 0 && isAuthenticated) {
      calculateProgress();
    }
  }, [lessons.length, isAuthenticated, calculateProgress, userProgress]);

  // Debug: log lessons data
  useEffect(() => {
    console.log('Lessons loaded:', lessons.map(l => ({ id: l.id, title: l.title, is_completed: l.is_completed })));
  }, [lessons]);

  const handleStartCourse = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const firstLesson = lessons.find(lesson => lesson.is_free) || lessons[0];
    if (firstLesson) {
      handleLessonClick(firstLesson);
    }
  };

  const handleContinueCourse = () => {
    const nextLessonId = progress.lastWatchedLesson ? progress.lastWatchedLesson + 1 : 1;
    const nextLesson = lessons.find(lesson => lesson.id === nextLessonId) || lessons[0];
    
    if (nextLesson) {
      handleLessonClick(nextLesson);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (canAccessLesson(lesson)) {
      setSelectedLesson(lesson);
      setIsLessonModalOpen(true);
    }
  };

  const closeLessonModal = () => {
    setIsLessonModalOpen(false);
    setSelectedLesson(null);
    
    // Refresh lessons data to get updated completion status
    fetchCourseLessons(courseId, true);
  };

  const handlePurchaseCourse = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    setShowPurchaseModal(true);
  };

  const canAccessLesson = (lesson: Lesson) => {
    // Use has_access field from backend if available, otherwise fallback to old logic
    if (lesson.has_access !== undefined) {
      return lesson.has_access;
    }
    // Fallback to old logic
    return lesson.is_free || hasAccess || !course?.is_premium;
  };

  if (isLoading || !course) {
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
        {/* Hero Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="container-custom py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <span className="badge-primary">{course.category || 'Программирование'}</span>
                  <span className="badge-secondary ml-2">{course.level}</span>
                </div>
                
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {course.title}
                </h1>
                
                <p className="text-lg text-gray-600 mb-6">
                  {course.description}
                </p>

                <div className="flex items-center gap-6 text-sm text-gray-500 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {Math.floor((course.total_duration || 0) / 60) || lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0)} мин
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {course.total_lessons || lessons.length} уроков
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {course.instructor_name || 'Инструктор ExpoVisionED'}
                  </div>
                </div>

                {/* Progress Bar (if enrolled) */}
                {isAuthenticated && hasAccess && progress.totalLessons > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Прогресс курса</span>
                      <span className="text-sm text-gray-500">
                        {progress.completedLessons} из {progress.totalLessons} уроков
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Course Preview/Purchase */}
              <div className="lg:col-span-1">
                <div className="card p-6 sticky top-8">
                  {/* Course Image */}
                  <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  {course.price && course.price > 0 ? (
                    <div className="text-center mb-4">
                      <span className="text-3xl font-bold text-gray-900">{course.price}₽</span>
                      <span className="text-gray-500 ml-2">разовая покупка</span>
                    </div>
                  ) : (
                    <div className="text-center mb-4">
                      <span className="text-3xl font-bold text-green-600">Бесплатно</span>
                    </div>
                  )}

                  {/* Access Status Indicator */}
                  {isAuthenticated && accessType === 'admin' && (
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Доступ предоставлен администратором
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!isAuthenticated ? (
                      <button
                        onClick={handleStartCourse}
                        className="w-full btn-primary"
                      >
                        Войти для доступа
                      </button>
                    ) : hasAccess ? (
                      progress.completedLessons > 0 ? (
                        <button
                          onClick={handleContinueCourse}
                          className="w-full btn-primary"
                        >
                          Продолжить обучение
                        </button>
                      ) : (
                        <button
                          onClick={handleStartCourse}
                          className="w-full btn-primary"
                        >
                          Начать курс
                        </button>
                      )
                    ) : (
                      <>
                        <button
                          onClick={handlePurchaseCourse}
                          className="w-full btn-primary"
                        >
                          Купить курс
                        </button>
                        <button
                          onClick={handleStartCourse}
                          className="w-full btn-outline"
                        >
                          Попробовать бесплатно
                        </button>
                      </>
                    )}
                  </div>

                  {/* Course Features */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Что включено:</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {course.total_lessons || lessons.length} видеоуроков
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        AI-ассистент для помощи
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Пожизненный доступ
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Сертификат о завершении
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="container-custom py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lessons List */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Содержание курса</h2>
              
              {lessons.length > 0 ? (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => {
                    const hasAccess = canAccessLesson(lesson);
                    const isLocked = !hasAccess;
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`card p-4 transition-all duration-200 ${
                          hasAccess 
                            ? 'hover:shadow-md cursor-pointer border-gray-200' 
                            : isLocked 
                              ? 'opacity-70 cursor-not-allowed border-red-200 bg-red-50' 
                              : 'opacity-60'
                        }`}
                        onClick={() => {
                          if (hasAccess) {
                            handleLessonClick(lesson);
                          } else {
                            alert('Этот урок доступен только при покупке курса. Обратитесь к администратору.');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                lesson.is_completed
                                  ? 'bg-green-100 text-green-800' 
                                  : isLocked
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-blue-100 text-blue-600'
                              }`}>
                                {lesson.is_completed ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : isLocked ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  index + 1
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h3 className={`font-medium flex items-center ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
                                {lesson.title}
                                <div className="flex items-center ml-2 space-x-1">
                                  {lesson.is_free && (
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded">
                                      Бесплатно
                                    </span>
                                  )}
                                  {isLocked && !lesson.is_free && (
                                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded">
                                      Премиум
                                    </span>
                                  )}
                                </div>
                              </h3>
                              <p className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
                                {Math.floor((lesson.duration || 0) / 60)} мин
                              </p>
                          </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {lesson.is_completed && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded">
                                ✓ Завершено
                              </span>
                            )}
                            {hasAccess && (
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">Уроки для этого курса скоро будут добавлены</p>
                </div>
              )}
            </div>

            {/* Instructor Info */}
            <div className="lg:col-span-1">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Преподаватель</h3>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{course.instructor_name || 'Инструктор ExpoVisionED'}</h4>
                    <p className="text-sm text-gray-600">Эксперт по {course.category?.toLowerCase() || 'программированию'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Опытный специалист с многолетним стажем в области {course.category?.toLowerCase() || 'разработки'}. 
                  Специализируется на современных технологиях и лучших практиках.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Modal */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={closeLessonModal}
        lesson={selectedLesson}
        courseTitle={course?.title}
        courseId={courseId}
      />
    </Layout>
  );
}

export default memo(CourseDetail);

