"""
Lesson model
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base


class Lesson(Base):
    """Lesson model"""
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False, index=True)
    video_url = Column(String(500), nullable=True)
    duration = Column(Integer, default=0)  # Duration in minutes
    transcript = Column(Text, nullable=True)  # Lesson transcript
    order_index = Column(Integer, nullable=False, default=0)
    is_free = Column(Boolean, default=False, nullable=False)  # Free lesson
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Lesson(id={self.id}, title='{self.title}', course_id={self.course_id})>"

