"""
Database initialization script with sample data
"""

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.user_course_progress import UserCourseProgress
from app.core.security import get_password_hash


def init_db():
    """Initialize database with sample data"""
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.email == "admin@expovision.ed").first()
        if not admin_user:
            # Create admin user
            admin_user = User(
                email="admin@expovision.ed",
                name="Администратор",
                password_hash=get_password_hash("admin123"),
                role="admin",
                subscription_status="active"
            )
            db.add(admin_user)
            print("✅ Created admin user: admin@expovision.ed / admin123")
        
        # Create test student user
        student_user = db.query(User).filter(User.email == "student@test.com").first()
        if not student_user:
            student_user = User(
                email="student@test.com",
                name="Тестовый Студент",
                password_hash=get_password_hash("student123"),
                role="student",
                subscription_status="active"
            )
            db.add(student_user)
            print("✅ Created test student: student@test.com / student123")
        
        db.commit()
        
        # Create sample courses
        course1 = db.query(Course).filter(Course.title == "Основы программирования").first()
        if not course1:
            course1 = Course(
                title="Основы программирования",
                description="Изучите основы программирования с нуля. Этот курс подходит для начинающих и покрывает основные концепции программирования.",
                level="beginner",
                price=0.00,
                is_premium=False,
                is_published=True,
                cover_image_url="/static/course1.jpg"
            )
            db.add(course1)
            db.commit()
            db.refresh(course1)
        
        # Check if lessons need to be added to course 1
        existing_lessons = db.query(Lesson).filter(Lesson.course_id == course1.id).count()
        if existing_lessons == 0:
            # Add lessons to course 1
            lessons1 = [
                {
                    "title": "Введение в программирование",
                    "video_url": "https://example.com/video1.mp4",
                    "duration": 10,
                    "transcript": "В этом уроке мы изучим основы программирования. Программирование - это процесс создания компьютерных программ с помощью языков программирования. Мы рассмотрим основные концепции: переменные, функции, циклы и условия.",
                    "order_index": 0,
                    "is_free": True
                },
                {
                    "title": "Переменные и типы данных",
                    "video_url": "https://example.com/video2.mp4",
                    "duration": 12,
                    "transcript": "Переменные - это контейнеры для хранения данных. В программировании существуют различные типы данных: числа, строки, логические значения. Мы изучим как объявлять переменные и работать с разными типами данных.",
                    "order_index": 1,
                    "is_free": True
                },
                {
                    "title": "Условные операторы",
                    "video_url": "https://example.com/video3.mp4",
                    "duration": 9,
                    "transcript": "Условные операторы позволяют программе принимать решения. Мы изучим операторы if, else, elif и научимся создавать логические условия для управления потоком выполнения программы.",
                    "order_index": 2,
                    "is_free": False
                },
                {
                    "title": "Циклы и итерации",
                    "video_url": "https://example.com/video4.mp4",
                    "duration": 11,
                    "transcript": "Циклы позволяют повторять код множество раз. Мы изучим циклы for и while, научимся работать с итерациями и поймем, когда использовать каждый тип цикла.",
                    "order_index": 3,
                    "is_free": False
                },
                {
                    "title": "Функции и модули",
                    "video_url": "https://example.com/video5.mp4",
                    "duration": 13,
                    "transcript": "Функции - это блоки кода, которые можно использовать повторно. Мы научимся создавать функции, передавать параметры и возвращать значения. Также изучим модули и библиотеки.",
                    "order_index": 4,
                    "is_free": False
                }
            ]
            
            for lesson_data in lessons1:
                lesson = Lesson(
                    course_id=course1.id,
                    **lesson_data
                )
                db.add(lesson)
            
            print("✅ Created course: Основы программирования")
        
        # Create premium course
        course2 = db.query(Course).filter(Course.title == "Веб-разработка с React").first()
        if not course2:
            course2 = Course(
                title="Веб-разработка с React",
                description="Продвинутый курс по созданию современных веб-приложений с использованием React, TypeScript и современных инструментов разработки.",
                level="intermediate",
                price=2999.00,
                is_premium=True,
                is_published=True,
                cover_image_url="/static/course2.jpg"
            )
            db.add(course2)
            db.commit()
            db.refresh(course2)
        
        # Check if lessons need to be added to course 2
        existing_lessons2 = db.query(Lesson).filter(Lesson.course_id == course2.id).count()
        if existing_lessons2 == 0:
            # Add lessons to course 2
            lessons2 = [
                {
                    "title": "Введение в React",
                    "video_url": "https://example.com/react1.mp4",
                    "duration": 15,
                    "transcript": "React - это библиотека JavaScript для создания пользовательских интерфейсов. В этом уроке мы изучим основы React, компоненты, JSX и виртуальный DOM.",
                    "order_index": 0,
                    "is_free": True
                },
                {
                    "title": "Компоненты и Props",
                    "video_url": "https://example.com/react2.mp4",
                    "duration": 14,
                    "transcript": "Компоненты - это строительные блоки React приложений. Мы изучим функциональные и классовые компоненты, научимся передавать данные через props.",
                    "order_index": 1,
                    "is_free": False
                },
                {
                    "title": "State и Hooks",
                    "video_url": "https://example.com/react3.mp4",
                    "duration": 16,
                    "transcript": "State позволяет компонентам хранить и изменять данные. Мы изучим useState, useEffect и другие хуки React для управления состоянием.",
                    "order_index": 2,
                    "is_free": False
                },
                {
                    "title": "Роутинг с React Router",
                    "video_url": "https://example.com/react4.mp4",
                    "duration": 12,
                    "transcript": "React Router позволяет создавать многостраничные приложения. Мы научимся настраивать маршруты, навигацию и защищенные страницы.",
                    "order_index": 3,
                    "is_free": False
                }
            ]
            
            for lesson_data in lessons2:
                lesson = Lesson(
                    course_id=course2.id,
                    **lesson_data
                )
                db.add(lesson)
            
            print("✅ Created course: Веб-разработка с React")
        
        # Create AI/ML course
        course3 = db.query(Course).filter(Course.title == "Машинное обучение для начинающих").first()
        if not course3:
            course3 = Course(
                title="Машинное обучение для начинающих",
                description="Введение в мир искусственного интеллекта и машинного обучения. Изучите основные алгоритмы и научитесь применять их на практике.",
                level="beginner",
                price=1999.00,
                is_premium=True,
                is_published=True,
                cover_image_url="/static/course3.jpg"
            )
            db.add(course3)
            db.commit()
            db.refresh(course3)
        
        # Check if lessons need to be added to course 3
        existing_lessons3 = db.query(Lesson).filter(Lesson.course_id == course3.id).count()
        if existing_lessons3 == 0:
            # Add lessons to course 3
            lessons3 = [
                {
                    "title": "Что такое машинное обучение?",
                    "video_url": "https://example.com/ml1.mp4",
                    "duration": 10,
                    "transcript": "Машинное обучение - это область искусственного интеллекта, которая позволяет компьютерам учиться без явного программирования. Мы рассмотрим основные типы машинного обучения.",
                    "order_index": 0,
                    "is_free": True
                },
                {
                    "title": "Подготовка данных",
                    "video_url": "https://example.com/ml2.mp4",
                    "duration": 13,
                    "transcript": "Качество данных критически важно для машинного обучения. Мы изучим методы очистки, преобразования и подготовки данных для обучения моделей.",
                    "order_index": 1,
                    "is_free": False
                },
                {
                    "title": "Линейная регрессия",
                    "video_url": "https://example.com/ml3.mp4",
                    "duration": 15,
                    "transcript": "Линейная регрессия - один из основных алгоритмов машинного обучения. Мы изучим математические основы и научимся применять его для предсказания числовых значений.",
                    "order_index": 2,
                    "is_free": False
                }
            ]
            
            for lesson_data in lessons3:
                lesson = Lesson(
                    course_id=course3.id,
                    **lesson_data
                )
                db.add(lesson)
            
            print("✅ Created course: Машинное обучение для начинающих")
        
        db.commit()
        print("✅ Database initialized successfully!")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

