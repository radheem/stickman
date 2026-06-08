#!/bin/bash

# 1. Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# 2. Check for required positional parameters
NAME=$1
SCORE=$2

if [ -z "$NAME" ] || [ -z "$SCORE" ]; then
    echo "Usage: $0 <name> <score>"
    echo "Example: $0 StickmanHero 450"
    exit 1
fi

# 3. Execute the curl command
echo "Sending score for $NAME ($SCORE)..."
curl -L -X POST "$LEADERBOARD_URL" \
     -H "Content-Type: text/plain" \
     -d "{\"name\": \"$NAME\", \"score\": $SCORE}"

echo -e "\nDone."
