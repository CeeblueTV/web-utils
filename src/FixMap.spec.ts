/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FixMap } from './FixMap';

describe('FixMap', () => {
    let map: FixMap<string, number>;
    let objectMap: FixMap<object, string>;
    let arrayMap: FixMap<number[], boolean>;

    beforeEach(() => {
        map = new FixMap(() => 0);
        objectMap = new FixMap(() => 'default');
        arrayMap = new FixMap(() => false);
    });

    describe('constructor', () => {
        it('should initialize with empty map', () => {
            expect(map.size).toBe(0);
        });

        it('should use provided initial value function', () => {
            const customMap = new FixMap(() => ({ count: 0 }));
            const value = customMap.get('key');
            expect(value).toEqual({ count: 0 });
        });
    });

    describe('get method', () => {
        it('should return existing value', () => {
            map.set('key', 42);
            expect(map.get('key')).toBe(42);
        });

        it('should create and return default value for non-existent key', () => {
            const value = map.get('newKey');
            expect(value).toBe(0);
            expect(map.has('newKey')).toBe(true);
        });

        it('should handle object keys', () => {
            const key = { id: 1 };
            objectMap.set(key, 'value');
            expect(objectMap.get(key)).toBe('value');

            const emptyObject = {};
            objectMap.set(emptyObject, 'value');
            expect(objectMap.get(emptyObject)).toBe('value');
        });

        it('should handle array keys', () => {
            const key = [1, 2, 3];
            arrayMap.set(key, true);
            expect(arrayMap.get(key)).toBe(true);

            const emptyArray = [];
            arrayMap.set(emptyArray, true);
            expect(arrayMap.get(emptyArray)).toBe(true);
        });

        it('should handle undefined keys', () => {
            const undefinedMap = new FixMap<string | undefined, string>(() => 'default');
            expect(undefinedMap.get(undefined)).toBe('default');
        });

        it('should handle null keys', () => {
            const nullMap = new FixMap<string | null, string>(() => 'default');
            expect(nullMap.get(null)).toBe('default');
        });
    });

    describe('find method', () => {
        it('should return existing value', () => {
            map.set('key', 42);
            expect(map.find('key')).toBe(42);
        });

        it('should return undefined for non-existent key', () => {
            expect(map.find('nonexistent')).toBeUndefined();
        });

        it('should not create default value', () => {
            map.find('newKey');
            expect(map.has('newKey')).toBe(false);
        });
    });

    describe('set method', () => {
        it('should set value and return it', () => {
            const value = map.set('key', 42);
            expect(value).toBe(42);
            expect(map.get('key')).toBe(42);
        });

        it('should overwrite existing value', () => {
            map.set('key', 42);
            map.set('key', 43);
            expect(map.get('key')).toBe(43);
        });

        it('should handle object keys', () => {
            const key = { id: 1 };
            const value = objectMap.set(key, 'value');
            expect(value).toBe('value');
            expect(objectMap.get(key)).toBe('value');
        });

        it('should handle array keys', () => {
            const key = [1, 2, 3];
            const value = arrayMap.set(key, true);
            expect(value).toBe(true);
            expect(arrayMap.get(key)).toBe(true);
        });
    });

    describe('has method', () => {
        it('should return true for existing key', () => {
            map.set('key', 42);
            expect(map.has('key')).toBe(true);
        });

        it('should return false for non-existent key', () => {
            expect(map.has('nonexistent')).toBe(false);
        });

        it('should handle object keys', () => {
            const key = { id: 1 };
            objectMap.set(key, 'value');
            expect(objectMap.has(key)).toBe(true);
        });

        it('should handle array keys', () => {
            const key = [1, 2, 3];
            arrayMap.set(key, true);
            expect(arrayMap.has(key)).toBe(true);
        });
    });

    describe('delete method', () => {
        it('should delete existing key', () => {
            map.set('key', 42);
            expect(map.delete('key')).toBe(true);
            expect(map.has('key')).toBe(false);
        });

        it('should return false for non-existent key', () => {
            expect(map.delete('nonexistent')).toBe(false);
        });

        it('should handle object keys', () => {
            const key = { id: 1 };
            objectMap.set(key, 'value');
            expect(objectMap.delete(key)).toBe(true);
            expect(objectMap.has(key)).toBe(false);
        });

        it('should handle array keys', () => {
            const key = [1, 2, 3];
            arrayMap.set(key, true);
            expect(arrayMap.delete(key)).toBe(true);
            expect(arrayMap.has(key)).toBe(false);
        });
    });

    describe('clear method', () => {
        it('should remove all entries', () => {
            map.set('key1', 42);
            map.set('key2', 43);
            expect(map.size).toBe(2);

            map.clear();
            expect(map.size).toBe(0);
            expect(map.has('key1')).toBe(false);
            expect(map.has('key2')).toBe(false);
        });
    });

    describe('size property', () => {
        it('should return correct size', () => {
            expect(map.size).toBe(0);
            map.set('key1', 42);
            expect(map.size).toBe(1);
            map.set('key2', 43);
            expect(map.size).toBe(2);
            map.delete('key1');
            expect(map.size).toBe(1);
        });
    });

    describe('iteration', () => {
        it('should be iterable', () => {
            map.set('key1', 42);
            map.set('key2', 43);

            const entries = Array.from(map);
            expect(entries).toEqual([
                ['key1', 42],
                ['key2', 43]
            ]);
        });

        it('should support forEach', () => {
            const callback = vi.fn();
            map.set('key1', 42);
            map.set('key2', 43);

            map.forEach(callback);
            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback).toHaveBeenCalledWith(42, 'key1', expect.any(Map));
            expect(callback).toHaveBeenCalledWith(43, 'key2', expect.any(Map));
        });
    });
});
