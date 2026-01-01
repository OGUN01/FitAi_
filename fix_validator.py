import re

# Read the file
with open('src/services/profileValidator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Map camelCase to snake_case for PersonalInfo
personal_info_mappings = {
    'data.height': "data.height_cm || (data as any).height",  # Allow both for compatibility
    'data.weight': "data.weight_kg || (data as any).weight",
    'data.activityLevel': "data.occupation_type || (data as any).activityLevel",
    'data.phoneNumber': "(data as any).phoneNumber",  # Not in interface
}

# For DietPreferences
diet_pref_mappings = {
    'data.dietType': 'data.diet_type',
    'data.cookingSkill': "(data as any).cookingSkill",  # Not in interface
    'data.mealPrepTime': "(data as any).mealPrepTime",  # Not in interface
    'data.cuisinePreferences': "(data as any).cuisinePreferences",  # Not in interface
    'data.dislikes': "(data as any).dislikes",  # Not in interface
}

# For FitnessGoals
fitness_goal_mappings = {
    'data.targetWeight': "(data as any).targetWeight",  # Not in interface
    'data.timeframe': "(data as any).timeframe",  # Not in interface
}

# For WorkoutPreferences
workout_pref_mappings = {
    'data.frequency': "(data as any).frequency",  # Not in interface
}

# Apply all mappings
all_mappings = {
    **personal_info_mappings,
    **diet_pref_mappings,
    **fitness_goal_mappings,
    **workout_pref_mappings
}

for old_prop, new_prop in all_mappings.items():
    # Only replace in validation contexts, not in error messages
    content = re.sub(
        f'(?<!["\'])\b{re.escape(old_prop)}\b(?!["\'])',
        new_prop,
        content
    )

# Fix age type issue - parseInt instead of parseFloat
content = content.replace('parseFloat(data.age)', 'parseInt(String(data.age), 10)')

# Write back
with open('src/services/profileValidator.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed profileValidator.ts property access")
