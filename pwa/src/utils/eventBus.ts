/**
 * Event Bus Implementation
 *
 * Provides a simple publish-subscribe mechanism for decoupled communication
 * between Concepts via Synchronizations.
 *
 * Key Principles:
 * - Concepts NEVER directly import each other
 * - All inter-concept communication goes through events
 * - Events are emitted with typed payloads
 * - Handlers can be async
 */

type EventHandler = (payload: unknown) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private debug: boolean = false;

  /**
   * Enable or disable debug logging
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  /**
   * Subscribe to an event
   *
   * @param event Event name to subscribe to
   * @param handler Function to call when event is emitted
   * @returns Unsubscribe function
   */
  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(handler);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to "${event}". Total handlers: ${this.handlers.get(event)!.size}`);
    }

    // Return unsubscribe function
    return () => {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        eventHandlers.delete(handler);
        if (this.debug) {
          console.log(`[EventBus] Unsubscribed from "${event}". Remaining handlers: ${eventHandlers.size}`);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event Event name to emit
   * @param payload Data to pass to handlers
   */
  async emit(event: string, payload: unknown): Promise<void> {
    const handlers = this.handlers.get(event);

    if (!handlers || handlers.size === 0) {
      if (this.debug) {
        console.warn(`[EventBus] No handlers for event "${event}"`);
      }
      return;
    }

    if (this.debug) {
      console.log(`[EventBus] Emitting "${event}" to ${handlers.size} handler(s)`, payload);
    }

    // Execute all handlers in parallel
    await Promise.all(
      Array.from(handlers).map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in handler for "${event}":`, error);
          // Don't throw - let other handlers continue
        }
      })
    );
  }

  /**
   * Remove all handlers for a specific event
   */
  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      if (this.debug) {
        console.log(`[EventBus] Cleared all handlers for "${event}"`);
      }
    } else {
      this.handlers.clear();
      if (this.debug) {
        console.log(`[EventBus] Cleared all event handlers`);
      }
    }
  }

  /**
   * Get count of handlers for an event (useful for testing)
   */
  getHandlerCount(event: string): number {
    return this.handlers.get(event)?.size || 0;
  }

  /**
   * Get list of all registered events (useful for debugging)
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export class for testing purposes
export { EventBus };
