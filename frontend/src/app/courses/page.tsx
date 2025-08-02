'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Users, Star, BookOpen, Play, Lock } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Loading from '@/components/ui/Loading';
import { useCoursesStore } from '@/store/courses';
import { useAuthStore } from '@/store/auth';
import { formatPrice, formatDuration } from '@/lib/utils';
import { Course } from '@/types';

export default function CoursesPage() {
  const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [level, setLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  
  const { courses, userProgress, isLoading, fetchCourses } = useCoursesStore();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Always fetch courses to ensure fresh data for current auth state
    fetchCourses(true);
  }, [isAuthenticated, fetchCourses]); // Re-fetch when auth status changes

  const filteredCourses = courses
    .filter(course => {
      if (filter === 'free' && course.is_premium) return false;
      if (filter === 'premium' && !course.is_premium) return false;
      if (level !== 'all' && course.level !== level) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by ID to maintain consistent order
      return a.id - b.id;
    });

  const getLevelBadge = (courseLevel?: string) => {
    switch (courseLevel) {
      case 'beginner':
        return <Badge variant="success">Начальный</Badge>;
      case 'intermediate':
        return <Badge variant="warning">Средний</Badge>;
      case 'advanced':
        return <Badge variant="error">Продвинутый</Badge>;
      default:
        return <Badge variant="secondary">Не указан</Badge>;
    }
  };

  const canAccessCourse = (course: Course) => {
    if (!course.is_premium) return true;
    if (!isAuthenticated) return false;
    
    // Check if user has subscription
    if (user?.subscription_status === 'active') return true;
    
    // Check if user has individual access to this course (granted by admin)
    const courseProgress = userProgress[course.id];
    return !!courseProgress; // If there's progress record, user has access
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-custom section-padding">
          <Loading size="lg" text="Загрузка курсов..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            Каталог курсов
          </h1>
          <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
            Выберите курс и начните свое обучение с персональным AI-ассистентом
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-secondary-700 self-center">
              Тип:
            </span>
            {[
              { key: 'all', label: 'Все курсы' },
              { key: 'free', label: 'Бесплатные' },
              { key: 'premium', label: 'Премиум' },
            ].map((item) => (
              <Button
                key={item.key}
                variant={filter === item.key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(item.key as any)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-secondary-700 self-center">
              Уровень:
            </span>
            {[
              { key: 'all', label: 'Все' },
              { key: 'beginner', label: 'Начальный' },
              { key: 'intermediate', label: 'Средний' },
              { key: 'advanced', label: 'Продвинутый' },
            ].map((item) => (
              <Button
                key={item.key}
                variant={level === item.key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setLevel(item.key as any)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              Курсы не найдены
            </h3>
            <p className="text-secondary-600">
              Попробуйте изменить фильтры поиска
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const progress = userProgress[course.id];
              const hasAccess = canAccessCourse(course);

              return (
                <div key={course.id} className="card-hover overflow-hidden">
                  {/* Course Image */}
                  <div className="aspect-video bg-gradient-to-br from-primary-400 to-primary-600 relative">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <BookOpen className="w-12 h-12 text-white" />
                      </div>
                    )}
                    
                    {!hasAccess && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-white" />
                      </div>
                    )}

                    {course.is_premium && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="warning">Премиум</Badge>
                      </div>
                    )}
                  </div>

                  {/* Course Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      {getLevelBadge(course.level)}
                      {course.price && course.price > 0 ? (
                        <span className="text-lg font-bold text-primary-600">
                          {formatPrice(course.price)}
                        </span>
                      ) : (
                        <span className="text-lg font-bold text-success-600">
                          Бесплатно
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-secondary-900 mb-2 line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-secondary-600 text-sm mb-4 line-clamp-3">
                      {course.description}
                    </p>

                    {/* Course Stats */}
                    <div className="flex items-center space-x-4 text-sm text-secondary-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Play className="w-4 h-4" />
                        <span>{course.lessons?.length || 0} уроков</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatDuration(
                            course.lessons?.reduce((total, lesson) => total + (lesson.duration || 0), 0) || 0
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {progress && (
                      <div className="mb-4">
                        <ProgressBar
                          value={progress.progress_percentage}
                          showLabel
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="flex space-x-2">
                      {hasAccess ? (
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button className="w-full">
                            {progress ? 'Продолжить' : 'Начать курс'}
                          </Button>
                        </Link>
                      ) : (
                        <div className="flex-1">
                          {isAuthenticated ? (
                            <Button variant="outline" className="w-full" disabled>
                              Требуется подписка
                            </Button>
                          ) : (
                            <Link href="/auth/login" className="block">
                              <Button variant="outline" className="w-full">
                                Войти для доступа
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                      
                      <Link href={`/courses/${course.id}`}>
                        <Button variant="ghost" size="sm">
                          Подробнее
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Section */}
        {!isAuthenticated && (
          <div className="mt-16 text-center">
            <div className="card p-8 bg-gradient-to-r from-primary-50 to-primary-100">
              <h2 className="text-2xl font-bold text-secondary-900 mb-4">
                Готовы начать обучение?
              </h2>
              <p className="text-secondary-600 mb-6">
                Зарегистрируйтесь и получите доступ к бесплатным курсам
              </p>
              <Link href="/auth/register">
                <Button size="lg">
                  Зарегистрироваться бесплатно
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

