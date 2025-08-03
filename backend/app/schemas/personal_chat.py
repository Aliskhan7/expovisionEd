"""
Personal Chat schemas
"""
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class PersonalChatCreate(BaseModel):
    title: str = "Новый чат"


class PersonalChatResponse(BaseModel):
    id: int
    user_id: int
    title: str
    thread_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0  # Количество сообщений в чате
    last_message_at: Optional[datetime] = None  # Время последнего сообщения

    class Config:
        from_attributes = True


class PersonalChatUpdate(BaseModel):
    title: Optional[str] = None
    is_active: Optional[bool] = None 