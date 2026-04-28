#!/usr/bin/env bash
# Build a Lambda deployment zip from the backend/ directory.
# Output: backend/dist/lambda_package.zip
#
# Usage:
#   ./infra/scripts/package_lambda.sh
#
# Requirements:
#   - Python 3.12 (matches Lambda runtime)
#   - pip
#   - zip

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
DIST_DIR="$BACKEND_DIR/dist"
BUILD_DIR="$DIST_DIR/build"
ZIP_PATH="$DIST_DIR/lambda_package.zip"

echo "==> Cleaning build dir"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "==> Installing dependencies (Lambda layer)"
pip install \
  --quiet \
  --target "$BUILD_DIR" \
  --platform manylinux2014_x86_64 \
  --only-binary=:all: \
  --python-version 3.12 \
  -r "$BACKEND_DIR/requirements.txt"

# Remove mangum is already installed; add it explicitly for Lambda
pip install \
  --quiet \
  --target "$BUILD_DIR" \
  --platform manylinux2014_x86_64 \
  --only-binary=:all: \
  --python-version 3.12 \
  "mangum>=0.19"

echo "==> Copying application code"
cp -r "$BACKEND_DIR/app" "$BUILD_DIR/"
cp "$BACKEND_DIR/lambda_handler.py" "$BUILD_DIR/"

echo "==> Removing unnecessary files to reduce zip size"
find "$BUILD_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$BUILD_DIR" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find "$BUILD_DIR" -name "*.pyc" -delete 2>/dev/null || true
# Strip test packages not needed at runtime
rm -rf "$BUILD_DIR/pytest" "$BUILD_DIR/pytest-*" "$BUILD_DIR/_pytest" 2>/dev/null || true

echo "==> Creating zip"
mkdir -p "$DIST_DIR"
cd "$BUILD_DIR"
zip -r -q "$ZIP_PATH" .

echo "==> Done: $ZIP_PATH ($(du -sh "$ZIP_PATH" | cut -f1))"
