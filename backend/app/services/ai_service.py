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
            base_url=settings.OPENAI_API_BASE
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
    
    def create_thread(self, user_id: int) -> Optional[str]:
        """Create a new conversation thread"""
        try:
            thread = self.client.beta.threads.create()
            print(f"✅ Created thread {thread.id} for user {user_id}")
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
        db: Session
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
                thread_id=thread_id,
                sender="assistant",
                content=ai_response,
                metadata={"model": "gpt-3.5-turbo"}
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


# Global AI service instance
ai_service = AIService()

