'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useCoursesStore } from '@/store/courses';
import { apiClient } from '@/lib/api';
import Layout from '@/components/layout/Layout';
import { Course } from '@/types';
import { ProtectedRoute } from '@/components/providers/AuthProvider';

function AdminCoursesContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { deleteCourse } = useCoursesStore(); // Only keep deleteCourse from store
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Load admin courses on mount
    const loadAdminCourses = async () => {
      console.log('Loading admin courses...');
      setLoading(true);
      try {
        const adminCourses = await apiClient.getAdminCourses();
        console.log('Admin courses loaded:', adminCourses);
        setCourses(adminCourses);
      } catch (error) {
        console.error('Failed to load admin courses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminCourses();
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'published' && course.is_published) ||
                         (filterStatus === 'draft' && !course.is_published) ||
                         (filterStatus === 'premium' && course.is_premium);
    
    return matchesSearch && matchesFilter;
  });

  const handleDeleteCourse = async (courseId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот курс?')) {
      try {
        await deleteCourse(courseId);
      } catch (error) {
        console.error('Failed to delete course:', error);
      }
    }
  };

  const togglePublishStatus = async (course: Course) => {
    try {
      const newPublishStatus = !course.is_published;
      
      // Update course on server
      await apiClient.updateCourse(course.id, { 
        is_published: newPublishStatus 
      });
      
      // Update local state
      setCourses(prevCourses => 
        prevCourses.map(c => 
          c.id === course.id 
            ? { ...c, is_published: newPublishStatus }
            : c
        )
      );
      
      console.log(`Course ${course.title} ${newPublishStatus ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error('Failed to toggle course publish status:', error);
      alert('Не удалось изменить статус публикации курса');
    }
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
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Управление курсами
            </h1>
            <p className="text-gray-600">
              Создавайте, редактируйте и управляйте курсами платформы
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/courses/create')}
            className="btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Создать курс
          </button>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Поиск курсов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input w-full"
              >
                <option value="all">Все курсы</option>
                <option value="published">Опубликованные</option>
                <option value="draft">Черновики</option>
                <option value="premium">Премиум</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="card-hover p-6">
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
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Course Info */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                  <div className="flex gap-2">
                    {course.is_published ? (
                      <span className="badge-success">Опубликован</span>
                    ) : (
                      <span className="badge-warning">Черновик</span>
                    )}
                    {course.is_premium && (
                      <span className="badge-primary">Премиум</span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {course.description || 'Описание отсутствует'}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{course.total_lessons || 0} уроков</span>
                  <span>{course.total_duration || 0} мин</span>
                  {course.price && (
                    <span className="font-medium text-primary-500">${course.price}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                  className="btn-outline flex-1 text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Редактировать
                </button>

                {course.is_premium && (
                  <button
                    onClick={() => router.push(`/admin/courses/${course.id}/access`)}
                    className="btn-outline text-sm"
                    title="Управление доступом"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Доступ
                  </button>
                )}
                
                <button
                  onClick={() => togglePublishStatus(course)}
                  className={`btn-sm px-3 ${course.is_published ? 'btn-secondary' : 'btn-primary'}`}
                  title={course.is_published ? 'Снять с публикации' : 'Опубликовать'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {course.is_published ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
                
                <button
                  onClick={() => handleDeleteCourse(course.id)}
                  className="btn-sm px-3 bg-red-100 text-red-600 hover:bg-red-200"
                  title="Удалить курс"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Курсы не найдены</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'Создайте свой первый курс, чтобы начать'
              }
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <button
                onClick={() => router.push('/admin/courses/create')}
                className="btn-primary"
              >
                Создать первый курс
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function AdminCourses() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminCoursesContent />
    </ProtectedRoute>
  );
}

