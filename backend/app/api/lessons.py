"""
Lessons API endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user, get_current_admin_user, get_current_user_optional, check_course_access
from app.db.database import get_db
from app.models.user import User
from app.models.lesson import Lesson
from app.models.course import Course
from app.models.user_course_progress import UserCourseProgress
from app.models.user_lesson_progress import UserLessonProgress
from app.schemas.lesson import LessonResponse, LessonCreate, LessonUpdate, LessonProgress

router = APIRouter()


@router.get("/test")
async def test_optional_auth(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Test endpoint for optional authentication"""
    if current_user:
        return {"message": "User authenticated", "user_id": current_user.id}
    else:
        return {"message": "No authentication", "user_id": None}


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get lesson details with new access control logic"""
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    # Get course information
    from app.models.course import Course
    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check lesson access based on new logic:
    # 1. Free lessons are accessible to everyone
    # 2. For premium lessons in premium courses, check course access
    # 3. For premium lessons in free courses, allow access
    if lesson.is_free:
        return lesson
    
    if not course.is_premium:
        # Free course - all lessons accessible
        return lesson
    
    # Premium course with premium lesson - check course access
    if not check_course_access(current_user, lesson.course_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This lesson requires course purchase or subscription."
        )
    
    return lesson


@router.post("/", response_model=LessonResponse)
async def create_lesson(
    lesson_data: LessonCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new lesson (admin only)"""
    
    # Check if course exists
    course = db.query(Course).filter(Course.id == lesson_data.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    db_lesson = Lesson(**lesson_data.dict())
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    
    # Update total lessons count for all user progress records
    progress_records = db.query(UserCourseProgress).filter(
        UserCourseProgress.course_id == lesson_data.course_id
    ).all()
    
    total_lessons = db.query(Lesson).filter(
        Lesson.course_id == lesson_data.course_id
    ).count()
    
    for progress in progress_records:
        progress.total_lessons = total_lessons
        if progress.total_lessons > 0:
            progress.progress_percentage = (progress.completed_lessons / progress.total_lessons) * 100
    
    db.commit()
    
    return db_lesson


@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    lesson_update: LessonUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a lesson (admin only)"""
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    # Update lesson fields
    update_data = lesson_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lesson, field, value)
    
    db.commit()
    db.refresh(lesson)
    
    return lesson


@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a lesson (admin only)"""
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    course_id = lesson.course_id
    db.delete(lesson)
    db.commit()
    
    # Update total lessons count for all user progress records
    progress_records = db.query(UserCourseProgress).filter(
        UserCourseProgress.course_id == course_id
    ).all()
    
    total_lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).count()
    
    for progress in progress_records:
        progress.total_lessons = total_lessons
        if progress.total_lessons > 0:
            progress.progress_percentage = (progress.completed_lessons / progress.total_lessons) * 100
        else:
            progress.progress_percentage = 0
    
    db.commit()
    
    return {"message": "Lesson deleted successfully"}


@router.post("/{lesson_id}/progress")
async def update_lesson_progress(
    lesson_id: int,
    progress_data: LessonProgress,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user's progress for a lesson"""
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    # Check course access
    if not check_course_access(current_user, lesson.course_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get or create user course progress
    progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.user_id == current_user.id,
        UserCourseProgress.course_id == lesson.course_id
    ).first()
    
    if not progress:
        total_lessons = db.query(Lesson).filter(
            Lesson.course_id == lesson.course_id
        ).count()
        
        progress = UserCourseProgress(
            user_id=current_user.id,
            course_id=lesson.course_id,
            total_lessons=total_lessons
        )
        db.add(progress)
    
    # Handle individual lesson progress
    from datetime import datetime
    
    # Get or create lesson progress record
    lesson_progress = db.query(UserLessonProgress).filter(
        UserLessonProgress.user_id == current_user.id,
        UserLessonProgress.lesson_id == lesson_id
    ).first()
    
    if progress_data.completed:
        # Mark lesson as completed
        # When lesson is completed, set watched_duration to full lesson duration
        full_duration = lesson.duration or 0
        
        if not lesson_progress:
            lesson_progress = UserLessonProgress(
                user_id=current_user.id,
                lesson_id=lesson_id,
                course_id=lesson.course_id,
                completed=True,
                watched_duration=full_duration,
                completed_at=datetime.utcnow()
            )
            db.add(lesson_progress)
        else:
            lesson_progress.completed = True
            lesson_progress.watched_duration = full_duration
            lesson_progress.completed_at = datetime.utcnow()
        
        # Update course progress
        progress.last_lesson_id = lesson_id
    else:
        # Mark lesson as NOT completed (cancel completion)
        if lesson_progress:
            lesson_progress.completed = False
            lesson_progress.completed_at = None
            # Reset watched_duration when canceling completion
            lesson_progress.watched_duration = 0
        else:
            # Create record as not completed
            lesson_progress = UserLessonProgress(
                user_id=current_user.id,
                lesson_id=lesson_id,
                course_id=lesson.course_id,
                completed=False,
                watched_duration=0,
                completed_at=None
            )
            db.add(lesson_progress)
    
    # Flush changes to database before counting
    db.flush()
    
    # Always recalculate course progress after any change
    completed_lessons_count = db.query(UserLessonProgress).filter(
        UserLessonProgress.user_id == current_user.id,
        UserLessonProgress.course_id == lesson.course_id,
        UserLessonProgress.completed == True
    ).count()
    
    progress.completed_lessons = completed_lessons_count
    
    if progress.total_lessons > 0:
        progress.progress_percentage = (completed_lessons_count / progress.total_lessons) * 100
    
    # Check if course is completed or reset completion status
    if progress.completed_lessons >= progress.total_lessons:
        progress.completed_at = datetime.utcnow()
    else:
        progress.completed_at = None  # Reset course completion if not all lessons completed
    
    db.commit()
    db.refresh(progress)
    
    return {"message": "Progress updated successfully", "progress": progress}

