"""
API Services package.
Contains business logic extracted from route handlers (TD-009).
"""
from .meal_service import (
    parse_made_status,
    find_or_create_dinner,
    update_dinner_feedback,
    update_daily_feedback,
    update_inventory_from_meal,
    auto_add_recipe_from_meal,
)

__all__ = [
    'parse_made_status',
    'find_or_create_dinner',
    'update_dinner_feedback',
    'update_daily_feedback',
    'update_inventory_from_meal',
    'auto_add_recipe_from_meal',
]
