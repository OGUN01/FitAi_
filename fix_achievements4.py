import re

# Read the file
with open('src/data/achievements.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: rewards?.points should be just points (rewards doesn't have points, it's a separate field)
content = content.replace('achievement.rewards?.points', 'achievement.points')

# Fix progress comparison - need to use .current
content = re.sub(
    r'\(a\.progress \|\| 0\) - \(b\.progress \|\| 0\)',
    r'(a.progress?.current || 0) - (b.progress?.current || 0)',
    content
)

# Fix: progress assignment should be an object not a number
# Find pattern: achievement.progress = progress; where progress is a number
content = re.sub(
    r'achievement\.progress = progress;',
    '''achievement.progress = {
    current: progress,
    target: 100,
    unit: '%',
  };''',
    content
)

# Fix: remove duplicate assignment and fix type
content = content.replace(
    '''achievement.unlockedAt = true;
    achievement.unlockedAt = new Date().toISOString();''',
    '''achievement.unlockedAt = new Date().toISOString();'''
)

# Write back
with open('src/data/achievements.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed final issues in achievements.ts")
