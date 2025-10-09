// ============================================================================
// METRIC DESCRIPTIONS
// ============================================================================
// Simple, easy-to-understand descriptions for all health and fitness metrics

export const METRIC_DESCRIPTIONS = {
  // Metabolic Metrics
  BMI: {
    title: 'BMI (Body Mass Index)',
    description: 'A simple calculation using your height and weight to estimate if you\'re in a healthy weight range. It\'s a general guide but doesn\'t account for muscle mass or body composition.',
  },
  
  BMR: {
    title: 'BMR (Basal Metabolic Rate)',
    description: 'The number of calories your body burns at rest just to keep you alive (breathing, heart beating, etc.). This is like your body\'s "idle speed" - the minimum energy you need.',
  },
  
  TDEE: {
    title: 'TDEE (Total Daily Energy Expenditure)',
    description: 'The total calories you burn in a day, including everything: resting metabolism, daily activities, exercise, and even digesting food. This helps us plan your daily calorie target.',
  },
  
  METABOLIC_AGE: {
    title: 'Metabolic Age',
    description: 'How old your metabolism "acts" compared to your actual age. A lower metabolic age means your metabolism is faster than average for your age - that\'s good! A higher age means it\'s slower.',
  },
  
  // Nutritional Metrics
  DAILY_CALORIES: {
    title: 'Daily Calorie Target',
    description: 'The number of calories you should eat each day to reach your goal. This accounts for your metabolism, activity level, and how fast you want to lose/gain weight safely.',
  },
  
  PROTEIN: {
    title: 'Daily Protein',
    description: 'Protein helps build and repair muscles. We calculate how much you need based on your weight, goals, and activity level. More protein helps preserve muscle while losing fat.',
  },
  
  CARBS: {
    title: 'Daily Carbohydrates',
    description: 'Your body\'s main source of quick energy. Carbs fuel your workouts and brain. We adjust this based on your activity level and dietary preferences.',
  },
  
  FATS: {
    title: 'Daily Fats',
    description: 'Essential for hormone production, brain health, and absorbing vitamins. Healthy fats are crucial - don\'t fear them! We balance this with your other nutrients.',
  },
  
  WATER: {
    title: 'Daily Water Intake',
    description: 'Based on your body weight, this is how much water you should drink daily. Proper hydration improves performance, recovery, and helps with fat loss.',
  },
  
  FIBER: {
    title: 'Daily Fiber',
    description: 'Fiber keeps your digestive system healthy, helps you feel full, and stabilizes blood sugar. It\'s found in fruits, vegetables, and whole grains.',
  },
  
  // Body Composition
  BODY_FAT: {
    title: 'Body Fat Percentage',
    description: 'What percent of your body weight is fat vs muscle, bone, and organs. Lower isn\'t always better - you need some fat for health! We show you a healthy range for your age and gender.',
  },
  
  LEAN_MASS: {
    title: 'Lean Body Mass',
    description: 'Everything in your body that\'s NOT fat: muscles, bones, organs, water. When losing weight, we want to keep this and only lose fat!',
  },
  
  WAIST_HIP_RATIO: {
    title: 'Waist-to-Hip Ratio',
    description: 'A measure of where you carry body fat. Lower ratios (carrying less fat around the waist) are associated with better health outcomes.',
  },
  
  // Weight Management
  HEALTHY_WEIGHT_RANGE: {
    title: 'Healthy Weight Range',
    description: 'The ideal weight range for your height and gender, based on medical research. Being within this range reduces health risks and supports overall wellbeing.',
  },
  
  WEEKLY_RATE: {
    title: 'Weekly Weight Change Rate',
    description: 'How much weight you should aim to lose or gain per week safely. Losing too fast can cause muscle loss, fatigue, and isn\'t sustainable. Slow and steady wins!',
  },
  
  TIMELINE: {
    title: 'Estimated Timeline',
    description: 'How many weeks it will realistically take to reach your goal at a healthy, sustainable pace. This accounts for your current stats and safe weight loss rates.',
  },
  
  CALORIE_DEFICIT: {
    title: 'Weekly Calorie Deficit',
    description: 'The total calories you need to reduce each week to hit your weight goal. We spread this across 7 days to make it manageable. 1kg of fat = about 7,700 calories.',
  },
  
  // Fitness Metrics
  VO2_MAX: {
    title: 'VO₂ Max',
    description: 'A measure of your cardiovascular fitness - how well your body can use oxygen during intense exercise. Higher numbers mean better endurance and heart health.',
  },
  
  HEART_RATE_ZONES: {
    title: 'Heart Rate Training Zones',
    description: 'Different intensity levels for cardio workouts. Fat Burn (60-70% max HR) is steady, moderate cardio. Cardio (70-85%) improves fitness. Peak (85-95%) is max effort.',
  },
  
  WORKOUT_FREQUENCY: {
    title: 'Recommended Workout Frequency',
    description: 'How many days per week you should work out based on your goals and experience level. Consistency matters more than intensity!',
  },
  
  CARDIO_MINUTES: {
    title: 'Weekly Cardio Minutes',
    description: 'Total minutes of cardio (running, cycling, swimming, etc.) recommended each week. This improves heart health and helps burn calories.',
  },
  
  STRENGTH_SESSIONS: {
    title: 'Strength Training Sessions',
    description: 'How many times per week you should do resistance/weight training. This builds muscle, strengthens bones, and boosts metabolism.',
  },
  
  // Health Scores
  OVERALL_HEALTH: {
    title: 'Overall Health Score',
    description: 'A composite score (0-100) based on your BMI, activity level, diet habits, sleep, and current fitness. Higher is better! This helps track your overall wellness.',
  },
  
  DIET_READINESS: {
    title: 'Diet Readiness Score',
    description: 'How prepared you are to stick to a nutrition plan, based on your current eating habits. A higher score means you already have good habits that make success easier.',
  },
  
  FITNESS_READINESS: {
    title: 'Fitness Readiness Score',
    description: 'Your preparedness for a workout program based on experience, current fitness level, and any limitations. Helps us match you with appropriate exercises.',
  },
  
  GOAL_REALISTIC: {
    title: 'Goal Realistic Score',
    description: 'How achievable your weight and fitness goals are given your timeline. Lower scores mean goals might be too aggressive - we\'ll help adjust for better long-term success.',
  },
  
  // Sleep
  SLEEP_DURATION: {
    title: 'Sleep Duration',
    description: 'How many hours you currently sleep vs what\'s recommended for your age. Sleep is CRUCIAL for weight loss, muscle recovery, and energy levels.',
  },
  
  SLEEP_EFFICIENCY: {
    title: 'Sleep Efficiency Score',
    description: 'How well your current sleep schedule supports your fitness goals. Poor sleep can slow progress by 20-30%! We\'ll help optimize your rest.',
  },
  
  // Advanced
  ACTIVITY_LEVEL: {
    title: 'Activity Level',
    description: 'How much you move throughout your day (not counting planned workouts). Your daily occupation and lifestyle affect how many calories you burn.',
  },
  
  OCCUPATION_TYPE: {
    title: 'Daily Activity from Job',
    description: 'Your job affects how many calories you burn daily. Desk jobs burn fewer calories than physically active jobs, so we adjust your daily calorie needs accordingly.',
  },
  
  INTENSITY: {
    title: 'Workout Intensity Level',
    description: 'Your fitness experience level. Beginner = new or returning to fitness. Intermediate = regular exercise for 1+ years. Advanced = 3+ years of consistent training.',
  },
  
  DATA_COMPLETENESS: {
    title: 'Data Completeness',
    description: 'How much of your profile you\'ve filled out. More complete data = more personalized recommendations! Aim for 90%+ for best results.',
  },
  
  RELIABILITY_SCORE: {
    title: 'Reliability Score',
    description: 'How consistent and realistic your provided information is. Lower scores might indicate unrealistic goals or conflicting data that we can help adjust.',
  },
  
  PERSONALIZATION_LEVEL: {
    title: 'Personalization Level',
    description: 'How customized your plan is based on your complete profile. Higher levels mean your meal and workout plans are more tailored to your specific needs.',
  },
};

// Helper function to get description
export const getMetricDescription = (metricKey: keyof typeof METRIC_DESCRIPTIONS) => {
  return METRIC_DESCRIPTIONS[metricKey] || {
    title: 'Metric Information',
    description: 'No description available for this metric.',
  };
};
