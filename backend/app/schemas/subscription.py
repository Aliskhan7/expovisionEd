from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SubscriptionBase(BaseModel):
    plan_name: str
    amount: float
    currency: str = "USD"
    auto_renew: bool = True


class SubscriptionCreate(SubscriptionBase):
    payment_method_id: str  # Stripe payment method ID


class SubscriptionUpdate(BaseModel):
    auto_renew: Optional[bool] = None
    status: Optional[str] = None


class Subscription(SubscriptionBase):
    id: int
    user_id: int
    status: str
    payment_provider: str
    stripe_subscription_id: Optional[str]
    start_date: datetime
    end_date: datetime
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PaymentBase(BaseModel):
    amount: float
    currency: str = "USD"
    payment_type: str  # subscription, course_purchase


class PaymentCreate(PaymentBase):
    course_id: Optional[int] = None
    payment_method_id: str


class Payment(PaymentBase):
    id: int
    user_id: int
    subscription_id: Optional[int]
    course_id: Optional[int]
    payment_provider: str
    payment_intent_id: Optional[str]
    status: str
    metadata_json: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CoursePurchaseBase(BaseModel):
    course_id: int
    price_paid: float
    currency: str = "USD"


class CoursePurchaseCreate(CoursePurchaseBase):
    payment_method_id: str


class CoursePurchase(CoursePurchaseBase):
    id: int
    user_id: int
    payment_id: int
    access_granted_at: datetime
    access_expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

