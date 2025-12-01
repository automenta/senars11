#!/bin/bash
set -e

echo "Starting SeNARS UI Tour..."

# Ensure test-results exists
mkdir -p test-results

# Start CPU monitor
echo "Starting CPU monitor..."
top -b -d 1 > test-results/cpu_tour.log &
MONITOR_PID=$!

# Start Demo Server (background)
echo "Starting Demo Server with 'tour' demo..."
node scripts/ui/launcher.js --demo tour > test-results/demo_tour.log 2>&1 &
SERVER_PID=$!

echo "Server started (PID: $SERVER_PID). Waiting 10s for initialization..."
sleep 10

# Run Screenshots
# Duration: ~16 steps * 1.5s = 24s. Add buffer. Let's use 40s.
# Interval: 1.5s to match step delay approximately
echo "Capturing screenshots..."
node scripts/utils/visualize.js --type screenshots --duration 40000 --interval 1500

# Kill background processes
echo "Stopping server and monitor..."
kill $SERVER_PID || true
kill $MONITOR_PID || true

# Generate Composite
echo "Generating composite image..."
npm run composite

echo "========================================"
echo "Tour completed successfully!"
echo "Results:"
ls -lh test-results/composite.png
echo "========================================"
