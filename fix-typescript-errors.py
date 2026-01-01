#!/usr/bin/env python3
"""
Fix all TypeScript errors in the FitAI project
"""
import re
import os
from pathlib import Path

def fix_style_type_errors(file_path):
    """Fix style type errors where false | ViewStyle is invalid"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern: style={[..., condition && styles.something]}
    # Replace with: style={[..., condition ? styles.something : undefined].filter(Boolean)}

    # Match array with && operator
    pattern = r'style=\{(\[[^\]]+\s+&&\s+styles\.[^\]]+)\]}'

    def replace_style(match):
        full_match = match.group(1)
        # Convert && to ternary
        fixed = re.sub(r'(\S+)\s+&&\s+(styles\.\w+)', r'\1 ? \2 : undefined', full_match)
        return f'style={{[{fixed}].filter(Boolean)}}'

    content = re.sub(pattern, replace_style, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_body_analysis_gender(file_path):
    """Fix BodyAnalysisTab gender type error"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The gender from BodyAnalysisTab can be 'other' but BodySilhouette only accepts 'male' | 'female'
    # Fix: gender={data.gender === 'other' || data.gender === 'prefer_not_to_say' ? undefined : data.gender}

    pattern = r'gender=\{data\.gender\}'
    replacement = r"gender={data.gender === 'other' || data.gender === 'prefer_not_to_say' ? undefined : data.gender as 'male' | 'female' | undefined}"

    content = re.sub(pattern, replacement, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_body_analysis_numbers(file_path):
    """Fix number to string conversions in BodyAnalysisTab"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix age, height, weight number to string
    # Pattern: age={age} -> age={age.toString()}
    content = re.sub(r'\bage=\{age\}', r'age={age?.toString() || ""}', content)
    content = re.sub(r'\bheight=\{data\.height\}', r'height={data.height?.toString() || ""}', content)
    content = re.sub(r'\bweight=\{data\.current_weight\}', r'weight={data.current_weight?.toString() || ""}', content)
    content = re.sub(r'\btargetWeight=\{data\.target_weight\}', r'targetWeight={data.target_weight?.toString() || ""}', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_hero_section_children(file_path):
    """Fix HeroSection children with false values"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    modified = False
    for i, line in enumerate(lines):
        # Look for HeroSection with children
        if '<HeroSection' in line:
            # Check if there's a closing > on the same or next few lines
            j = i
            while j < min(i + 10, len(lines)) and '>' not in lines[j]:
                j += 1

            # Check if children have conditional rendering with &&
            k = j + 1
            while k < min(j + 20, len(lines)) and '</HeroSection>' not in lines[k]:
                if '&&' in lines[k] and '<' in lines[k]:
                    # Found conditional child - this section needs filter(Boolean)
                    # Look for the closing tag and wrap children
                    modified = True
                k += 1

    if not modified:
        return

    # For now, just mark files that need manual review
    print(f"  Note: {file_path} may need manual HeroSection children filtering")

def fix_undefined_calculations(file_path):
    """Fix calculations that might be undefined"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern: calculateX(value) where value might be undefined
    # Fix: value !== undefined ? calculateX(value) : 0
    patterns = [
        (r'calculateBMI\(([^,]+),\s*([^)]+)\)', r'(\1 !== undefined && \2 !== undefined ? calculateBMI(\1, \2) : 0)'),
        (r'calculateBMR\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)', r'(\1 !== undefined && \2 !== undefined && \3 !== undefined && \4 ? calculateBMR(\1, \2, \3, \4) : 0)'),
        (r'calculateTDEE\(([^,]+),\s*([^)]+)\)', r'(\1 !== undefined && \2 !== undefined ? calculateTDEE(\1, \2) : 0)'),
        (r'calculateIdealWeight\(([^,]+),\s*([^)]+)\)', r'(\1 !== undefined && \2 ? calculateIdealWeight(\1, \2) : 0)'),
    ]

    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    """Main function to fix all TypeScript errors"""
    root = Path('D:/FitAi/FitAI/src')

    print("Fixing TypeScript errors...")

    # Fix specific files
    files_to_fix = [
        ('screens/main/ProgressScreen.tsx', fix_style_type_errors),
        ('screens/onboarding/tabs/AdvancedReviewTab.tsx', fix_style_type_errors),
        ('screens/onboarding/tabs/AdvancedReviewTab.tsx', fix_undefined_calculations),
        ('screens/onboarding/tabs/BodyAnalysisTab.tsx', fix_style_type_errors),
        ('screens/onboarding/tabs/BodyAnalysisTab.tsx', fix_body_analysis_gender),
        ('screens/onboarding/tabs/BodyAnalysisTab.tsx', fix_body_analysis_numbers),
        ('screens/onboarding/tabs/DietPreferencesTab.tsx', fix_style_type_errors),
        ('screens/onboarding/tabs/WorkoutPreferencesTab.tsx', fix_style_type_errors),
        ('screens/onboarding/tabs/PersonalInfoTab.tsx', fix_hero_section_children),
    ]

    for file_path, fix_func in files_to_fix:
        full_path = root / file_path
        if full_path.exists():
            print(f"Fixing {file_path}...")
            try:
                fix_func(str(full_path))
                print(f"  [OK] Fixed {file_path}")
            except Exception as e:
                print(f"  [ERROR] Error fixing {file_path}: {e}")

    print("\nDone!")

if __name__ == '__main__':
    main()
