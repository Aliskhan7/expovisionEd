"""
Migration script to add course_id and lesson_id fields to chat_messages table
Run this script to update the database schema for lesson-specific chat functionality
"""

import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def run_migration():
    """Run the migration to add course_id and lesson_id to chat_messages table"""
    
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Create a session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        print("🔄 Starting migration to add course_id and lesson_id to chat_messages...")
        
        # Check if columns already exist
        result = session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='chat_messages' 
            AND column_name IN ('course_id', 'lesson_id')
        """))
        
        existing_columns = [row[0] for row in result.fetchall()]
        
        # Add course_id column if it doesn't exist
        if 'course_id' not in existing_columns:
            print("Adding course_id column...")
            session.execute(text("""
                ALTER TABLE chat_messages 
                ADD COLUMN course_id INTEGER REFERENCES courses(id)
            """))
            print("✅ Added course_id column")
        else:
            print("ℹ️ course_id column already exists")
        
        # Add lesson_id column if it doesn't exist
        if 'lesson_id' not in existing_columns:
            print("Adding lesson_id column...")
            session.execute(text("""
                ALTER TABLE chat_messages 
                ADD COLUMN lesson_id INTEGER REFERENCES lessons(id)
            """))
            print("✅ Added lesson_id column")
        else:
            print("ℹ️ lesson_id column already exists")
        
        # Check if message_metadata column exists and rename it to metadata if needed
        result = session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='chat_messages' 
            AND column_name IN ('message_metadata', 'metadata')
        """))
        
        metadata_columns = [row[0] for row in result.fetchall()]
        
        if 'message_metadata' in metadata_columns and 'metadata' not in metadata_columns:
            print("Renaming message_metadata to metadata...")
            session.execute(text("""
                ALTER TABLE chat_messages 
                RENAME COLUMN message_metadata TO metadata
            """))
            print("✅ Renamed message_metadata to metadata")
        
        # Add indexes for better performance
        print("Adding indexes...")
        
        try:
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_messages_course_id 
                ON chat_messages(course_id)
            """))
            print("✅ Added index on course_id")
        except Exception as e:
            print(f"ℹ️ Index on course_id may already exist: {e}")
        
        try:
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_messages_lesson_id 
                ON chat_messages(lesson_id)
            """))
            print("✅ Added index on lesson_id")
        except Exception as e:
            print(f"ℹ️ Index on lesson_id may already exist: {e}")
        
        try:
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_messages_user_course 
                ON chat_messages(user_id, course_id)
            """))
            print("✅ Added composite index on user_id, course_id")
        except Exception as e:
            print(f"ℹ️ Composite index may already exist: {e}")
        
        # Commit all changes
        session.commit()
        print("🎉 Migration completed successfully!")
        
        # Show table structure
        print("\n📋 Current chat_messages table structure:")
        result = session.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name='chat_messages'
            ORDER BY ordinal_position
        """))
        
        for row in result.fetchall():
            nullable = "NULL" if row[2] == "YES" else "NOT NULL"
            default = f" DEFAULT {row[3]}" if row[3] else ""
            print(f"  {row[0]}: {row[1]} {nullable}{default}")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("Chat Messages Table Migration")
    print("=" * 40)
    
    try:
        run_migration()
    except Exception as e:
        print(f"\n❌ Migration failed with error: {e}")
        sys.exit(1)
    
    print("\n✅ All done! You can now use lesson-specific chat functionality.") 