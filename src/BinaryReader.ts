/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
/**
 * BinaryReader allows to read binary data
 */
const _decoder = new TextDecoder();

export class BinaryReader {
    private _data: Uint8Array;
    private _size: number;
    private _position: number;
    private _view: DataView;

    constructor(data: BufferSource) {
        this._data =
            'buffer' in data ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
        this._size = this._data.byteLength;
        this._position = 0;
        this._view = new DataView(this._data.buffer, this._data.byteOffset, this._size);
    }

    data(): Uint8Array {
        return this._data;
    }
    size(): number {
        return this._size;
    }

    available(): number {
        return this._size - this._position;
    }
    value(position: number = this._position): number {
        return this._data[position];
    }
    position(): number {
        return this._position;
    }
    reset(position = 0) {
        this._position = Math.max(0, position > this._size ? this._size : position);
    }

    shrink(available: number): number {
        const rest = this._size - this._position;
        if (available > rest) {
            return rest;
        }
        this._size = this._position + available;
        return available;
    }

    next(count = 1): number {
        const rest = this._size - this._position;
        if (count > rest) {
            count = rest;
        }
        this._position = Math.max(0, this._position + count);
        return count;
    }

    read8(): number {
        return this.next(1) === 1 ? this._view.getUint8(this._position - 1) : 0;
    }
    read16(): number {
        return this.next(2) === 2 ? this._view.getUint16(this._position - 2) : 0;
    }
    read24(): number {
        return this.next(3) === 3
            ? (this._view.getUint16(this._position - 3) << 8) | (this._view.getUint8(this._position - 1) & 0xff)
            : 0;
    }
    read32(): number {
        return this.next(4) === 4 ? this._view.getUint32(this._position - 4) : 0;
    }
    read64(): number {
        if (this.next(8) !== 8) {
            return 0;
        }
        return this._view.getUint32(this._position - 8) * 4294967296 + this._view.getUint32(this._position - 4);
    }
    readFloat(): number {
        return this.next(4) === 4 ? this._view.getFloat32(this._position - 4) : 0;
    }
    readDouble(): number {
        return this.next(8) === 8 ? this._view.getFloat64(this._position - 8) : 0;
    }
    read7Bit(bytes = 5): number {
        let result: number = 0;
        let factor: number = 1;
        while (this.available()) {
            const byte = this.read8();
            result += (byte & 0x7f) * factor;
            if (!(byte & 0x80)) {
                break;
            }
            factor *= 128;
        }
        return result;
    }
    readString(): string {
        let i = this._position;
        while (i < this._size && this._data[i]) {
            ++i;
        }
        const result = this.read(i - this._position);
        this.next(); // skip the 0 termination
        return _decoder.decode(result);
    }

    readHex(size: number): string {
        let hex = '';
        while (size-- > 0) {
            hex += ('0' + this.read8().toString(16)).slice(-2);
        }
        return hex;
    }

    /**
     * Read bytes, to convert bytes to string use String.fromCharCode(...reader.read(size)) or Util.stringify
     * @param {UInt32} size
     */
    read(size = this.available()): Uint8Array {
        if (this.available() < size) {
            return new Uint8Array(size); // default value = empty bytearray!
        }
        const pos = this._position;
        return this._data.subarray(pos, Math.max(pos, (this._position += size)));
    }
}
