/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { Queue } from './Queue';

describe('Queue', () => {
    describe('constructor', () => {
        it('should create empty queue', () => {
            const queue = new Queue<number>();
            expect(queue.size).toBe(0);
            expect(queue.capacity).toBeUndefined();
        });

        it('should create queue with capacity', () => {
            const queue = new Queue<number>(2);
            expect(queue.size).toBe(0);
            expect(queue.capacity).toBe(2);
        });
    });

    describe('push', () => {
        it('should add elements to queue', () => {
            const queue = new Queue<number>();
            queue.push(1).push(2).push(3);
            expect(queue.size).toBe(3);
            expect(queue.front).toBe(1);
            expect(queue.back).toBe(3);
        });

        it('should respect capacity limit', () => {
            const queue = new Queue<number>(2);
            queue.push(1).push(2).push(3);
            expect(queue.size).toBe(2);
            expect(queue.front).toBe(2);
            expect(queue.back).toBe(3);
        });

        it('should handle different types', () => {
            const queue = new Queue<string>();
            queue.push('a').push('b').push('c');
            expect(queue.size).toBe(3);
            expect(queue.front).toBe('a');
            expect(queue.back).toBe('c');
        });

        it('should handle objects', () => {
            const queue = new Queue<{ id: number }>();
            queue.push({ id: 1 }).push({ id: 2 });
            expect(queue.size).toBe(2);
            expect(queue.front.id).toBe(1);
            expect(queue.back.id).toBe(2);
        });
    });

    describe('pop', () => {
        it('should remove and return front element', () => {
            const queue = new Queue<number>();
            queue.push(1).push(2).push(3);
            expect(queue.pop()).toBe(1);
            expect(queue.size).toBe(2);
            expect(queue.front).toBe(2);
            expect(queue.back).toBe(3);
        });

        it('should return undefined when queue is empty', () => {
            const queue = new Queue<number>();
            expect(queue.pop()).toBeUndefined();
            expect(queue.size).toBe(0);
        });

        it('should handle popping last element', () => {
            const queue = new Queue<number>();
            queue.push(1);
            expect(queue.pop()).toBe(1);
            expect(queue.size).toBe(0);
        });
    });

    describe('clear', () => {
        it('should remove all elements', () => {
            const queue = new Queue<number>();
            queue.push(1).push(2).push(3);
            queue.clear();
            expect(queue.size).toBe(0);
        });

        it('should allow adding elements after clearing', () => {
            const queue = new Queue<number>();
            queue.push(1).push(2).push(3);
            queue.clear();
            queue.push(4).push(5);
            expect(queue.size).toBe(2);
            expect(queue.front).toBe(4);
            expect(queue.back).toBe(5);
        });
    });

    describe('capacity property', () => {
        it('should set new capacity', () => {
            const queue = new Queue<number>();
            queue.push(1).push(2).push(3);
            queue.capacity = 2;
            expect(queue.size).toBe(2);
            expect(queue.front).toBe(2);
            expect(queue.back).toBe(3);
        });

        it('should remove capacity limit', () => {
            const queue = new Queue<number>(2);
            queue.push(1).push(2);
            queue.capacity = undefined;
            queue.push(3);
            expect(queue.size).toBe(3);
            expect(queue.front).toBe(1);
            expect(queue.back).toBe(3);
        });

        it('should handle increasing capacity', () => {
            const queue = new Queue<number>(1);
            queue.push(1);
            queue.capacity = 2;
            queue.push(2);
            expect(queue.size).toBe(2);
            expect(queue.front).toBe(1);
            expect(queue.back).toBe(2);
        });
    });

    describe('iteration', () => {
        it('should iterate through elements in order', () => {
            const queue = new Queue<number>(3);
            queue.push(1).push(2).push(3);
            const elements = [...queue];
            expect(elements).toEqual([1, 2, 3]);
        });

        it('should handle empty queue iteration', () => {
            const queue = new Queue<number>(3);
            const elements = [...queue];
            expect(elements).toEqual([]);
        });

        it('should maintain order after capacity changes', () => {
            const queue = new Queue<number>(2);
            queue.push(1).push(2);
            queue.capacity = 3;
            queue.push(3);
            const elements = [...queue];
            expect(elements).toEqual([1, 2, 3]);
        });
    });

    describe('edge cases', () => {
        it('should handle zero capacity', () => {
            const queue = new Queue<number>(0);
            queue.push(1);
            expect(queue.size).toBe(0);
        });

        it('should handle negative capacity', () => {
            const queue = new Queue<number>(-1); // Negative capacity is ignored
            queue.push(1);
            expect(queue.size).toBe(1);
        });

        it('should handle undefined values', () => {
            const queue = new Queue<number | undefined>(2);
            queue.push(undefined).push(1);
            expect(queue.size).toBe(2);
            expect(queue.front).toBeUndefined();
            expect(queue.back).toBe(1);
        });

        it('should handle null values', () => {
            const queue = new Queue<number | null>();
            queue.push(null).push(1);
            expect(queue.size).toBe(2);
            expect(queue.front).toBeNull();
            expect(queue.back).toBe(1);
        });
    });
});
