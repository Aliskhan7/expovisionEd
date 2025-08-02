"""
Users API endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.models.user_course_progress import UserCourseProgress
from app.models.user_lesson_progress import UserLessonProgress
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.course import CourseProgress

router = APIRouter()


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    
    # Update user fields
    if user_update.name is not None:
        current_user.name = user_update.name
    
    if user_update.email is not None:
        # Check if email is already taken
        existing_user = db.query(User).filter(
            User.email == user_update.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/progress", response_model=List[CourseProgress])
async def get_user_progress(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's course progress"""
    
    progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.user_id == current_user.id
    ).all()
    
    return progress


@router.get("/courses")
async def get_user_courses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get courses accessible to the user"""
    from app.models.course import Course
    
    # Get all published courses
    courses = db.query(Course).filter(Course.is_published == True).all()
    
    # Filter based on user access
    accessible_courses = []
    for course in courses:
        # Free courses are accessible to everyone
        if not course.is_premium:
            accessible_courses.append(course)
        # Admin users have access to all courses
        elif current_user.role == "admin":
            accessible_courses.append(course)
        # Check subscription status
        elif current_user.subscription_status == "active":
            accessible_courses.append(course)
        # Check if user purchased this specific course
        else:
            progress = db.query(UserCourseProgress).filter(
                UserCourseProgress.user_id == current_user.id,
                UserCourseProgress.course_id == course.id
            ).first()
            if progress:
                accessible_courses.append(course)
    
    return accessible_courses


@router.get("/completed-lessons")
async def get_user_completed_lessons(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's completed lessons"""
    completed_lessons = db.query(UserLessonProgress).filter(
        UserLessonProgress.user_id == current_user.id,
        UserLessonProgress.completed == True
    ).all()
    
    return [
        {
            "lesson_id": lesson.lesson_id,
            "course_id": lesson.course_id,
            "completed_at": lesson.completed_at
        }
        for lesson in completed_lessons
    ]


@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's learning statistics"""
    from app.models.course import Course
    from app.models.lesson import Lesson
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    # Get all user's course progress
    user_progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.user_id == current_user.id
    ).all()
    
    # Calculate basic stats
    total_courses = len(user_progress)
    completed_courses = len([p for p in user_progress if p.completed_at is not None])
    in_progress_courses = total_courses - completed_courses
    
    # Calculate total watch time (sum of all progress percentages * course durations)
    total_watch_time_minutes = 0
    for progress in user_progress:
        course = db.query(Course).filter(Course.id == progress.course_id).first()
        if course and course.total_duration:
            watched_minutes = (float(progress.progress_percentage) / 100) * course.total_duration
            total_watch_time_minutes += watched_minutes
    
    # Calculate learning streak (simplified - count consecutive days with lesson progress)
    # For now, we'll use a mock value since calculating actual streak requires more complex logic
    learning_streak = 7  # Mock value
    
    # Get completed lessons for certificates calculation
    completed_lessons = db.query(UserLessonProgress).filter(
        UserLessonProgress.user_id == current_user.id,
        UserLessonProgress.completed == True
    ).count()
    
    # Calculate certificates (one certificate per completed course)
    certificates = completed_courses
    
    return {
        "total_courses": total_courses,
        "completed_courses": completed_courses,
        "in_progress_courses": in_progress_courses,
        "total_watch_time_minutes": int(total_watch_time_minutes),
        "learning_streak_days": learning_streak,
        "certificates": certificates,
        "completed_lessons": completed_lessons
    }


@router.get("/courses-with-progress")
async def get_user_courses_with_progress(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's courses with their progress (includes all accessible courses)"""
    from app.models.course import Course
    from app.models.lesson import Lesson
    
    # Get all accessible courses for the user
    courses = db.query(Course).filter(Course.is_published == True).all()
    
    # Filter based on user access
    accessible_courses = []
    for course in courses:
        # Free courses are accessible to everyone
        if not course.is_premium:
            accessible_courses.append(course)
        # Admin users have access to all courses
        elif current_user.role == "admin":
            accessible_courses.append(course)
        # Check subscription status
        elif current_user.subscription_status == "active":
            accessible_courses.append(course)
        # Check if user has individual access to this course (granted by admin)
        else:
            progress = db.query(UserCourseProgress).filter(
                UserCourseProgress.user_id == current_user.id,
                UserCourseProgress.course_id == course.id
            ).first()
            if progress:
                accessible_courses.append(course)
    
    # Get user's progress records
    progress_records = db.query(UserCourseProgress).filter(
        UserCourseProgress.user_id == current_user.id
    ).all()
    
    progress_dict = {p.course_id: p for p in progress_records}
    
    courses_with_progress = []
    for course in accessible_courses:
        progress = progress_dict.get(course.id)
        
        # Calculate total lessons for the course
        total_lessons = db.query(Lesson).filter(Lesson.course_id == course.id).count()
        
        if progress:
            # User has progress data
            courses_with_progress.append({
                "course": {
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "cover_image_url": course.cover_image_url,
                    "level": course.level,
                    "category": course.category,
                    "price": float(course.price) if course.price else None,
                    "is_premium": course.is_premium,
                    "is_published": course.is_published,
                    "access_type": course.access_type,
                    "total_duration": course.total_duration,
                    "total_lessons": course.total_lessons or total_lessons,
                    "instructor_name": course.instructor_name,
                    "created_at": course.created_at.isoformat() if course.created_at else None,
                    "updated_at": course.updated_at.isoformat() if course.updated_at else None
                },
                "completed_lessons": progress.completed_lessons,
                "total_lessons": progress.total_lessons,
                "progress_percentage": float(progress.progress_percentage),
                "last_watched_at": progress.updated_at.isoformat() if progress.updated_at else None,
                "is_completed": progress.completed_at is not None
            })
        else:
            # User has access but no progress yet (new course)
            courses_with_progress.append({
                "course": {
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "cover_image_url": course.cover_image_url,
                    "level": course.level,
                    "category": course.category,
                    "price": float(course.price) if course.price else None,
                    "is_premium": course.is_premium,
                    "is_published": course.is_published,
                    "access_type": course.access_type,
                    "total_duration": course.total_duration,
                    "total_lessons": course.total_lessons or total_lessons,
                    "instructor_name": course.instructor_name,
                    "created_at": course.created_at.isoformat() if course.created_at else None,
                    "updated_at": course.updated_at.isoformat() if course.updated_at else None
                },
                "completed_lessons": 0,
                "total_lessons": total_lessons,
                "progress_percentage": 0.0,
                "last_watched_at": None,
                "is_completed": False
            })
    
    # Sort by last activity (courses with recent activity first, then by creation date)
    courses_with_progress.sort(key=lambda x: (
        x["last_watched_at"] is None,  # Put courses with no activity last
        -(x["course"]["id"])  # Then by course ID descending (newer courses first)
    ))
    
    return courses_with_progress

