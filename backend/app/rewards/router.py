from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.rewards.schemas import (
    PointsAwardRequest,
    PointsRedeemRequest,
    DiscountCalculationResponse
)
from app.rewards.service import RewardsService
from app.shared.response import success_response

router = APIRouter(prefix="/rewards", tags=["Rewards, Point System & Activity Discounts"])


@router.get("/members/{member_id}/points", response_model=dict)
async def get_member_points_and_ledger(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("rewards:manage"))
):
    service = RewardsService(db)
    member = await service.member_repo.get_by_member_id(member_id)
    if not member:
        return success_response(data={"total_points": 0, "ledger": []}, message="المخدوم غير موجود")

    ledger = await service.get_member_points_ledger(member_id)
    return success_response(
        data={
            "member_id": member_id,
            "member_name": member["full_name"],
            "total_points": member.get("total_points", 0),
            "ledger": ledger
        },
        message="تم جلب دفتر حسابات النقاط بنجاح"
    )


@router.post("/award", response_model=dict, status_code=status.HTTP_201_CREATED)
async def award_points(
    award_in: PointsAwardRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("rewards:manage"))
):
    service = RewardsService(db)
    txn = await service.award_points(award_in, current_user.get("user_id"))
    return success_response(data=txn, message=f"تم منح {award_in.points} نقطة تشجيعية بنجاح 🎉")


@router.post("/redeem", response_model=dict, status_code=status.HTTP_201_CREATED)
async def redeem_points(
    redeem_in: PointsRedeemRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("rewards:manage"))
):
    service = RewardsService(db)
    txn = await service.redeem_points_for_event(redeem_in, current_user.get("user_id"))
    return success_response(data=txn, message=f"تم استبدال {redeem_in.points_to_redeem} نقطة بخصم مالي بنجاح 💳")


@router.get("/calculate-discount", response_model=dict)
async def calculate_trip_discount(
    member_id: str = Query(..., description="رمز العضوية K-XXXXXX"),
    event_id: str = Query(..., description="رمز الفعالية EVT-XXXXXX"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("rewards:manage"))
):
    service = RewardsService(db)
    result = await service.calculate_trip_discount(member_id=member_id, event_id=event_id)
    return success_response(data=result, message="تم حساب خصم الحضور والخصم المالي المستحق بنجاح")


@router.get("/leaderboard", response_model=dict)
async def get_rewards_leaderboard(
    stage: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("rewards:manage"))
):
    service = RewardsService(db)
    leaderboard = await service.get_leaderboard(stage=stage, limit=limit)
    return success_response(data=leaderboard, message="تم جلب قائمة متميزي الحضور والنقاط بنجاح")
