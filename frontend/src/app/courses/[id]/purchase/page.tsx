'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/layout/Layout';
import { Course } from '@/types';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export default function CoursePurchase() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'subscription'>('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [billingAddress, setBillingAddress] = useState({
    country: 'US',
    postalCode: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const courseId = parseInt(params.id as string);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchCourseDetails();
  }, [courseId, isAuthenticated, router]);

  const fetchCourseDetails = async () => {
    try {
      // Mock course data - replace with actual API call
      const mockCourse: Course = {
        id: courseId,
        title: 'Основы веб-разработки',
        description: 'Изучите основы HTML, CSS и JavaScript с нуля',
        cover_image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        level: 'beginner',
        category: 'Программирование',
        price: 99.99,
        is_premium: true,
        is_published: true,
        access_type: 'premium',
        total_duration: 480,
        total_lessons: 12,
        instructor_name: 'Анна Петрова',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCourse(mockCourse);
    } catch (error) {
      console.error('Failed to fetch course details:', error);
      setError('Не удалось загрузить информацию о курсе');
    } finally {
      setLoading(false);
    }
  };

  const handleCardInputChange = (field: string, value: string) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validateCard = () => {
    if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length < 16) {
      setError('Введите корректный номер карты');
      return false;
    }
    if (!cardDetails.expiry || cardDetails.expiry.length < 5) {
      setError('Введите срок действия карты');
      return false;
    }
    if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
      setError('Введите CVC код');
      return false;
    }
    if (!cardDetails.name.trim()) {
      setError('Введите имя владельца карты');
      return false;
    }
    return true;
  };

  const handlePurchase = async () => {
    if (!validateCard()) return;

    setProcessing(true);
    setError('');

    try {
      // Mock payment processing - replace with actual Stripe integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      setSuccess(true);
      
      setTimeout(() => {
        router.push(`/courses/${courseId}`);
      }, 2000);
    } catch (error) {
      console.error('Payment failed:', error);
      setError('Ошибка при обработке платежа. Попробуйте еще раз.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscriptionPurchase = async () => {
    setProcessing(true);
    setError('');

    try {
      // Mock subscription creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/courses');
      }, 2000);
    } catch (error) {
      console.error('Subscription failed:', error);
      setError('Ошибка при создании подписки. Попробуйте еще раз.');
    } finally {
      setProcessing(false);
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

  if (!course) {
    return (
      <Layout>
        <div className="container-custom py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Курс не найден</h1>
          <button
            onClick={() => router.push('/courses')}
            className="btn-primary"
          >
            Вернуться к курсам
          </button>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="container-custom py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Оплата прошла успешно!</h1>
            <p className="text-gray-600 mb-6">
              Теперь у вас есть доступ к курсу "{course.title}"
            </p>
            <div className="loading-spinner w-6 h-6 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Перенаправление...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Оформление покупки
              </h1>
              <p className="text-gray-600">
                Выберите способ оплаты и получите доступ к курсу
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payment Form */}
              <div className="space-y-6">
                {/* Payment Method Selection */}
                <div className="card p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Способ оплаты
                  </h2>
                  
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'card')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            Разовая покупка курса
                          </span>
                          <span className="text-2xl font-bold text-gray-900">
                            ${course.price}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Пожизненный доступ к курсу
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="subscription"
                        checked={paymentMethod === 'subscription'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'subscription')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            Месячная подписка
                          </span>
                          <span className="text-2xl font-bold text-gray-900">
                            $29.99<span className="text-sm font-normal text-gray-500">/мес</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Доступ ко всем курсам платформы
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Card Details */}
                {paymentMethod === 'card' && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Данные карты
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Номер карты
                        </label>
                        <input
                          type="text"
                          value={cardDetails.number}
                          onChange={(e) => handleCardInputChange('number', formatCardNumber(e.target.value))}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="input w-full"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Срок действия
                          </label>
                          <input
                            type="text"
                            value={cardDetails.expiry}
                            onChange={(e) => handleCardInputChange('expiry', formatExpiry(e.target.value))}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CVC
                          </label>
                          <input
                            type="text"
                            value={cardDetails.cvc}
                            onChange={(e) => handleCardInputChange('cvc', e.target.value.replace(/\D/g, ''))}
                            placeholder="123"
                            maxLength={4}
                            className="input w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Имя владельца карты
                        </label>
                        <input
                          type="text"
                          value={cardDetails.name}
                          onChange={(e) => handleCardInputChange('name', e.target.value)}
                          placeholder="John Doe"
                          className="input w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Address */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Адрес для выставления счета
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Страна
                      </label>
                      <select
                        value={billingAddress.country}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, country: e.target.value }))}
                        className="input w-full"
                      >
                        <option value="US">США</option>
                        <option value="RU">Россия</option>
                        <option value="UA">Украина</option>
                        <option value="BY">Беларусь</option>
                        <option value="KZ">Казахстан</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Почтовый индекс
                      </label>
                      <input
                        type="text"
                        value={billingAddress.postalCode}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="12345"
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* Purchase Button */}
                <button
                  onClick={paymentMethod === 'card' ? handlePurchase : handleSubscriptionPurchase}
                  disabled={processing}
                  className="w-full btn-primary btn-lg"
                >
                  {processing ? (
                    <>
                      <div className="loading-spinner w-5 h-5 mr-2"></div>
                      Обработка...
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'card' 
                        ? `Купить за $${course.price}`
                        : 'Оформить подписку за $29.99/мес'
                      }
                    </>
                  )}
                </button>
              </div>

              {/* Order Summary */}
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Сводка заказа
                  </h3>
                  
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-20 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {course.cover_image_url ? (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
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
                      <h4 className="font-medium text-gray-900">{course.title}</h4>
                      <p className="text-sm text-gray-600">{course.instructor_name}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span>{course.total_lessons} уроков</span>
                        <span className="mx-2">•</span>
                        <span>{Math.floor(course.total_duration / 60)} часов</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">
                        {paymentMethod === 'card' ? 'Цена курса' : 'Месячная подписка'}
                      </span>
                      <span className="font-medium">
                        ${paymentMethod === 'card' ? course.price : '29.99'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Налоги</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-900">Итого</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ${paymentMethod === 'card' ? course.price : '29.99'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div className="card p-6">
                  <div className="flex items-center mb-3">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-medium text-gray-900">Безопасная оплата</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Ваши данные защищены 256-битным SSL шифрованием. 
                    Мы не храним данные вашей карты.
                  </p>
                </div>

                {/* Money Back Guarantee */}
                <div className="card p-6">
                  <div className="flex items-center mb-3">
                    <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="font-medium text-gray-900">Гарантия возврата</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    30-дневная гарантия возврата денег. Если курс вам не подойдет, 
                    мы вернем полную стоимость.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

