'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, MessageCircle, Users, Zap, Star, CheckCircle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  const features = [
    {
      icon: BookOpen,
      title: 'Короткие видеоуроки',
      description: 'Уроки длительностью 5-15 минут для лучшего усвоения материала',
    },
    {
      icon: MessageCircle,
      title: 'AI-ассистент',
      description: 'Персональный помощник, знающий все курсы платформы',
    },
    {
      icon: Users,
      title: 'Сообщество',
      description: 'Общайтесь с другими студентами и преподавателями',
    },
    {
      icon: Zap,
      title: 'Быстрое обучение',
      description: 'Эффективные методики для ускоренного освоения навыков',
    },
  ];

  const benefits = [
    'Доступ к курсам 24/7',
    'Персональный AI-наставник',
    'Сертификаты о прохождении',
    'Мобильное приложение',
    'Прогресс-трекинг',
    'Поддержка сообщества',
  ];

  const testimonials = [
    {
      name: 'Анна Петрова',
      role: 'Frontend разработчик',
      content: 'Благодаря ExpoVisionED я освоила React за месяц. AI-ассистент всегда помогал разобраться со сложными вопросами.',
      rating: 5,
    },
    {
      name: 'Михаил Сидоров',
      role: 'Data Scientist',
      content: 'Отличная платформа для изучения машинного обучения. Короткие уроки идеально вписываются в рабочий график.',
      rating: 5,
    },
    {
      name: 'Елена Козлова',
      role: 'Студентка',
      content: 'Начала с нуля и теперь уверенно программирую. Спасибо за качественные курсы и поддержку!',
      rating: 5,
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-primary-50 to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6">
              Обучение будущего с{' '}
              <span className="text-gradient">AI-ассистентом</span>
            </h1>
            <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
              Изучайте новые навыки с персональным AI-наставником. 
              Короткие уроки, практические задания и поддержка на каждом шаге.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/courses">
                  <Button size="lg" className="group">
                    Перейти к курсам
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/register">
                    <Button size="lg" className="group">
                      Начать обучение
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/courses">
                    <Button variant="outline" size="lg">
                      Посмотреть курсы
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Почему выбирают ExpoVisionED?
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Мы создали платформу, которая делает обучение эффективным, 
              увлекательным и доступным для каждого.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card p-6 text-center hover:shadow-medium transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-secondary-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-secondary-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
                Все необходимое для успешного обучения
              </h2>
              <p className="text-lg text-secondary-600 mb-8">
                Получите доступ к современным инструментам обучения и 
                персональной поддержке AI-ассистента.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
                    <span className="text-secondary-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center">
                <div className="text-white text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">AI-Ассистент</h3>
                  <p className="text-primary-100">
                    Ваш персональный наставник
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Отзывы наших студентов
            </h2>
            <p className="text-lg text-secondary-600">
              Узнайте, что говорят о нас те, кто уже достиг успеха
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-warning-400 fill-current" />
                  ))}
                </div>
                <p className="text-secondary-700 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-secondary-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-secondary-600">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-primary-600">
        <div className="container-custom">
          <div className="text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Готовы начать свое обучение?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам студентов, которые уже изменили свою жизнь 
              с помощью ExpoVisionED.
            </p>
            {!isAuthenticated && (
              <Link href="/auth/register">
                <Button 
                  variant="secondary" 
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-primary-50"
                >
                  Зарегистрироваться бесплатно
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

