/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

/**
 * BitReader allows to read binary data bit by bit
 */
export class BitReader {
    private _data: Uint8Array;
    private _size: number;
    private _position: number;
    private _bit: number;

    constructor(data: BufferSource) {
        if ('buffer' in data) {
            this._data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else {
            this._data = new Uint8Array(data);
        }
        this._size = this._data.byteLength;
        this._position = 0;
        this._bit = 0;
    }

    data(): Uint8Array {
        return this._data;
    }
    size(): number {
        return this._size;
    }
    available(): number {
        return (this._size - this._position) * 8 - this._bit;
    }

    next(count = 1): number {
        let gotten = 0;
        while (this._position !== this._size && count--) {
            ++gotten;
            if (++this._bit === 8) {
                this._bit = 0;
                ++this._position;
            }
        }
        return gotten;
    }
    read(count = 1): number {
        let result = 0;
        while (this._position !== this._size && count--) {
            result <<= 1;
            if (this._data[this._position] & (0x80 >> this._bit++)) {
                result |= 1;
            }
            if (this._bit === 8) {
                this._bit = 0;
                ++this._position;
            }
        }
        return result;
    }
    read8(): number {
        return this.read(8);
    }
    read16(): number {
        return this.read(16);
    }
    read24(): number {
        return this.read(24);
    }
    read32(): number {
        return this.read(32);
    }
}

export function readExpGolomb(reader: BitReader): number {
    let i = 0;
    while (reader.available() && !reader.read()) {
        ++i;
    }
    const result = reader.read(i);
    if (i > 15) {
        console.warn('Exponential-Golomb code exceeding unsigned 16 bits');
        return 0;
    }
    return result + (1 << i) - 1;
}
