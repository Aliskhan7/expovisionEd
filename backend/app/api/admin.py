"""
Admin API endpoints
"""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_admin_user
from app.db.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.user_course_progress import UserCourseProgress
from app.schemas.user import UserResponse
from app.schemas.course import CourseResponse, CourseCreate, CourseUpdate
from app.schemas.lesson import LessonResponse, LessonCreate, LessonUpdate

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/courses", response_model=List[CourseResponse])
async def get_all_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    include_unpublished: bool = Query(True),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all courses including unpublished (admin only)"""
    
    query = db.query(Course)
    if not include_unpublished:
        query = query.filter(Course.is_published == True)
    
    courses = query.offset(skip).limit(limit).all()
    return courses


@router.put("/courses/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_update: CourseUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update course (admin only)"""
    
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


@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete course (admin only)"""
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Delete related lessons first
    db.query(Lesson).filter(Lesson.course_id == course_id).delete()
    
    # Delete course progress records
    db.query(UserCourseProgress).filter(UserCourseProgress.course_id == course_id).delete()
    
    # Delete the course
    db.delete(course)
    db.commit()
    
    return {"message": "Course deleted successfully"}


# Lesson management endpoints
@router.post("/lessons", response_model=LessonResponse)
async def create_lesson(
    lesson_create: LessonCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create new lesson (admin only)"""
    
    # Verify course exists
    course = db.query(Course).filter(Course.id == lesson_create.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    lesson = Lesson(**lesson_create.dict())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.put("/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    lesson_update: LessonUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update lesson (admin only)"""
    
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


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete lesson (admin only)"""
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    db.delete(lesson)
    db.commit()
    
    return {"message": "Lesson deleted successfully"}


@router.get("/stats")
async def get_platform_stats(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get platform statistics (admin only)"""
    
    total_users = db.query(User).count()
    total_courses = db.query(Course).count()
    published_courses = db.query(Course).filter(Course.is_published == True).count()
    total_lessons = db.query(Lesson).count()
    
    active_subscriptions = db.query(User).filter(
        User.subscription_status == "active"
    ).count()
    
    completed_courses = db.query(UserCourseProgress).filter(
        UserCourseProgress.completed_at.isnot(None)
    ).count()
    
    return {
        "total_users": total_users,
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_lessons": total_lessons,
        "active_subscriptions": active_subscriptions,
        "completed_courses": completed_courses
    }


@router.put("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: int,
    subscription_status: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update user subscription status (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.subscription_status = subscription_status
    
    if subscription_status == "active":
        from datetime import datetime, timedelta
        user.subscription_expiry = datetime.utcnow() + timedelta(days=30)
    else:
        user.subscription_expiry = None
    
    db.commit()
    db.refresh(user)
    
    return {"message": "Subscription updated successfully", "user": user}


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update user role (admin only)"""
    
    if role not in ["student", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'student' or 'admin'"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.role = role
    db.commit()
    db.refresh(user)
    
    return {"message": "User role updated successfully", "user": user}


# Course Access Management
@router.post("/grant-course-access")
async def grant_course_access(
    user_id: int,
    course_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Grant user access to a premium course (admin only)"""
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if user already has access
    existing_progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.user_id == user_id,
        UserCourseProgress.course_id == course_id
    ).first()
    
    if existing_progress:
        return {"message": "User already has access to this course", "access_granted": False}
    
    # Create course progress record to grant access
    from app.models.lesson import Lesson
    total_lessons = db.query(Lesson).filter(Lesson.course_id == course_id).count()
    
    progress = UserCourseProgress(
        user_id=user_id,
        course_id=course_id,
        total_lessons=total_lessons,
        completed_lessons=0,
        progress_percentage=0
    )
    
    db.add(progress)
    db.commit()
    db.refresh(progress)
    
    return {
        "message": "Course access granted successfully", 
        "access_granted": True,
        "user_email": user.email,
        "course_title": course.title
    }


@router.delete("/revoke-course-access")
async def revoke_course_access(
    user_id: int,
    course_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Revoke user access to a premium course (admin only)"""
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Find and delete course progress record
    progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.user_id == user_id,
        UserCourseProgress.course_id == course_id
    ).first()
    
    if not progress:
        return {"message": "User does not have access to this course", "access_revoked": False}
    
    # Also remove lesson progress
    from app.models.user_lesson_progress import UserLessonProgress
    lesson_progress = db.query(UserLessonProgress).filter(
        UserLessonProgress.user_id == user_id,
        UserLessonProgress.course_id == course_id
    ).all()
    
    for lp in lesson_progress:
        db.delete(lp)
    
    db.delete(progress)
    db.commit()
    
    return {
        "message": "Course access revoked successfully", 
        "access_revoked": True,
        "user_email": user.email,
        "course_title": course.title
    }


@router.get("/course-access/{course_id}")
async def get_course_access_list(
    course_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get list of users who have access to a specific course (admin only)"""
    
    # Verify course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get users with course access
    progress_records = db.query(UserCourseProgress).filter(
        UserCourseProgress.course_id == course_id
    ).all()
    
    users_with_access = []
    for progress in progress_records:
        user = db.query(User).filter(User.id == progress.user_id).first()
        if user:
            users_with_access.append({
                "user_id": user.id,
                "email": user.email,
                "full_name": user.name,
                "progress_percentage": float(progress.progress_percentage),
                "completed_lessons": progress.completed_lessons,
                "total_lessons": progress.total_lessons,
                "granted_at": progress.created_at
            })
    
    return {
        "course_title": course.title,
        "course_id": course_id,
        "total_users_with_access": len(users_with_access),
        "users": users_with_access
    }


@router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin panel"""
    from sqlalchemy import func
    
    try:
        # Count total users
        total_users = db.query(User).count()
        
        # Count total courses
        total_courses = db.query(Course).count()
        
        # Count active subscriptions (if you have subscription table)
        # For now, count users with active subscription status
        active_subscriptions = db.query(User).filter(
            User.subscription_status == 'active'
        ).count()
        
        # Calculate total revenue (mock calculation based on course prices)
        # In real app, you'd have a payments/orders table
        total_revenue = 0
        premium_courses = db.query(Course).filter(
            Course.is_premium == True,
            Course.price.isnot(None)
        ).all()
        
        # Simple revenue calculation: sum of all premium course prices * some factor
        for course in premium_courses:
            if course.price:
                # Assume each course sold 10 times on average (mock calculation)
                total_revenue += course.price * 10
        
        # Get recent courses (last 5, ordered by creation date)
        recent_courses = db.query(Course).order_by(Course.created_at.desc()).limit(5).all()
        
        recent_courses_data = []
        for course in recent_courses:
            # Calculate days since creation  
            days_ago = (datetime.utcnow() - course.created_at.replace(tzinfo=None)).days
            if days_ago == 0:
                time_text = "Сегодня"
            elif days_ago == 1:
                time_text = "Вчера"
            elif days_ago < 7:
                time_text = f"{days_ago} дня назад" if days_ago < 5 else f"{days_ago} дней назад"
            elif days_ago < 30:
                weeks = days_ago // 7
                time_text = f"{weeks} неделю назад" if weeks == 1 else f"{weeks} недели назад"
            else:
                months = days_ago // 30
                time_text = f"{months} месяц назад" if months == 1 else f"{months} месяца назад"
            
            recent_courses_data.append({
                "id": course.id,
                "title": course.title,
                "is_published": course.is_published,
                "created_at": course.created_at.isoformat(),
                "time_ago": time_text
            })
        
        return {
            "total_users": total_users,
            "total_courses": total_courses,
            "total_revenue": total_revenue,
            "active_subscriptions": active_subscriptions,
            "recent_courses": recent_courses_data,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}"
        )

