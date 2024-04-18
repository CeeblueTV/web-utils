/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
/**
 * Some fix for JS MAP:
 * - find(key) search an item in the map and returns undefined if not found
 * - get(key) return the item if exists or otherwise create and returns it
 * - set(key, value) returns the value of the item (rather the MAP)
 */
export class FixMap<KeyType, ValueType> {
    [Symbol.iterator](): IterableIterator<[KeyType, ValueType]> {
        return this._map[Symbol.iterator]();
    }
    get size() {
        return this._map.size;
    }
    private _map: Map<KeyType, ValueType>;
    constructor(private _initValue: () => ValueType) {
        this._map = new Map<KeyType, ValueType>();
    }
    get(key: KeyType): ValueType {
        let value = this.find(key);
        if (value === undefined) {
            this._map.set(key, (value = this._initValue()));
        }
        return value;
    }
    find(key: KeyType): ValueType | undefined {
        return this._map.get(key);
    }
    has(key: KeyType): boolean {
        return this._map.has(key);
    }
    clear() {
        this._map.clear();
    }
    delete(key: KeyType): boolean {
        return this._map.delete(key);
    }
    set(key: KeyType, value: ValueType): ValueType {
        this._map.set(key, value);
        return value;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    forEach(callbackfn: (value: ValueType, key: KeyType, map: Map<KeyType, ValueType>) => void, thisArg?: any) {
        this._map.forEach(callbackfn, thisArg);
    }
}
