#!/bin/bash

# Download Hyperon test files from official repositories
# Usage: bash scripts/download-hyperon-tests.sh

HYPERON_REPO="https://github.com/trueagi-io/hyperon-experimental"
TESTSUITE_REPO="https://github.com/logicmoo/metta-testsuite"
TEST_DIR="tests/integration/metta/hyperon"
TEMP_DIR=$(mktemp -d)

echo "========================================="
echo "Downloading Hyperon Test Files"
echo "========================================="
echo ""

cd "$TEMP_DIR"

# Download hyperon-experimental (sparse checkout for tests only)
echo "📥 Cloning hyperon-experimental..."
git clone --depth 1 --filter=blob:none --sparse "$HYPERON_REPO" 2>&1 | grep -v "^remote:"
cd hyperon-experimental
git sparse-checkout set python/tests/scripts 2>&1 | grep -v "^remote:"
cd ..
echo "✅ hyperon-experimental cloned"
echo ""

# Download metta-testsuite
echo "📥 Cloning metta-testsuite..."
git clone --depth 1 "$TESTSUITE_REPO" 2>&1 | grep -v "^remote:"
echo "✅ metta-testsuite cloned"
echo ""

echo "========================================="
echo "Test files downloaded successfully!"
echo "========================================="
echo ""
echo "📁 Location: $TEMP_DIR"
echo ""
echo "📂 Contents:"
echo "  - hyperon-experimental/python/tests/scripts/"
echo "  - metta-testsuite/"
echo ""
echo "Next steps:"
echo "  1. Review test files in $TEMP_DIR"
echo "  2. Use convert-python-tests.js to convert Python tests"
echo "  3. Manually copy relevant .metta files to $TEST_DIR"
echo ""
echo "Example conversion:"
echo "  node scripts/convert-python-tests.js \\"
echo "    $TEMP_DIR/hyperon-experimental/python/tests/scripts \\"
echo "    $TEST_DIR/converted"
echo ""
echo "⚠️  Temp directory will be deleted on reboot"
echo "   Copy files before closing terminal!"
echo ""
