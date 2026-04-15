/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, vi } from 'vitest';
import { BitReader } from './BitReader';

describe('BitReader', () => {
    describe('constructor', () => {
        it('should create reader from Uint8Array', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BitReader(data);
            expect(reader.size()).toBe(4);
            expect(reader.available()).toBe(32);
        });

        it('should create reader from ArrayBuffer', () => {
            const buffer = new ArrayBuffer(4);
            new Uint8Array(buffer).set([1, 2, 3, 4]);
            const reader = new BitReader(buffer);
            expect(reader.size()).toBe(4);
            expect(reader.available()).toBe(32);
        });

        it('should keep the correct window when created from a typed-array view', () => {
            const buffer = new Uint8Array([9, 1, 2, 3, 4, 9]);
            const view = buffer.subarray(1, 5);
            const reader = new BitReader(view);

            expect(reader.data()).toEqual(new Uint8Array([1, 2, 3, 4]));
            expect(reader.size()).toBe(4);
            expect(reader.read8()).toBe(1);
        });
    });

    describe('basic operations', () => {
        it('should read and return correct data', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BitReader(data);
            expect(reader.data()).toEqual(data);
        });

        it('should return correct size', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BitReader(data);
            expect(reader.size()).toBe(4);
        });

        it('should return correct available bits', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BitReader(data);
            expect(reader.available()).toBe(32);
            reader.next(8);
            expect(reader.available()).toBe(24);
        });

        it('should handle next operation correctly', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BitReader(data);
            expect(reader.next(8)).toBe(8);
            expect(reader.available()).toBe(24);
        });

        it('should advance by one bit when next is called without arguments', () => {
            const data = new Uint8Array([0b10101010]);
            const reader = new BitReader(data);

            expect(reader.next()).toBe(1);
            expect(reader.available()).toBe(7);
            expect(reader.read(3)).toBe(0b010);
        });

        it('should not advance when next is called with zero bits', () => {
            const data = new Uint8Array([0b10101010]);
            const reader = new BitReader(data);

            expect(reader.next(0)).toBe(0);
            expect(reader.available()).toBe(8);
            expect(reader.read(4)).toBe(0b1010);
        });

        it('should return zero when next is called at end of buffer', () => {
            const data = new Uint8Array([0b10101010]);
            const reader = new BitReader(data);

            expect(reader.next(8)).toBe(8);
            expect(reader.next(1)).toBe(0);
            expect(reader.available()).toBe(0);
        });
    });

    describe('bit reading operations', () => {
        it('should read single bits correctly', () => {
            const data = new Uint8Array([0b10101010]);
            const reader = new BitReader(data);
            expect(reader.read(1)).toBe(1);
            expect(reader.read(1)).toBe(0);
            expect(reader.read(1)).toBe(1);
            expect(reader.read(1)).toBe(0);
            expect(reader.read(1)).toBe(1);
            expect(reader.read(1)).toBe(0);
            expect(reader.read(1)).toBe(1);
            expect(reader.read(1)).toBe(0);
        });

        it('should read multiple bits correctly', () => {
            const data = new Uint8Array([0b10101010]);
            const reader = new BitReader(data);
            expect(reader.read(2)).toBe(0b10);
            expect(reader.read(2)).toBe(0b10);
            expect(reader.read(2)).toBe(0b10);
            expect(reader.read(2)).toBe(0b10);
        });

        it('should read across byte boundaries correctly', () => {
            const data = new Uint8Array([0b11110000, 0b00001111]);
            const reader = new BitReader(data);
            expect(reader.read(4)).toBe(0b1111);
            expect(reader.read(4)).toBe(0b0000);
            expect(reader.read(4)).toBe(0b0000);
            expect(reader.read(4)).toBe(0b1111);
        });
    });

    describe('numeric reading operations', () => {
        it('should read 8-bit values correctly', () => {
            const data = new Uint8Array([0xff, 0x80, 0x40, 0x20]);
            const reader = new BitReader(data);
            expect(reader.read8()).toBe(0xff);
            expect(reader.read8()).toBe(0x80);
            expect(reader.read8()).toBe(0x40);
            expect(reader.read8()).toBe(0x20);
        });

        it('should read 16-bit values correctly', () => {
            const data = new Uint8Array([0xff, 0xff, 0x80, 0x00, 0x40, 0x00]);
            const reader = new BitReader(data);
            expect(reader.read16()).toBe(0xffff);
            expect(reader.read16()).toBe(0x8000);
            expect(reader.read16()).toBe(0x4000);
        });

        it('should read 24-bit values correctly', () => {
            const data = new Uint8Array([0xff, 0xff, 0xff, 0x80, 0x00, 0x00]);
            const reader = new BitReader(data);
            expect(reader.read24()).toBe(0xffffff);
            expect(reader.read24()).toBe(0x800000);
        });

        it('should read 32-bit values correctly', () => {
            const data = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x80, 0x00, 0x00, 0x00]);
            const reader = new BitReader(data);
            expect(reader.read32()).toBe(0xffffffff);
            expect(reader.read32()).toBe(0x80000000);
        });
    });

    describe('exponential golomb coding', () => {
        it('should read exp golomb codes correctly', () => {
            // Test case: 0, 1, 2, 3, 4
            // Binary representation: 1, 010, 011, 00100, 00101
            const data = new Uint8Array([0b10100110, 0b01000010, 0b10000000]);
            const reader = new BitReader(data);
            expect(reader.readExpGolomb()).toBe(0);
            expect(reader.readExpGolomb()).toBe(1);
            expect(reader.readExpGolomb()).toBe(2);
            expect(reader.readExpGolomb()).toBe(3);
            expect(reader.readExpGolomb()).toBe(4);
        });

        it('should handle exp golomb codes exceeding 16 bits', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const data = new Uint8Array([0x00, 0x00, 0x80, 0x00, 0x00]);
            const reader = new BitReader(data);

            expect(reader.readExpGolomb()).toBe(0);
            expect(warnSpy).toHaveBeenCalledWith('Exponential-Golomb code exceeding unsigned 16 bits');

            warnSpy.mockRestore();
        });

        it('should return zero when exp golomb code is truncated', () => {
            const data = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00]);
            const reader = new BitReader(data);

            expect(reader.readExpGolomb()).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('should handle reading beyond buffer size', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BitReader(data);
            reader.next(32);
            expect(reader.read(1)).toBe(0);
            expect(reader.read(8)).toBe(0);
        });

        it('should handle empty buffer', () => {
            const reader = new BitReader(new Uint8Array(0));
            expect(reader.size()).toBe(0);
            expect(reader.available()).toBe(0);
            expect(reader.read(1)).toBe(0);
        });

        it('should handle partial byte reads', () => {
            const data = new Uint8Array([0b11110000]);
            const reader = new BitReader(data);
            expect(reader.read(4)).toBe(0b1111);
            expect(reader.read(4)).toBe(0b0000);
            expect(reader.read(4)).toBe(0);
        });
    });
});
