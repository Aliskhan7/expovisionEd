# Docker Setup для ExpoVisionED

## 🐳 Установка Docker

### Ubuntu/Debian:
```bash
# Обновить пакеты
sudo apt update

# Установить зависимости
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Добавить GPG ключ Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавить репозиторий Docker
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установить Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Перезайти в систему или выполнить:
newgrp docker
```

### macOS:
```bash
# Установить Docker Desktop
brew install --cask docker

# Или скачать с официального сайта:
# https://docs.docker.com/desktop/mac/install/
```

### Windows:
```bash
# Установить Docker Desktop
# Скачать с официального сайта:
# https://docs.docker.com/desktop/windows/install/
```

## 🚀 Запуск ExpoVisionED

### 1. Клонирование проекта:
```bash
git clone <repository-url>
cd expovision-ed
```

### 2. Настройка окружения:
```bash
# Скопировать файл окружения
cp .env.docker .env

# Отредактировать .env файл и добавить ваш OpenAI API ключ:
nano .env
# Изменить: OPENAI_API_KEY=your-openai-api-key-here
```

### 3. Запуск с помощью скрипта:
```bash
# Сделать скрипт исполняемым
chmod +x start.sh

# Запустить платформу
./start.sh
```

### 4. Ручной запуск:
```bash
# Запуск всех сервисов
docker compose up --build -d

# Инициализация базы данных
docker compose exec backend python -m app.db.init_db

# Проверка статуса
docker compose ps
```

## 📊 Доступ к сервисам

После успешного запуска:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 👤 Демо-аккаунты

- **Студент**: student@test.com / student123
- **Администратор**: admin@expovision.ed / admin123

## 🛠️ Полезные команды

### Просмотр логов:
```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Остановка сервисов:
```bash
# Остановить все сервисы
docker compose down

# Остановить и удалить данные
docker compose down -v
```

### Перезапуск сервиса:
```bash
# Перезапустить backend
docker compose restart backend

# Пересобрать и перезапустить
docker compose up --build -d backend
```

### Выполнение команд в контейнере:
```bash
# Подключиться к backend контейнеру
docker compose exec backend bash

# Выполнить миграции
docker compose exec backend python -m app.db.init_db

# Подключиться к PostgreSQL
docker compose exec postgres psql -U postgres -d expovision_ed
```

## 🔧 Разработка

### Режим разработки:
```bash
# Использовать dev конфигурацию
docker compose -f docker-compose.dev.yml up --build -d

# С автоперезагрузкой кода
docker compose -f docker-compose.dev.yml up --build
```

### Отладка:
```bash
# Просмотр состояния контейнеров
docker compose ps

# Проверка здоровья сервисов
docker compose exec backend curl http://localhost:8000/health
docker compose exec frontend curl http://localhost:3000

# Мониторинг ресурсов
docker stats
```

## 🚨 Решение проблем

### Порты заняты:
```bash
# Найти процессы на портах
sudo lsof -i :3000
sudo lsof -i :8000
sudo lsof -i :5432

# Остановить процессы
sudo kill -9 <PID>
```

### Проблемы с правами:
```bash
# Исправить права на папки
sudo chown -R $USER:$USER uploads static

# Очистить Docker кеш
docker system prune -f
docker volume prune -f
```

### Ошибки сборки:
```bash
# Пересобрать без кеша
docker compose build --no-cache

# Удалить все образы и пересобрать
docker compose down --rmi all
docker compose up --build -d
```

## 📈 Production Deployment

### С Nginx (рекомендуется):
```bash
# Использовать полную конфигурацию
docker compose -f docker-compose.yml up --build -d
```

### SSL сертификаты:
```bash
# Создать папку для SSL
mkdir -p nginx/ssl

# Добавить сертификаты в nginx/ssl/
# Обновить nginx.conf для HTTPS
```

### Мониторинг:
```bash
# Добавить мониторинг с Prometheus/Grafana
# Настроить логирование
# Настроить бэкапы базы данных
```

## 🔒 Безопасность

1. **Изменить пароли по умолчанию** в .env файле
2. **Настроить firewall** для production
3. **Использовать SSL сертификаты**
4. **Регулярно обновлять образы Docker**
5. **Настроить мониторинг и алерты**

---

**Удачного использования ExpoVisionED! 🚀**

