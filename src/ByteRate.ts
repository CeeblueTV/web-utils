/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import * as Util from './Util';

/**
 * Class to compute a weighted average byte rate over a specified time interval.
 *
 * This class continuously tracks data transmission and computes the byte rate
 * based on a weighted average, considering both the duration and the number of
 * bytes in each sample. It allows for real-time monitoring of bandwidth usage
 * and provides mechanisms to dynamically adjust the measurement interval.
 *
 * Features:
 * - Computes the byte rate using a **weighted average** approach.
 * - Allows setting a custom interval for tracking.
 * - Supports dynamic clipping to manually shrink the observation window.
 */
export class ByteRate {
    /**
     * Raised when new bytes are added
     */
    onBytes(bytes: number) {}

    /**
     * Returns the interval used for computing the byte rate
     */
    get interval() {
        return this._interval;
    }

    /**
     * Sets a new interval for computing the average byte rate
     */
    set interval(value: number) {
        this._interval = value;
        this._updateWindow();
    }

    private _interval: number;
    private _window: Array<{ time: number; bytes: number }> = [];
    private _totalBytes: number = 0;

    /**
     * Constructor initializes the ByteRate object with a specified interval (default: 1000ms).
     */
    constructor(interval = 1000) {
        this._interval = interval;
    }

    /**
     * Returns the computed byte rate rounded to the nearest integer
     */
    value(): number {
        return Math.round(this.exact());
    }

    /**
     * Computes the exact byte rate in bytes per second
     */
    exact(): number {
        this._updateWindow();
        if (this._window.length === 0) {
            return 0;
        }

        const duration = Util.time() - this._window[0].time;
        return duration ? (this._totalBytes / duration) * 1000 : 0;
    }

    /**
     * Adds a new byte sample to the tracking system
     */
    addBytes(bytes: number): ByteRate {
        const time = Util.time();
        this._window.push({ time, bytes });
        this._totalBytes += bytes;
        this._updateWindow();
        this.onBytes(bytes);
        return this;
    }

    /**
     * Clears all recorded byte rate data
     */
    clear(): ByteRate {
        this._window = [];
        this._totalBytes = 0;
        return this;
    }

    /**
     * Clips the byte rate tracking by removing all samples before the last clip point
     */
    clip(): ByteRate {
        if (this._window.length === 0) {
            return this;
        }

        const lastTime = this._window[this._window.length - 1].time;
        this._window = this._window.filter(sample => sample.time >= lastTime);
        this._totalBytes = this._window.reduce((sum, sample) => sum + sample.bytes, 0);
        return this;
    }

    private _updateWindow() {
        const now = Util.time();
        const cutoff = now - this._interval;

        // Remove samples outside the window
        while (this._window.length > 0 && this._window[0].time < cutoff) {
            this._totalBytes -= this._window[0].bytes;
            this._window.shift();
        }
    }
}
