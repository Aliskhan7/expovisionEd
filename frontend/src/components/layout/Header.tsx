'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, BookOpen, MessageCircle, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navigation = [
    { name: 'Курсы', href: '/courses', icon: BookOpen },
    { name: 'AI Чат', href: '/chat', icon: MessageCircle },
  ];

  const adminNavigation = [
    { name: 'Админ панель', href: '/admin', icon: User },
    { name: 'Управление курсами', href: '/admin/courses', icon: BookOpen },
  ];

  return (
    <header className="bg-white border-b border-secondary-200 sticky top-0 z-40">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-secondary-900">
              ExpoVisionED
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="nav-link flex items-center space-x-1"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
            {isAuthenticated && user?.role === 'admin' && adminNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="nav-link flex items-center space-x-1 text-primary-600"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                {/* User Avatar and Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary-50 transition-colors">
                    <Avatar name={user.name} size="sm" />
                    <span className="hidden md:block text-sm font-medium text-secondary-700">
                      {user.name}
                    </span>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-medium border border-secondary-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Профиль
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Выйти
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Войти
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Регистрация
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary-50 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'md:hidden border-t border-secondary-200 transition-all duration-300 overflow-hidden',
            isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <nav className="py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-2 px-4 py-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
            
            {!isAuthenticated && (
              <div className="px-4 pt-4 border-t border-secondary-200 space-y-2">
                <Link href="/auth/login" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    Войти
                  </Button>
                </Link>
                <Link href="/auth/register" className="block">
                  <Button variant="primary" className="w-full">
                    Регистрация
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

