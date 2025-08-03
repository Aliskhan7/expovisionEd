"""
Chat API endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.security import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.models.chat_message import ChatMessage
from app.models.lesson import Lesson
from app.models.course import Course
from app.models.personal_chat import PersonalChat
from app.schemas.chat import (
    ChatMessageCreate, ChatMessageResponse, ChatThreadCreate, ChatThreadResponse,
    LessonChatMessageCreate, LessonChatHistoryResponse
)
from app.schemas.personal_chat import (
    PersonalChatCreate, PersonalChatResponse, PersonalChatUpdate
)
from app.services.ai_service import ai_service

router = APIRouter()


@router.get("/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    thread_id: str = None,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get chat history for user"""
    
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    
    if thread_id:
        query = query.filter(ChatMessage.thread_id == thread_id)
    
    messages = query.order_by(ChatMessage.created_at.desc()).limit(limit).all()
    
    return messages[::-1]  # Reverse to get chronological order


@router.get("/lesson/{lesson_id}/history", response_model=LessonChatHistoryResponse)
async def get_lesson_chat_history(
    lesson_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get chat history for a specific lesson and course context"""
    
    # Get lesson and course info
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get all messages for this course (for context)
    course_messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.course_id == lesson.course_id
    ).order_by(ChatMessage.created_at).all()
    
    # Get messages specific to this lesson
    lesson_messages = [msg for msg in course_messages if msg.lesson_id == lesson_id]
    
    return LessonChatHistoryResponse(
        messages=lesson_messages,
        lesson_title=lesson.title,
        course_title=course.title,
        total_course_messages=len(course_messages)
    )


@router.post("/lesson/{lesson_id}/message", response_model=ChatMessageResponse)
async def send_lesson_message(
    lesson_id: int,
    message_data: LessonChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a message to AI assistant about specific lesson"""
    
    # Verify lesson exists and user has access
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Send message to AI service with lesson context
    result = await ai_service.send_lesson_message(
        user=current_user, 
        message=message_data.content,
        lesson_id=lesson_id,
        course_id=message_data.course_id,
        db=db
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )
    
    # Get the saved assistant message
    assistant_message = db.query(ChatMessage).filter(
        ChatMessage.id == result["message_id"]
    ).first()
    
    return assistant_message


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a message to AI assistant"""
    
    # Send message to AI service
    result = await ai_service.send_message(current_user, message_data.content, db)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )
    
    # Get the saved assistant message
    assistant_message = db.query(ChatMessage).filter(
        ChatMessage.id == result["message_id"]
    ).first()
    
    return assistant_message


@router.post("/new-thread", response_model=ChatThreadResponse)
async def create_new_thread(
    thread_data: ChatThreadCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new chat thread"""
    
    thread_id = ai_service.create_thread(current_user.id)
    if not thread_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat thread"
        )
    
    current_user.ai_thread_id = thread_id
    db.commit()
    
    from datetime import datetime
    return {
        "thread_id": thread_id,
        "created_at": datetime.utcnow()
    }


@router.post("/upload-materials")
async def upload_course_materials(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload course materials to AI assistant (admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    success = ai_service.upload_course_materials(db)
    
    if success:
        return {"message": "Course materials uploaded successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload course materials"
        )


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket)
    
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4004, reason="User not found")
            return
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Send message to AI service
            result = await ai_service.send_message(user, data, db)
            
            if result["success"]:
                # Send AI response back to client
                await manager.send_personal_message(result["message"], websocket)
            else:
                await manager.send_personal_message(
                    "Извините, произошла ошибка при обработке сообщения.", 
                    websocket
                )
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("/personal/history", response_model=List[ChatMessageResponse])
async def get_personal_assistant_history(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get personal assistant (Jarvis) chat history"""
    
    thread_id = f"personal_assistant_user_{current_user.id}"
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.thread_id == thread_id,
        ChatMessage.course_id.is_(None),  # Personal assistant messages have no course
        ChatMessage.lesson_id.is_(None)   # Personal assistant messages have no lesson
    ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    
    return messages[::-1]  # Reverse to get chronological order


@router.post("/personal/message", response_model=ChatMessageResponse)
async def send_personal_assistant_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send message to personal AI assistant (Jarvis)"""
    
    try:
        # Use AI service for personal assistant
        result = await ai_service.send_personal_assistant_message(
            user=current_user,
            message=message_data.content,
            db=db
        )
        
        if result["success"]:
            # Get the saved assistant message
            assistant_message = db.query(ChatMessage).filter(
                ChatMessage.id == result["message_id"]
            ).first()
            
            return assistant_message
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {result.get('error', 'Unknown error')}"
            )
            
    except Exception as e:
        print(f"❌ Error in personal assistant endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message with personal assistant"
        )


# Personal Chat Management Endpoints

