import re

# Read the file
with open('src/data/achievements.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Map old criteria types to new ones
type_mapping = {
    'workouts_completed': 'total',
    'workout_streak': 'streak',
    'strength_workouts': 'total',
    'cardio_workouts': 'total',
    'nutrition_streak': 'streak',
    'calorie_goals_met': 'total',
    'macro_goals_met': 'total',
    'weight_progress': 'personal_best',
    'water_goals_met': 'total',
    'meals_logged': 'total',
    'distance_run': 'total',
    'calories_burned': 'total',
    'weights_lifted': 'total',
}

# Replace type values
for old_type, new_type in type_mapping.items():
    content = content.replace(f"type: '{old_type}'", f"type: '{new_type}'")

# Replace timeframe 'days' with 'daily'
content = content.replace("timeframe: 'days'", "timeframe: 'daily'")
content = content.replace("timeframe: 'weeks'", "timeframe: 'weekly'")
content = content.replace("timeframe: 'months'", "timeframe: 'monthly'")

# Write back
with open('src/data/achievements.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed criteria types in achievements.ts")
