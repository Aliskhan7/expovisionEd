'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/providers/AuthProvider';
import { apiClient } from '@/lib/api';
import { User, Course } from '@/types';

interface UserWithAccess extends User {
  course_count?: number;
}

function AdminUsersContent() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithAccess | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await apiClient.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const coursesData = await apiClient.getCourses();
      setCourses(coursesData.filter(course => course.is_premium)); // Only premium courses
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUser || !selectedCourse) return;

    try {
      const result = await apiClient.grantCourseAccess(selectedUser.id, selectedCourse);
      alert(`Доступ предоставлен: ${result.message}`);
      setShowAccessModal(false);
      setSelectedUser(null);
      setSelectedCourse(null);
    } catch (error: any) {
      console.error('Failed to grant access:', error);
      alert(`Ошибка: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedUser || !selectedCourse) return;

    try {
      const result = await apiClient.revokeCourseAccess(selectedUser.id, selectedCourse);
      alert(`Доступ запрещен: ${result.message}`);
      setShowRevokeModal(false);
      setSelectedUser(null);
      setSelectedCourse(null);
    } catch (error: any) {
      console.error('Failed to revoke access:', error);
      alert(`Ошибка: ${error.response?.data?.detail || error.message}`);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление пользователями</h1>
            <p className="text-gray-600 mt-2">Предоставление доступа к премиум курсам</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="btn-outline"
          >
            ← Назад к админке
          </button>
        </div>

        {/* Search */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск пользователей
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Email или имя пользователя..."
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Пользователи ({filteredUsers.length})
          </h2>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Пользователи не найдены</h3>
              <p className="text-gray-600">Попробуйте изменить параметры поиска</p>
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
                      Роль
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата регистрации
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {user.full_name?.charAt(0) || user.email.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'Имя не указано'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowAccessModal(true);
                            }}
                            className="btn-primary btn-sm"
                            disabled={user.role === 'admin'}
                          >
                            Дать доступ
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRevokeModal(true);
                            }}
                            className="btn-sm bg-red-100 text-red-600 hover:bg-red-200"
                            disabled={user.role === 'admin'}
                          >
                            Запретить доступ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Access Modal */}
        {showAccessModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Предоставить доступ к курсу
                </h3>
                <button
                  onClick={() => {
                    setShowAccessModal(false);
                    setSelectedUser(null);
                    setSelectedCourse(null);
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
                  Пользователь: <strong>{selectedUser.email}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите курс
                </label>
                <select
                  value={selectedCourse || ''}
                  onChange={(e) => setSelectedCourse(Number(e.target.value))}
                  className="input w-full"
                >
                  <option value="">Выберите курс...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} - ${course.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAccessModal(false);
                    setSelectedUser(null);
                    setSelectedCourse(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Отменить
                </button>
                <button
                  onClick={handleGrantAccess}
                  disabled={!selectedCourse}
                  className="btn-primary flex-1"
                >
                  Предоставить доступ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revoke Access Modal */}
        {showRevokeModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Запретить доступ к курсу
                </h3>
                <button
                  onClick={() => {
                    setShowRevokeModal(false);
                    setSelectedUser(null);
                    setSelectedCourse(null);
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
                  Пользователь: <strong>{selectedUser.email}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите курс для запрета доступа
                </label>
                <select
                  value={selectedCourse || ''}
                  onChange={(e) => setSelectedCourse(Number(e.target.value))}
                  className="input w-full"
                >
                  <option value="">Выберите курс...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} - ${course.price}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Внимание: Это удалит весь прогресс пользователя по курсу
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRevokeModal(false);
                    setSelectedUser(null);
                    setSelectedCourse(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Отменить
                </button>
                <button
                  onClick={handleRevokeAccess}
                  disabled={!selectedCourse}
                  className="btn-sm bg-red-600 text-white hover:bg-red-700 flex-1"
                >
                  Запретить доступ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function AdminUsers() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminUsersContent />
    </ProtectedRoute>
  );
}