"""
Courses API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user, get_current_admin_user, get_current_user_optional, check_course_access
from app.db.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.user_lesson_progress import UserLessonProgress
from app.models.user_course_progress import UserCourseProgress
from app.schemas.course import CourseResponse, CourseCreate, CourseUpdate, CourseWithLessons

router = APIRouter()


@router.get("/", response_model=List[CourseResponse])
async def get_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    level: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get list of all published courses - access control is at lesson level"""
    
    query = db.query(Course).filter(Course.is_published == True)
    
    # Filter by level if specified
    if level:
        query = query.filter(Course.level == level)
    
    courses = query.offset(skip).limit(limit).all()
    
    # Return all published courses - access control is now at lesson level
    return courses


@router.get("/public", response_model=List[CourseResponse])
async def get_public_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of all published courses for public viewing (no authentication required)"""
    
    query = db.query(Course).filter(Course.is_published == True)
    
    # Filter by level if specified
    if level:
        query = query.filter(Course.level == level)
    
    courses = query.offset(skip).limit(limit).all()
    
    # Return all published courses - access control is handled at lesson level
    return courses


@router.get("/{course_id}", response_model=CourseWithLessons)
async def get_course(
    course_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get course details - all published courses are viewable, access control is at lesson level"""
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if not course.is_published and (not current_user or current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # All published courses are viewable - access control is now at lesson level
    return course


@router.get("/{course_id}/lessons")
async def get_course_lessons(
    course_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get lessons for a specific course with access control per lesson"""
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get all lessons for the course
    lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).order_by(Lesson.order_index).all()
    
    # Check if user has full access to the course
    has_full_access = check_course_access(current_user, course_id, db)
    
    # Add completion status and access information
    if current_user:
        completed_lesson_ids = {
            progress.lesson_id for progress in 
            db.query(UserLessonProgress).filter(
                UserLessonProgress.user_id == current_user.id,
                UserLessonProgress.course_id == course_id,
                UserLessonProgress.completed == True
            ).all()
        }
        
        # Add access control per lesson
        for lesson in lessons:
            lesson.is_completed = lesson.id in completed_lesson_ids
            # User can access lesson if:
            # 1. Lesson is free, OR
            # 2. User has full course access, OR  
            # 3. Course is not premium
            lesson.has_access = (
                lesson.is_free or 
                has_full_access or 
                not course.is_premium
            )
    else:
        for lesson in lessons:
            lesson.is_completed = False
            # Non-authenticated users can only access free lessons in any course
            lesson.has_access = lesson.is_free
    
    return lessons


@router.get("/{course_id}/next-lesson")
async def get_next_lesson(
    course_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get the next uncompleted lesson for a user in a course"""
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get all lessons for the course ordered by order_index
    lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).order_by(Lesson.order_index).all()
    
    if not current_user:
        # For unauthenticated users, return first free lesson
        for lesson in lessons:
            if lesson.is_free:
                return {"lesson_id": lesson.id, "is_first": True}
        return {"lesson_id": None, "message": "No accessible lessons"}
    
    # Get completed lessons for this user and course
    completed_lesson_ids = {
        progress.lesson_id for progress in 
        db.query(UserLessonProgress).filter(
            UserLessonProgress.user_id == current_user.id,
            UserLessonProgress.course_id == course_id,
            UserLessonProgress.completed == True
        ).all()
    }
    
    # Check if user has full access to the course
    has_full_access = check_course_access(current_user, course_id, db)
    
    # Find next uncompleted accessible lesson
    for lesson in lessons:
        # Check if lesson is accessible
        lesson_accessible = (
            lesson.is_free or 
            has_full_access or 
            not course.is_premium
        )
        
        if lesson_accessible and lesson.id not in completed_lesson_ids:
            return {
                "lesson_id": lesson.id, 
                "is_first": lesson.order_index == 1 if hasattr(lesson, 'order_index') else False
            }
    
    # All accessible lessons completed - return first lesson for repeat
    for lesson in lessons:
        lesson_accessible = (
            lesson.is_free or 
            has_full_access or 
            not course.is_premium
        )
        if lesson_accessible:
            return {
                "lesson_id": lesson.id, 
                "is_first": True,
                "all_completed": True
            }
    
    return {"lesson_id": None, "message": "No accessible lessons"}


@router.post("/", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new course (admin only)"""
    
    db_course = Course(**course_data.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    
    return db_course


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_update: CourseUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a course (admin only)"""
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Update course fields
    update_data = course_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)
    
    return course


@router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a course (admin only)"""
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    db.delete(course)
    db.commit()
    
    return {"message": "Course deleted successfully"}

