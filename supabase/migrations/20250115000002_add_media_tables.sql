-- ============================================
-- MEDIA REGISTRY TABLES
-- ============================================
-- Migration: Add media tables for exercise and diet content
-- Created: 2025-11-14
-- Description: Tracks exercise animations/videos and diet images stored in R2

-- Exercise media (animations + human demos)
CREATE TABLE IF NOT EXISTS exercise_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_name TEXT NOT NULL,
  exercise_id TEXT,

  -- Media URLs
  animation_url TEXT,
  human_video_url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  duration_seconds INTEGER,
  file_size_kb INTEGER,
  source TEXT,
  source_url TEXT,

  -- Quality metrics
  video_quality TEXT,
  fps INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(exercise_name, source)
);

-- Diet/food media
CREATE TABLE IF NOT EXISTS diet_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_name TEXT NOT NULL,
  food_id TEXT,

  -- Media URLs
  image_url TEXT,
  video_url TEXT,
  recipe_url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  source TEXT,
  cuisine_type TEXT,
  meal_type TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(food_name, source)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_exercise_media_name ON exercise_media(exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercise_media_source ON exercise_media(source);
CREATE INDEX IF NOT EXISTS idx_diet_media_name ON diet_media(food_name);
CREATE INDEX IF NOT EXISTS idx_diet_media_source ON diet_media(source);
CREATE INDEX IF NOT EXISTS idx_diet_media_meal_type ON diet_media USING GIN(meal_type);

-- Comments
COMMENT ON TABLE exercise_media IS 'Registry of exercise media (animations and human demonstrations)';
COMMENT ON TABLE diet_media IS 'Registry of diet/food media (images and recipe videos)';
COMMENT ON COLUMN exercise_media.source IS 'Media source: r2, pexels, pixabay, youtube';
COMMENT ON COLUMN diet_media.source IS 'Media source: spoonacular, edamam, unsplash, youtube';
COMMENT ON COLUMN diet_media.meal_type IS 'Array of meal types: breakfast, lunch, dinner, snack';
