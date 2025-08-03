export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Условия использования
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Добро пожаловать в ExpoVisionED. Пользуясь нашей платформой, вы соглашаетесь с данными условиями.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              1. Использование платформы
            </h2>
            <p className="text-gray-600 mb-4">
              Платформа предназначена для образовательных целей. Пользователи обязуются использовать контент только в рамках обучения.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              2. Конфиденциальность
            </h2>
            <p className="text-gray-600 mb-4">
              Мы защищаем ваши персональные данные и используем их только для улучшения образовательного процесса.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              3. Интеллектуальная собственность
            </h2>
            <p className="text-gray-600 mb-4">
              Все материалы на платформе защищены авторским правом и не могут быть использованы без разрешения.
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