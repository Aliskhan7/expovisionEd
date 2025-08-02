"""
Chat Pydantic schemas
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class ChatMessageBase(BaseModel):
    """Base chat message schema"""
    content: str


class ChatMessageCreate(ChatMessageBase):
    """Chat message creation schema"""
    pass


class ChatMessageResponse(ChatMessageBase):
    """Chat message response schema"""
    id: int
    sender: str  # 'user' or 'assistant'
    thread_id: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatThreadCreate(BaseModel):
    """Chat thread creation schema"""
    course_id: Optional[int] = None


class ChatThreadResponse(BaseModel):
    """Chat thread response schema"""
    thread_id: str
    created_at: datetime

