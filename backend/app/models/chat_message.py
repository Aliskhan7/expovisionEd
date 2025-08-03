"""
Chat Message model
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class ChatMessage(Base):
    """Chat Message model"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)  # Курс к которому относится чат
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)  # Урок к которому относится чат
    thread_id = Column(String(255), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    message_data = Column(JSON, nullable=True)  # Переименовано из metadata
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    # user = relationship("User", back_populates="chat_messages")
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, sender='{self.sender}', user_id={self.user_id}, lesson_id={self.lesson_id})>"

