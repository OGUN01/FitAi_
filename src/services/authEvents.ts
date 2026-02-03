/**
 * Auth Events - Event Bus for Auth State Changes
 *
 * ARCHITECTURAL PURPOSE: Breaks circular dependency between SyncEngine and authStore.
 * Chain was: SyncEngine -> authStore -> auth.ts -> migrationManager -> DataBridge -> SyncEngine
 * Now: authStore publishes to authEvents, SyncEngine subscribes to authEvents (no direct import)
 */

export type AuthEventType = "SIGNED_IN" | "SIGNED_OUT" | "AUTH_STATE_CHANGE";

export interface AuthEventData {
  userId?: string;
  email?: string;
  isAuthenticated?: boolean;
}

export interface AuthEvent {
  type: AuthEventType;
  data?: AuthEventData;
}

export type AuthEventCallback = (event: AuthEvent) => void;

interface Subscription {
  eventType: AuthEventType;
  callback: AuthEventCallback;
}

class AuthEventBus {
  private subscriptions: Subscription[] = [];
  private currentUserId: string | null = null;

  subscribe(eventType: AuthEventType, callback: AuthEventCallback): () => void {
    const subscription: Subscription = { eventType, callback };
    this.subscriptions.push(subscription);

    return () => {
      const index = this.subscriptions.indexOf(subscription);
      if (index !== -1) {
        this.subscriptions.splice(index, 1);
      }
    };
  }

  emit(eventType: AuthEventType, data?: AuthEventData): void {
    if (eventType === "SIGNED_IN" && data?.userId) {
      this.currentUserId = data.userId;
    } else if (eventType === "SIGNED_OUT") {
      this.currentUserId = null;
    }

    const event: AuthEvent = { type: eventType, data };

    this.subscriptions
      .filter((sub) => sub.eventType === eventType)
      .forEach((sub) => {
        try {
          sub.callback(event);
        } catch (error) {
          console.error(`[authEvents] Error in ${eventType} callback:`, error);
        }
      });
  }

  removeAllListeners(): void {
    this.subscriptions = [];
    this.currentUserId = null;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

export const authEvents = new AuthEventBus();
export default authEvents;
