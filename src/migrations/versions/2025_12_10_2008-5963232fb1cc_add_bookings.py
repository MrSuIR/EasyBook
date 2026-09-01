"""add bookings

Revision ID: 5963232fb1cc
Revises: 578269213921
Create Date: 2025-12-10 20:08:37.291327

"""

from typing import Sequence, Union


revision: str = "5963232fb1cc"
down_revision: Union[str, None] = "578269213921"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
