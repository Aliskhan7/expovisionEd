"""
User Lesson Progress model
"""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from app.db.database import Base


class UserLessonProgress(Base):
    """User Lesson Progress model to track individual lesson completion"""
    __tablename__ = "user_lesson_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    watched_duration = Column(Integer, default=0, nullable=False)  # in seconds
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Unique constraint - one record per user per lesson
    __table_args__ = (UniqueConstraint('user_id', 'lesson_id', name='_user_lesson_uc'),)
    
    def __repr__(self):
        return f"<UserLessonProgress(user_id={self.user_id}, lesson_id={self.lesson_id}, completed={self.completed})>" 