#!/usr/bin/env python3
"""
Master script to run all database setup steps:
1. Apply changes (drop DB, create tables, functions, procedures, triggers)
2. Seed data from CSV files
"""

import subprocess
import sys
from pathlib import Path

def run_script(script_name):
    """Run a Python script and return its exit code"""
    script_path = Path(__file__).parent / script_name
    
    print(f"\n{'='*80}")
    print(f"Running: {script_name}")
    print(f"{'='*80}")
    
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=Path(__file__).parent
    )
    
    return result.returncode

def main():
    print("╔" + "="*78 + "╗")
    print("║" + " "*20 + "DATABASE SETUP - COMPLETE WORKFLOW" + " "*24 + "║")
    print("╚" + "="*78 + "╝")
    
    scripts = [
        ("apply_changes.py", "Applying database schema changes"),
        ("seed_data.py", "Seeding data into database")
    ]
    
    failed_scripts = []
    
    for script_name, description in scripts:
        print(f"\n[STEP] {description}")
        exit_code = run_script(script_name)
        
        if exit_code != 0:
            failed_scripts.append(script_name)
            print(f"✗ {script_name} failed with exit code {exit_code}")
        else:
            print(f"✓ {script_name} completed successfully")
    
    # Final summary
    print("\n" + "╔" + "="*78 + "╗")
    if not failed_scripts:
        print("║" + " "*20 + "✓ ALL STEPS COMPLETED SUCCESSFULLY!" + " "*23 + "║")
    else:
        print("║" + " "*20 + "✗ SOME STEPS FAILED!" + " "*39 + "║")
        for script in failed_scripts:
            print(f"║  - {script}" + " "*(74-len(f"  - {script}")) + "║")
    print("╚" + "="*78 + "╝")
    
    return 1 if failed_scripts else 0

if __name__ == "__main__":
    sys.exit(main())
