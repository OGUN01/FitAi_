#!/bin/bash
# Remove all className attributes from AnalyticsScreen.tsx
sed -i 's/ className="[^"]*"//g' src/screens/main/AnalyticsScreen.tsx
echo "Removed all className attributes from AnalyticsScreen.tsx"
