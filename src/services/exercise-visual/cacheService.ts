import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExerciseData, CacheStats } from "./types";
import { fixBrokenCdnUrl } from "./urlUtils";
import { LOCAL_EXERCISE_MAPPING } from "./localMappings";

const CACHE_KEY = "exercise_cache";
const LAST_CACHE_UPDATE_KEY = "last_cache_update";
const CACHE_EXPIRY_DAYS = 7;

export class ExerciseCacheService {
  private cache = new Map<string, ExerciseData>();

  constructor() {
    this.preloadLocalMappingsToCache();
  }

  private preloadLocalMappingsToCache(): void {
    for (const [key, exercise] of LOCAL_EXERCISE_MAPPING.entries()) {
      this.cache.set(key, exercise);
      this.cache.set(exercise.exerciseId, exercise);
      this.cache.set(exercise.name.toLowerCase(), exercise);
    }
  }

  async initialize(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const lastUpdate = await AsyncStorage.getItem(LAST_CACHE_UPDATE_KEY);

      if (cachedData && lastUpdate) {
        const cacheAge = Date.now() - parseInt(lastUpdate);
        const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        if (cacheAge < maxAge) {
          const exercises: ExerciseData[] = JSON.parse(cachedData);
          exercises.forEach((exercise) => {
            if (exercise.gifUrl) {
              exercise.gifUrl = fixBrokenCdnUrl(exercise.gifUrl);
            }
            this.cache.set(exercise.name.toLowerCase(), exercise);
            this.cache.set(exercise.exerciseId, exercise);
          });
          return;
        } else {
        }
      } else {
      }
    } catch (error) {
      console.error("Failed to initialize exercise cache:", error);
    }
  }

  get(key: string): ExerciseData | undefined {
    return this.cache.get(key);
  }

  set(key: string, exercise: ExerciseData): void {
    this.cache.set(key, exercise);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  values(): IterableIterator<ExerciseData> {
    return this.cache.values();
  }

  async saveExercises(exercises: ExerciseData[]): Promise<void> {
    try {
      exercises.forEach((exercise) => {
        this.cache.set(exercise.name.toLowerCase(), exercise);
        this.cache.set(exercise.exerciseId, exercise);
      });

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(exercises));
      await AsyncStorage.setItem(LAST_CACHE_UPDATE_KEY, Date.now().toString());
    } catch (error) {
      console.error("Failed to cache exercises:", error);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(LAST_CACHE_UPDATE_KEY);
    this.preloadLocalMappingsToCache();
  }

  getStats(): CacheStats {
    const exercises = Array.from(this.cache.values()).filter(
      (exercise, index, array) =>
        array.findIndex((e) => e.exerciseId === exercise.exerciseId) === index,
    );

    return {
      size: this.cache.size,
      exercises: exercises.length,
    };
  }

  isCacheExpired(): boolean {
    return false;
  }
}

export const cacheService = new ExerciseCacheService();
