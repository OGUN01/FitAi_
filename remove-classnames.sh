#!/bin/bash
# Remove all className props from React Native files

files=(
  "src/components/subscription/PaywallModal.tsx"
  "src/components/subscription/PremiumBadge.tsx"
  "src/components/subscription/PremiumGate.tsx"
  "src/screens/settings/SubscriptionScreen.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Remove className="..." or className='...' or className={...}
    sed -i 's/ className="[^"]*"//g' "$file"
    sed -i "s/ className='[^']*'//g" "$file"
    sed -i 's/ className={[^}]*}//g' "$file"
    echo "  ✓ Cleaned className props"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo "Done!"
