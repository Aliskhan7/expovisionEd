# ExpoVisionED - Образовательная платформа с AI-ассистентом

Современная образовательная платформа, объединяющая короткие видеокурсы с персональным AI-ассистентом для создания уникального обучающего опыта.

## Особенности

- 🎥 **Короткие видеоуроки** (5-15 минут) для лучшего усвоения
- 🤖 **AI-ассистент** с знанием всех курсов платформы
- 🎨 **Минималистичный дизайн** без отвлекающих элементов
- 📱 **Адаптивный интерфейс** для всех устройств
- 💳 **Гибкая монетизация** (подписки и разовые покупки)
- 🔒 **Безопасность** с JWT аутентификацией

## Технологический стек

### Frontend
- **Next.js 14** с App Router
- **React 18** с TypeScript
- **Tailwind CSS** для стилизации
- **Zustand** для управления состоянием
- **Socket.IO** для real-time чата

### Backend
- **FastAPI** (Python 3.11+)
- **SQLAlchemy** с PostgreSQL
- **Redis** для кэширования
- **OpenAI Assistants API**
- **JWT** аутентификация

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- Python 3.11+ (для локальной разработки)

### Установка

1. **Клонируйте репозиторий**
   ```bash
   git clone <repository-url>
   cd expovision-ed
   ```

2. **Настройте переменные окружения**
   ```bash
   cp .env.docker .env
   # Отредактируйте .env файл, добавив ваш OpenAI API ключ
   ```

3. **Запустите с Docker (рекомендуется)**
   ```bash
   # Сделать скрипт исполняемым
   chmod +x start.sh
   
   # Запустить платформу
   ./start.sh
   ```
   
   Или вручную:
   ```bash
   docker compose up --build -d
   docker compose exec backend python -m app.db.init_db
   ```

4. **Запустите без Docker (для разработки)**
   
   Backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Откройте приложение**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Демо-аккаунты

- **Студент**: student@test.com / student123
- **Администратор**: admin@expovision.ed / admin123

## Структура проекта

```
expovision-ed/
├── frontend/                 # Next.js приложение
│   ├── src/
│   │   ├── app/             # App Router страницы
│   │   ├── components/      # React компоненты
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Утилиты и конфигурация
│   │   ├── store/          # Zustand store
│   │   └── types/          # TypeScript типы
│   └── package.json
├── backend/                 # FastAPI приложение
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Конфигурация
│   │   ├── db/             # База данных
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── schemas/        # Pydantic схемы
│   │   └── services/       # Бизнес-логика
│   └── requirements.txt
├── uploads/                 # Загруженные файлы
├── static/                  # Статические файлы
└── docker-compose.yml       # Оркестрация сервисов
```

## API Документация

После запуска backend сервера, API документация доступна по адресу:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Основные API endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена

### Курсы
- `GET /api/courses` - Список курсов
- `GET /api/courses/{id}` - Детали курса
- `GET /api/courses/{id}/lessons` - Уроки курса

### AI Чат
- `POST /api/chat/message` - Отправка сообщения
- `WebSocket /ws/chat` - Real-time чат

## Развертывание

### Production с Docker

1. **Настройте production переменные**
   ```bash
   cp .env.example .env.production
   # Настройте production значения
   ```

2. **Соберите и запустите**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### Переменные окружения

Основные переменные для настройки:

- `OPENAI_API_KEY` - Ключ OpenAI API
- `DATABASE_URL` - URL подключения к PostgreSQL
- `JWT_SECRET_KEY` - Секретный ключ для JWT
- `CORS_ORIGINS` - Разрешенные origins для CORS

## Разработка

### Добавление нового курса

1. Войдите как администратор
2. Перейдите в админ-панель
3. Создайте новый курс
4. Добавьте уроки с видео и транскриптами
5. Опубликуйте курс

### Настройка AI-ассистента

AI-ассистент автоматически получает доступ к транскриптам всех курсов. Для настройки поведения ассистента отредактируйте системные инструкции в `backend/app/services/ai_service.py`.

## Лицензия

MIT License

## Поддержка

Для вопросов и поддержки создайте issue в репозитории или свяжитесь с командой разработки.

