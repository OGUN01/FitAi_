#!/bin/bash

# Fix common TypeScript type errors - Batch 2

echo "Starting batch fixes..."

# Fix all "medium" blurIntensity to "default"
find src -name "*.tsx" -exec sed -i 's/blurIntensity="medium"/blurIntensity="default"/g' {} \;
echo "✓ Fixed blurIntensity medium -> default"

# Fix all "strong" blurIntensity to "heavy"
find src -name "*.tsx" -exec sed -i 's/blurIntensity="strong"/blurIntensity="heavy"/g' {} \;
echo "✓ Fixed blurIntensity strong -> heavy"

# Fix all borderRadius="none" which needs proper support
# Already fixed in type definition

# Fix variant="solid" to variant="primary"
find src -name "*.tsx" -exec sed -i 's/variant="solid"/variant="primary"/g' {} \;
echo "✓ Fixed variant solid -> primary"

# Fix justifyContent string types
find src -name "*.tsx" -exec sed -i 's/justifyContent: "space-between"/justifyContent: "space-between" as const/g' {} \;
find src -name "*.tsx" -exec sed -i 's/justifyContent: "center"/justifyContent: "center" as const/g' {} \;
find src -name "*.tsx" -exec sed -i 's/justifyContent: "flex-start"/justifyContent: "flex-start" as const/g' {} \;
find src -name "*.tsx" -exec sed -i 's/justifyContent: "flex-end"/justifyContent: "flex-end" as const/g' {} \;
echo "✓ Fixed justifyContent type assertions"

# Fix alignItems string types  
find src -name "*.tsx" -exec sed -i 's/alignItems: "center"/alignItems: "center" as const/g' {} \;
find src -name "*.tsx" -exec sed -i 's/alignItems: "flex-start"/alignItems: "flex-start" as const/g' {} \;
find src -name "*.tsx" -exec sed -i 's/alignItems: "flex-end"/alignItems: "flex-end" as const/g' {} \;
echo "✓ Fixed alignItems type assertions"

echo "Batch fixes complete!"
