"""
Course model
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, DECIMAL
from sqlalchemy.sql import func
from app.db.database import Base


class Course(Base):
    """Course model"""
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    level = Column(String(50), nullable=True)  # beginner, intermediate, advanced
    category = Column(String(100), nullable=True)
    price = Column(DECIMAL(10, 2), nullable=True)
    is_premium = Column(Boolean, default=False, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    access_type = Column(String(50), default="free")  # free, premium, subscription_only
    total_duration = Column(Integer, default=0)  # Total duration in minutes
    total_lessons = Column(Integer, default=0)
    instructor_name = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Course(id={self.id}, title='{self.title}', is_premium={self.is_premium})>"

