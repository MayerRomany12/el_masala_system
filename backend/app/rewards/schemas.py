from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TransactionTypeEnum:
    EARNED = "Earned"
    REDEEMED = "Redeemed"
    BONUS = "Bonus"


# ─── Points Transactions & Redemption Schemas ─────────────────────────────────

class PointsAwardRequest(BaseModel):
    member_id: str = Field(..., description="رمز العضوية K-XXXXXX")
    points: int = Field(..., gt=0, description="عدد النقاط الممنوحة")
    reason: str = Field(..., min_length=2, description="سبب منح النقاط")


class PointsRedeemRequest(BaseModel):
    member_id: str = Field(..., description="رمز العضوية K-XXXXXX")
    event_id: str = Field(..., description="رمز الفعالية / الرحلة المربوطة")
    points_to_redeem: int = Field(..., gt=0, description="عدد النقاط المطلوبة للاستبدال (مثال: 100 نقطة = 25 جم خصم)")


class PointsTransactionResponse(BaseModel):
    transaction_id: str
    member_id: str
    member_name: Optional[str] = None
    points: int
    type: str # Earned, Redeemed, Bonus
    event_id: Optional[str] = None
    session_id: Optional[str] = None
    reason: str
    created_by_name: Optional[str] = None
    created_at: datetime


# ─── Discount Calculator Schemas ─────────────────────────────────────────────

class DiscountCalculationRequest(BaseModel):
    member_id: str
    event_id: str


class DiscountCalculationResponse(BaseModel):
    member_id: str
    member_name: str
    event_id: str
    event_title: str
    event_fee: float
    attendance_percentage: float
    attendance_discount_pct: float # 30.0, 15.0, or 0.0
    attendance_discount_amount: float
    available_points: int
    max_points_discount_amount: float
    final_amount_due: float


class LeaderboardItemResponse(BaseModel):
    rank: int
    member_id: str
    full_name: str
    stage: str
    total_points: int
    attendance_percentage: float
