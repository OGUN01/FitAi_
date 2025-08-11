/**
 * Reliability Tracker - Monitor and track reliability improvements
 * This utility helps track progress on fixing reliability issues
 */

interface ReliabilityIssue {
  id: string;
  type: 'fontWeight' | 'console.log' | 'todo' | 'errorHandling';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  fixedAt?: Date;
  estimatedEffort: number; // hours
}

interface ReliabilityReport {
  totalIssues: number;
  completedIssues: number;
  pendingIssues: number;
  progressPercentage: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  estimatedTimeRemaining: number;
}

class ReliabilityTracker {
  private issues: ReliabilityIssue[] = [];

  /**
   * Add a new reliability issue to track
   */
  addIssue(issue: Omit<ReliabilityIssue, 'id' | 'status'>): string {
    const id = `${issue.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.issues.push({
      ...issue,
      id,
      status: 'pending',
    });
    return id;
  }

  /**
   * Mark an issue as completed
   */
  completeIssue(id: string): boolean {
    const issue = this.issues.find((i) => i.id === id);
    if (issue) {
      issue.status = 'completed';
      issue.fixedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Update issue status
   */
  updateIssueStatus(id: string, status: ReliabilityIssue['status']): boolean {
    const issue = this.issues.find((i) => i.id === id);
    if (issue) {
      issue.status = status;
      if (status === 'completed' && !issue.fixedAt) {
        issue.fixedAt = new Date();
      }
      return true;
    }
    return false;
  }

  /**
   * Generate comprehensive reliability report
   */
  generateReport(): ReliabilityReport {
    const totalIssues = this.issues.length;
    const completedIssues = this.issues.filter((i) => i.status === 'completed').length;
    const pendingIssues = this.issues.filter((i) => i.status === 'pending').length;
    const progressPercentage =
      totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 100;

    const issuesByType = this.issues.reduce(
      (acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const issuesBySeverity = this.issues.reduce(
      (acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const estimatedTimeRemaining = this.issues
      .filter((i) => i.status !== 'completed')
      .reduce((acc, issue) => acc + issue.estimatedEffort, 0);

    return {
      totalIssues,
      completedIssues,
      pendingIssues,
      progressPercentage,
      issuesByType,
      issuesBySeverity,
      estimatedTimeRemaining,
    };
  }

  /**
   * Get issues by status
   */
  getIssuesByStatus(status: ReliabilityIssue['status']): ReliabilityIssue[] {
    return this.issues.filter((i) => i.status === status);
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: ReliabilityIssue['severity']): ReliabilityIssue[] {
    return this.issues.filter((i) => i.severity === severity);
  }

  /**
   * Get issues by type
   */
  getIssuesByType(type: ReliabilityIssue['type']): ReliabilityIssue[] {
    return this.issues.filter((i) => i.type === type);
  }

  /**
   * Export reliability data for reporting
   */
  exportData(): {
    report: ReliabilityReport;
    issues: ReliabilityIssue[];
    generatedAt: Date;
  } {
    return {
      report: this.generateReport(),
      issues: [...this.issues],
      generatedAt: new Date(),
    };
  }

  /**
   * Get top priority issues (critical severity, not completed)
   */
  getTopPriorityIssues(): ReliabilityIssue[] {
    return this.issues
      .filter((i) => i.status !== 'completed')
      .sort((a, b) => {
        // Sort by severity (critical first), then by estimated effort (lower first)
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.estimatedEffort - b.estimatedEffort;
      });
  }

  /**
   * Initialize with current known issues from audit
   */
  initializeWithKnownIssues(): void {
    // FontWeight issues (127 instances found)
    this.addIssue({
      type: 'fontWeight',
      severity: 'critical',
      file: 'Multiple files (127 instances)',
      description: 'String fontWeight values causing potential HostFunction errors',
      estimatedEffort: 2,
    });

    // Console.log issues (10+ files)
    this.addIssue({
      type: 'console.log',
      severity: 'medium',
      file: '10+ files',
      description: 'console.log statements need to be replaced with proper logging',
      estimatedEffort: 1,
    });

    // Critical TODOs
    this.addIssue({
      type: 'todo',
      severity: 'critical',
      file: 'src/services/dataManager.ts:88',
      line: 88,
      description: 'Implement schema repair logic based on validation errors',
      estimatedEffort: 4,
    });

    this.addIssue({
      type: 'todo',
      severity: 'high',
      file: 'src/ai/index.ts:175',
      line: 175,
      description: 'Add demo weekly workout plan generation',
      estimatedEffort: 2,
    });

    this.addIssue({
      type: 'todo',
      severity: 'high',
      file: 'src/ai/index.ts:194',
      line: 194,
      description: 'Add demo weekly meal plan generation',
      estimatedEffort: 2,
    });

    this.addIssue({
      type: 'todo',
      severity: 'medium',
      file: 'src/screens/settings/NotificationsScreen.tsx:109',
      line: 109,
      description: 'Implement time picker',
      estimatedEffort: 1,
    });

    this.addIssue({
      type: 'todo',
      severity: 'medium',
      file: 'src/services/foodRecognitionService.ts:379',
      line: 379,
      description: 'Implement image compression and optimization',
      estimatedEffort: 3,
    });
  }
}

// Singleton instance
export const reliabilityTracker = new ReliabilityTracker();

// Initialize with known issues on first import
reliabilityTracker.initializeWithKnownIssues();

export type { ReliabilityIssue, ReliabilityReport };
