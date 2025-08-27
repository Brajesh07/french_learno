#!/bin/bash

# API Cleanup Script
# Removes debug, test, and duplicate API endpoints

cd /Users/brajeshtanwar/Desktop/french_learno/admin-dashboard

echo "Starting API cleanup..."

# Remove debug endpoints
echo "Removing debug endpoints..."
rm -rf src/app/api/check-admin/
rm -rf src/app/api/env-check/
rm -rf src/app/api/firebase-test/
rm -rf src/app/api/test/

# Remove duplicate endpoints
echo "Removing duplicate endpoints..."
rm -rf src/app/api/list-users/
rm -rf src/app/api/students/
rm -rf src/app/api/setup-admin/

# Remove auth debug endpoints
echo "Removing auth debug endpoints..."
rm -rf src/app/api/auth/debug-admin/
rm -rf src/app/api/auth/fix-admin/
rm -rf src/app/api/auth/fix-email/
rm -rf src/app/api/auth/login-test/
rm -rf src/app/api/auth/list-users/

echo "API cleanup completed!"

# Show remaining structure
echo ""
echo "Remaining API structure:"
find src/app/api -name "route.ts" | sort
