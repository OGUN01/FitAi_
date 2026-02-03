export type WeightEventType = "WEIGHT_CHANGED";

export interface WeightChangeData {
  previousWeight: number | null;
  currentWeight: number;
  timestamp: string;
}

export interface WeightChangeEvent {
  type: WeightEventType;
  data: WeightChangeData;
}

export type WeightChangeCallback = (event: WeightChangeEvent) => void;

interface WeightHistoryEntry {
  weight: number;
  timestamp: string;
}

interface Subscription {
  eventType: WeightEventType;
  callback: WeightChangeCallback;
}

class WeightTrackingService {
  private subscriptions: Subscription[] = [];
  private currentWeight: number | null = null;
  private weightHistory: WeightHistoryEntry[] = [];

  getCurrentWeight(): number | null {
    return this.currentWeight;
  }

  setWeight(weightKg: number): void {
    if (this.currentWeight === weightKg) {
      return;
    }

    const previousWeight = this.currentWeight;
    this.currentWeight = weightKg;

    const timestamp = new Date().toISOString();
    this.weightHistory.push({ weight: weightKg, timestamp });

    this.emit("WEIGHT_CHANGED", {
      previousWeight,
      currentWeight: weightKg,
      timestamp,
    });
  }

  subscribe(
    eventType: WeightEventType,
    callback: WeightChangeCallback,
  ): () => void {
    const subscription: Subscription = { eventType, callback };
    this.subscriptions.push(subscription);

    return () => {
      const index = this.subscriptions.indexOf(subscription);
      if (index !== -1) {
        this.subscriptions.splice(index, 1);
      }
    };
  }

  private emit(eventType: WeightEventType, data: WeightChangeData): void {
    const event: WeightChangeEvent = { type: eventType, data };

    this.subscriptions
      .filter((sub) => sub.eventType === eventType)
      .forEach((sub) => {
        try {
          sub.callback(event);
        } catch (error) {
          console.error(
            `[WeightTrackingService] Error in ${eventType} callback:`,
            error,
          );
        }
      });
  }

  removeAllListeners(): void {
    this.subscriptions = [];
    this.currentWeight = null;
    this.weightHistory = [];
  }

  getWeightHistory(): WeightHistoryEntry[] {
    return [...this.weightHistory];
  }

  initializeFromBodyAnalysis(bodyAnalysis: {
    current_weight_kg: number | null;
  }): void {
    if (bodyAnalysis.current_weight_kg !== null) {
      this.currentWeight = bodyAnalysis.current_weight_kg;
    } else {
      this.currentWeight = null;
    }
  }
}

export const weightTrackingService = new WeightTrackingService();
export default weightTrackingService;
