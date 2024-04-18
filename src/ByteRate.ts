/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import * as Util from './Util';

/**
 * Compute ByteRate every delta time
 */
export class ByteRate {
    onBytes(bytes: number) {}

    get delta() {
        return this._delta;
    }

    private _bytes: number;
    private _time: number;
    private _delta: number;
    private _value: number;
    constructor(delta = 1000) {
        this._time = Util.time();
        this._value = NaN;
        this._delta = delta;
        this._bytes = 0;
    }

    value(): number {
        return Math.round(this.exact());
    }
    exact(): number {
        const now = Util.time();
        const elapsed = now - this._time;
        if (elapsed > this._delta || isNaN(this._value)) {
            // wait "_delta" before next compute rate
            this._value = (this._bytes * 1000) / elapsed;
            this._bytes = 0;
            this._time = now;
        }
        return this._value;
    }

    addBytes(bytes: number) {
        this._bytes += bytes;
        this.onBytes(bytes);
        return this;
    }
}
