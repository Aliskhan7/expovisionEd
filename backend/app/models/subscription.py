from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_name = Column(String(100), nullable=False)  # "monthly", "yearly", etc.
    status = Column(String(50), nullable=False, default="active")  # active, cancelled, expired
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    payment_provider = Column(String(50), nullable=False, default="stripe")
    stripe_subscription_id = Column(String(255), nullable=True)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=False)
    auto_renew = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    payment_provider = Column(String(50), nullable=False, default="stripe")
    payment_intent_id = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False)  # pending, succeeded, failed, cancelled
    payment_type = Column(String(50), nullable=False)  # subscription, course_purchase
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")
    course = relationship("Course")


class CoursePurchase(Base):
    __tablename__ = "course_purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    price_paid = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    access_granted_at = Column(DateTime(timezone=True), server_default=func.now())
    access_expires_at = Column(DateTime(timezone=True), nullable=True)  # NULL for lifetime access
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="course_purchases")
    course = relationship("Course", back_populates="purchases")
    payment = relationship("Payment")

