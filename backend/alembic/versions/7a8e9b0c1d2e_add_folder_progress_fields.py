"""add folder progress fields

Revision ID: 7a8e9b0c1d2e
Revises: 47e907d8b123
Create Date: 2026-04-24 03:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8e9b0c1d2e'
down_revision: Union[str, Sequence[str], None] = '47e907d8b123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('folders', sa.Column('total_files', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('folders', sa.Column('processed_files', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('folders', 'processed_files')
    op.drop_column('folders', 'total_files')
