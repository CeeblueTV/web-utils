/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from './EventEmitter';

// Test class that extends EventEmitter
class TestEmitter extends EventEmitter {
    onTest(value: string) {
        // Default implementation
        console.log('Default test:', value);
    }

    onAnother(value: number) {
        // Default implementation
        console.log('Default another:', value);
    }

    triggerTest(value: string) {
        this.onTest(value);
    }

    triggerAnother(value: number) {
        this.onAnother(value);
    }
}

describe('EventEmitter', () => {
    let emitter: TestEmitter;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        emitter = new TestEmitter();
        consoleSpy = vi.spyOn(console, 'log');
    });

    describe('default event handling', () => {
        it('should call default handler when event is triggered', () => {
            emitter.triggerTest('test value');
            expect(consoleSpy).toHaveBeenCalledWith('Default test:', 'test value');
        });

        it('should allow overriding default handler', () => {
            const newHandler = vi.fn();
            emitter.onTest = newHandler;
            emitter.triggerTest('test value');
            expect(newHandler).toHaveBeenCalledWith('test value');
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle multiple events independently', () => {
            const testHandler = vi.fn();
            const anotherHandler = vi.fn();
            emitter.onTest = testHandler;
            emitter.onAnother = anotherHandler;

            emitter.triggerTest('test');
            emitter.triggerAnother(42);

            expect(testHandler).toHaveBeenCalledWith('test');
            expect(anotherHandler).toHaveBeenCalledWith(42);
        });
    });

    describe('event subscription', () => {
        it('should allow subscribing to events', () => {
            const handler = vi.fn();
            emitter.on('test', handler);
            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledWith('test value');
            expect(consoleSpy).toHaveBeenCalledWith('Default test:', 'test value');
        });

        it('should allow multiple subscribers to the same event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            emitter.on('test', handler1);
            emitter.on('test', handler2);
            emitter.triggerTest('test value');
            expect(handler1).toHaveBeenCalledWith('test value');
            expect(handler2).toHaveBeenCalledWith('test value');
        });

        it('should throw error for non-existent events', () => {
            expect(() => emitter.on('nonexistent' as 'test', vi.fn())).toThrow(/No event onnonexistent/);
        });
    });

    describe('event unsubscription', () => {
        it('should allow unsubscribing from events', () => {
            const handler = vi.fn();
            emitter.on('test', handler);
            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledTimes(1);

            emitter.off('test', handler);
            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should return false when unsubscribing non-existent handler', () => {
            const result = emitter.off('test', vi.fn());
            expect(result).toBe(false);
        });
    });

    describe('once subscription', () => {
        it('should trigger handler only once', () => {
            const handler = vi.fn();
            emitter.once('test', handler);
            emitter.triggerTest('test value');
            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('AbortController integration', () => {
        it('should unsubscribe when AbortController is aborted', () => {
            const controller = new AbortController();
            const handler = vi.fn();
            emitter.on('test', handler, { signal: controller.signal });

            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledTimes(1);

            controller.abort();
            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple subscriptions with same AbortController', () => {
            const controller = new AbortController();
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            emitter.on('test', handler1, { signal: controller.signal });
            emitter.on('test', handler2, { signal: controller.signal });

            emitter.triggerTest('test value');
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);

            controller.abort();
            emitter.triggerTest('test value');
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should handle AbortController with once subscription', () => {
            const controller = new AbortController();
            const handler = vi.fn();
            emitter.once('test', handler, { signal: controller.signal });

            controller.abort();
            emitter.triggerTest('test value');
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('case sensitivity', () => {
        it('should handle case variations in event names', () => {
            const handler = vi.fn();
            emitter.on('Test', handler);
            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledWith('test value');
        });

        it('should handle mixed case in event names', () => {
            const handler = vi.fn();
            emitter.on('Test', handler);
            emitter.triggerTest('test value');
            expect(handler).toHaveBeenCalledWith('test value');
        });
    });
});
