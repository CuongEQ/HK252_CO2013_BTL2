# Database Setup and Seeding Scripts

## Overview

This project contains three Python scripts for managing the "Hệ Thống Vận Chuyển" (Shipping Management System) database:

1. **apply_changes.py** - Drops the existing database and applies all schema changes
2. **seed_data.py** - Seeds data into the database from CSV files
3. **run_all.py** - Master script that runs both scripts sequentially

## Prerequisites

- Python 3.7+
- MySQL Server 5.7+
- mysql-connector-python (installed via requirements.txt)

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Configure database connection in `config.json`:

```json
{
    "host": "127.0.0.1",
    "port": 3306,
    "user": "your_username",
    "password": "your_password",
    "database": "HeThongVanChuyen"
}
```

## Usage

### Run All Steps (Recommended)

```bash
python run_all.py
```

This will:

1. Drop the existing database (if it exists)
2. Create all tables
3. Create functions
4. Create procedures
5. Create triggers
6. Seed data from CSV files

### Run Individual Scripts

#### Apply Database Changes Only

```bash
python apply_changes.py
```

This will:

- Drop database `HeThongVanChuyen` (if exists)
- Create all tables from `database/Init.sql`
- Create functions from `database/Function.sql`
- Create stored procedures from `database/Procedure.sql`
- Create triggers from `database/Trigger.sql`

#### Seed Data Only

```bash
python seed_data.py
```

This will load data from CSV files in the `seeding/` directory and insert them into the database tables.

## Database Structure

### Tables Created

The script creates the following tables with relationships:

- USER
- CUSTOMER
- DRIVER
- STAFF
- HUB
- VOUCHER
- ORDER
- PAYMENT
- RATING
- SHIPMENT
- SHIPMENT_ORDER
- PICKUP_ORDER
- DELIVERY_ORDER
- ORDER_TRACKING
- DRIVER_WORK_AREA
- DRIVER_CERTIFICATE
- USER_PHONE
- CUSTOMER_VOUCHER
- HUB_MANAGER

### Functions Created

- `Calculate_Driver_Bonus(p_Driver_ID)` - Calculates bonus for a driver
- `Get_Customer_Tier(p_Customer_ID)` - Gets customer tier (VIP, Regular, New)

### Procedures Created

- Account management procedures
- Order management procedures (create, update, delete)
- Pickup/Delivery procedures
- Payment procedures
- Voucher procedures
- Statistics procedures

### Triggers Created

- Voucher expiration checks
- Hub capacity checks
- Pickup/Delivery count limits
- Order count tracking

## Data Seeding

The CSV files in the `seeding/` directory contain realistic sample data:

- **10+ Hubs** with locations across Vietnam (TPHCM, Hà Nội, Đà Nẵng)
- **15 Customers** with shipping addresses
- **10 Drivers** with experience levels
- **10 Staff members** with roles
- **15 Orders** with various statuses
- **15 Shipments** with tracking information
- **15 Ratings** from customers
- **35 Phone numbers** for users
- **10 Vouchers** with expiration dates

## Error Handling

The scripts have built-in error handling:

- Duplicate key errors are skipped (existing data is not re-inserted)
- Foreign key constraint violations are reported
- All errors are logged to the console

## Important Notes

1. **Database Reset**: Running `apply_changes.py` will DROP the existing database. Make sure to back up any important data before running.

2. **Seed Order**: The seeding order in `seed_data.py` follows the database schema dependencies:
   - Independent tables (USER, HUB, VOUCHER) are seeded first
   - Dependent tables (CUSTOMER, DRIVER, STAFF) are seeded next
   - Order-related tables are seeded last

3. **Data Consistency**: The sample data maintains referential integrity. All foreign key relationships are properly established.

## Troubleshooting

### Connection Issues

- Verify MySQL server is running
- Check credentials in `config.json`
- Ensure you have proper permissions

### Data Import Issues

- Check CSV file encoding (should be UTF-8)
- Verify CSV column names match expected table columns
- Check for missing required columns in CSV files

### Permission Errors

- Make sure the database user has privileges to:
  - CREATE/DROP DATABASE
  - CREATE/DROP TABLE
  - CREATE/DROP FUNCTION/PROCEDURE/TRIGGER
  - INSERT/SELECT data

## Script Details

### apply_changes.py

- Parses SQL files handling DELIMITER declarations
- Executes SQL statements using mysql-connector-python
- Provides progress feedback for each operation

### seed_data.py

- Reads CSV files from `seeding/` directory
- Maintains proper insert order based on foreign keys
- Handles duplicate key errors gracefully
- Reports total rows inserted

### run_all.py

- Orchestrates execution of both scripts
- Displays formatted progress output
- Reports success/failure of each step
- Returns appropriate exit codes

## Example Output

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    DATABASE SETUP - COMPLETE WORKFLOW                    ║
╚════════════════════════════════════════════════════════════════════════════╝

[STEP] Applying database schema changes
================================================================================
Running: apply_changes.py
✓ Executing Init.sql (22 statements)...
✓ Executing Function.sql (2 statements)...
✓ Executing Procedure.sql (18 statements)...
✓ Executing Trigger.sql (17 statements)...
✓ apply_changes.py completed successfully

[STEP] Seeding data into database
================================================================================
Running: seed_data.py
✓ Seeded 51 rows into USER
✓ Seeded 10 rows into HUB
✓ Seeded 15 rows into CUSTOMER
... (more tables) ...
✓ DATA SEEDING COMPLETED! Total rows inserted: 268
✓ seed_data.py completed successfully

╔════════════════════════════════════════════════════════════════════════════╗
║                ✓ ALL STEPS COMPLETED SUCCESSFULLY!                        ║
╚════════════════════════════════════════════════════════════════════════════╝
```

## Support

For issues or questions, refer to:

- Database schema: `database/Init.sql`
- Data samples: `seeding/*.csv`
- Configuration: `config.json`
