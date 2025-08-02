'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useCoursesStore } from '@/store/courses';
import Layout from '@/components/layout/Layout';
import { Course, Lesson } from '@/types';
import { ProtectedRoute } from '@/components/providers/AuthProvider';
import { apiClient } from '@/lib/api';

interface EditCourseForm {
  title: string;
  description: string;
  level: string;
  price: number;
  is_premium: boolean;
  is_published: boolean;
  category: string;
}

interface LessonForm {
  title: string;
  video_url: string;
  duration: number;
  transcript: string;
  order_index: number;
  is_free: boolean;
}

function EditCourseContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [courseForm, setCourseForm] = useState<EditCourseForm>({
    title: '',
    description: '',
    level: 'beginner',
    price: 0,
    is_premium: false,
    is_published: false,
    category: ''
  });

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>({
    title: '',
    video_url: '',
    duration: 0,
    transcript: '',
    order_index: 0,
    is_free: false
  });

  const courseId = parseInt(params.id as string);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setIsLoading(true);
      
      // Use store methods instead of direct fetch calls
      const { fetchCourse, fetchCourseLessons } = useCoursesStore.getState();
      
      // Get course details from store
      await fetchCourse(courseId);
      const courseData = useCoursesStore.getState().currentCourse;
      
      if (courseData) {
        setCourse(courseData);
        setCourseForm({
          title: courseData.title || '',
          description: courseData.description || '',
          level: courseData.level || 'beginner',
          price: courseData.price || 0,
          is_premium: courseData.is_premium || false,
          is_published: courseData.is_published || false,
          category: courseData.category || ''
        });
      }

      // Get lessons from store
      await fetchCourseLessons(courseId);
      const lessonsData = useCoursesStore.getState().courseLessons[courseId] || [];
      setLessons(lessonsData);
    } catch (error) {
      console.error('Failed to fetch course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch(`http://localhost:8000/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseForm)
      });

      if (response.ok) {
        alert('Курс успешно обновлен!');
        fetchCourseData();
      } else {
        throw new Error('Failed to update course');
      }
    } catch (error) {
      console.error('Failed to save course:', error);
      alert('Ошибка при сохранении курса');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLesson = () => {
    setEditingLesson(null);
    setLessonForm({
      title: '',
      video_url: '',
      duration: 0,
      transcript: '',
      order_index: lessons.length,
      is_free: false
    });
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      video_url: lesson.video_url || '',
      duration: lesson.duration || 0,
      transcript: lesson.transcript || '',
      order_index: lesson.order_index,
      is_free: lesson.is_free || false
    });
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    try {
      const method = editingLesson ? 'PUT' : 'POST';
      const url = editingLesson 
        ? `http://localhost:8000/api/admin/lessons/${editingLesson.id}`
        : `http://localhost:8000/api/admin/lessons`;

      const body = editingLesson 
        ? lessonForm
        : { ...lessonForm, course_id: courseId };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowLessonModal(false);
        
        // Refresh lesson data after save
        fetchCourseData();
        
        alert('Урок успешно сохранен!');
      } else {
        throw new Error('Failed to save lesson');
      }
    } catch (error) {
      console.error('Failed to save lesson:', error);
      alert('Ошибка при сохранении урока');
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот урок?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        }
      });

      if (response.ok) {
        // Update local state immediately
        setLessons(prevLessons => prevLessons.filter(lesson => lesson.id !== lessonId));
        
        // Update store cache without breaking other data
        const store = useCoursesStore.getState();
        const updatedLessons = store.courseLessons[courseId]?.filter(lesson => lesson.id !== lessonId) || [];
        useCoursesStore.setState((state) => ({
          ...state,
          courseLessons: {
            ...state.courseLessons,
            [courseId]: updatedLessons
          }
        }));
        
        alert('Урок удален!');
      } else {
        throw new Error('Failed to delete lesson');
      }
    } catch (error) {
      console.error('Failed to delete lesson:', error);
      alert('Ошибка при удалении урока');
    }
  };

  const moveLessonUp = (index: number) => {
    if (index > 0) {
      const newLessons = [...lessons];
      [newLessons[index], newLessons[index - 1]] = [newLessons[index - 1], newLessons[index]];
      
      // Update order_index for both lessons
      newLessons[index].order_index = index;
      newLessons[index - 1].order_index = index - 1;
      
      setLessons(newLessons);
      // TODO: Save order to backend
    }
  };

  const moveLessonDown = (index: number) => {
    if (index < lessons.length - 1) {
      const newLessons = [...lessons];
      [newLessons[index], newLessons[index + 1]] = [newLessons[index + 1], newLessons[index]];
      
      // Update order_index for both lessons
      newLessons[index].order_index = index;
      newLessons[index + 1].order_index = index + 1;
      
      setLessons(newLessons);
      // TODO: Save order to backend
    }
  };

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-gray-900">Редактирование курса</h1>
            <p className="text-gray-600 mt-2">Управление курсом и уроками</p>
          </div>
          <button
            onClick={() => router.push('/admin/courses')}
            className="btn-outline"
          >
            ← Назад к курсам
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Details */}
          <div className="lg:col-span-2">
            <div className="card p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6">Информация о курсе</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название курса
                  </label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                    className="input w-full"
                    placeholder="Введите название курса"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input w-full h-24"
                    placeholder="Описание курса"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Уровень
                  </label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, level: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="beginner">Начальный</option>
                    <option value="intermediate">Средний</option>
                    <option value="advanced">Продвинутый</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, category: e.target.value }))}
                    className="input w-full"
                    placeholder="Программирование"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Цена
                  </label>
                  <input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_premium"
                      checked={courseForm.is_premium}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, is_premium: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="is_premium" className="text-sm text-gray-700">
                      Премиум курс
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={courseForm.is_published}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="is_published" className="text-sm text-gray-700">
                      Опубликован
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveCourse}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить курс'}
                </button>
              </div>
            </div>

            {/* Lessons Management */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Уроки ({lessons.length})</h2>
                <button
                  onClick={handleAddLesson}
                  className="btn-primary"
                >
                  + Добавить урок
                </button>
              </div>

              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-500">#{lesson.order_index + 1}</span>
                          <h3 className="font-medium text-gray-900">{lesson.title}</h3>
                          {lesson.is_free && (
                            <span className="badge-success text-xs">Бесплатно</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Длительность: {lesson.duration} мин
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Move buttons */}
                        <button
                          onClick={() => moveLessonUp(index)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          title="Переместить вверх"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => moveLessonDown(index)}
                          disabled={index === lessons.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          title="Переместить вниз"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => handleEditLesson(lesson)}
                          className="btn-outline-sm"
                        >
                          Редактировать
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="btn-sm bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {lessons.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p>В курсе пока нет уроков</p>
                    <button
                      onClick={handleAddLesson}
                      className="btn-primary mt-4"
                    >
                      Добавить первый урок
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Статистика курса</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Всего уроков:</span>
                  <span className="font-medium">{lessons.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Бесплатных уроков:</span>
                  <span className="font-medium">{lessons.filter(l => l.is_free).length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Общая длительность:</span>
                  <span className="font-medium">
                    {lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0)} мин
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Статус:</span>
                  <span className={`font-medium ${courseForm.is_published ? 'text-green-600' : 'text-yellow-600'}`}>
                    {courseForm.is_published ? 'Опубликован' : 'Черновик'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => router.push(`/courses/${courseId}`)}
                  className="btn-outline w-full"
                >
                  Просмотреть курс
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lesson Modal */}
        {showLessonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">
                    {editingLesson ? 'Редактировать урок' : 'Добавить урок'}
                  </h3>
                  <button
                    onClick={() => setShowLessonModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название урока
                    </label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                      className="input w-full"
                      placeholder="Введите название урока"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL видео
                    </label>
                    <input
                      type="url"
                      value={lessonForm.video_url}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, video_url: e.target.value }))}
                      className="input w-full"
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Длительность (минуты)
                    </label>
                    <input
                      type="number"
                      value={lessonForm.duration}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                      className="input w-full"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Транскрипт урока
                    </label>
                    <textarea
                      value={lessonForm.transcript}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, transcript: e.target.value }))}
                      className="input w-full h-24"
                      placeholder="Описание или транскрипт урока"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="lesson_is_free"
                      checked={lessonForm.is_free}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, is_free: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="lesson_is_free" className="text-sm text-gray-700">
                      Бесплатный урок
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setShowLessonModal(false)}
                    className="btn-outline"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveLesson}
                    className="btn-primary"
                  >
                    Сохранить урок
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function EditCourse() {
  return (
    <ProtectedRoute requiredRole="admin">
      <EditCourseContent />
    </ProtectedRoute>
  );
} 