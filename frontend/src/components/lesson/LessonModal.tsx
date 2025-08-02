'use client';

import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
import { X, Clock, FileText, Maximize, Check } from 'lucide-react';
import { Lesson } from '@/types';
import { useCoursesStore } from '@/store/courses';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  courseTitle?: string;
  courseId?: number;
}

export default function LessonModal({ isOpen, onClose, lesson, courseTitle, courseId }: LessonModalProps) {
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [playerError, setPlayerError] = React.useState(false);
  const { updateProgress } = useCoursesStore();

  // Function to convert YouTube URL to embed format
  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  // Check if URL is YouTube
  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };
  
  // Initialize completion state based on lesson data
  React.useEffect(() => {
    if (isOpen && lesson) {
      // Check if lesson is already completed from API data
      setIsCompleted(lesson.is_completed || false);
      setIsCompleting(false);
      setPlayerError(false);
    }
  }, [isOpen, lesson?.id, lesson?.is_completed]);
  
  if (!lesson) return null;

  const handleCompleteLesson = async () => {
    if (!courseId) return;
    
    // Check if user has access to this lesson
    if (lesson.has_access === false) {
      alert('У вас нет доступа к этому уроку. Обратитесь к администратору.');
      return;
    }
    
    setIsCompleting(true);
    try {
      await updateProgress(courseId, lesson.id, true);
      setIsCompleted(true);
      
      // Show success message for a moment, then close
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to complete lesson:', error);
      alert('Ошибка при завершении урока. Попробуйте еще раз.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                      {lesson.title}
                    </Dialog.Title>
                    {courseTitle && (
                      <p className="text-sm text-gray-500 mt-1">{courseTitle}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <span className="sr-only">Закрыть</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                  {/* Video Player */}
                  <div className="lg:col-span-2">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                      {lesson.video_url ? (
                        <>
                          {!playerError && isYouTubeUrl(lesson.video_url) ? (
                            // YouTube iframe fallback for better compatibility
                            <iframe
                              src={getYouTubeEmbedUrl(lesson.video_url) || lesson.video_url}
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0
                              }}
                              onError={() => setPlayerError(true)}
                            />
                          ) : !playerError ? (
                            // ReactPlayer for other video formats
                            <ReactPlayer
                              url={lesson.video_url}
                              width="100%"
                              height="100%"
                              controls={true}
                              playing={false}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0
                              }}
                              onError={() => setPlayerError(true)}
                            />
                          ) : (
                            // Error fallback
                            <div className="flex items-center justify-center h-full text-white">
                              <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg mb-2">Ошибка загрузки видео</p>
                                <button
                                  onClick={() => window.open(lesson.video_url, '_blank')}
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  Открыть в новой вкладке
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-white">
                          <div className="text-center">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Видео недоступно</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Video Info */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {Math.floor((lesson.duration || 0) / 60)} мин
                        </div>
                        {lesson.is_free && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Бесплатно
                          </span>
                        )}
                      </div>
                      
                      {lesson.video_url && (
                        <button
                          onClick={() => {
                            // Open video in fullscreen in new tab
                            window.open(lesson.video_url, '_blank');
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          <Maximize className="w-4 h-4 mr-1" />
                          Полный экран
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lesson Details */}
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Описание урока</h4>
                      
                      {lesson.transcript ? (
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <p className="whitespace-pre-wrap">{lesson.transcript}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Описание урока пока недоступно</p>
                      )}
                    </div>

                    {/* Lesson Navigation */}
                    <div className="mt-4 space-y-3">
                      {!isCompleted ? (
                        <button
                          onClick={handleCompleteLesson}
                          disabled={isCompleting}
                          className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isCompleting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Завершаем...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Завершить урок
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full px-4 py-2 text-sm font-medium text-green-800 bg-green-100 border border-green-200 rounded-md flex items-center justify-center">
                          <Check className="w-4 h-4 mr-2" />
                          Урок завершен!
                        </div>
                      )}
                      
                      <button
                        onClick={onClose}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Закрыть урок
                      </button>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-500">
                          Урок #{lesson.order_index + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 