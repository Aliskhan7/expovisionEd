import React from 'react';
import Link from 'next/link';
import { BookOpen, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { name: 'О платформе', href: '/about' },
      { name: 'Курсы', href: '/courses' },
      { name: 'AI Ассистент', href: '/chat' },
      { name: 'Цены', href: '/pricing' },
    ],
    support: [
      { name: 'Помощь', href: '/help' },
      { name: 'Контакты', href: '/contact' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Обратная связь', href: '/feedback' },
    ],
    legal: [
      { name: 'Политика конфиденциальности', href: '/privacy' },
      { name: 'Условия использования', href: '/terms' },
      { name: 'Публичная оферта', href: '/offer' },
    ],
  };

  return (
    <footer className="bg-secondary-900 text-white">
      <div className="container-custom">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">ExpoVisionED</span>
            </div>
            <p className="text-secondary-300 text-sm leading-relaxed">
              Современная образовательная платформа с AI-ассистентом для 
              эффективного обучения и развития навыков.
            </p>
            <div className="space-y-2 text-sm text-secondary-300">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>info@expovision.ed</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+7 (999) 123-45-67</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Москва, Россия</span>
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Платформа</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-secondary-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Поддержка</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-secondary-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Правовая информация</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-secondary-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-6 border-t border-secondary-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-secondary-400 text-sm">
              © {currentYear} ExpoVisionED. Все права защищены.
            </p>
            <div className="flex items-center space-x-6">
              <span className="text-secondary-400 text-sm">
                Сделано с ❤️ для образования
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

