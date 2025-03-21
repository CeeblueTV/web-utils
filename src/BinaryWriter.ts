/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import * as Util from './Util';

/**
 * BinaryWriter allows to write data in its binary form
 */
export class BinaryWriter {
    get view(): DataView {
        if (!this._view) {
            this._view = new DataView(this._data.buffer, this._data.byteOffset, this._data.byteLength);
        }
        return this._view;
    }
    get capacity(): number {
        return this._data.byteLength;
    }

    private _data: Uint8Array;
    private _size: number;
    private _view?: DataView;
    private _isConst?: boolean;

    constructor(dataOrSize: BufferSource | number = 64, offset: number = 0, length?: number) {
        if (typeof dataOrSize == 'number') {
            // allocate new buffer
            this._data = new Uint8Array(dataOrSize);
            this._size = 0;
        } else if ('buffer' in dataOrSize) {
            // append to existing data!
            this._data = new Uint8Array(dataOrSize.buffer, dataOrSize.byteOffset, dataOrSize.byteLength);
            this._size = dataOrSize.byteLength;
        } else {
            // overrides data
            this._isConst = true; // better than boolean for memory usage
            if (length == null) {
                // /!\ Safari does not support undefined length, so we need to use byteLength instead
                length = dataOrSize.byteLength;
            }
            this._data = new Uint8Array(dataOrSize, offset, length);
            this._size = 0;
        }
    }

    data(): Uint8Array {
        return new Uint8Array(this._data.buffer, this._data.byteOffset, this._size);
    }
    size(): number {
        return this._size || 0;
    }

    next(count = 1): BinaryWriter {
        return this.reserve((this._size += count));
    }
    clear(size = 0): BinaryWriter {
        return this.reserve((this._size = size));
    }

    /**
     * Write binary data
     * @param data
     */
    write(data: ArrayLike<number> | BufferSource | string): BinaryWriter {
        let bin: Uint8Array | ArrayLike<number>;
        if (typeof data === 'string') {
            // Convertit la chaîne en Uint8Array
            bin = Util.toBin(data);
        } else if (data instanceof ArrayBuffer) {
            bin = new Uint8Array(data);
        } else if ('buffer' in data) {
            bin = new Uint8Array(data.buffer, data.byteOffset ?? 0, data.byteLength);
        } else {
            bin = data;
        }
        this.reserve(this._size + bin.length);
        this._data.set(bin, this._size);
        this._size += bin.length;
        return this;
    }

    write8(value: number): BinaryWriter {
        if (value > 0xff) {
            // cast to 8bits range
            value = 0xff;
        }
        this.reserve(this._size + 1);
        this._data[this._size++] = value;
        return this;
    }

    write16(value: number): BinaryWriter {
        if (value > 0xffff) {
            // cast to 16bits range
            value = 0xffff;
        }
        this.reserve(this._size + 2);
        this.view.setUint16(this._size, value);
        this._size += 2;
        return this;
    }

    write24(value: number): BinaryWriter {
        if (value > 0xffffff) {
            // cast to 24bits range
            value = 0xffffff;
        }
        this.reserve(this._size + 3);
        this.view.setUint16(this._size, value >> 8);
        this.view.setUint8((this._size += 2), value & 0xff);
        ++this._size;
        return this;
    }
    write32(value: number): BinaryWriter {
        if (value > 0xffffffff) {
            // cast to 32bits range
            value = 0xffffffff;
        }
        this.reserve(this._size + 4);
        this.view.setUint32(this._size, value);
        this._size += 4;
        return this;
    }

    write64(value: number): BinaryWriter {
        this.write32(value / 4294967296);
        return this.write32(value & 0xffffffff);
    }

    writeFloat(value: number): BinaryWriter {
        this.reserve(this._size + 4);
        this.view.setFloat32(this._size, value);
        this._size += 4;
        return this;
    }

    writeDouble(value: number): BinaryWriter {
        this.reserve(this._size + 8);
        this.view.setFloat64(this._size, value);
        this._size += 8;
        return this;
    }

    write7Bit(value: number): BinaryWriter {
        let byte = value & 0x7f;
        while ((value = Math.floor(value / 0x80))) {
            // equivalent to >>=7 for JS!
            this.write8(0x80 | byte);
            byte = value & 0x7f;
        }
        return this.write8(byte);
    }

    writeString(value: string): BinaryWriter {
        return this.write(Util.toBin(value)).write8(0);
    }

    writeHex(value: string): BinaryWriter {
        for (let i = 0; i < value.length; i += 2) {
            this.write8(parseInt(value.substring(i, i + 2), 16));
        }
        return this;
    }

    reserve(size: number): BinaryWriter {
        if (!this._data) {
            throw Error('buffer not writable');
        }
        if (size <= this._data.byteLength) {
            return this;
        }
        if (this._isConst) {
            throw Error('writing exceeds maximum ' + this._data.byteLength + ' bytes limit');
        }

        --size;
        size |= size >> 1;
        size |= size >> 2;
        size |= size >> 4;
        size |= size >> 8;
        size |= size >> 16;
        ++size;

        const data = new Uint8Array(size);
        data.set(this._data); // copy old buffer!
        this._data = data;
        this._view = undefined; // release view
        return this;
    }
}
