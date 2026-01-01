import re

# Read the file
with open('src/data/achievements.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Replace difficulty with rarity
content = content.replace("rarity: 'common'", "rarity: 'common'")
content = content.replace("difficulty: 'bronze'", "rarity: 'common'")
content = content.replace("difficulty: 'silver'", "rarity: 'rare'")
content = content.replace("difficulty: 'gold'", "rarity: 'epic'")
content = content.replace("difficulty: 'platinum'", "rarity: 'legendary'")

# Step 2: Replace reward with rewards and update structure
# reward: { points: X, badge: Y, unlocks: Z } -> points: X, rewards: { badges: [Y], features: Z }
def replace_reward(match):
    indent = match.group(1)
    points = match.group(2)
    badge = match.group(3) if match.group(3) else None
    unlocks = match.group(4) if match.group(4) else None
    
    result = f"{indent}points: {points},\n"
    
    if badge or unlocks:
        result += f"{indent}rewards: {{\n"
        if badge:
            result += f"{indent}  badges: ['{badge}'],\n"
        if unlocks:
            result += f"{indent}  features: {unlocks},\n"
        result += f"{indent}}},\n"
    
    return result

# Match reward objects
pattern = r'(\s+)reward: \{\s*points: (\d+),\s*badge: \'(\w+)\',?\s*(?:unlocks: (\[[^\]]+\]),?)?\s*\},'
content = re.sub(pattern, replace_reward, content)

# Handle rewards without unlocks
pattern2 = r'(\s+)reward: \{\s*points: (\d+),\s*badge: \'(\w+)\'\s*\},'
content = re.sub(pattern2, replace_reward, content)

# Handle rewards with only points
pattern3 = r'(\s+)reward: \{\s*points: (\d+)\s*\},'
def replace_reward_points_only(match):
    indent = match.group(1)
    points = match.group(2)
    return f"{indent}points: {points},\n"
content = re.sub(pattern3, replace_reward_points_only, content)

# Step 3: Replace isUnlocked with unlockedAt
content = content.replace('isUnlocked: false,', '// unlockedAt: undefined,')
content = content.replace('isUnlocked: true,', '// unlockedAt: defined,')

# Step 4: Replace progress: 0 with progress object
def replace_progress(match):
    indent = match.group(1)
    return f"{indent}progress: {{\n{indent}  current: 0,\n{indent}  target: 0,\n{indent}  unit: 'count',\n{indent}}},\n"
    
pattern_progress = r'(\s+)progress: 0,'
content = re.sub(pattern_progress, replace_progress, content)

# Write back
with open('src/data/achievements.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed achievements.ts")
