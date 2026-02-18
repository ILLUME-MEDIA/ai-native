#!/bin/bash
echo "=== Testing API Endpoint ==="
curl -s "https://creatorstream.tv/api/v1/channel/search-for-addable-content?modelType=album&query=test&limit=10" \
  -H "Accept: application/json" \
  -H "Cookie: XSRF-TOKEN=test" \
  | head -20
