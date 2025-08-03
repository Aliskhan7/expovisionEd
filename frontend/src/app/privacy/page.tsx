export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Политика конфиденциальности
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Мы уважаем вашу конфиденциальность и стремимся защитить ваши персональные данные.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              1. Какие данные мы собираем
            </h2>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Имя пользователя и email адрес</li>
              <li>Прогресс обучения и результаты тестов</li>
              <li>История взаимодействия с AI-чатом</li>
              <li>Техническая информация о вашем устройстве</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              2. Как мы используем данные
            </h2>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Для персонализации обучения</li>
              <li>Для улучшения работы AI-помощника</li>
              <li>Для анализа эффективности курсов</li>
              <li>Для технической поддержки</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              3. Защита данных
            </h2>
            <p className="text-gray-600 mb-4">
              Мы используем современные методы шифрования и защиты для обеспечения безопасности ваших данных.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              4. Ваши права
            </h2>
            <p className="text-gray-600 mb-4">
              Вы имеете право на доступ, исправление, удаление или ограничение обработки ваших персональных данных.
            </p>
            
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 