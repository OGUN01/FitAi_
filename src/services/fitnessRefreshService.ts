/**
 * Fitness Refresh Service for FitAI
 * 
 * Similar to nutritionRefreshService but for fitness/workout data.
 * Ensures UI consistency after workout completions.
 */

export class FitnessRefreshService {
  private static instance: FitnessRefreshService;
  private refreshCallbacks: Array<() => Promise<void>> = [];
  private isRefreshing = false;

  private constructor() {}

  static getInstance(): FitnessRefreshService {
    if (!FitnessRefreshService.instance) {
      FitnessRefreshService.instance = new FitnessRefreshService();
    }
    return FitnessRefreshService.instance;
  }

  /**
   * Register a callback to be called when fitness data should be refreshed
   */
  onRefreshNeeded(callback: () => Promise<void>): () => void {
    this.refreshCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.refreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.refreshCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Trigger refresh of all registered fitness data hooks
   */
  async triggerRefresh(): Promise<void> {
    if (this.isRefreshing) {
      console.warn('Fitness refresh already in progress, skipping');
      return;
    }

    this.isRefreshing = true;

    try {
      // Execute all refresh callbacks in parallel
      await Promise.all(
        this.refreshCallbacks.map(async (callback) => {
          try {
            await callback();
          } catch (error) {
            console.warn('⚠️ Failed to execute fitness refresh callback:', error);
          }
        })
      );

    } catch (error) {
      console.error('❌ Error during fitness refresh:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Refresh fitness data after a workout has been completed
   */
  async refreshAfterWorkoutCompleted(workoutData?: {
    workoutId: string;
    workoutName: string;
    duration?: number;
    caloriesBurned?: number;
  }): Promise<void> {
    try {
      // Wait a small delay to ensure database consistency
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Trigger the general refresh
      await this.triggerRefresh();

    } catch (error) {
      console.error('❌ Error refreshing fitness after workout completion:', error);
      // Still try to trigger the general refresh
      await this.triggerRefresh();
    }
  }
}

// Export singleton instance
export const fitnessRefreshService = FitnessRefreshService.getInstance();
export default fitnessRefreshService;
