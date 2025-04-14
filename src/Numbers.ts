/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { Queue } from './Queue';

/**
 * A collection of number Queue<number> with the following efficient mathematic computation:
 * - minimum value in the collection
 * - maximum value in the collection
 * - average value of the collection
 */
export class Numbers extends Queue<number> {
    /**
     * minimum value in the collection, or 0 if colleciton is empty
     */
    get minimum(): number {
        // We return 0 if the minimum is NaN, To keep the original behavior for code that relies on this.
        // But we should consider to return -Infinity instead.
        if (isNaN(this._min)) {
            return 0;
        }
        return this._min;
    }

    /**
     * maximum value in the collection, or 0 if colleciton is empty
     */
    get maximum(): number {
        // We return 0 if the maximum is NaN, To keep the original behavior for code that relies on this.
        // But we should consider to return Infinity instead.
        if (isNaN(this._max)) {
            return 0;
        }

        return this._max;
    }

    /**
     * average value of the collection, or 0 if collection if empty
     */
    get average(): number {
        if (typeof this._average !== 'number') {
            this._average = this.size ? this._sum / this.size : 0;
        }
        return this._average;
    }

    private _average?: number;
    private _sum: number = 0;
    private _min: number = NaN;
    private _max: number = NaN;

    /**
     * Instantiate the collection of the number
     * @param capacity if set it limits the number of values stored, any exceding number pops the first number pushed (FIFO)
     */
    constructor(capacity?: number) {
        super(capacity);
    }

    /**
     * Push a value to the back to the collection
     * @param value number to add
     * @returns this
     */
    push(value: number): Numbers {
        if (value > this._max || isNaN(this._max)) {
            this._max = value;
        }

        if (value < this._min || isNaN(this._min)) {
            this._min = value;
        }

        this._average = undefined;
        this._sum += value;
        super.push(value);

        return this;
    }

    /**
     * Pop the front number from the collection
     * @returns the front number removed
     */
    pop(): number | undefined {
        const front = super.pop();

        if (front === this._max) {
            this._max = this._queue.length ? Math.max(...this._queue) : NaN;
        }

        if (front === this._min) {
            this._min = this._queue.length ? Math.min(...this._queue) : NaN;
        }

        this._average = undefined;
        this._sum -= front || 0;
        return front;
    }

    /**
     * Clear all the numbers, collection becomes empty
     * @returns this
     */
    clear() {
        this._sum = 0;
        this._min = NaN;
        this._max = NaN;
        super.clear();
        return this;
    }
}
