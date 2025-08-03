"""
AI Service for OpenAI Assistants API integration
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.chat_message import ChatMessage


class AIService:
    """AI Service for managing OpenAI Assistants"""
    
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
            default_headers={
                "OpenAI-Beta": "assistants=v2"
            }
        )
        self.assistant_id = None
        self._initialize_assistant()
    
    def _initialize_assistant(self):
        """Initialize or get existing assistant"""
        try:
            # Try to get existing assistant ID from environment or file
            assistant_file = "assistant_id.txt"
            if os.path.exists(assistant_file):
                with open(assistant_file, 'r') as f:
                    self.assistant_id = f.read().strip()
                    
                # Verify assistant exists
                try:
                    self.client.beta.assistants.retrieve(self.assistant_id)
                    print(f"✅ Using existing assistant: {self.assistant_id}")
                    return
                except Exception:
                    print("❌ Existing assistant not found, creating new one...")
                    self.assistant_id = None
            
            # Create new assistant
            self.assistant_id = self._create_assistant()
            
            # Save assistant ID
            with open(assistant_file, 'w') as f:
                f.write(self.assistant_id)
                
        except Exception as e:
            print(f"❌ Error initializing assistant: {e}")
            self.assistant_id = None
    
    def _create_assistant(self) -> str:
        """Create a new OpenAI assistant"""
        try:
            assistant = self.client.beta.assistants.create(
                name="ExpoVisionED AI Tutor",
                instructions="""
                Ты - дружелюбный AI-преподаватель платформы ExpoVisionED. 
                
                Твоя роль:
                - Помогать студентам изучать курсы и отвечать на вопросы по материалам
                - Объяснять сложные концепции простым языком
                - Мотивировать студентов к обучению
                - Предлагать дополнительные примеры и упражнения
                - Проверять понимание материала через наводящие вопросы
                
                Принципы работы:
                - Всегда отвечай на русском языке
                - Будь терпеливым и поощряющим
                - Используй только информацию из загруженных курсов
                - Если не знаешь ответа, честно признайся в этом
                - Задавай уточняющие вопросы для лучшего понимания
                - Адаптируй объяснения под уровень студента
                
                Стиль общения:
                - Дружелюбный и профессиональный
                - Используй примеры из реальной жизни
                - Поощряй любознательность
                - Помогай структурировать знания
                """,
                model="gpt-3.5-turbo",
                tools=[{"type": "file_search"}]
            )
            
            print(f"✅ Created new assistant: {assistant.id}")
            return assistant.id
            
        except Exception as e:
            print(f"❌ Error creating assistant: {e}")
            raise
    
    def create_thread(self, user_id: int, lesson_id: Optional[int] = None) -> Optional[str]:
        """Create a new conversation thread"""
        try:
            thread = self.client.beta.threads.create()
            print(f"✅ Created thread {thread.id} for user {user_id}, lesson {lesson_id}")
            return thread.id
        except Exception as e:
            print(f"❌ Error creating thread: {e}")
            return None
    
    def add_message_to_thread(self, thread_id: str, content: str, role: str = "user") -> bool:
        """Add a message to the thread"""
        try:
            self.client.beta.threads.messages.create(
                thread_id=thread_id,
                role=role,
                content=content
            )
            return True
        except Exception as e:
            print(f"❌ Error adding message to thread: {e}")
            return False
    
    def run_assistant(self, thread_id: str) -> Optional[str]:
        """Run the assistant on a thread and get response"""
        try:
            if not self.assistant_id:
                return "Извините, AI-ассистент временно недоступен."
            
            # Create and run the assistant
            run = self.client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=self.assistant_id
            )
            
            # Wait for completion
            while run.status in ['queued', 'in_progress']:
                run = self.client.beta.threads.runs.retrieve(
                    thread_id=thread_id,
                    run_id=run.id
                )
                asyncio.sleep(1)
            
            if run.status == 'completed':
                # Get the latest message
                messages = self.client.beta.threads.messages.list(
                    thread_id=thread_id,
                    limit=1
                )
                
                if messages.data:
                    message = messages.data[0]
                    if message.content and message.content[0].type == 'text':
                        return message.content[0].text.value
            
            return "Извините, произошла ошибка при обработке вашего запроса."
            
        except Exception as e:
            print(f"❌ Error running assistant: {e}")
            return "Извините, произошла ошибка при обработке вашего запроса."
    
    def _get_lesson_context(self, lesson_id: int, db: Session) -> str:
        """Get lesson context for AI assistant"""
        try:
            lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
            if not lesson:
                return ""
            
            course = db.query(Course).filter(Course.id == lesson.course_id).first()
            context = f"КОНТЕКСТ УРОКА:\n"
            context += f"Курс: {course.title if course else 'Неизвестный курс'}\n"
            context += f"Урок: {lesson.title}\n"
            
            if lesson.transcript:
                context += f"Содержание урока:\n{lesson.transcript}\n"
            else:
                context += "Содержание урока: Транскрипт урока не предоставлен\n"
            
            context += f"Длительность: {lesson.duration or 0} секунд\n"
            context += "\nОтвечай на вопросы студента основываясь на этом содержании урока."
            
            return context
            
        except Exception as e:
            print(f"❌ Error getting lesson context: {e}")
            return ""
    
    def _get_course_chat_history(self, user_id: int, course_id: int, db: Session, limit: int = 10) -> List[Dict]:
        """Get recent chat history for the course to maintain context"""
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_id == user_id,
                ChatMessage.course_id == course_id
            ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
            
            history = []
            for msg in reversed(messages):  # Reverse to get chronological order
                history.append({
                    "role": "user" if msg.sender == "user" else "assistant",
                    "content": msg.content
                })
            
            return history
            
        except Exception as e:
            print(f"❌ Error getting course chat history: {e}")
            return []

    async def send_lesson_message(
        self, 
        user: User, 
        message: str, 
        lesson_id: int,
        course_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Send message to AI assistant with lesson context and course memory"""
        try:
            # Get lesson context
            lesson_context = self._get_lesson_context(lesson_id, db)
            
            # Get course chat history for context
            course_history = self._get_course_chat_history(user.id, course_id, db)
            
            # Create thread ID for this lesson if user doesn't have one
            thread_id = f"lesson_{lesson_id}_user_{user.id}"
            
            # Create a contextual message with lesson info and course history
            contextual_message = f"{lesson_context}\n\nИСТОРИЯ ЧАТА ПО КУРСУ:\n"
            
            # Add recent course history
            for hist_msg in course_history[-5:]:  # Last 5 messages for context
                role_name = "Студент" if hist_msg["role"] == "user" else "Преподаватель"
                contextual_message += f"{role_name}: {hist_msg['content']}\n"
            
            contextual_message += f"\nВОПРОС СТУДЕНТА: {message}"
            
            # Use OpenAI Chat Completions API directly for better control
            try:
                completion = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {
                            "role": "system", 
                            "content": """Ты - дружелюбный AI-преподаватель платформы ExpoVisionED. 
                            Отвечай на вопросы студентов по материалам уроков, используя предоставленный контекст.
                            Помни предыдущие разговоры по курсу и связывай новые вопросы с ранее изученным материалом.
                            Всегда отвечай на русском языке дружелюбно и профессионально."""
                        },
                        {"role": "user", "content": contextual_message}
                    ],
                    temperature=0.7,
                    max_tokens=1000
                )
                
                ai_response = completion.choices[0].message.content
                
            except Exception as e:
                print(f"❌ Error with OpenAI completion: {e}")
                ai_response = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз."
            
            # Save user message to database
            user_message = ChatMessage(
                user_id=user.id,
                course_id=course_id,
                lesson_id=lesson_id,
                thread_id=thread_id,
                sender="user",
                content=message
            )
            db.add(user_message)
            db.commit()
            
            # Save AI response to database
            assistant_message = ChatMessage(
                user_id=user.id,
                course_id=course_id,
                lesson_id=lesson_id,
                thread_id=thread_id,
                sender="assistant",
                content=ai_response,
                message_data={"model": "gpt-3.5-turbo", "lesson_context": True}
            )
            db.add(assistant_message)
            db.commit()
            
            return {
                "success": True,
                "message": ai_response,
                "message_id": assistant_message.id
            }
            
        except Exception as e:
            print(f"❌ Error in send_lesson_message: {e}")
            return {
                "success": False,
                "message": "Произошла ошибка при обработке сообщения"
            }

    def upload_course_materials(self, db: Session) -> bool:
        """Upload course materials to assistant for knowledge base"""
        try:
            if not self.assistant_id:
                return False
            
            # Get all courses with lessons
            courses = db.query(Course).filter(Course.is_published == True).all()
            
            for course in courses:
                # Create course content file
                course_content = self._generate_course_content(course, db)
                
                if course_content:
                    # Save to temporary file
                    filename = f"course_{course.id}_{course.title.replace(' ', '_')}.txt"
                    filepath = os.path.join(settings.STATIC_DIR, filename)
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(course_content)
                    
                    # Upload to OpenAI
                    try:
                        with open(filepath, 'rb') as f:
                            file = self.client.files.create(
                                file=f,
                                purpose='assistants'
                            )
                        
                        # Attach file to assistant
                        self.client.beta.assistants.update(
                            assistant_id=self.assistant_id,
                            tool_resources={
                                "file_search": {
                                    "vector_store_ids": []
                                }
                            }
                        )
                        
                        print(f"✅ Uploaded course materials: {course.title}")
                        
                    except Exception as e:
                        print(f"❌ Error uploading course {course.title}: {e}")
                    
                    # Clean up temporary file
                    if os.path.exists(filepath):
                        os.remove(filepath)
            
            return True
            
        except Exception as e:
            print(f"❌ Error uploading course materials: {e}")
            return False
    
    def _generate_course_content(self, course: Course, db: Session) -> str:
        """Generate text content for a course"""
        try:
            content = f"КУРС: {course.title}\n"
            content += f"ОПИСАНИЕ: {course.description or 'Описание отсутствует'}\n"
            content += f"УРОВЕНЬ: {course.level or 'Не указан'}\n\n"
            
            # Get lessons for this course
            lessons = db.query(Lesson).filter(
                Lesson.course_id == course.id
            ).order_by(Lesson.order_index).all()
            
            for lesson in lessons:
                content += f"УРОК {lesson.order_index + 1}: {lesson.title}\n"
                if lesson.transcript:
                    content += f"СОДЕРЖАНИЕ:\n{lesson.transcript}\n"
                else:
                    content += "СОДЕРЖАНИЕ: Транскрипт урока отсутствует\n"
                content += f"ДЛИТЕЛЬНОСТЬ: {lesson.duration or 0} секунд\n\n"
            
            return content
            
        except Exception as e:
            print(f"❌ Error generating course content: {e}")
            return ""
    
    async def send_message(
        self, 
        user: User, 
        message: str, 
        db: Session,
        course_id: Optional[int] = None,
        lesson_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Send message to AI assistant and get response"""
        try:
            # Get or create thread for user
            thread_id = user.ai_thread_id
            if not thread_id:
                thread_id = self.create_thread(user.id)
                if thread_id:
                    user.ai_thread_id = thread_id
                    db.commit()
                else:
                    return {
                        "success": False,
                        "message": "Не удалось создать сессию чата"
                    }
            
            # Save user message to database
            user_message = ChatMessage(
                user_id=user.id,
                course_id=course_id,
                lesson_id=lesson_id,
                thread_id=thread_id,
                sender="user",
                content=message
            )
            db.add(user_message)
            db.commit()
            
            # Add message to OpenAI thread
            if not self.add_message_to_thread(thread_id, message):
                return {
                    "success": False,
                    "message": "Ошибка отправки сообщения"
                }
            
            # Get AI response
            ai_response = self.run_assistant(thread_id)
            
            # Save AI response to database
            assistant_message = ChatMessage(
                user_id=user.id,
                course_id=course_id,
                lesson_id=lesson_id,
                thread_id=thread_id,
                sender="assistant",
                content=ai_response,
                message_data={"model": "gpt-3.5-turbo"}
            )
            db.add(assistant_message)
            db.commit()
            
            return {
                "success": True,
                "message": ai_response,
                "message_id": assistant_message.id
            }
            
        except Exception as e:
            print(f"❌ Error in send_message: {e}")
            return {
                "success": False,
                "message": "Произошла ошибка при обработке сообщения"
            }

    def _get_user_progress_context(self, user: User, db: Session) -> str:
        """Get user progress context for personal assistant"""
        from app.models.user_course_progress import UserCourseProgress
        from app.models.user_lesson_progress import UserLessonProgress
        from app.models.course import Course
        from app.models.lesson import Lesson
        
        # Get user's enrolled courses
        enrolled_courses = db.query(Course).join(
            UserCourseProgress
        ).filter(UserCourseProgress.user_id == user.id).all()
        
        progress_context = f"ИНФОРМАЦИЯ О СТУДЕНТЕ:\n"
        progress_context += f"Имя: {user.name}\n"
        progress_context += f"Email: {user.email}\n\n"
        
        if not enrolled_courses:
            progress_context += "СТАТУС: Студент пока не записан ни на один курс.\n"
            return progress_context
            
        progress_context += f"ЗАПИСАН НА КУРСЫ ({len(enrolled_courses)}):\n"
        
        for course in enrolled_courses:
            # Get course progress
            course_progress = db.query(UserCourseProgress).filter(
                UserCourseProgress.user_id == user.id,
                UserCourseProgress.course_id == course.id
            ).first()
            
            # Get all lessons in course
            total_lessons = db.query(Lesson).filter(Lesson.course_id == course.id).count()
            
            # Get completed lessons
            completed_lessons = db.query(UserLessonProgress).join(Lesson).filter(
                UserLessonProgress.user_id == user.id,
                UserLessonProgress.completed == True,
                Lesson.course_id == course.id
            ).count()
            
            completion_rate = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
            
            progress_context += f"\n📚 {course.title}\n"
            progress_context += f"   Прогресс: {completed_lessons}/{total_lessons} уроков ({completion_rate:.1f}%)\n"
            
            if course_progress:
                progress_context += f"   Начат: {course_progress.created_at.strftime('%d.%m.%Y')}\n"
                if course_progress.completed_at:
                    progress_context += f"   Завершен: {course_progress.completed_at.strftime('%d.%m.%Y')}\n"
                else:
                    progress_context += f"   Статус: В процессе изучения\n"
        
        return progress_context

    def _get_user_learning_insights(self, user: User, db: Session) -> str:
        """Analyze user's learning patterns from lesson chats"""
        
        # Get recent chat messages from lessons
        recent_messages = db.query(ChatMessage).filter(
            ChatMessage.user_id == user.id,
            ChatMessage.lesson_id.isnot(None),
            ChatMessage.sender == 'user'
        ).order_by(ChatMessage.created_at.desc()).limit(20).all()
        
        if not recent_messages:
            return "\nАНАЛИЗ ОБУЧЕНИЯ: Пока нет данных о взаимодействии с уроками.\n"
        
        insights = "\nАНАЛИЗ ОБУЧЕНИЯ:\n"
        
        # Analyze question patterns
        question_topics = []
        for msg in recent_messages:
            if any(word in msg.content.lower() for word in ['как', 'что', 'почему', 'зачем', 'когда']):
                question_topics.append(msg.content[:100])
        
        if question_topics:
            insights += f"Часто задаваемые вопросы ({len(question_topics)} последних):\n"
            for i, topic in enumerate(question_topics[-3:], 1):  # Show last 3
                insights += f"{i}. {topic}...\n"
        
        # Get lessons where user was most active
        from sqlalchemy import func
        lesson_activity = db.query(
            Lesson.title,
            func.count(ChatMessage.id).label('message_count')
        ).join(ChatMessage, Lesson.id == ChatMessage.lesson_id).filter(
            ChatMessage.user_id == user.id,
            ChatMessage.sender == 'user'
        ).group_by(Lesson.id, Lesson.title).order_by(
            func.count(ChatMessage.id).desc()
        ).limit(3).all()
        
        if lesson_activity:
            insights += f"\nНаиболее активные уроки:\n"
            for lesson_title, msg_count in lesson_activity:
                insights += f"• {lesson_title}: {msg_count} вопросов\n"
        
        return insights

    async def send_personal_assistant_message(
        self, 
        user: User, 
        message: str, 
        db: Session
    ) -> Dict[str, Any]:
        """Send message to personal AI assistant"""
        
        # Generate unique thread ID for personal assistant
        thread_id = f"personal_assistant_user_{user.id}"
        
        # Get user progress context
        progress_context = self._get_user_progress_context(user, db)
        learning_insights = self._get_user_learning_insights(user, db)
        
        # Get recent personal assistant chat history
        recent_chat = db.query(ChatMessage).filter(
            ChatMessage.user_id == user.id,
            ChatMessage.thread_id == thread_id,
            ChatMessage.course_id.is_(None),  # Personal assistant messages have no course_id
            ChatMessage.lesson_id.is_(None)   # Personal assistant messages have no lesson_id
        ).order_by(ChatMessage.created_at.desc()).limit(10).all()
        
        # Build context message
        contextual_message = f"""ПЕРСОНАЛЬНЫЙ AI-АССИСТЕНТ
{progress_context}
{learning_insights}

ПОСЛЕДНИЕ СООБЩЕНИЯ В ЛИЧНОМ ЧАТЕ:
"""
        
        for msg in reversed(recent_chat[-5:]):  # Last 5 messages in chronological order
            role_name = "Студент" if msg.sender == "user" else "Ассистент"
            contextual_message += f"{role_name}: {msg.content}\n"
        
        contextual_message += f"\nНОВОЕ СООБЩЕНИЕ СТУДЕНТА: {message}"
        
        try:
            # Use Chat Completions API for personal assistant
            completion = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system", 
                        "content": """Ты - персональный AI-ассистент для обучения на платформе ExpoVisionED. У тебя есть полная информация о прогрессе студента, его курсах, пройденных уроках и активности.

ТВОЯ ЗАДАЧА:
- Анализировать прогресс студента и давать конкретные рекомендации
- Помогать с планированием обучения
- Мотивировать к продолжению изучения курсов
- Отвечать на вопросы о контенте курсов
- Предлагать оптимальные стратегии обучения

СТРОГИЕ ПРАВИЛА ОБЩЕНИЯ:
- НИКОГДА не используй слова "Привет", "Здравствуй" или любые приветствия в ответах
- НИКОГДА не говори "рад видеть" или подобные фразы
- СРАЗУ переходи к сути вопроса
- Если история чата пустая, просто представь свои возможности БЕЗ приветствия
- Будь конкретным и полезным
- Анализируй данные и давай персональные советы
- Отвечай кратко, но информативно

НЕПРАВИЛЬНО: "Привет! Рад видеть твой интерес к обучению..."
ПРАВИЛЬНО: "После анализа твоего прогресса на курсе..."

ТВОИ ВОЗМОЖНОСТИ:
- Видишь все курсы студента и прогресс по ним
- Знаешь какие уроки пройдены, а какие нет
- Анализируешь вопросы из урочных чатов
- Можешь определить сложные темы для студента
- Предлагаешь персональный план развития

Отвечай на русском языке. Будь наставником, а не просто чат-ботом! ЗАПОМНИ: никаких приветствий!"""
                    },
                    {"role": "user", "content": contextual_message}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            ai_response = completion.choices[0].message.content
            
            # Save user message
            user_message = ChatMessage(
                user_id=user.id,
                thread_id=thread_id,
                sender="user",
                content=message,
                course_id=None,  # Personal assistant has no course
                lesson_id=None,  # Personal assistant has no lesson
                message_data={"type": "personal_assistant"}
            )
            db.add(user_message)
            db.flush()
            
            # Save assistant response
            assistant_message = ChatMessage(
                user_id=user.id,
                thread_id=thread_id,
                sender="assistant",
                content=ai_response,
                course_id=None,  # Personal assistant has no course
                lesson_id=None,  # Personal assistant has no lesson
                message_data={"type": "personal_assistant", "model": "gpt-3.5-turbo"}
            )
            db.add(assistant_message)
            db.commit()
            
            return {
                "success": True, 
                "message": ai_response, 
                "message_id": assistant_message.id
            }
            
        except Exception as e:
            db.rollback()
            print(f"❌ Error in personal assistant: {str(e)}")
            return {
                "success": False, 
                "error": str(e)
            }

    async def send_personal_assistant_message_to_thread(
        self, 
        user: User, 
        message: str, 
        thread_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Send message to personal assistant using specific thread_id"""
        
        try:
            # Get user progress and learning insights
            progress_context = self._get_user_progress_context(user, db)
            learning_insights = self._get_user_learning_insights(user, db)
            
            # Get recent chat history for this specific thread
            recent_chat = db.query(ChatMessage).filter(
                ChatMessage.user_id == user.id,
                ChatMessage.thread_id == thread_id,
                ChatMessage.course_id.is_(None),
                ChatMessage.lesson_id.is_(None)
            ).order_by(ChatMessage.created_at.desc()).limit(10).all()
            
            # Build context message
            contextual_message = f"""ПЕРСОНАЛЬНЫЙ AI-АССИСТЕНТ
{progress_context}
{learning_insights}

ПОСЛЕДНИЕ СООБЩЕНИЯ В ЭТОМ ЧАТЕ:
"""
            
            for msg in reversed(recent_chat[-5:]):  # Last 5 messages in chronological order
                role_name = "Студент" if msg.sender == "user" else "Ассистент"
                contextual_message += f"{role_name}: {msg.content}\n"
            
            contextual_message += f"\nНОВОЕ СООБЩЕНИЕ СТУДЕНТА: {message}"
            
            # Use Chat Completions API for personal assistant
            completion = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system", 
                        "content": """Ты - персональный AI-ассистент для обучения на платформе ExpoVisionED. У тебя есть полная информация о прогрессе студента, его курсах, пройденных уроках и активности.

ТВОЯ ЗАДАЧА:
- Анализировать прогресс студента и давать конкретные рекомендации
- Помогать с планированием обучения
- Мотивировать к продолжению изучения курсов
- Отвечать на вопросы о контенте курсов
- Предлагать оптимальные стратегии обучения

СТРОГИЕ ПРАВИЛА ОБЩЕНИЯ:
- НИКОГДА не используй слова "Привет", "Здравствуй" или любые приветствия в ответах
- НИКОГДА не говори "рад видеть" или подобные фразы
- СРАЗУ переходи к сути вопроса
- Если история чата пустая, просто представь свои возможности БЕЗ приветствия
- Будь конкретным и полезным
- Анализируй данные и давай персональные советы
- Отвечай кратко, но информативно

НЕПРАВИЛЬНО: "Привет! Рад видеть твой интерес к обучению..."
ПРАВИЛЬНО: "После анализа твоего прогресса на курсе..."

ТВОИ ВОЗМОЖНОСТИ:
- Видишь все курсы студента и прогресс по ним
- Знаешь какие уроки пройдены, а какие нет
- Анализируешь вопросы из урочных чатов
- Можешь определить сложные темы для студента
- Предлагаешь персональный план развития

Отвечай на русском языке. Будь наставником, а не просто чат-ботом! ЗАПОМНИ: никаких приветствий!"""
                    },
                    {"role": "user", "content": contextual_message}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            ai_response = completion.choices[0].message.content
            
            # Save user message
            user_message = ChatMessage(
                user_id=user.id,
                thread_id=thread_id,
                sender="user",
                content=message,
                course_id=None,  # Personal assistant messages have no course_id
                lesson_id=None   # Personal assistant messages have no lesson_id
            )
            db.add(user_message)
            db.flush()  # Get the ID
            
            # Save assistant message
            assistant_message = ChatMessage(
                user_id=user.id,
                thread_id=thread_id,
                sender="assistant",
                content=ai_response,
                course_id=None,  # Personal assistant messages have no course_id
                lesson_id=None   # Personal assistant messages have no lesson_id
            )
            db.add(assistant_message)
            db.commit()
            
            return {
                "success": True, 
                "message": ai_response, 
                "message_id": assistant_message.id
            }
            
        except Exception as e:
            db.rollback()
            print(f"❌ Error in personal assistant thread: {str(e)}")
            return {
                "success": False, 
                "error": str(e)
            }


# Global AI service instance
ai_service = AIService()

