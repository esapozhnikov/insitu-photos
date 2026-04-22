"""add is_face_scanned to photo

Revision ID: 47e907d8b123
Revises: 244fc7b30154
Create Date: 2026-04-21 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '47e907d8b123'
down_revision: Union[str, Sequence[str], None] = '244fc7b30154'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add column as nullable initially
    op.add_column('photos', sa.Column('is_face_scanned', sa.Boolean(), nullable=True))
    op.create_index(op.f('ix_photos_is_face_scanned'), 'photos', ['is_face_scanned'], unique=False)
    
    # 2. Backfill: Set is_face_scanned=True for photos that already have faces
    op.execute("""
        UPDATE photos 
        SET is_face_scanned = True 
        WHERE id IN (SELECT DISTINCT photo_id FROM faces)
    """)
    
    # 3. Set default False for the rest
    op.execute("UPDATE photos SET is_face_scanned = False WHERE is_face_scanned IS NULL")
    
    # 4. Make column non-nullable with server default
    op.alter_column('photos', 'is_face_scanned',
               existing_type=sa.Boolean(),
               nullable=False,
               server_default=sa.text('false'))


def downgrade() -> None:
    op.drop_index(op.f('ix_photos_is_face_scanned'), table_name='photos')
    op.drop_column('photos', 'is_face_scanned')
