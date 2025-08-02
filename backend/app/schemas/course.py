"""
Course Pydantic schemas
"""

from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel

from app.schemas.lesson import LessonResponse


class CourseBase(BaseModel):
    """Base course schema"""
    title: str
    description: Optional[str] = None
    level: Optional[str] = None
    price: Optional[Decimal] = None
    is_premium: bool = False


class CourseCreate(CourseBase):
    """Course creation schema"""
    is_published: bool = False
    cover_image_url: Optional[str] = None


class CourseUpdate(BaseModel):
    """Course update schema"""
    title: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    price: Optional[Decimal] = None
    is_premium: Optional[bool] = None
    is_published: Optional[bool] = None
    cover_image_url: Optional[str] = None


class CourseResponse(CourseBase):
    """Course response schema"""
    id: int
    cover_image_url: Optional[str] = None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CourseWithLessons(CourseResponse):
    """Course with lessons schema"""
    lessons: List[LessonResponse] = []


class CourseProgress(BaseModel):
    """Course progress schema"""
    course_id: int
    completed_lessons: int
    total_lessons: int
    progress_percentage: Decimal
    last_lesson_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

