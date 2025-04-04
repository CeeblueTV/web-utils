/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Util from './Util';

describe('Util', () => {
    describe('time functions', () => {
        it('should calculate passed time, since the origin', async () => {
            const timeOrigin = Util.timeOrigin();
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(Util.timeOrigin()).toEqual(timeOrigin);
            expect(Util.time()).toBeGreaterThanOrEqual(timeOrigin + 100);
        });
    });

    describe('options', () => {
        it('should parse URL search params', () => {
            const params = Util.options('?key=value&number=123&boolean=true');
            expect(params).toEqual({
                key: 'value',
                number: 123,
                boolean: true
            });
        });

        it('should handle URL object', () => {
            const url = new URL('http://example.com?key=value');
            const params = Util.options(url);
            expect(params).toEqual({ key: 'value' });
        });

        it('should handle URLSearchParams object', () => {
            const searchParams = new URLSearchParams('key=value');
            const params = Util.options(searchParams);
            expect(params).toEqual({ key: 'value' });
        });

        it('should handle empty input', () => {
            const params = Util.options('');
            expect(params).toEqual({});

            const params2 = Util.options('http://example.com?');
            expect(params2).toEqual({});

            const params3 = Util.options('http://example.com');
            expect(params3).toEqual({});
        });

        it('should handle object input', () => {
            const params = Util.options({ key: 'value' });
            expect(params).toEqual({ key: 'value' });
        });
    });

    describe('toBin', () => {
        it('should convert string to UTF-8 representation in Uint8Array', () => {
            const str = 'Hello 😭';
            const bin = Util.toBin(str);
            // UTF-8
            expect(bin).to.be.deep.equal(new Uint8Array([72, 101, 108, 108, 111, 32, 240, 159, 152, 173]));
        });

        it('should return empty array for empty string', () => {
            const bin = Util.toBin('');
            expect(bin).to.be.deep.equal(new Uint8Array());
        });
    });

    describe('safePromise', () => {
        it('should resolve before timeout', async () => {
            const promise = new Promise(resolve => setTimeout(() => resolve('success'), 100));
            const result = await Util.safePromise(200, promise);
            expect(result).toBe('success');
        });

        it('should reject after timeout', async () => {
            const promise = new Promise(resolve => setTimeout(() => resolve('success'), 200));
            await expect(Util.safePromise(100, promise)).rejects.toThrow(Error);
        });
    });

    describe('sleep', () => {
        it('should wait for specified time', async () => {
            const start = Date.now();
            await Util.sleep(100);
            const duration = Date.now() - start;
            expect(duration).toBeGreaterThanOrEqual(100);
        });
    });

    describe('equal', () => {
        it('should compare primitive values', () => {
            expect(Util.equal(1, 1)).toBe(true);
            expect(Util.equal('a', 'a')).toBe(true);
            expect(Util.equal(true, true)).toBe(true);
            // Null isn't really a primitive value, thanks javascript :/
            expect(Util.equal(null, null)).toBe(true);
            expect(Util.equal(undefined, undefined)).toBe(true);
            expect(Util.equal(NaN, NaN)).toBe(true);
            expect(Util.equal(Infinity, Infinity)).toBe(true);
            expect(Util.equal(-Infinity, -Infinity)).toBe(true);

            expect(Util.equal(0, null)).toBe(false);
            expect(Util.equal(0, undefined)).toBe(false);
            expect(Util.equal(0, NaN)).toBe(false);
            expect(Util.equal(0, Infinity)).toBe(false);
            expect(Util.equal(0, -Infinity)).toBe(false);
            expect(Util.equal(0, '0')).toBe(false);
            expect(Util.equal(null, undefined)).toBe(false);
        });

        it('should compare arrays', () => {
            expect(Util.equal([1, 2, 3], [1, 2, 3])).toBe(true);
            expect(Util.equal([1, 2], [1, 2, 3])).toBe(false);
            expect(Util.equal([1, 2, 3], [1, 2, 4])).toBe(false);
            expect(Util.equal([null, undefined, NaN], [null, undefined, NaN])).toBe(true);
        });

        it('should compare objects', () => {
            expect(Util.equal({ a: 1 }, { a: 1 })).toBe(true);
            expect(Util.equal({ a: 1 }, { a: 2 })).toBe(false);
        });
    });

    describe('fetch', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
        });

        it('should handle successful response', async () => {
            const response = new Response('success');
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(response);

            const result = await Util.fetch('http://example.com');
            expect(result).toBe(response);
        });

        it('should throw on error response', async () => {
            const response = new Response('error', { status: 404 });
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(response);

            await expect(Util.fetch('http://example.com')).rejects.toThrow(Error);
        });
    });

    describe('path functions', () => {
        it('should get extension from path', () => {
            expect(Util.getExtension('file.txt')).toBe('.txt');
            expect(Util.getExtension('path/to/file.txt')).toBe('.txt');
            expect(Util.getExtension('file')).toBe('');
            expect(Util.getExtension('path/to/file.txt')).toBe('.txt');
            expect(Util.getExtension('path/to/.txt')).toBe('.txt');
            expect(Util.getExtension('.txt')).toBe('.txt');
            expect(Util.getExtension('path/to/file.txt.')).toBe('.');
        });

        it('should get file from path', () => {
            expect(Util.getFile('file.txt')).toBe('file.txt');
            expect(Util.getFile('path/to/file.txt')).toBe('file.txt');
        });

        it('should get base file without extension', () => {
            expect(Util.getBaseFile('file.txt')).toBe('file');
            expect(Util.getBaseFile('path/to/file.txt')).toBe('file');
            expect(Util.getBaseFile('file')).toBe('file');
        });
    });

    describe('string trim functions', () => {
        it('should trim spaces', () => {
            expect(Util.trim('  hello  ')).toBe('hello');
        });

        it('should trim custom characters', () => {
            expect(Util.trim('xxhelloxx', 'x')).toBe('hello');
            expect(Util.trim('xxhello😭xx', 'x😭')).toBe('hello');
        });

        it('should trim start only', () => {
            expect(Util.trimStart('  hello  ')).toBe('hello  ');
            expect(Util.trimStart('😭hello😭', '😭')).toBe('hello😭');
        });

        it('should trim end only', () => {
            expect(Util.trimEnd('  hello  ')).toBe('  hello');
            expect(Util.trimEnd('😭hello😭', '😭')).toBe('😭hello');
        });
    });
});
