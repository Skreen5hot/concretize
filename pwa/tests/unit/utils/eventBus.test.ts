/**
 * Unit tests for Event Bus
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../src/utils/eventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('subscribe', () => {
    test('subscribes to an event', () => {
      const handler = vi.fn();
      eventBus.subscribe('test:event', handler);

      expect(eventBus.getHandlerCount('test:event')).toBe(1);
    });

    test('allows multiple subscribers to same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test:event', handler1);
      eventBus.subscribe('test:event', handler2);

      expect(eventBus.getHandlerCount('test:event')).toBe(2);
    });

    test('returns unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe('test:event', handler);

      expect(eventBus.getHandlerCount('test:event')).toBe(1);

      unsubscribe();

      expect(eventBus.getHandlerCount('test:event')).toBe(0);
    });
  });

  describe('emit', () => {
    test('calls subscribed handlers', async () => {
      const handler = vi.fn();
      eventBus.subscribe('test:event', handler);

      await eventBus.emit('test:event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('calls all subscribed handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test:event', handler1);
      eventBus.subscribe('test:event', handler2);

      await eventBus.emit('test:event', { data: 'test' });

      expect(handler1).toHaveBeenCalledWith({ data: 'test' });
      expect(handler2).toHaveBeenCalledWith({ data: 'test' });
    });

    test('does not call handlers for different events', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('event:one', handler1);
      eventBus.subscribe('event:two', handler2);

      await eventBus.emit('event:one', {});

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    test('handles async handlers', async () => {
      const asyncHandler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      eventBus.subscribe('test:event', asyncHandler);

      await eventBus.emit('test:event', {});

      expect(asyncHandler).toHaveBeenCalled();
    });

    test('continues on handler error', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();

      eventBus.subscribe('test:event', errorHandler);
      eventBus.subscribe('test:event', goodHandler);

      // Should not throw
      await expect(eventBus.emit('test:event', {})).resolves.toBeUndefined();

      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
    });

    test('does nothing when no handlers exist', async () => {
      await expect(eventBus.emit('nonexistent:event', {})).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    test('clears specific event handlers', () => {
      const handler = vi.fn();
      eventBus.subscribe('test:event', handler);

      expect(eventBus.getHandlerCount('test:event')).toBe(1);

      eventBus.clear('test:event');

      expect(eventBus.getHandlerCount('test:event')).toBe(0);
    });

    test('clears all event handlers', () => {
      eventBus.subscribe('event:one', vi.fn());
      eventBus.subscribe('event:two', vi.fn());

      expect(eventBus.getRegisteredEvents().length).toBeGreaterThan(0);

      eventBus.clear();

      expect(eventBus.getRegisteredEvents().length).toBe(0);
    });
  });

  describe('getRegisteredEvents', () => {
    test('returns list of registered events', () => {
      eventBus.subscribe('event:one', vi.fn());
      eventBus.subscribe('event:two', vi.fn());
      eventBus.subscribe('event:three', vi.fn());

      const events = eventBus.getRegisteredEvents();

      expect(events).toContain('event:one');
      expect(events).toContain('event:two');
      expect(events).toContain('event:three');
      expect(events.length).toBe(3);
    });

    test('returns empty array when no events', () => {
      const events = eventBus.getRegisteredEvents();
      expect(events).toEqual([]);
    });
  });

  describe('debug mode', () => {
    test('can enable debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      eventBus.setDebug(true);
      eventBus.subscribe('test:event', vi.fn());

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
