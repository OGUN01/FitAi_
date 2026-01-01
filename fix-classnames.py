#!/usr/bin/env python3
import re
import sys

files = [
    'src/components/subscription/PaywallModal.tsx',
    'src/components/subscription/PremiumBadge.tsx',
    'src/components/subscription/PremiumGate.tsx',
    'src/screens/settings/SubscriptionScreen.tsx'
]

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Remove className from JSX tags only (not from strings or objects)
        # Pattern: space followed by className= followed by value
        # Only match when it's in a JSX context (after < or after another prop)

        # Match: <Tag className="..." or <Tag prop="val" className="..."
        content = re.sub(r'(\<\w+[^>]*?)\s+className="[^"]*"', r'\1', content)
        content = re.sub(r"(\<\w+[^>]*?)\s+className='[^']*'", r'\1', content)
        content = re.sub(r'(\<\w+[^>]*?)\s+className=\{[^}]*\}', r'\1', content)

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'✓ Fixed {filepath}')
        else:
            print(f'- No changes needed for {filepath}')

    except FileNotFoundError:
        print(f'✗ File not found: {filepath}')
    except Exception as e:
        print(f'✗ Error processing {filepath}: {e}')

print('Done!')