@router.get("/personal/chats", response_model=List[PersonalChatResponse])
async def get_personal_chats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all personal chats for the current user"""
    chats = db.query(PersonalChat).filter(
        PersonalChat.user_id == current_user.id,
        PersonalChat.is_active == True
    ).order_by(PersonalChat.updated_at.desc()).all()
    
    # Add message count and last message time for each chat
    chat_responses = []
    for chat in chats:
        # Count messages in this chat
        message_count = db.query(ChatMessage).filter(
            ChatMessage.thread_id == chat.thread_id
        ).count()
        
        # Get last message time
        last_message = db.query(ChatMessage).filter(
            ChatMessage.thread_id == chat.thread_id
        ).order_by(ChatMessage.created_at.desc()).first()
        
        chat_response = PersonalChatResponse(
            id=chat.id,
            user_id=chat.user_id,
            title=chat.title,
            thread_id=chat.thread_id,
            is_active=chat.is_active,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            message_count=message_count,
            last_message_at=last_message.created_at if last_message else chat.created_at
        )
        chat_responses.append(chat_response)
    
    return chat_responses


@router.post("/personal/chats", response_model=PersonalChatResponse)
async def create_personal_chat(
    chat_data: PersonalChatCreate = PersonalChatCreate(),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new personal chat"""
    import uuid
    
    # Generate unique thread_id
    thread_id = f"personal_chat_{uuid.uuid4().hex[:8]}_user_{current_user.id}"
    
    # Create new chat
    new_chat = PersonalChat(
        user_id=current_user.id,
        title=chat_data.title,
        thread_id=thread_id
    )
    
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    return PersonalChatResponse(
        id=new_chat.id,
        user_id=new_chat.user_id,
        title=new_chat.title,
        thread_id=new_chat.thread_id,
        is_active=new_chat.is_active,
        created_at=new_chat.created_at,
        updated_at=new_chat.updated_at,
        message_count=0,
        last_message_at=new_chat.created_at
    )


@router.put("/personal/chats/{chat_id}", response_model=PersonalChatResponse)
async def update_personal_chat(
    chat_id: int,
    chat_update: PersonalChatUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a personal chat"""
    chat = db.query(PersonalChat).filter(
        PersonalChat.id == chat_id,
        PersonalChat.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Update fields if provided
    if chat_update.title is not None:
        chat.title = chat_update.title
    if chat_update.is_active is not None:
        chat.is_active = chat_update.is_active
    
    db.commit()
    db.refresh(chat)
    
    # Get message count and last message time
    message_count = db.query(ChatMessage).filter(
        ChatMessage.thread_id == chat.thread_id
    ).count()
    
    last_message = db.query(ChatMessage).filter(
        ChatMessage.thread_id == chat.thread_id
    ).order_by(ChatMessage.created_at.desc()).first()
    
    return PersonalChatResponse(
        id=chat.id,
        user_id=chat.user_id,
        title=chat.title,
        thread_id=chat.thread_id,
        is_active=chat.is_active,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        message_count=message_count,
        last_message_at=last_message.created_at if last_message else chat.created_at
    )


@router.delete("/personal/chats/{chat_id}")
async def delete_personal_chat(
    chat_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a personal chat"""
    chat = db.query(PersonalChat).filter(
        PersonalChat.id == chat_id,
        PersonalChat.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Soft delete - mark as inactive
    chat.is_active = False
    db.commit()
    
    return {"message": "Chat deleted successfully"}


@router.get("/personal/chats/{chat_id}/history", response_model=List[ChatMessageResponse])
async def get_personal_chat_history(
    chat_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get message history for a specific personal chat"""
    # Verify chat belongs to user
    chat = db.query(PersonalChat).filter(
        PersonalChat.id == chat_id,
        PersonalChat.user_id == current_user.id,
        PersonalChat.is_active == True
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Get messages for this chat
    messages = db.query(ChatMessage).filter(
        ChatMessage.thread_id == chat.thread_id
    ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    
    return messages[::-1]  # Return in chronological order


@router.post("/personal/chats/{chat_id}/message", response_model=ChatMessageResponse)
async def send_message_to_personal_chat(
    chat_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send message to a specific personal chat"""
    # Verify chat belongs to user
    chat = db.query(PersonalChat).filter(
        PersonalChat.id == chat_id,
        PersonalChat.user_id == current_user.id,
        PersonalChat.is_active == True
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    try:
        # Use the existing AI service but with the specific chat's thread_id
        result = await ai_service.send_personal_assistant_message_to_thread(
            user=current_user,
            message=message_data.content,
            thread_id=chat.thread_id,
            db=db
        )
        
        if result["success"]:
            # Update chat's updated_at timestamp
            chat.updated_at = func.now()
            db.commit()
            
            # Get the saved assistant message
            assistant_message = db.query(ChatMessage).filter(
                ChatMessage.id == result["message_id"]
            ).first()
            
            return assistant_message
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {result.get('error', 'Unknown error')}"
            )
            
    except Exception as e:
        print(f"❌ Error in personal chat message endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message in personal chat"
        )

