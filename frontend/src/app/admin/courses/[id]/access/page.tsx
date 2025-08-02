'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/providers/AuthProvider';
import { apiClient } from '@/lib/api';
import { User, Course } from '@/types';

interface UserAccess {
  user_id: number;
  email: string;
  full_name: string;
  progress_percentage: number;
  granted_at: string;
}

function CourseAccessContent() {
  const router = useRouter();
  const params = useParams();
  const courseId = typeof params.id === 'string' ? parseInt(params.id, 10) : 0;
  


  const [course, setCourse] = useState<Course | null>(null);
  const [usersWithAccess, setUsersWithAccess] = useState<UserAccess[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    if (courseId && courseId > 0) {

      fetchCourseData();
      fetchUsersWithAccess();
      fetchAllUsers();
    } else {
      console.error('Invalid courseId:', courseId);
      setLoading(false);
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const courseData = await apiClient.getCourse(courseId);
      setCourse(courseData);
    } catch (error) {
      console.error('Failed to fetch course:', error);

    }
  };

  const fetchUsersWithAccess = async () => {
    try {
      const accessData = await apiClient.getCourseAccessList(courseId);
      setUsersWithAccess(accessData.users || accessData);
    } catch (error) {
      console.error('Failed to fetch users with access:', error);

    }
  };

  const fetchAllUsers = async () => {
    try {
      const usersData = await apiClient.getAllUsers();
      setAllUsers(usersData.filter(user => user.role !== 'admin'));
    } catch (error) {
      console.error('Failed to fetch users:', error);

    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUserId) return;

    try {
      const result = await apiClient.grantCourseAccess(selectedUserId, courseId);
      alert(`Доступ предоставлен: ${result.message}`);
      setShowGrantModal(false);
      setSelectedUserId(null);
      fetchUsersWithAccess(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to grant access:', error);
      alert(`Ошибка: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleRevokeAccess = async (userId: number) => {
    if (!confirm('Вы уверены, что хотите отозвать доступ к этому курсу?')) return;

    try {
      const result = await apiClient.revokeCourseAccess(userId, courseId);
      alert(`Доступ отозван: ${result.message}`);
      fetchUsersWithAccess(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to revoke access:', error);
      alert(`Ошибка: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Users who don't have access yet
  const usersWithoutAccess = allUsers.filter(user => 
    !usersWithAccess.some(access => access.user_id === user.id)
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Курс не найден</h1>
            <button onClick={() => router.push('/admin/courses')} className="btn-primary mt-4">
              Вернуться к курсам
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление доступом</h1>
            <p className="text-gray-600 mt-2">
              Курс: <strong>{course.title}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Цена: ${course.price} • {course.is_premium ? 'Премиум курс' : 'Бесплатный курс'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGrantModal(true)}
              className="btn-primary"
              disabled={usersWithoutAccess.length === 0}
            >
              + Предоставить доступ
            </button>
            {usersWithAccess.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Вы уверены, что хотите отозвать доступ у всех ${usersWithAccess.length} пользователей? Это удалит весь их прогресс по курсу.`)) {
                    Promise.all(usersWithAccess.map(user => apiClient.revokeCourseAccess(user.user_id, courseId)))
                      .then(() => {
                        alert('Доступ отозван у всех пользователей');
                        fetchUsersWithAccess();
                      })
                      .catch((error) => {
                        console.error('Failed to revoke access:', error);
                        alert('Ошибка при отзыве доступа');
                      });
                  }
                }}
                className="btn-sm bg-red-100 text-red-600 hover:bg-red-200"
              >
                🚫 Отозвать у всех
              </button>
            )}
            <button
              onClick={() => router.push('/admin/courses')}
              className="btn-outline"
            >
              ← Назад к курсам
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Пользователей с доступом</p>
                <p className="text-2xl font-bold text-gray-900">{usersWithAccess.length}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Средний прогресс</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersWithAccess.length > 0 
                    ? Math.round(usersWithAccess.reduce((sum, user) => sum + user.progress_percentage, 0) / usersWithAccess.length)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Завершили курс</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersWithAccess.filter(user => user.progress_percentage >= 100).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users with Access */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Пользователи с доступом ({usersWithAccess.length})
          </h2>

          {usersWithAccess.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Пока никому не предоставлен доступ</h3>
              <p className="text-gray-600">Нажмите "Предоставить доступ" чтобы добавить пользователей</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Прогресс
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Предоставлен
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersWithAccess.map((userAccess) => (
                    <tr key={userAccess.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {userAccess.full_name?.charAt(0) || userAccess.email.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userAccess.full_name || 'Имя не указано'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{userAccess.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(userAccess.progress_percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900 w-12">
                            {Math.round(userAccess.progress_percentage)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userAccess.granted_at ? new Date(userAccess.granted_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleRevokeAccess(userAccess.user_id)}
                          className="btn-sm bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded"
                          title="Отозвать доступ к курсу"
                        >
                          🚫 Отозвать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Grant Access Modal */}
        {showGrantModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Предоставить доступ к курсу
                </h3>
                <button
                  onClick={() => {
                    setShowGrantModal(false);
                    setSelectedUserId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Курс: <strong>{course.title}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите пользователя
                </label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="input w-full"
                >
                  <option value="">Выберите пользователя...</option>
                  {usersWithoutAccess.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} {user.full_name ? `(${user.full_name})` : ''}
                    </option>
                  ))}
                </select>
                {usersWithoutAccess.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Все пользователи уже имеют доступ к этому курсу
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowGrantModal(false);
                    setSelectedUserId(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Отменить
                </button>
                <button
                  onClick={handleGrantAccess}
                  disabled={!selectedUserId}
                  className="btn-primary flex-1"
                >
                  Предоставить доступ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function CourseAccess() {
  return (
    <ProtectedRoute requiredRole="admin">
      <CourseAccessContent />
    </ProtectedRoute>
  );
}