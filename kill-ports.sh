#!/bin/bash

# Kill all ports that Next.js development server might use
# Common ports: 3000, 3001, 3002, 3003

echo "Killing processes on Next.js ports..."

ports=(3000 3001 3002 3003)

for port in "${ports[@]}"; do
  echo "Checking port $port..."
  pid=$(lsof -ti:$port)

  if [ -n "$pid" ]; then
    echo "  Found process $pid on port $port. Killing..."
    kill -9 $pid 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "  ✓ Successfully killed process on port $port"
    else
      echo "  ✗ Failed to kill process on port $port (may need sudo)"
    fi
  else
    echo "  - No process found on port $port"
  fi
done

echo ""
echo "Done!"
