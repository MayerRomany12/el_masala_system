from typing import Optional, List, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.rewards.repository import RewardsRepository
from app.members.repository import MemberRepository
from app.events.repository import EventRepository
from app.models.event import EventRegistration
from app.rewards.schemas import (
    PointsAwardRequest,
    PointsRedeemRequest,
    DiscountCalculationResponse
)
from app.core.errors import NotFoundException, BadRequestException


class RewardsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = RewardsRepository(db)
        self.member_repo = MemberRepository(db)
        self.event_repo = EventRepository(db)

    async def calculate_trip_discount(self, member_id: str, event_id: str) -> Dict[str, Any]:
        member = await self.member_repo.get_by_member_id(member_id)
        if not member:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")

        event = await self.event_repo.get_event_by_id(event_id)
        if not event:
            raise NotFoundException(f"الفعالية/الرحلة برقم {event_id} غير موجودة")

        # Dynamic settings lookup
        from app.settings.repository import SettingsRepository
        settings_repo = SettingsRepository(self.db)
        disc_high = float(await settings_repo.get_setting_value("discount_high_pct", "30.0"))
        disc_medium = float(await settings_repo.get_setting_value("discount_medium_pct", "15.0"))
        redemption_rate = float(await settings_repo.get_setting_value("points_redemption_rate", "0.25"))

        event_fee = float(event["fee"] or 0.0)
        pct, present_c, total_c = await self.repo.calculate_member_attendance_percentage(
            member_id=member_id, member_stage=member["stage"], last_n_sessions=8
        )

        # Financial Discount Rules (Dynamic & Fixed at Registration Time)
        disc_pct = 0.0
        if pct >= 90.0:
            disc_pct = disc_high
        elif pct >= 75.0:
            disc_pct = disc_medium

        attendance_disc_amount = round(event_fee * (disc_pct / 100.0), 2)
        available_pts = int(member.get("total_points", 0))

        # Points Conversion Rate from Dynamic Settings
        max_pts_disc_amount = round(min(event_fee - attendance_disc_amount, available_pts * redemption_rate), 2)
        final_amount_due = max(0.0, event_fee - attendance_disc_amount)

        return {
            "member_id": member_id,
            "member_name": member["full_name"],
            "event_id": event_id,
            "event_title": event["title"],
            "event_fee": event_fee,
            "attendance_percentage": pct,
            "attendance_discount_pct": disc_pct,
            "attendance_discount_amount": attendance_disc_amount,
            "available_points": available_pts,
            "max_points_discount_amount": max_pts_disc_amount,
            "final_amount_due": final_amount_due
        }

    async def award_points(self, data: PointsAwardRequest, created_by: str) -> Dict[str, Any]:
        return await self.repo.record_transaction(
            member_id=data.member_id,
            points=data.points,
            type_str="Bonus",
            reason=data.reason,
            created_by=created_by
        )

    async def award_attendance_points(self, member_id: str, session_id: str) -> Dict[str, Any]:
        """منح آلي للنقاط عند تسجيل الحضور في M5 بقيمة ديناميكية"""
        from app.settings.repository import SettingsRepository
        settings_repo = SettingsRepository(self.db)
        pts_str = await settings_repo.get_setting_value("attendance_points", "10")
        pts = int(pts_str)

        return await self.repo.record_transaction(
            member_id=member_id,
            points=pts,
            type_str="Earned",
            session_id=session_id,
            reason="حضور اجتماع الأحد ⛪"
        )

    async def redeem_points_for_event(self, data: PointsRedeemRequest, created_by: str) -> Dict[str, Any]:
        member = await self.member_repo.get_by_member_id(data.member_id)
        if not member:
            raise NotFoundException(f"المخدوم برقم العضوية {data.member_id} غير موجود")

        event = await self.event_repo.get_event_by_id(data.event_id)
        if not event:
            raise NotFoundException(f"الفعالية/الرحلة برقم {data.event_id} غير موجودة")

        pts = data.points_to_redeem
        discount_value = round(pts * 0.25, 2)

        # 1. Record Ledger Entry (-PTS) with event_id
        txn = await self.repo.record_transaction(
            member_id=data.member_id,
            points=-pts,
            type_str="Redeemed",
            event_id=data.event_id,
            reason=f"خصم {discount_value} جنيه من اشتراك رحلة ({event['title']})",
            created_by=created_by
        )

        # 2. Update EventRegistration if member is registered
        reg = await self.event_repo.get_registration_by_event_and_member(data.event_id, data.member_id)
        if reg:
            reg_id = reg["registration_id"]
            new_pts_disc = float(reg.get("points_discount_amount", 0.0) or 0.0) + discount_value
            event_fee = float(event["fee"])
            att_disc = float(reg.get("attendance_discount_amount", 0.0) or 0.0)

            new_amount_due = max(0.0, event_fee - att_disc - new_pts_disc)
            amount_paid = float(reg["amount_paid"])
            new_status = "Paid" if amount_paid >= new_amount_due else ("Partial" if amount_paid > 0 else "Unpaid")

            await self.db.execute(
                update(EventRegistration)
                .where(EventRegistration.registration_id == reg_id)
                .values(
                    points_discount_amount=new_pts_disc,
                    amount_due=new_amount_due,
                    payment_status=new_status
                )
            )
            await self.db.flush()

        return txn

    async def get_member_points_ledger(self, member_id: str) -> List[Dict[str, Any]]:
        return await self.repo.get_member_points_ledger(member_id)

    async def get_leaderboard(self, stage: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.repo.get_leaderboard(stage=stage, limit=limit)
