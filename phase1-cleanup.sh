#!/bin/bash

# Phase 1 API Cleanup Script
# Removes safe endpoints that provide no value and may pose security risks

echo "==================================="
echo "Phase 1 API Cleanup - Safe Removal"
echo "==================================="

cd /Users/brajeshtanwar/Desktop/french_learno/admin-dashboard

echo "Current directory: $(pwd)"
echo ""

echo "Before cleanup - API structure:"
find src/app/api -type d -name "*" | sort
echo ""

echo "Removing test endpoints..."
rm -rf src/app/api/test/ && echo "✓ Removed: test/"
rm -rf src/app/api/env-check/ && echo "✓ Removed: env-check/"
rm -rf src/app/api/firebase-test/ && echo "✓ Removed: firebase-test/"

echo ""
echo "Removing duplicate endpoints..."
rm -rf src/app/api/check-admin/ && echo "✓ Removed: check-admin/"
rm -rf src/app/api/list-users/ && echo "✓ Removed: list-users/"
rm -rf src/app/api/students/ && echo "✓ Removed: students/"
rm -rf src/app/api/setup-admin/ && echo "✓ Removed: setup-admin/"

echo ""
echo "Removing duplicate auth endpoints..."
rm -rf src/app/api/auth/list-users/ && echo "✓ Removed: auth/list-users/"
rm -rf src/app/api/auth/login-test/ && echo "✓ Removed: auth/login-test/"

echo ""
echo "Phase 1 cleanup completed!"
echo ""

echo "After cleanup - API structure:"
find src/app/api -type d -name "*" | sort
echo ""

echo "Remaining API endpoints:"
find src/app/api -name "route.ts" | sort
echo ""

echo "==================================="
echo "Phase 1 Cleanup Summary"
echo "==================================="
echo "✓ Removed 9 unnecessary endpoints"
echo "✓ Kept production endpoints"
echo "✓ Kept debug endpoints for development safety"
echo ""
echo "Next: Remove Phase 2 endpoints before production deployment"
