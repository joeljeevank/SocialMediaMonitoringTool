#!/usr/bin/env bash
# Render Build Script for Social Media Monitoring Backend
set -e

echo "=== Starting Render Build ==="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 1. Install project dependencies
npm install

# 2. Tell Playwright to store browsers inside node_modules so Render does not delete them after build
export PLAYWRIGHT_BROWSERS_PATH=0

# 3. Install Chromium browser binary
echo "Installing Playwright Chromium..."
npx playwright install chromium

# 4. Build NestJS application
echo "Building NestJS backend..."
npm run build

echo "=== Render Build Finished Successfully ==="
