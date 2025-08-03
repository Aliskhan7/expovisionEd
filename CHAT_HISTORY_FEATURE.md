# История Чатов - Функциональность

## Обзор

Реализована система истории чатов, которая позволяет пользователям:
- Создавать несколько персональных чатов
- Переключаться между ними
- Редактировать названия чатов
- Удалять ненужные чаты
- Сохранять историю сообщений для каждого чата отдельно

## Новые компоненты

### Backend

#### 1. Модель PersonalChat
**Файл:** `backend/app/models/personal_chat.py`

```python
class PersonalChat(Base):
    __tablename__ = "personal_chats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    thread_id = Column(String(255), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

#### 2. Схемы PersonalChat
**Файл:** `backend/app/schemas/personal_chat.py`

- `PersonalChatCreate` - для создания нового чата
- `PersonalChatResponse` - для ответов API
- `PersonalChatUpdate` - для обновления чата

#### 3. API Endpoints
**Файл:** `backend/app/api/chat.py`

- `GET /api/chat/personal/chats` - получить все чаты пользователя
- `POST /api/chat/personal/chats` - создать новый чат  
- `PUT /api/chat/personal/chats/{chat_id}` - обновить чат
- `DELETE /api/chat/personal/chats/{chat_id}` - удалить чат
- `GET /api/chat/personal/chats/{chat_id}/history` - получить историю сообщений
- `POST /api/chat/personal/chats/{chat_id}/message` - отправить сообщение в чат

#### 4. AI Service
**Файл:** `backend/app/services/ai_service.py`

Добавлен метод `send_personal_assistant_message_to_thread()` для отправки сообщений в конкретный thread_id.

### Frontend

#### 1. Типы TypeScript
**Файл:** `frontend/src/types/index.ts`

```typescript
export interface PersonalChat {
  id: number;
  user_id: number;
  title: string;
  thread_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message_at?: string;
}
```

#### 2. API Клиент  
**Файл:** `frontend/src/lib/api.ts`

Добавлены методы:
- `getPersonalChats()`
- `createPersonalChat()`
- `updatePersonalChat()`
- `deletePersonalChat()`
- `getPersonalChatHistory()`
- `sendPersonalChatMessage()`

#### 3. Обновленная страница чата
**Файл:** `frontend/src/app/chat/page.tsx`

Полностью переписана с:
- Боковой панелью для списка чатов
- Возможностью создания/редактирования/удаления чатов
- Переключением между чатами
- Сохранением истории для каждого чата

## Структура базы данных

### Таблица personal_chats

```sql
CREATE TABLE personal_chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_personal_chats_user_id ON personal_chats(user_id);
CREATE INDEX idx_personal_chats_thread_id ON personal_chats(thread_id);
CREATE INDEX idx_personal_chats_user_active ON personal_chats(user_id, is_active);
```

### Связь с chat_messages

Сообщения в персональных чатах идентифицируются по:
- `course_id = NULL`
- `lesson_id = NULL`  
- `thread_id = personal_chat_{uuid}_user_{user_id}`

## Пользовательский интерфейс

### Боковая панель
- Список всех чатов пользователя
- Кнопка "Новый" для создания чата
- Информация о количестве сообщений и времени последнего сообщения
- Кнопки редактирования и удаления (появляются при наведении)

### Основная область чата
- Заголовок с названием текущего чата
- Область сообщений с историей
- Поле ввода сообщения
- Быстрые команды для новых чатов

### Функциональность
- **Создание чата:** Автоматически создается с названием "Новый чат"
- **Редактирование:** Клик по иконке редактирования → inline редактор
- **Удаление:** Клик по иконке корзины → подтверждение → soft delete
- **Переключение:** Клик по чату в списке → загрузка истории

## Технические особенности

### Thread ID
Каждый персональный чат имеет уникальный thread_id:
```
personal_chat_{8-символьный_uuid}_user_{user_id}
```

### Сохранение состояния
- Чаты загружаются при входе пользователя
- История загружается при переключении чата  
- Автоматический выбор первого чата в списке
- Сохранение счетчика сообщений и времени последнего сообщения

### AI Assistant
- Тот же AI-ассистент работает во всех чатах
- Контекст включает прогресс пользователя по курсам
- История чата учитывается при генерации ответов
- Каждый чат имеет независимую историю

## Использование

1. **Войдите в систему** → перейдите на `/chat`
2. **Создайте новый чат** → нажмите "Новый" в боковой панели
3. **Переключайтесь между чатами** → кликайте по чатам в списке
4. **Редактируйте названия** → наведите на чат → кликните иконку редактирования
5. **Удаляйте ненужные** → наведите на чат → кликните иконку корзины

## Отличия от урочных чатов

| Параметр | Персональные чаты | Урочные чаты |
|----------|------------------|--------------|
| Привязка | К пользователю | К уроку + пользователю |
| Количество | Множественные | Один на урок |
| Контекст | Общий прогресс | Конкретный урок |
| Управление | Создание/удаление | Автоматические |
| Цель | Общие вопросы | Помощь по уроку | 