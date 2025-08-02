"""
User Course Progress model
"""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, DECIMAL, UniqueConstraint
from sqlalchemy.sql import func
from app.db.database import Base


class UserCourseProgress(Base):
    """User Course Progress model"""
    __tablename__ = "user_course_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    last_lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    completed_lessons = Column(Integer, default=0, nullable=False)
    total_lessons = Column(Integer, default=0, nullable=False)
    progress_percentage = Column(DECIMAL(5, 2), default=0, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Unique constraint
    __table_args__ = (UniqueConstraint('user_id', 'course_id', name='_user_course_uc'),)
    
    def __repr__(self):
        return f"<UserCourseProgress(user_id={self.user_id}, course_id={self.course_id}, progress={self.progress_percentage}%)>"

