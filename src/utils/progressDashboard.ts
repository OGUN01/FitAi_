/**
 * Progress Dashboard - Real-time tracking of FitAI reliability improvements
 */

import { reliabilityTracker } from './reliabilityTracker';

interface ProgressMetrics {
  reliabilityScore: number; // 0-100
  codeQualityScore: number; // 0-100
  productionReadiness: number; // 0-100
  completedTasks: number;
  totalTasks: number;
  timeSpent: number; // hours
  estimatedTimeRemaining: number; // hours
}

interface TaskProgress {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress: number; // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'reliability' | 'performance' | 'security' | 'features';
  completedAt?: Date;
}

class ProgressDashboard {
  private startTime: Date = new Date();
  private tasks: TaskProgress[] = [];

  constructor() {
    this.initializeTasks();
  }

  /**
   * Initialize with current project tasks
   */
  private initializeTasks(): void {
    this.tasks = [
      // Reliability tasks
      {
        id: 'fontweight-fix',
        name: 'Fix FontWeight Style Issues (127 instances)',
        status: 'in_progress',
        progress: 15, // Started with ErrorBoundary, AsyncInitializer
        priority: 'critical',
        category: 'reliability',
      },
      {
        id: 'console-log-replacement',
        name: 'Replace console.log with proper logging',
        status: 'in_progress',
        progress: 10, // Started with ErrorBoundary
        priority: 'high',
        category: 'reliability',
      },
      {
        id: 'demo-mode-implementation',
        name: 'Implement AI Demo Mode',
        status: 'completed',
        progress: 100,
        priority: 'critical',
        category: 'features',
        completedAt: new Date(),
      },
      {
        id: 'reliability-tracking',
        name: 'Create Reliability Tracking System',
        status: 'completed',
        progress: 100,
        priority: 'high',
        category: 'reliability',
        completedAt: new Date(),
      },
      {
        id: 'progress-dashboard',
        name: 'Create Progress Dashboard',
        status: 'completed',
        progress: 100,
        priority: 'medium',
        category: 'reliability',
        completedAt: new Date(),
      },
      // Critical TODO resolutions
      {
        id: 'schema-repair-logic',
        name: 'Implement schema repair logic (dataManager)',
        status: 'pending',
        progress: 0,
        priority: 'critical',
        category: 'reliability',
      },
      {
        id: 'migration-cancellation',
        name: 'Implement migration cancellation',
        status: 'pending',
        progress: 0,
        priority: 'high',
        category: 'features',
      },
      {
        id: 'time-picker-implementation',
        name: 'Implement notification time picker',
        status: 'pending',
        progress: 0,
        priority: 'medium',
        category: 'features',
      },
      {
        id: 'image-optimization',
        name: 'Implement food recognition image optimization',
        status: 'pending',
        progress: 0,
        priority: 'medium',
        category: 'performance',
      },
      // Performance improvements
      {
        id: 'lazy-loading',
        name: 'Implement lazy loading for exercise filters',
        status: 'pending',
        progress: 0,
        priority: 'medium',
        category: 'performance',
      },
      // Error handling improvements
      {
        id: 'comprehensive-error-handling',
        name: 'Add comprehensive error handling patterns',
        status: 'pending',
        progress: 0,
        priority: 'high',
        category: 'reliability',
      },
    ];
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId: string, progress: number, status?: TaskProgress['status']): boolean {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.progress = Math.min(100, Math.max(0, progress));
      if (status) {
        task.status = status;
      }
      if (progress === 100 && !task.completedAt) {
        task.status = 'completed';
        task.completedAt = new Date();
      }
      return true;
    }
    return false;
  }

  /**
   * Get current progress metrics
   */
  getProgressMetrics(): ProgressMetrics {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter((t) => t.status === 'completed').length;
    const timeSpent = (Date.now() - this.startTime.getTime()) / (1000 * 60 * 60); // hours

    // Calculate reliability score based on critical issues resolved
    const criticalTasks = this.tasks.filter((t) => t.priority === 'critical');
    const completedCriticalTasks = criticalTasks.filter((t) => t.status === 'completed');
    const reliabilityScore =
      criticalTasks.length > 0
        ? Math.round((completedCriticalTasks.length / criticalTasks.length) * 100)
        : 100;

    // Calculate code quality score based on overall progress
    const totalProgress = this.tasks.reduce((sum, task) => sum + task.progress, 0);
    const maxProgress = this.tasks.length * 100;
    const codeQualityScore = Math.round((totalProgress / maxProgress) * 100);

    // Calculate production readiness (weighted by priority)
    const priorityWeights = { critical: 3, high: 2, medium: 1, low: 0.5 };
    const weightedProgress = this.tasks.reduce((sum, task) => {
      return sum + task.progress * priorityWeights[task.priority];
    }, 0);
    const maxWeightedProgress = this.tasks.reduce((sum, task) => {
      return sum + 100 * priorityWeights[task.priority];
    }, 0);
    const productionReadiness = Math.round((weightedProgress / maxWeightedProgress) * 100);

    // Estimate remaining time (rough calculation)
    const remainingTasks = this.tasks.filter((t) => t.status !== 'completed');
    const estimatedTimePerTask = {
      critical: 4, // hours
      high: 2,
      medium: 1,
      low: 0.5,
    };
    const estimatedTimeRemaining = remainingTasks.reduce((sum, task) => {
      const remainingProgress = (100 - task.progress) / 100;
      return sum + estimatedTimePerTask[task.priority] * remainingProgress;
    }, 0);

    return {
      reliabilityScore,
      codeQualityScore,
      productionReadiness,
      completedTasks,
      totalTasks,
      timeSpent,
      estimatedTimeRemaining,
    };
  }

  /**
   * Get tasks by category
   */
  getTasksByCategory(category: TaskProgress['category']): TaskProgress[] {
    return this.tasks.filter((t) => t.category === category);
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskProgress['status']): TaskProgress[] {
    return this.tasks.filter((t) => t.status === status);
  }

  /**
   * Get next priority tasks
   */
  getNextPriorityTasks(limit: number = 3): TaskProgress[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return this.tasks
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, limit);
  }

  /**
   * Generate progress report
   */
  generateProgressReport(): {
    metrics: ProgressMetrics;
    taskSummary: {
      byStatus: Record<TaskProgress['status'], number>;
      byPriority: Record<TaskProgress['priority'], number>;
      byCategory: Record<TaskProgress['category'], number>;
    };
    nextPriorityTasks: TaskProgress[];
    recentCompletions: TaskProgress[];
    timeAnalysis: {
      startedAt: Date;
      currentTime: Date;
      totalTimeSpent: number;
      averageTimePerTask: number;
      projectedCompletionDate: Date;
    };
  } {
    const metrics = this.getProgressMetrics();
    const nextPriorityTasks = this.getNextPriorityTasks(5);
    const recentCompletions = this.tasks
      .filter((t) => t.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 5);

    const taskSummary = {
      byStatus: this.tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {} as Record<TaskProgress['status'], number>
      ),
      byPriority: this.tasks.reduce(
        (acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        },
        {} as Record<TaskProgress['priority'], number>
      ),
      byCategory: this.tasks.reduce(
        (acc, task) => {
          acc[task.category] = (acc[task.category] || 0) + 1;
          return acc;
        },
        {} as Record<TaskProgress['category'], number>
      ),
    };

    const projectedCompletionDate = new Date(
      Date.now() + metrics.estimatedTimeRemaining * 60 * 60 * 1000
    );

    return {
      metrics,
      taskSummary,
      nextPriorityTasks,
      recentCompletions,
      timeAnalysis: {
        startedAt: this.startTime,
        currentTime: new Date(),
        totalTimeSpent: metrics.timeSpent,
        averageTimePerTask:
          metrics.completedTasks > 0 ? metrics.timeSpent / metrics.completedTasks : 0,
        projectedCompletionDate,
      },
    };
  }

  /**
   * Get formatted progress summary
   */
  getProgressSummary(): string {
    const metrics = this.getProgressMetrics();
    const report = this.generateProgressReport();

    return `
🚀 FitAI RELIABILITY PROGRESS DASHBOARD

📊 OVERALL METRICS:
• Reliability Score: ${metrics.reliabilityScore}%
• Code Quality Score: ${metrics.codeQualityScore}%
• Production Readiness: ${metrics.productionReadiness}%
• Completed Tasks: ${metrics.completedTasks}/${metrics.totalTasks}

⏱️ TIME ANALYSIS:
• Time Spent: ${metrics.timeSpent.toFixed(1)} hours
• Estimated Remaining: ${metrics.estimatedTimeRemaining.toFixed(1)} hours
• Projected Completion: ${report.timeAnalysis.projectedCompletionDate.toLocaleDateString()}

✅ RECENT COMPLETIONS:
${report.recentCompletions.map((task) => `• ${task.name}`).join('\n')}

🎯 NEXT PRIORITY TASKS:
${report.nextPriorityTasks.map((task) => `• ${task.name} (${task.priority})`).join('\n')}

📈 PROGRESS BY CATEGORY:
• Reliability: ${report.taskSummary.byCategory.reliability || 0} tasks
• Features: ${report.taskSummary.byCategory.features || 0} tasks  
• Performance: ${report.taskSummary.byCategory.performance || 0} tasks
• Security: ${report.taskSummary.byCategory.security || 0} tasks
    `.trim();
  }
}

// Singleton instance
export const progressDashboard = new ProgressDashboard();

export type { ProgressMetrics, TaskProgress };
