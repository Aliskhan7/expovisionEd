"""
Chat API endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.models.chat_message import ChatMessage
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatThreadCreate, ChatThreadResponse
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

