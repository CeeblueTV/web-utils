/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ByteRate } from './ByteRate';
import * as Util from './Util';

vi.mock('./Util', () => ({
    // Mock the time function to have deterministic tests
    time: vi.fn()
}));

describe('ByteRate', () => {
    let currentTime = 0;

    beforeEach(() => {
        currentTime = 0;
        (Util.time as Mock).mockImplementation(() => currentTime);
    });

    describe('constructor', () => {
        it('should initialize with default interval', () => {
            const rate = new ByteRate();
            expect(rate.interval).toBe(1000);
            expect(rate.value()).toBe(0);
        });

        it('should initialize with custom interval', () => {
            const rate = new ByteRate(2000);
            expect(rate.interval).toBe(2000);
            expect(rate.value()).toBe(0);
        });
    });

    describe('basic operations', () => {
        it('should calculate byte rate correctly', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(1000);
            currentTime += 1000;
            expect(rate.value()).toBe(1000);
        });

        it('should handle multiple addBytes calls', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(500);
            currentTime += 500;
            rate.addBytes(500);
            currentTime += 500;
            expect(rate.value()).toBe(1000);
        });

        it('should clear all data', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(1000);
            currentTime += 1000;
            rate.clear();
            expect(rate.value()).toBe(0);
        });

        it('should handle onBytes callback', () => {
            const rate = new ByteRate(1000);
            let callbackBytes = 0;
            rate.onBytes = bytes => {
                callbackBytes = bytes;
            };
            rate.addBytes(1000);
            expect(callbackBytes).toBe(1000);
        });
    });

    describe('sample management', () => {
        it('should handle multiple samples within interval', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(500);
            currentTime += 250;
            rate.addBytes(500);
            currentTime += 250;
            rate.addBytes(500);
            currentTime += 250;
            rate.addBytes(500);
            currentTime += 250;
            expect(rate.value()).toBe(2000);
        });

        it('should clip samples correctly', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(500);
            currentTime += 500;
            rate.clip();
            rate.addBytes(500);
            currentTime += 500;
            expect(rate.value()).toBe(1000); // Only second half
        });

        it('should handle multiple clips', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(500);
            currentTime += 500;
            rate.clip();
            rate.addBytes(500);
            currentTime += 500;
            rate.clip();
            rate.addBytes(500);
            currentTime += 500;
            expect(rate.value()).toBe(1000);
        });

        it('should handle clip with partial sample', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(1000);
            currentTime += 500;
            rate.clip();
            currentTime += 500;
            expect(rate.value()).toBe(1000);
        });
    });

    describe('edge cases', () => {
        it('should handle zero interval', () => {
            const rate = new ByteRate(0);
            rate.addBytes(1000);
            expect(rate.value()).toBe(0);
        });

        it('should handle negative bytes', () => {
            const rate = new ByteRate(1000);
            rate.addBytes(-1000);
            currentTime += 1000;
            expect(rate.value()).toBe(-1000);
        });
    });
});
