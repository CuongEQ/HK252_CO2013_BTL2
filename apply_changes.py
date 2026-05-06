#!/usr/bin/env python3
"""
Script to drop and recreate the database with all changes:
- Drop existing database
- Create tables
- Create functions
- Create procedures
- Create triggers
"""

import mysql.connector
import json
import sys
from pathlib import Path
import re

def load_config():
    """Load database configuration from config.json"""
    config_path = Path(__file__).parent / "config.json"
    with open(config_path, 'r') as f:
        return json.load(f)

def parse_sql_file(filename):
    """Parse SQL file and return list of statements, handling DELIMITER changes"""
    sql_path = Path(__file__).parent / "database" / filename
    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    statements = []
    lines = content.split('\n')
    
    current_delimiter = ';'
    current_statement = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Check if line changes delimiter
        if stripped.upper().startswith('DELIMITER'):
            # If we have a statement being built, don't include DELIMITER in it
            # Extract new delimiter
            parts = stripped.split()
            if len(parts) > 1:
                current_delimiter = parts[1]
            i += 1
            continue
        
        # Skip empty lines and comments
        if not stripped or stripped.startswith('--') or stripped.startswith('/*'):
            i += 1
            continue
        
        # Add line to current statement
        current_statement.append(line)
        
        # Check if this line ends with the current delimiter
        if stripped.rstrip().endswith(current_delimiter):
            # Found end of statement
            statement_text = '\n'.join(current_statement).strip()
            
            # Remove the delimiter from end
            if statement_text.endswith(current_delimiter):
                # For multi-character delimiters
                if len(current_delimiter) > 1:
                    if statement_text.rstrip().endswith(current_delimiter):
                        statement_text = statement_text.rstrip()[:-len(current_delimiter)].rstrip()
                else:
                    # For single character, be more careful
                    # Check if it's actually the delimiter or part of the code
                    if statement_text.rstrip()[-1] == current_delimiter:
                        statement_text = statement_text.rstrip()[:-1].rstrip()
            
            if statement_text:
                statements.append(statement_text)
            
            current_statement = []
        
        i += 1
    
    # Add any remaining statement
    if current_statement:
        statement_text = '\n'.join(current_statement).strip()
        if statement_text:
            statements.append(statement_text)
    
    return statements

def execute_sql_file(connection, filename):
    """Execute SQL file"""
    statements = parse_sql_file(filename)
    cursor = connection.cursor()
    
    print(f"✓ Executing {filename} ({len(statements)} statements)...")
    
    for i, statement in enumerate(statements):
        if statement.strip():
            try:
                cursor.execute(statement)
                while cursor.nextset():
                    pass
                connection.commit()
                # Print progress for first few and last few
                if i < 3 or i >= len(statements) - 3:
                    stmt_preview = statement[:60].replace('\n', ' ')
                    print(f"  [{i+1}/{len(statements)}] {stmt_preview}...")
                elif i == 3:
                    print(f"  ... ({len(statements)-6} more statements) ...")
            except mysql.connector.Error as err:
                print(f"  Error at statement {i+1}: {err}")
                print(f"  Statement: {statement[:100]}")
                raise
    
    cursor.close()
    print(f"✓ {filename} completed successfully")

def main():
    try:
        print("=" * 80)
        print("DATABASE RESET AND APPLY CHANGES")
        print("=" * 80)
        
        # Load configuration
        config = load_config()
        
        # Connect without specifying database (to drop it)
        print("\nConnecting to MySQL server...")
        conn = mysql.connector.connect(
            host=config['host'],
            port=config['port'],
            user=config['user'],
            password=config['password'],
            autocommit=False
        )
        
        print("✓ Connected to MySQL server")
        
        # Execute Init.sql (which includes DROP and CREATE DATABASE)
        print("\nApplying database schema changes...")
        execute_sql_file(conn, "Init.sql")
        
        conn.close()
        print("✓ Database tables created successfully")
        
        # Reconnect to the new database
        conn = mysql.connector.connect(
            host=config['host'],
            port=config['port'],
            user=config['user'],
            password=config['password'],
            database=config['database'],
            autocommit=False
        )
        
        # Execute all other SQL files containing procedures, functions, triggers
        print("\nCreating domain procedures, functions and triggers...")
        sql_files = sorted([f.name for f in Path(__file__).parent.joinpath("database").glob("*.sql")])
        excluded = ["Init.sql", "Procedure.sql", "Trigger.sql"]
        for f in sql_files:
            if f not in excluded:
                execute_sql_file(conn, f)
        print("✓ Domain logic created successfully")
        
        conn.close()
        
        print("\n" + "=" * 80)
        print("✓ ALL DATABASE CHANGES APPLIED SUCCESSFULLY!")
        print("=" * 80)
        return 0
        
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())



