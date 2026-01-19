/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import * as Util from './Util';

describe('Util', () => {
    describe('time functions', () => {
        it('should calculate passed time', async () => {
            const time0 = Util.time();
            await new Promise(resolve => setTimeout(resolve, 100));
            const time100 = Util.time();
            expect(time100).toBeGreaterThanOrEqual(time0 + 100);

            const unixTime = Util.unixTime();
            expect(unixTime).toBeGreaterThanOrEqual(Math.floor(performance.timeOrigin + time0 + 100));
            expect(unixTime).toBeGreaterThanOrEqual(Math.floor(performance.timeOrigin + time100));
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

        // it('should reject after timeout', async () => {
        //     const promise = new Promise(resolve => setTimeout(() => resolve('success'), 200));
        //     await expect(Util.safePromise(100, promise)).rejects.toThrow(Error);
        // });
    });

    describe('sleep', () => {
        it('should wait for specified time', async () => {
            const start = Date.now();
            await Util.sleep(102); // 100 + 2ms to avoid flaky tests
            const duration = Date.now() - start;
            expect(duration).toBeGreaterThanOrEqual(100);
        });
    });

    describe('equal', () => {
        it('should compare primitive values', () => {
            expect(Util.equal(1, 1)).toBe(true);
            expect(Util.equal('a', 'a')).toBe(true);
            expect(Util.equal(true, true)).toBe(true);
            // Null and undefined
            expect(Util.equal(null, null)).toBe(true);
            expect(Util.equal(undefined, undefined)).toBe(true);
            // NaN and infinites
            expect(Util.equal(NaN, NaN)).toBe(true);
            expect(Util.equal(Infinity, Infinity)).toBe(true);
            expect(Util.equal(-Infinity, -Infinity)).toBe(true);
            // Differents
            expect(Util.equal(0, null)).toBe(false);
            expect(Util.equal(0, undefined)).toBe(false);
            expect(Util.equal(0, NaN)).toBe(false);
            expect(Util.equal(0, Infinity)).toBe(false);
            expect(Util.equal(0, -Infinity)).toBe(false);
            expect(Util.equal(0, '0')).toBe(false);
            expect(Util.equal(null, undefined)).toBe(false);
        });

        it('should compare arrays', () => {
            expect(Util.equal([], [])).toBe(true);
            expect(Util.equal([1, 2, 3], [1, 2, 3])).toBe(true);
            expect(Util.equal([1, 2], [1, 2, 3])).toBe(false);
            expect(Util.equal([1, 2, 3], [1, 2, 4])).toBe(false);
            expect(Util.equal([null, undefined, NaN], [null, undefined, NaN])).toBe(true);
        });

        it('should compare plain objects', () => {
            expect(Util.equal({}, {})).toBe(true);
            expect(Util.equal({ a: 1 }, { a: 1 })).toBe(true);
            expect(Util.equal({ a: 1 }, { a: 2 })).toBe(false);
        });

        it('should compare Map object', () => {
            expect(
                Util.equal(
                    new Map([
                        ['key1', '1'],
                        ['key2', '2']
                    ]),
                    new Map([
                        ['key1', '1'],
                        ['key2', '2']
                    ])
                )
            ).toBe(true);
            expect(
                Util.equal(
                    new Map([
                        ['key1', '1'],
                        ['key2', '2']
                    ]),
                    new Map([
                        ['key1', '1'],
                        ['key2', '3']
                    ])
                )
            ).toBe(false);
            expect(
                Util.equal(
                    new Map([
                        ['key1', [1, 2]],
                        ['key2', [1, 2]]
                    ]),
                    new Map([
                        ['key1', [1, 2]],
                        ['key2', [1, 2]]
                    ])
                )
            ).toBe(true);
            expect(
                Util.equal(
                    new Map([
                        ['key1', [1, 2]],
                        ['key2', [1, 2]]
                    ]),
                    new Map([
                        ['key1', [1, 2]],
                        ['key2', [1, 3]]
                    ])
                )
            ).toBe(false);
        });

        it('should compare Set object', () => {
            expect(Util.equal(new Set(['key1', 'key2']), new Set(['key1', 'key2']))).toBe(true);
            expect(Util.equal(new Set(['key1', 'key2']), new Set(['key1', 'key3']))).toBe(false);
            expect(Util.equal(new Set([[1, 2]]), new Set([[1, 2]]))).toBe(true);
            expect(Util.equal(new Set([[1, 2]]), new Set([[1, 3]]))).toBe(false);
        });

        it('should compare nested structures', () => {
            expect(
                Util.equal(
                    {
                        foo: [1, { bar: 'baz' }, [null, NaN]],
                        qux: { nested: { deep: 42 } }
                    },
                    {
                        foo: [1, { bar: 'baz' }, [null, NaN]],
                        qux: { nested: { deep: 42 } }
                    }
                )
            ).toBe(true);
        });

        it('should return false when object keys differ in one direction', () => {
            expect(Util.equal({ a: 1 }, { a: 1, b: 2 })).toBe(false);
            expect(Util.equal({ a: 1, b: 2 }, { a: 1 })).toBe(false);
        });

        it('should consider different shapes not equal', () => {
            // Object with length ≠ array
            expect(Util.equal({ length: 0 }, [])).toBe(false);
            // Array ≠ objet
            expect(Util.equal([], {})).toBe(false);
        });

        it('should handle deeply mismatched structures', () => {
            expect(Util.equal({ x: [1, 2, { y: 3 }] }, { x: [1, 2, { y: 4 }] })).toBe(false);
        });
    });

    describe('fetch', () => {
        const realFetch = global.fetch;
        afterEach(() => {
            global.fetch = realFetch;
        });

        it('should handle successful response', async () => {
            global.fetch = vi.fn();
            const response = new Response('success');
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(response);

            const result = await Util.fetch('http://example.com');
            expect(result).toBe(response);
        });

        it('should handle error response', async () => {
            global.fetch = vi.fn();
            const response = new Response('superError', { status: 444 });
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(response);

            let result = await Util.fetch('https://example.com');
            expect(result).toBe(response);
            expect(result.error).toBe('superError');

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
                new Response('', { status: 444, statusText: 'superError' })
            );
            result = await Util.fetch('https://example.com');
            expect(result.error).toBe('superError');

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('', { status: 444 }));
            result = await Util.fetch('https://example.com');
            expect(result.error).toBe('444');
        });

        it('should throw on error response', async () => {
            await expect(Util.fetch('https://¤.com')).rejects.toThrow(Error);
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

    describe('caseInsensitive', () => {
        it('should get the same property with different case', async () => {
            const obj = Util.caseInsensitive({ endPoint: 'http://address', streamName: null });
            expect(obj.endPoint).toBe('http://address');
            expect(obj.endpoint).toBe('http://address');
            expect(obj.endpoinT).toBe('http://address');
            expect(obj.endpoin).toBeUndefined();
            expect(obj.streamname).toBeNull();
            expect(obj.STREAMNAME).toBeNull();
            expect(obj.stream).toBeUndefined();
        });
    });
});
