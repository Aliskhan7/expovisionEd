"""
Simple script to show the SQL commands needed for lesson chat migration
"""

def show_migration_sql():
    """Show the SQL commands needed for the migration"""
    
    print("🔄 SQL Commands for Lesson Chat Migration")
    print("=" * 50)
    
    print("\n1. Add course_id column to chat_messages:")
    print("ALTER TABLE chat_messages ADD COLUMN course_id INTEGER REFERENCES courses(id);")
    
    print("\n2. Add lesson_id column to chat_messages:")
    print("ALTER TABLE chat_messages ADD COLUMN lesson_id INTEGER REFERENCES lessons(id);")
    
    print("\n3. Rename message_metadata to metadata (if needed):")
    print("ALTER TABLE chat_messages RENAME COLUMN message_metadata TO metadata;")
    
    print("\n4. Add indexes for performance:")
    print("CREATE INDEX idx_chat_messages_course_id ON chat_messages(course_id);")
    print("CREATE INDEX idx_chat_messages_lesson_id ON chat_messages(lesson_id);")
    print("CREATE INDEX idx_chat_messages_user_course ON chat_messages(user_id, course_id);")
    
    print("\n✅ Migration SQL commands shown above.")
    print("\nTo apply these changes:")
    print("1. Connect to your database")
    print("2. Run each SQL command in order")
    print("3. Verify the changes by checking the table structure")
    
    print("\nExpected final table structure:")
    print("chat_messages:")
    print("  - id: INTEGER PRIMARY KEY")
    print("  - user_id: INTEGER NOT NULL (FK to users)")
    print("  - course_id: INTEGER (FK to courses)")
    print("  - lesson_id: INTEGER (FK to lessons)")
    print("  - thread_id: VARCHAR(255) NOT NULL")
    print("  - sender: VARCHAR(20) NOT NULL")
    print("  - content: TEXT NOT NULL")
    print("  - metadata: JSON")
    print("  - created_at: TIMESTAMP")

if __name__ == "__main__":
    show_migration_sql() 