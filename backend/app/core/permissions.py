# Central Permissions Registry for Al-Masalla Coptic Church System
from typing import Set

ALL_PERMISSIONS: Set[str] = {
    # Users & Permissions
    "users:read",
    "users:write",
    "users:delete",
    "users:permissions",

    # System Settings & Stages
    "settings:read",
    "settings:write",
    "stages:manage",

    # Members Registry
    "members:read",
    "members:write",
    "members:archive",

    # Cards & QR System
    "cards:issue",
    "cards:revoke",

    # Events & Activities
    "events:read",
    "events:write",
    "events:delete",

    # Attendance & Scanning
    "attendance:session",
    "attendance:scan",
    "attendance:cancel",
    "devices:manage",

    # Follow-Up & Absence Tracking
    "followup:read",
    "followup:write",
    "followup:manage",

    # Rewards & Trip Discounts
    "rewards:read",
    "rewards:manage",
    "discounts:manage",

    # Birthdays & Gift Tracking
    "birthdays:read",
    "birthdays:gift",

    # Analytics & Multi-Format Reports
    "reports:read",
    "reports:export",
    "audit:read",

    # Internal Messaging & Communication Center
    "messages:send",
    "messages:manage"
}


def is_valid_permission(perm: str) -> bool:
    return perm in ALL_PERMISSIONS
