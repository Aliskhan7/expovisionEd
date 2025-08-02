'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useCoursesStore } from '@/store/courses';
import { apiClient } from '@/lib/api';
import Layout from '@/components/layout/Layout';

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: string;
  price: string;
  access_type: string;
  instructor_name: string;
  cover_image_url: string;
  is_published: boolean;
}

interface Lesson {
  id: string;
  title: string;
  video_url: string;
  duration: string;
  transcript: string;
  is_free: boolean;
  order_index: number;
}

export default function CreateCourse() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { fetchCourses } = useCoursesStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    price: '',
    access_type: 'free',
    instructor_name: '',
    cover_image_url: '',
    is_published: false
  });

  const [lessons, setLessons] = useState<Lesson[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addLesson = () => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: '',
      video_url: '',
      duration: '',
      transcript: '',
      is_free: lessons.length === 0, // First lesson is free by default
      order_index: lessons.length
    };
    setLessons(prev => [...prev, newLesson]);
  };

  const updateLesson = (id: string, field: keyof Lesson, value: string | boolean | number) => {
    setLessons(prev => prev.map(lesson => 
      lesson.id === id ? { ...lesson, [field]: value } : lesson
    ));
  };

  const removeLesson = (id: string) => {
    setLessons(prev => prev.filter(lesson => lesson.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare course data
      const courseData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        level: formData.level,
        price: formData.access_type === 'premium' ? parseFloat(formData.price) || 0 : 0,
        is_premium: formData.access_type === 'premium',
        instructor_name: formData.instructor_name,
        cover_image_url: formData.cover_image_url,
        access_type: formData.access_type,
        is_published: formData.is_published
      };

      console.log('FormData before sending:', formData);
      console.log('Creating course:', courseData);

      // Create course via API using apiClient
      const createdCourse = await apiClient.createCourse(courseData);
      console.log('Course created:', createdCourse);

      // Create lessons if any
      if (lessons.length > 0) {
        for (const lesson of lessons) {
          if (lesson.title && lesson.video_url) {
            const lessonData = {
              course_id: createdCourse.id,
              title: lesson.title,
              video_url: lesson.video_url,
              duration: parseInt(lesson.duration) || 0,
              transcript: lesson.transcript,
              is_free: lesson.is_free,
              order_index: lesson.order_index
            };

            const lessonResponse = await fetch('http://localhost:8000/api/lessons', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              },
              body: JSON.stringify(lessonData)
            });

            if (!lessonResponse.ok) {
              console.warn('Failed to create lesson:', lesson.title);
            }
          }
        }
      }

      // Show success message
      alert('Курс успешно создан!');
      
      // Force refresh courses data - clear cache and fetch fresh data
      console.log('Clearing courses cache and fetching fresh data...');
      await fetchCourses(true); // Force refresh with true parameter
      
      // Redirect to courses list
      router.push('/admin/courses');
    } catch (error) {
      console.error('Failed to create course:', error);
      alert('Ошибка при создании курса: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    router.push('/auth/login');
    return null;
  }

  return (
    <Layout>
      <div className="container-custom py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="btn-ghost p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Создание нового курса
            </h1>
          </div>
          <p className="text-gray-600">
            Заполните информацию о курсе и добавьте уроки
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Основная информация
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lessons')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'lessons'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Уроки ({lessons.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Настройки
              </button>
            </nav>
          </div>

          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="card p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Основная информация</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название курса *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input w-full"
                    placeholder="Введите название курса"
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание курса
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="input w-full"
                    placeholder="Опишите содержание и цели курса"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="input w-full"
                    placeholder="Например: Программирование"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Уровень сложности
                  </label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="input w-full"
                  >
                    <option value="beginner">Начинающий</option>
                    <option value="intermediate">Средний</option>
                    <option value="advanced">Продвинутый</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Преподаватель
                  </label>
                  <input
                    type="text"
                    name="instructor_name"
                    value={formData.instructor_name}
                    onChange={handleInputChange}
                    className="input w-full"
                    placeholder="Имя преподавателя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Обложка курса (URL)
                  </label>
                  <input
                    type="url"
                    name="cover_image_url"
                    value={formData.cover_image_url}
                    onChange={handleInputChange}
                    className="input w-full"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Publish checkbox - moved from settings tab for better visibility */}
                <div className="lg:col-span-2 mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_published_basic"
                      name="is_published"
                      checked={formData.is_published}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_published_basic" className="ml-2 block text-sm font-medium text-gray-700">
                      Опубликовать курс сразу
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Если не отмечено, курс будет сохранен как черновик
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lessons Tab */}
          {activeTab === 'lessons' && (
            <div className="card p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Уроки курса</h2>
                <button
                  type="button"
                  onClick={addLesson}
                  className="btn-primary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Добавить урок
                </button>
              </div>

              {lessons.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600">Пока нет уроков. Добавьте первый урок.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {lessons.map((lesson, index) => (
                    <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">Урок {index + 1}</h3>
                        <button
                          type="button"
                          onClick={() => removeLesson(lesson.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Название урока *
                          </label>
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={(e) => updateLesson(lesson.id, 'title', e.target.value)}
                            className="input w-full"
                            placeholder="Название урока"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Длительность (минуты)
                          </label>
                          <input
                            type="number"
                            value={lesson.duration}
                            onChange={(e) => updateLesson(lesson.id, 'duration', e.target.value)}
                            className="input w-full"
                            placeholder="30"
                          />
                        </div>

                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL видео *
                          </label>
                          <input
                            type="url"
                            value={lesson.video_url}
                            onChange={(e) => updateLesson(lesson.id, 'video_url', e.target.value)}
                            className="input w-full"
                            placeholder="https://example.com/video.mp4"
                            required
                          />
                        </div>

                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Транскрипт урока
                          </label>
                          <textarea
                            value={lesson.transcript}
                            onChange={(e) => updateLesson(lesson.id, 'transcript', e.target.value)}
                            rows={3}
                            className="input w-full"
                            placeholder="Текст урока для AI-ассистента"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`free-${lesson.id}`}
                            checked={lesson.is_free}
                            onChange={(e) => updateLesson(lesson.id, 'is_free', e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`free-${lesson.id}`} className="ml-2 block text-sm text-gray-900">
                            Бесплатный урок
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="card p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Настройки курса</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип доступа
                  </label>
                  <select
                    name="access_type"
                    value={formData.access_type}
                    onChange={handleInputChange}
                    className="input w-full"
                  >
                    <option value="free">Бесплатный</option>
                    <option value="premium">Премиум (разовая покупка)</option>
                    <option value="subscription_only">Только по подписке</option>
                  </select>
                </div>

                {formData.access_type === 'premium' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Цена (USD)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="input w-full"
                      placeholder="99.99"
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}

                <div className="lg:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_published"
                      name="is_published"
                      checked={formData.is_published}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_published" className="ml-2 block text-sm font-medium text-gray-700">
                      Опубликовать курс сразу
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Если не отмечено, курс будет сохранен как черновик
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !formData.title}
            >
              {loading ? (
                <>
                  <div className="loading-spinner w-4 h-4 mr-2"></div>
                  Создание...
                </>
              ) : (
                'Создать курс'
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

