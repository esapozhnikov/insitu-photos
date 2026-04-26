"""add media_type to photos

Revision ID: dad8490912c4
Revises: 8b9c0d1e2f3a
Create Date: 2026-04-25 19:27:42.190269

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dad8490912c4'
down_revision: Union[str, Sequence[str], None] = '8b9c0d1e2f3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the Enum type
    media_type_enum = sa.Enum('photo', 'video', name='mediatype')
    media_type_enum.create(op.get_bind(), checkfirst=True)
    
    op.add_column('photos', sa.Column('media_type', sa.Enum('photo', 'video', name='mediatype'), nullable=True))
    op.execute("UPDATE photos SET media_type = 'photo'")
    op.alter_column('photos', 'media_type', nullable=False, server_default='photo')
    op.create_index(op.f('ix_photos_media_type'), 'photos', ['media_type'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_photos_media_type'), table_name='photos')
    op.drop_column('photos', 'media_type')
    op.execute("DROP TYPE mediatype")
