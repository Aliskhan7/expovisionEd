'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { isValidEmail } from '@/lib/utils';

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');

  const { login } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Check for session expired message from URL on client side only
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const message = urlParams.get('message');
      if (message === 'session_expired') {
        setSessionExpiredMessage('Ваша сессия истекла. Пожалуйста, войдите в систему заново.');
        // Clear the message from URL after 5 seconds
        setTimeout(() => {
          setSessionExpiredMessage('');
          // Clean URL
          const url = new URL(window.location.href);
          url.searchParams.delete('message');
          window.history.replaceState({}, '', url.toString());
        }, 5000);
      }
    }
  }, []); // Remove searchParams dependency

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await login(formData);
      router.push('/courses');
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.detail || 'Ошибка входа. Проверьте данные.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-secondary-900">
              ExpoVisionED
            </span>
          </Link>
        </div>

        {/* Login Form */}
        <div className="card p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">
              Добро пожаловать!
            </h1>
            <p className="text-secondary-600">
              Войдите в свой аккаунт для продолжения обучения
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-error-700 text-sm">{errors.general}</p>
            </div>
          )}

          {sessionExpiredMessage && (
            <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-warning-700 text-sm">{sessionExpiredMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(value) => handleChange('email', value)}
              error={errors.email}
              placeholder="your@email.com"
              required
            />

            <div className="relative">
              <Input
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(value) => handleChange('password', value)}
                error={errors.password}
                placeholder="Введите пароль"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-secondary-400 hover:text-secondary-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Войти
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-secondary-600">
              Нет аккаунта?{' '}
              <Link
                href="/auth/register"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-secondary-500 hover:text-secondary-700"
            >
              Забыли пароль?
            </Link>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-secondary-50 rounded-lg">
          <h3 className="text-sm font-medium text-secondary-900 mb-2">
            Демо-аккаунты:
          </h3>
          <div className="text-xs text-secondary-600 space-y-1">
            <div>
              <strong>Студент:</strong> student@test.com / student123
            </div>
            <div>
              <strong>Админ:</strong> admin@expovision.ed / admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}

