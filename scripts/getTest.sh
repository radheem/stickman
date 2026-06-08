#!/bin/bash

# 1. Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# 2. Execute the curl command
echo "Fetching top scores..."
curl -L "$LEADERBOARD_URL"

echo -e "\nDone."
