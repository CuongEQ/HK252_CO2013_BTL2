#!/usr/bin/env python3
"""
Script to seed data into the database from CSV files
"""

import mysql.connector
import csv
import json
import sys
from pathlib import Path
from collections import defaultdict

def load_config():
    """Load database configuration from config.json"""
    config_path = Path(__file__).parent / "config.json"
    with open(config_path, 'r') as f:
        return json.load(f)

def read_csv_file(filename):
    """Read data from a CSV file"""
    csv_path = Path(__file__).parent / "seeding" / filename
    data = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data

def insert_data_to_table(connection, table_name, columns, values):
    """Insert data into a table"""
    cursor = connection.cursor()
    placeholders = ', '.join(['%s'] * len(columns))
    columns_str = ', '.join([f'`{col}`' for col in columns])
    
    query = f"INSERT INTO `{table_name}` ({columns_str}) VALUES ({placeholders})"
    
    try:
        cursor.execute(query, values)
        connection.commit()
    except mysql.connector.Error as err:
        print(f"Error inserting into {table_name}: {err}")
        if 'Duplicate' not in str(err):
            raise
    
    cursor.close()

def seed_table(connection, csv_filename, table_name):
    """Seed a specific table from CSV file"""
    data = read_csv_file(csv_filename)
    
    if not data:
        print(f"⚠ No data in {csv_filename}")
        return 0
    
    count = 0
    for row in data:
        # Filter out empty values
        columns = [k for k, v in row.items() if v]
        values = [v for k, v in row.items() if v]
        
        if columns:
            try:
                insert_data_to_table(connection, table_name, columns, values)
                count += 1
            except Exception as e:
                print(f"Error seeding {table_name}: {e}")
                # Continue with other rows
                pass
    
    print(f"✓ Seeded {count} rows into {table_name} from {csv_filename}")
    return count

def main():
    try:
        print("=" * 80)
        print("DATA SEEDING")
        print("=" * 80)
        
        # Load configuration
        config = load_config()
        
        # Connect to database
        print("\nConnecting to database...")
        conn = mysql.connector.connect(
            host=config['host'],
            port=config['port'],
            user=config['user'],
            password=config['password'],
            database=config['database']
        )
        print("✓ Connected to database")
        
        # Seeding order matters due to foreign keys
        seeding_order = [
            # ('USER.csv', 'USER'),
            # ('HUB.csv', 'HUB'),
            # ('L1_ADDRESS.csv', 'L1_ADDRESS'),
            # ('L2_ADDRESS.csv', 'L2_ADDRESS'),
            ('VOUCHER.csv', 'VOUCHER'),
            # ('CUSTOMER.csv', 'CUSTOMER'),
            # ('DRIVER.csv', 'DRIVER'),
            # ('STAFF.csv', 'STAFF'),
            # ('DRIVER_WORK_AREA.csv', 'DRIVER_WORK_AREA'),
            # ('DRIVER_CERTIFICATE.csv', 'DRIVER_CERTIFICATE'),
            # ('HUB_MANAGER.csv', 'HUB_MANAGER'),
            # ('ORDER.csv', 'ORDER'),
            # ('ORDER_TRACKING.csv', 'ORDER_TRACKING'),
            # ('PAYMENT.csv', 'PAYMENT'),
            # ('PICKUP_ORDER.csv', 'PICKUP_ORDER'),
            # ('DELIVERY_ORDER.csv', 'DELIVERY_ORDER'),
            # ('SHIPMENT.csv', 'SHIPMENT'),
            # ('SHIPMENT_ORDER.csv', 'SHIPMENT_ORDER'),
            # ('RATING.csv', 'RATING'),
        ]
        
        print("\nSeeding data into tables...")
        total_rows = 0
        
        for csv_file, table_name in seeding_order:
            csv_path = Path(__file__).parent / "seeding" / csv_file
            if csv_path.exists():
                rows = seed_table(conn, csv_file, table_name)
                total_rows += rows
            else:
                print(f"⚠ File not found: {csv_file}")
        
        conn.close()
        
        print("\n" + "=" * 80)
        print(f"✓ DATA SEEDING COMPLETED! Total rows inserted: {total_rows}")
        print("=" * 80)
        return 0
        
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
