import re

# Read the file
with open('src/data/achievements.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Additional type mappings
type_mapping = {
    'protein_goals_met': 'total',
    'weight_lost': 'personal_best',
    'muscle_gained': 'personal_best',
    'early_workouts': 'total',
    'late_workouts': 'total',
    'weekend_workouts': 'total',
    'unique_exercises': 'total',
}

for old_type, new_type in type_mapping.items():
    content = content.replace(f"type: '{old_type}'", f"type: '{new_type}'")

# Fix 'week' timeframe
content = content.replace("timeframe: 'week'", "timeframe: 'weekly'")

# Fix utility functions at the end
# Replace .difficulty with .rarity
content = content.replace('.difficulty', '.rarity')

# Replace .isUnlocked with .unlockedAt
content = re.sub(r'\.isUnlocked\s*===?\s*true', '.unlockedAt !== undefined', content)
content = re.sub(r'\.isUnlocked\s*===?\s*false', '.unlockedAt === undefined', content)
content = re.sub(r'\.isUnlocked', '.unlockedAt', content)

# Replace .reward with .rewards or .points
content = re.sub(r'\.reward\.points', '.points', content)
content = content.replace('.reward', '.rewards')

# Fix progress arithmetic - need to access .current
content = re.sub(r'(\w+)\.progress\s*\+\s*(\w+)\.progress', r'\1.progress.current + \2.progress.current', content)

# Write back
with open('src/data/achievements.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed additional issues in achievements.ts")
