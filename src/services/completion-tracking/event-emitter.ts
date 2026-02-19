import { CompletionEvent, CompletionListener } from "./types";

export class EventEmitter {
  private listeners: CompletionListener[] = [];

  /**
   * Subscribe to completion events
   * @param listener Function to call when events occur
   * @returns Unsubscribe function
   */
  subscribe(listener: CompletionListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit completion event to all listeners
   * @param event The completion event to emit
   */
  emit(event: CompletionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
