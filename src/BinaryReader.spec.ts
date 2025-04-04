/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { BinaryReader } from './BinaryReader';

describe('BinaryReader', () => {
    describe('constructor', () => {
        it('should create reader from Uint8Array', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            expect(reader.size()).toBe(4);
            expect(reader.position()).toBe(0);
        });

        it('should create reader from ArrayBuffer', () => {
            const buffer = new ArrayBuffer(4);
            new Uint8Array(buffer).set([1, 2, 3, 4]);
            const reader = new BinaryReader(buffer);
            expect(reader.size()).toBe(4);
            expect(reader.position()).toBe(0);
        });
    });

    describe('basic operations', () => {
        it('should read and return correct data', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            expect(reader.data()).toEqual(data);
        });

        it('should return correct size', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            expect(reader.size()).toBe(4);
        });

        it('should return correct available bytes', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            expect(reader.available()).toBe(4);
            reader.next(2);
            expect(reader.available()).toBe(2);
        });

        it('should return correct value at position', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            expect(reader.value(0)).toBe(1);
            expect(reader.value(2)).toBe(3);
        });
    });

    describe('position management', () => {
        it('should reset position correctly', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            reader.next(2);
            reader.reset();
            expect(reader.position()).toBe(0);
        });

        it('should handle reset with custom position', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            reader.reset(2);
            expect(reader.position()).toBe(2);
        });

        it('should clamp reset position to valid range', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            reader.reset(10);
            expect(reader.position()).toBe(4);
        });
    });

    describe('reading operations', () => {
        it('should read 8-bit values correctly', () => {
            const data = new Uint8Array([255, 128, 64, 32]);
            const reader = new BinaryReader(data);
            expect(reader.read8()).toBe(255);
            expect(reader.read8()).toBe(128);
            expect(reader.read8()).toBe(64);
            expect(reader.read8()).toBe(32);
        });

        it('should read 16-bit values correctly', () => {
            const data = new Uint8Array([0xff, 0xff, 0x80, 0x00, 0x40, 0x00]);
            const reader = new BinaryReader(data);
            expect(reader.read16()).toBe(65535);
            expect(reader.read16()).toBe(32768);
            expect(reader.read16()).toBe(16384);
        });

        it('should read 24-bit values correctly', () => {
            const data = new Uint8Array([0xff, 0xff, 0xff, 0x80, 0x00, 0x00]);
            const reader = new BinaryReader(data);
            expect(reader.read24()).toBe(16777215);
            expect(reader.read24()).toBe(8388608);
        });

        it('should read 32-bit values correctly', () => {
            const data = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x80, 0x00, 0x00, 0x00]);
            const reader = new BinaryReader(data);
            expect(reader.read32()).toBe(4294967295);
            expect(reader.read32()).toBe(2147483648);
        });

        it('should read 64-bit values correctly', () => {
            const data = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff]);
            const reader = new BinaryReader(data);
            expect(reader.read64()).toBe(255);
        });

        it('should read floating point values correctly', () => {
            const data = new Uint8Array([0x3f, 0x80, 0x00, 0x00]); // 1.0 in IEEE 754
            const reader = new BinaryReader(data);
            expect(reader.readFloat()).toBe(1.0);
        });

        it('should read double values correctly', () => {
            const data = new Uint8Array([0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // 1.0 in IEEE 754
            const reader = new BinaryReader(data);
            expect(reader.readDouble()).toBe(1.0);
        });
    });

    describe('special reading operations', () => {
        it('should read 7-bit encoded values correctly', () => {
            const data = new Uint8Array([0x81, 0x01]); // 129 in 7-bit encoding
            const reader = new BinaryReader(data);
            expect(reader.read7Bit()).toBe(129);
        });

        it('should read strings correctly', () => {
            const text = 'Hello\0';
            const data = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
            const reader = new BinaryReader(data);
            expect(reader.readString()).toBe('Hello');
        });

        it('should read hex values correctly', () => {
            const data = new Uint8Array([0xff, 0x00, 0xaa]);
            const reader = new BinaryReader(data);
            expect(reader.readHex(3)).toBe('ff00aa');
        });

        it('should read bytes correctly', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            expect(reader.read(2)).toEqual(new Uint8Array([1, 2]));
        });
    });

    describe('edge cases', () => {
        it('should handle reading beyond buffer size', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            reader.next(4);
            expect(reader.read8()).toBe(0);
            expect(reader.read16()).toBe(0);
            expect(reader.read32()).toBe(0);
        });

        it('should handle shrinking buffer', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const reader = new BinaryReader(data);
            reader.next(2);
            expect(reader.shrink(1)).toBe(1);
            expect(reader.available()).toBe(1);
        });

        it('should handle empty buffer', () => {
            const reader = new BinaryReader(new Uint8Array(0));
            expect(reader.size()).toBe(0);
            expect(reader.available()).toBe(0);
            expect(reader.read8()).toBe(0);
        });
    });
});
