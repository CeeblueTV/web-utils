/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

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

    write(data: string | ArrayLike<number>): BinaryWriter {
        this.reserve(this._size + data.length);
        if (typeof data === 'string') {
            // beware here support just the 255 first bytes (compatible Latin-1)
            for (let i = 0; i < data.length; ++i) {
                const value = data.charCodeAt(i);
                this._data[this._size++] = value > 255 ? 32 : value;
            }
            return this;
        }
        this._data.set(data, this._size);
        this._size += data.length;
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

    write7Bit(value: number, bytes: number = 5): BinaryWriter {
        if (bytes > 5) {
            throw Error("BinaryWriter in JS can't encode more than 32 usefull bits");
        }
        if (!(bytes > 0)) {
            // negation to catch NaN value
            throw Error('Have to indicate a positive number of bytes to encode');
        }
        let bits = --bytes * 7;
        const front = value > 0xffffffff ? 0x100 : value >>> bits;
        if (front) {
            ++bits;
            if (front > 0xff) {
                value = 0xffffffff;
            }
        } else {
            while ((bits -= 7) && !(value >>> bits)) {
                continue;
            }
        }

        while (bits > 1) {
            this.write8(0x80 | ((value >>> bits) & 0xff));
            bits -= 7;
        }
        return this.write8(value & (bits ? 0xff : 0x7f));
    }

    writeString(value: string): BinaryWriter {
        return this.write7Bit(value.length).write(value);
    }

    writeHex(value: string): BinaryWriter {
        for (let i = 0; i < value.length; i += 2) {
            this.write8(parseInt(value.substring(i, i + 2), 16));
        }
        return this;
    }

    reserve(size: number): BinaryWriter {
        if (!this._data) {
            throw new Error('buffer not writable');
        }
        if (size <= this._data.byteLength) {
            return this;
        }
        if (this._isConst) {
            throw new Error('writing exceeds maximum ' + this._data.byteLength + ' bytes limit');
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
