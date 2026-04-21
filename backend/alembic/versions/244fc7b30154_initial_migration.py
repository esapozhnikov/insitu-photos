"""Initial migration

Revision ID: 244fc7b30154
Revises: 
Create Date: 2026-04-19 03:08:56.668728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "244fc7b30154"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create folders table
    op.create_table(
        "folders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("path", sa.String(), nullable=True),
        sa.Column("is_monitored", sa.Boolean(), nullable=True),
        sa.Column("last_scanned_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("scan_error", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_folders_id"), "folders", ["id"], unique=False)
    op.create_index(op.f("ix_folders_path"), "folders", ["path"], unique=True)

    # Create photos table
    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("physical_path", sa.String(), nullable=True),
        sa.Column("checksum", sa.String(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("gps_lat", sa.Float(), nullable=True),
        sa.Column("gps_long", sa.Float(), nullable=True),
        sa.Column("manual_lat_override", sa.Float(), nullable=True),
        sa.Column("manual_long_override", sa.Float(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("camera_make", sa.String(), nullable=True),
        sa.Column("camera_model", sa.String(), nullable=True),
        sa.Column("lens", sa.String(), nullable=True),
        sa.Column("shutter_speed", sa.String(), nullable=True),
        sa.Column("aperture", sa.Float(), nullable=True),
        sa.Column("iso", sa.Integer(), nullable=True),
        sa.Column("thumbnail_small", sa.String(), nullable=True),
        sa.Column("thumbnail_large", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_photos_checksum"), "photos", ["checksum"], unique=False)
    op.create_index(op.f("ix_photos_id"), "photos", ["id"], unique=False)
    op.create_index(op.f("ix_photos_physical_path"), "photos", ["physical_path"], unique=True)
    op.create_index(op.f("ix_photos_timestamp"), "photos", ["timestamp"], unique=False)

    # Create albums table
    op.create_table(
        "albums",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("is_smart_sync", sa.Boolean(), nullable=True),
        sa.Column("linked_folder_id", sa.Integer(), nullable=True),
        sa.Column("cover_photo_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["cover_photo_id"], ["photos.id"]),
        sa.ForeignKeyConstraint(["linked_folder_id"], ["folders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_albums_id"), "albums", ["id"], unique=False)
    op.create_index(op.f("ix_albums_name"), "albums", ["name"], unique=False)

    # Create people table
    op.create_table(
        "people",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("thumbnail_photo_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["thumbnail_photo_id"], ["photos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_people_id"), "people", ["id"], unique=False)
    op.create_index(op.f("ix_people_name"), "people", ["name"], unique=False)

    # Create faces table
    op.create_table(
        "faces",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("photo_id", sa.Integer(), nullable=True),
        sa.Column("person_id", sa.Integer(), nullable=True),
        sa.Column("bounding_box", sa.JSON(), nullable=True),
        sa.Column("thumbnail_path", sa.String(), nullable=True),
        sa.Column("embedding", Vector(512), nullable=True),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"]),
        sa.ForeignKeyConstraint(["photo_id"], ["photos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_faces_id"), "faces", ["id"], unique=False)
    op.create_index(op.f("ix_faces_person_id"), "faces", ["person_id"], unique=False)
    op.create_index(op.f("ix_faces_photo_id"), "faces", ["photo_id"], unique=False)

    # Create tags table
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tags_id"), "tags", ["id"], unique=False)
    op.create_index(op.f("ix_tags_name"), "tags", ["name"], unique=True)

    # Create settings table
    op.create_table(
        "settings",
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index(op.f("ix_settings_key"), "settings", ["key"], unique=False)

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("hashed_password", sa.String(), nullable=True),
        sa.Column("role", sa.Enum("ADMIN", "USER", "VIEWER", name="userrole"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    # Many-to-Many join tables
    op.create_table(
        "album_photos",
        sa.Column("album_id", sa.Integer(), nullable=False),
        sa.Column("photo_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["album_id"], ["albums.id"]),
        sa.ForeignKeyConstraint(["photo_id"], ["photos.id"]),
        sa.PrimaryKeyConstraint("album_id", "photo_id"),
    )
    op.create_table(
        "photo_tags",
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.Column("photo_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["photo_id"], ["photos.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
        sa.PrimaryKeyConstraint("tag_id", "photo_id"),
    )
    op.create_table(
        "album_tags",
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.Column("album_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["album_id"], ["albums.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
        sa.PrimaryKeyConstraint("tag_id", "album_id"),
    )


def downgrade() -> None:
    op.drop_table("album_tags")
    op.drop_table("photo_tags")
    op.drop_table("album_photos")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_settings_key"), table_name="settings")
    op.drop_table("settings")
    op.drop_index(op.f("ix_tags_name"), table_name="tags")
    op.drop_index(op.f("ix_tags_id"), table_name="tags")
    op.drop_table("tags")
    op.drop_index(op.f("ix_faces_photo_id"), table_name="faces")
    op.drop_index(op.f("ix_faces_person_id"), table_name="faces")
    op.drop_index(op.f("ix_faces_id"), table_name="faces")
    op.drop_table("faces")
    op.drop_index(op.f("ix_people_name"), table_name="people")
    op.drop_index(op.f("ix_people_id"), table_name="people")
    op.drop_table("people")
    op.drop_index(op.f("ix_albums_name"), table_name="albums")
    op.drop_index(op.f("ix_albums_id"), table_name="albums")
    op.drop_table("albums")
    op.drop_index(op.f("ix_photos_timestamp"), table_name="photos")
    op.drop_index(op.f("ix_photos_physical_path"), table_name="photos")
    op.drop_index(op.f("ix_photos_id"), table_name="photos")
    op.drop_index(op.f("ix_photos_checksum"), table_name="photos")
    op.drop_table("photos")
    op.drop_index(op.f("ix_folders_path"), table_name="folders")
    op.drop_index(op.f("ix_folders_id"), table_name="folders")
    op.drop_table("folders")
    op.execute("DROP EXTENSION vector")
