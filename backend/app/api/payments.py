from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
# from app.models.subscription import Subscription, Payment, CoursePurchase
from app.models.course import Course
# from app.schemas.subscription import (
#     SubscriptionCreate, Subscription as SubscriptionSchema,
#     PaymentCreate, Payment as PaymentSchema,
#     CoursePurchaseCreate, CoursePurchase as CoursePurchaseSchema
# )
# from app.services.payment_service import PaymentService

router = APIRouter()
# payment_service = PaymentService()


# @router.post("/subscriptions", response_model=SubscriptionSchema)
# async def create_subscription(
#     subscription_data: SubscriptionCreate,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Create a new subscription"""
#     try:
#         subscription = await payment_service.create_subscription(
#             user_id=current_user.id,
#             subscription_data=subscription_data,
#             db=db
#         )
#         return subscription
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=f"Failed to create subscription: {str(e)}"
#         )


# Temporary health check endpoint  
@router.get("/health")
async def payments_health():
    """Payments service health check"""
    return {"status": "ok", "service": "payments"}


# @router.get("/subscriptions/current", response_model=SubscriptionSchema)
# async def get_current_subscription(
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Get current user's active subscription"""
#     subscription = db.query(Subscription).filter(
#         Subscription.user_id == current_user.id,
#         Subscription.status == "active"
#     ).first()
    
#     if not subscription:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="No active subscription found"
#         )
    
#     return subscription


# @router.post("/subscriptions/{subscription_id}/cancel")
# async def cancel_subscription(
#     subscription_id: int,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Cancel a subscription"""
#     subscription = db.query(Subscription).filter(
#         Subscription.id == subscription_id,
#         Subscription.user_id == current_user.id
#     ).first()
    
#     if not subscription:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Subscription not found"
#         )
    
#     try:
#         await payment_service.cancel_subscription(subscription, db)
#         return {"message": "Subscription cancelled successfully"}
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=f"Failed to cancel subscription: {str(e)}"
#         )


# @router.post("/courses/{course_id}/purchase", response_model=CoursePurchaseSchema)
# async def purchase_course(
#     course_id: int,
#     purchase_data: CoursePurchaseCreate,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Purchase a single course"""
#     # Check if course exists
#     course = db.query(Course).filter(Course.id == course_id).first()
#     if not course:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Course not found"
#         )
    
#     # Check if user already has access
#     existing_purchase = db.query(CoursePurchase).filter(
#         CoursePurchase.user_id == current_user.id,
#         CoursePurchase.course_id == course_id
#     ).first()
    
#     if existing_purchase:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Course already purchased"
#         )
    
#     try:
#         purchase = await payment_service.purchase_course(
#             user_id=current_user.id,
#             course_id=course_id,
#             purchase_data=purchase_data,
#             db=db
#         )
#         return purchase
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=f"Failed to purchase course: {str(e)}"
#         )


# @router.get("/payments", response_model=List[PaymentSchema])
# async def get_user_payments(
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Get user's payment history"""
#     payments = db.query(Payment).filter(
#         Payment.user_id == current_user.id
#     ).order_by(Payment.created_at.desc()).all()
    
#     return payments


# @router.get("/courses/purchased", response_model=List[CoursePurchaseSchema])
# async def get_purchased_courses(
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Get user's purchased courses"""
#     purchases = db.query(CoursePurchase).filter(
#         CoursePurchase.user_id == current_user.id
#     ).order_by(CoursePurchase.created_at.desc()).all()
    
#     return purchases


# @router.post("/webhooks/stripe")
# async def stripe_webhook(request: dict, db: Session = Depends(get_db)):
#     """Handle Stripe webhooks"""
#     try:
#         await payment_service.handle_stripe_webhook(request, db)
#         return {"status": "success"}
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=f"Webhook processing failed: {str(e)}"
#         )

