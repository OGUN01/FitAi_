#!/bin/bash

echo "==================================================="
echo "RELIABILITY AUDIT REPORT"
echo "Generated: $(date)"
echo "==================================================="

echo ""
echo "1. useEffect WITHOUT CLEANUP"
echo "---------------------------------------------------"
grep -rn "useEffect" src --include="*.tsx" --include="*.ts" | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  
  # Check next 20 lines for return cleanup
  if ! sed -n "${linenum},$((linenum+20))p" "$file" | grep -q "return () =>"; then
    echo "$file:$linenum"
  fi
done | sort | uniq -c | sort -rn | head -30

echo ""
echo "2. UNHANDLED await CALLS"
echo "---------------------------------------------------"
grep -rn "await " src --include="*.ts" --include="*.tsx" | grep -v "try\|catch" | wc -l

echo ""
echo "3. 'any' TYPE USAGE BY FILE"
echo "---------------------------------------------------"
grep -rn ": any\|<any>\|any\[\]" src --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq -c | sort -rn | head -20

echo ""
echo "4. CRITICAL TODOs"
echo "---------------------------------------------------"
grep -rn "TODO.*CRITICAL\|TODO.*FIX\|TODO.*IMPLEMENT" src --include="*.ts" --include="*.tsx" | head -20

echo ""
echo "==================================================="
