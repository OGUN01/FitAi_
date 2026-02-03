/**
 * Tests for authEvents - Event Bus for Auth State Changes
 *
 * This module breaks the circular dependency between SyncEngine and authStore
 * by using an event-based pattern instead of direct imports.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  authEvents,
  AuthEvent,
  AuthEventCallback,
} from "../../services/authEvents";

describe("authEvents", () => {
  beforeEach(() => {
    // Reset event bus state between tests
    authEvents.removeAllListeners();
  });

  afterEach(() => {
    authEvents.removeAllListeners();
    vi.clearAllMocks();
  });

  describe("subscribe", () => {
    it("should return an unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = authEvents.subscribe("SIGNED_IN", callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should allow multiple subscribers to the same event", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      authEvents.subscribe("SIGNED_IN", callback1);
      authEvents.subscribe("SIGNED_IN", callback2);

      authEvents.emit("SIGNED_IN", {
        userId: "user-123",
        email: "test@example.com",
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe("emit", () => {
    it("should call subscribed callbacks with event data on SIGNED_IN", () => {
      const callback = vi.fn();
      authEvents.subscribe("SIGNED_IN", callback);

      const eventData = { userId: "user-123", email: "test@example.com" };
      authEvents.emit("SIGNED_IN", eventData);

      expect(callback).toHaveBeenCalledWith({
        type: "SIGNED_IN",
        data: eventData,
      });
    });

    it("should call subscribed callbacks on SIGNED_OUT", () => {
      const callback = vi.fn();
      authEvents.subscribe("SIGNED_OUT", callback);

      authEvents.emit("SIGNED_OUT");

      expect(callback).toHaveBeenCalledWith({
        type: "SIGNED_OUT",
        data: undefined,
      });
    });

    it("should not call callbacks for other event types", () => {
      const signInCallback = vi.fn();
      const signOutCallback = vi.fn();

      authEvents.subscribe("SIGNED_IN", signInCallback);
      authEvents.subscribe("SIGNED_OUT", signOutCallback);

      authEvents.emit("SIGNED_IN", {
        userId: "user-123",
        email: "test@example.com",
      });

      expect(signInCallback).toHaveBeenCalledTimes(1);
      expect(signOutCallback).not.toHaveBeenCalled();
    });

    it("should handle AUTH_STATE_CHANGE event", () => {
      const callback = vi.fn();
      authEvents.subscribe("AUTH_STATE_CHANGE", callback);

      const eventData = {
        userId: "user-123",
        email: "test@example.com",
        isAuthenticated: true,
      };
      authEvents.emit("AUTH_STATE_CHANGE", eventData);

      expect(callback).toHaveBeenCalledWith({
        type: "AUTH_STATE_CHANGE",
        data: eventData,
      });
    });
  });

  describe("unsubscribe", () => {
    it("should stop receiving events after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = authEvents.subscribe("SIGNED_IN", callback);

      authEvents.emit("SIGNED_IN", {
        userId: "user-123",
        email: "test@example.com",
      });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      authEvents.emit("SIGNED_IN", {
        userId: "user-456",
        email: "test2@example.com",
      });
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe("removeAllListeners", () => {
    it("should remove all subscriptions", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      authEvents.subscribe("SIGNED_IN", callback1);
      authEvents.subscribe("SIGNED_OUT", callback2);

      authEvents.removeAllListeners();

      authEvents.emit("SIGNED_IN", {
        userId: "user-123",
        email: "test@example.com",
      });
      authEvents.emit("SIGNED_OUT");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentUserId", () => {
    it("should return null when no user is signed in", () => {
      expect(authEvents.getCurrentUserId()).toBeNull();
    });

    it("should return userId after SIGNED_IN event", () => {
      authEvents.emit("SIGNED_IN", {
        userId: "user-123",
        email: "test@example.com",
      });
      expect(authEvents.getCurrentUserId()).toBe("user-123");
    });

    it("should return null after SIGNED_OUT event", () => {
      authEvents.emit("SIGNED_IN", {
        userId: "user-123",
        email: "test@example.com",
      });
      authEvents.emit("SIGNED_OUT");
      expect(authEvents.getCurrentUserId()).toBeNull();
    });
  });
});
