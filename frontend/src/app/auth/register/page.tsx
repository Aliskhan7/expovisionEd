'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, BookOpen, CheckCircle, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { isValidEmail, validatePassword } from '@/lib/utils';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuthStore();
  const router = useRouter();

  const passwordValidation = validatePassword(formData.password);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Имя обязательно';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Имя должно содержать минимум 2 символа';
    }

    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтверждение пароля обязательно';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email,
        password: formData.password,
      });
      router.push('/courses');
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.detail || 'Ошибка регистрации. Попробуйте еще раз.',
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

        {/* Register Form */}
        <div className="card p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">
              Создать аккаунт
            </h1>
            <p className="text-secondary-600">
              Присоединяйтесь к тысячам студентов уже сегодня
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-error-700 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Полное имя"
              type="text"
              value={formData.name}
              onChange={(value) => handleChange('name', value)}
              error={errors.name}
              placeholder="Иван Иванов"
              required
            />

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
                placeholder="Создайте надежный пароль"
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

            {/* Password Requirements */}
            {formData.password && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-secondary-700">
                  Требования к паролю:
                </p>
                <div className="space-y-1">
                  {[
                    { check: formData.password.length >= 8, text: 'Минимум 8 символов' },
                    { check: /[A-Z]/.test(formData.password), text: 'Заглавная буква' },
                    { check: /[a-z]/.test(formData.password), text: 'Строчная буква' },
                    { check: /\d/.test(formData.password), text: 'Цифра' },
                  ].map((req, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {req.check ? (
                        <CheckCircle className="w-4 h-4 text-success-600" />
                      ) : (
                        <X className="w-4 h-4 text-error-500" />
                      )}
                      <span className={`text-xs ${req.check ? 'text-success-600' : 'text-secondary-500'}`}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <Input
                label="Подтвердите пароль"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(value) => handleChange('confirmPassword', value)}
                error={errors.confirmPassword}
                placeholder="Повторите пароль"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-8 text-secondary-400 hover:text-secondary-600"
              >
                {showConfirmPassword ? (
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
              disabled={isSubmitting || !passwordValidation.isValid}
            >
              Создать аккаунт
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-secondary-600">
              Уже есть аккаунт?{' '}
              <Link
                href="/auth/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Войти
              </Link>
            </p>
          </div>

          <div className="mt-6 text-xs text-secondary-500 text-center">
            Регистрируясь, вы соглашаетесь с{' '}
            <Link href="/terms" className="text-primary-600 hover:text-primary-700">
              Условиями использования
            </Link>{' '}
            и{' '}
            <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
              Политикой конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

