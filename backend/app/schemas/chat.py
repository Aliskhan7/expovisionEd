"""
Chat Pydantic schemas
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class ChatMessageBase(BaseModel):
    """Base chat message schema"""
    content: str


class ChatMessageCreate(ChatMessageBase):
    """Chat message creation schema"""
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None


class ChatMessageResponse(ChatMessageBase):
    """Chat message response schema"""
    id: int
    sender: str  # 'user' or 'assistant'
    thread_id: str
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    message_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatThreadCreate(BaseModel):
    """Chat thread creation schema"""
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None


class ChatThreadResponse(BaseModel):
    """Chat thread response schema"""
    thread_id: str
    created_at: datetime


class LessonChatMessageCreate(BaseModel):
    """Lesson-specific chat message schema"""
    content: str
    lesson_id: int
    course_id: int


class LessonChatHistoryResponse(BaseModel):
    """Lesson chat history response schema"""
    messages: List[ChatMessageResponse]
    lesson_title: str
    course_title: str
    total_course_messages: int

