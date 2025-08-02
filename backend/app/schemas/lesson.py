"""
Lesson Pydantic schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class LessonBase(BaseModel):
    """Base lesson schema"""
    title: str
    video_url: str
    duration: Optional[int] = None
    transcript: Optional[str] = None
    order_index: int = 0
    is_free: bool = False


class LessonCreate(LessonBase):
    """Lesson creation schema"""
    course_id: int


class LessonUpdate(BaseModel):
    """Lesson update schema"""
    title: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[int] = None
    transcript: Optional[str] = None
    order_index: Optional[int] = None
    is_free: Optional[bool] = None


class LessonResponse(LessonBase):
    """Lesson response schema"""
    id: int
    course_id: int
    is_completed: bool = False
    has_access: bool = True  # Whether user has access to this lesson
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LessonProgress(BaseModel):
    """Lesson progress schema"""
    lesson_id: int
    watched_duration: int = 0  # in seconds
    completed: bool = False

