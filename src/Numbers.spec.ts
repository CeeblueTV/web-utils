/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { Numbers } from './Numbers';

describe('Numbers', () => {
    describe('constructor', () => {
        it('should create empty collection', () => {
            const numbers = new Numbers();
            expect(numbers.size).toBe(0);
            expect(numbers.minimum).toBe(0);
            expect(numbers.maximum).toBe(0);
            expect(numbers.average).toBe(0);
        });

        it('should create collection with capacity', () => {
            const numbers = new Numbers(2);
            numbers.push(1).push(2).push(3);
            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(2);
            expect(numbers.maximum).toBe(3);
            expect(numbers.average).toBe(2.5);
        });
    });

    describe('push', () => {
        it('should add numbers and update statistics', () => {
            const numbers = new Numbers();
            numbers.push(1).push(2).push(3);
            expect(numbers.size).toBe(3);
            expect(numbers.minimum).toBe(1);
            expect(numbers.maximum).toBe(3);
            expect(numbers.average).toBe(2);
        });

        it('should handle negative numbers', () => {
            const numbers = new Numbers();
            numbers.push(-1).push(-2).push(-3);
            expect(numbers.size).toBe(3);
            expect(numbers.minimum).toBe(-3);
            expect(numbers.maximum).toBe(-1);
            expect(numbers.average).toBe(-2);
        });

        it('should handle zero values', () => {
            const numbers = new Numbers();
            numbers.push(0).push(0).push(0);
            expect(numbers.size).toBe(3);
            expect(numbers.minimum).toBe(0);
            expect(numbers.maximum).toBe(0);
            expect(numbers.average).toBe(0);
        });

        it('should handle decimal numbers', () => {
            const numbers = new Numbers();
            numbers.push(1.5).push(2.5).push(3.5);
            expect(numbers.size).toBe(3);
            expect(numbers.minimum).toBe(1.5);
            expect(numbers.maximum).toBe(3.5);
            expect(numbers.average).toBe(2.5);
        });
    });

    describe('pop', () => {
        it('should remove numbers and update statistics', () => {
            const numbers = new Numbers();
            numbers.push(1).push(2).push(3);
            expect(numbers.pop()).toBe(1);
            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(2);
            expect(numbers.maximum).toBe(3);
            expect(numbers.average).toBe(2.5);
        });

        it('should handle popping from empty collection', () => {
            const numbers = new Numbers();
            expect(numbers.pop()).toBeUndefined();
            expect(numbers.size).toBe(0);
            expect(numbers.minimum).toBe(0);
            expect(numbers.maximum).toBe(0);
            expect(numbers.average).toBe(0);
        });

        it('should handle popping last element', () => {
            const numbers = new Numbers(3);
            numbers.push(1);
            expect(numbers.pop()).toBe(1);
            expect(numbers.size).toBe(0);
            expect(numbers.minimum).toBe(0);
            expect(numbers.maximum).toBe(0);
            expect(numbers.average).toBe(0);

            numbers.push(1).push(2).push(3);
            expect(numbers.pop()).toBe(1);
            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(2);
            expect(numbers.maximum).toBe(3);
            expect(numbers.average).toBe(2.5);
        });

        it('should handle popping maximum value', () => {
            const numbers = new Numbers();
            numbers.push(1).push(3).push(2);
            expect(numbers.pop()).toBe(1);
            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(2);
            expect(numbers.maximum).toBe(3);
            expect(numbers.average).toBe(2.5);
        });

        it('should handle popping minimum value', () => {
            const numbers = new Numbers();
            numbers.push(3).push(1).push(2);
            expect(numbers.pop()).toBe(3);
            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(1);
            expect(numbers.maximum).toBe(2);
            expect(numbers.average).toBe(1.5);
        });
    });

    describe('clear', () => {
        it('should reset collection and statistics', () => {
            const numbers = new Numbers();
            numbers.push(1).push(2).push(3);
            numbers.clear();
            expect(numbers.size).toBe(0);
            expect(numbers.minimum).toBe(0);
            expect(numbers.maximum).toBe(0);
            expect(numbers.average).toBe(0);
        });

        it('should allow adding numbers after clearing', () => {
            const numbers = new Numbers();
            numbers.push(1).push(2).push(3);
            numbers.clear();
            numbers.push(4).push(5);
            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(4);
            expect(numbers.maximum).toBe(5);
            expect(numbers.average).toBe(4.5);
        });
    });

    describe('capacity limit', () => {
        it('should respect capacity limit', () => {
            const numbers = new Numbers(2);
            numbers.push(1).push(2).push(3);
            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(2);
            expect(numbers.maximum).toBe(3);
            expect(numbers.average).toBe(2.5);
        });

        it('should maintain correct statistics when exceeding capacity', () => {
            const numbers = new Numbers(2);
            numbers.push(1).push(2).push(3).push(4);

            expect(numbers.size).toBe(2);
            expect(numbers.minimum).toBe(3);
            expect(numbers.maximum).toBe(4);
            expect(numbers.average).toBe(3.5);
        });
    });
});
