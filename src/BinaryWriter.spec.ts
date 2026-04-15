/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { BinaryWriter } from './BinaryWriter';

describe('BinaryWriter', () => {
    describe('constructor and accessors', () => {
        it('should create an expandable writer with the default capacity', () => {
            const writer = new BinaryWriter();

            expect(writer.capacity).toBe(64);
            expect(writer.size()).toBe(0);
            expect(writer.data()).toEqual(new Uint8Array(0));
        });

        it('should create an expandable writer with a custom capacity', () => {
            const writer = new BinaryWriter(4);

            expect(writer.capacity).toBe(4);
            expect(writer.size()).toBe(0);
        });

        it('should append to an existing typed-array view', () => {
            const buffer = new Uint8Array([9, 1, 2, 3, 9]);
            const view = buffer.subarray(1, 4);
            const writer = new BinaryWriter(view);

            expect(writer.size()).toBe(3);
            expect(writer.data()).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('should write inside a constant ArrayBuffer using the full buffer by default', () => {
            const buffer = new ArrayBuffer(3);
            const writer = new BinaryWriter(buffer);

            writer.write8(1).write8(2).write8(3);

            expect(writer.capacity).toBe(3);
            expect(writer.data()).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('should write inside a constant ArrayBuffer window with offset and length', () => {
            const raw = new Uint8Array([9, 9, 9, 9, 9]);
            const writer = new BinaryWriter(raw.buffer, 1, 3);

            writer.write8(1).write8(2).write8(3);

            expect(raw).toEqual(new Uint8Array([9, 1, 2, 3, 9]));
            expect(writer.capacity).toBe(3);
            expect(writer.data()).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('should cache the DataView until the buffer grows', () => {
            const writer = new BinaryWriter(2);
            const initialView = writer.view;

            expect(writer.view).toBe(initialView);

            writer.reserve(3);

            expect(writer.view).not.toBe(initialView);
        });
    });

    describe('size management', () => {
        it('should advance with next and keep the new bytes zeroed', () => {
            const writer = new BinaryWriter(2);

            expect(writer.next(2)).toBe(writer);
            expect(writer.size()).toBe(2);
            expect(writer.data()).toEqual(new Uint8Array([0, 0]));
        });

        it('should advance by one byte when next is called without arguments', () => {
            const writer = new BinaryWriter(1);

            writer.next();

            expect(writer.size()).toBe(1);
            expect(writer.data()).toEqual(new Uint8Array([0]));
        });

        it('should clear the written size to zero by default', () => {
            const writer = new BinaryWriter();

            writer.write8(1).write8(2).clear();

            expect(writer.size()).toBe(0);
            expect(writer.data()).toEqual(new Uint8Array(0));
        });

        it('should clear to a specific size', () => {
            const writer = new BinaryWriter(2);

            writer.write8(1).clear(4);

            expect(writer.size()).toBe(4);
            expect(writer.data()).toEqual(new Uint8Array([1, 0, 0, 0]));
        });
    });

    describe('generic writes', () => {
        it('should write strings', () => {
            const writer = new BinaryWriter();

            writer.write('Hi');

            expect(writer.data()).toEqual(new Uint8Array([72, 105]));
        });

        it('should write typed-array views', () => {
            const source = new Uint8Array([9, 1, 2, 3, 9]);
            const writer = new BinaryWriter();

            writer.write(source.subarray(1, 4));

            expect(writer.data()).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('should write ArrayBuffers', () => {
            const buffer = new Uint8Array([1, 2, 3]).buffer;
            const writer = new BinaryWriter();

            writer.write(buffer);

            expect(writer.data()).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('should write array-like values', () => {
            const writer = new BinaryWriter();

            writer.write([1, 2, 3]);

            expect(writer.data()).toEqual(new Uint8Array([1, 2, 3]));
        });
    });

    describe('numeric writes', () => {
        it('should write 8-bit values and clamp oversized values', () => {
            const writer = new BinaryWriter();

            writer.write8(0x01).write8(0x1ff);

            expect(writer.data()).toEqual(new Uint8Array([0x01, 0xff]));
        });

        it('should write 16-bit values and clamp oversized values', () => {
            const writer = new BinaryWriter();

            writer.write16(0x1234).write16(0x1ffff);

            expect(writer.data()).toEqual(new Uint8Array([0x12, 0x34, 0xff, 0xff]));
        });

        it('should write 24-bit values and clamp oversized values', () => {
            const writer = new BinaryWriter();

            writer.write24(0x123456).write24(0x1ffffff);

            expect(writer.data()).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0xff, 0xff, 0xff]));
        });

        it('should write 32-bit values and clamp oversized values', () => {
            const writer = new BinaryWriter();

            writer.write32(0x12345678).write32(0x1ffffffff);

            expect(writer.data()).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0xff, 0xff, 0xff, 0xff]));
        });

        it('should write 64-bit values as two 32-bit words', () => {
            const writer = new BinaryWriter();

            writer.write64(0x00000001000000ff);

            expect(writer.data()).toEqual(new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0xff]));
        });

        it('should write float values', () => {
            const writer = new BinaryWriter();

            writer.writeFloat(1.0);

            expect(writer.data()).toEqual(new Uint8Array([0x3f, 0x80, 0x00, 0x00]));
        });

        it('should write double values', () => {
            const writer = new BinaryWriter();

            writer.writeDouble(1.0);

            expect(writer.data()).toEqual(new Uint8Array([0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        });
    });

    describe('encoded writes', () => {
        it('should write 7-bit encoded values', () => {
            const writer = new BinaryWriter();

            writer.write7Bit(129);

            expect(writer.data()).toEqual(new Uint8Array([0x81, 0x01]));
        });

        it('should write zero as a single 7-bit byte', () => {
            const writer = new BinaryWriter();

            writer.write7Bit(0);

            expect(writer.data()).toEqual(new Uint8Array([0x00]));
        });

        it('should write null-terminated strings', () => {
            const writer = new BinaryWriter();

            writer.writeString('Hi');

            expect(writer.data()).toEqual(new Uint8Array([72, 105, 0]));
        });

        it('should write hexadecimal strings', () => {
            const writer = new BinaryWriter();

            writer.writeHex('ff00aa');

            expect(writer.data()).toEqual(new Uint8Array([0xff, 0x00, 0xaa]));
        });
    });

    describe('reserve behavior', () => {
        it('should keep the same capacity when enough space is already available', () => {
            const writer = new BinaryWriter(8);

            writer.reserve(4);

            expect(writer.capacity).toBe(8);
        });

        it('should grow to the next power of two when more space is needed', () => {
            const writer = new BinaryWriter(2);

            writer.reserve(3);

            expect(writer.capacity).toBe(4);
        });

        it('should throw when writing exceeds a constant buffer capacity', () => {
            const writer = new BinaryWriter(new ArrayBuffer(2));

            expect(() => writer.write([1, 2, 3])).toThrow('writing exceeds maximum 2 bytes limit');
        });

        it('should throw when reserve is called on a non-writable instance', () => {
            const writer = new BinaryWriter();
            (writer as unknown as { _data?: Uint8Array })._data = undefined;

            expect(() => writer.reserve(1)).toThrow('buffer not writable');
        });
    });
});
