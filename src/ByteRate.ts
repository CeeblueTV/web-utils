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
        this.updateSamples();
    }

    private _interval: number;
    private _bytes!: number;
    private _time!: number; // beginning of the samples !
    private _samples!: Array<{ time: number; bytes: number; clip: boolean }>;
    private _clip!: boolean;

    /**
     * Constructor initializes the ByteRate object with a specified interval (default: 1000ms).
     * It sets up necessary variables to track byte rate over time.
     *
     * @param interval - Time interval in milliseconds to compute the byte rate.
     */
    constructor(interval = 1000) {
        this._interval = interval;
        this.clear();
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
        // compute rate/s
        this.updateSamples();
        const duration = Util.time() - this._time;
        return duration ? (this._bytes / duration) * 1000 : 0;
    }

    /**
     * Adds a new byte sample to the tracking system.
     * Updates the list of samples and recomputes the byte rate
     *
     * @param bytes - Number of bytes added in this interval
     */
    addBytes(bytes: number): ByteRate {
        const time = Util.time();
        const lastSample = this.updateSamples(time)[this._samples.length - 1];
        const lastTime = lastSample?.time ?? this._time;
        if (time > lastTime) {
            this._samples.push({ bytes, time, clip: false });
        } else {
            // no new duration => attach byte to last-one
            if (!lastSample) {
                // Ignore, was before our ByteRate scope !
                return this;
            }
            lastSample.bytes += bytes;
        }
        this._bytes += bytes;
        this.onBytes(bytes);
        return this;
    }

    /**
     * Clears all recorded byte rate data.
     */
    clear(): ByteRate {
        this._bytes = 0;
        this._time = Util.time();
        this._samples = [];
        this._clip = false;
        return this;
    }

    /**
     * Clips the byte rate tracking by marking the last sample as clipped.
     * If a previous clip exists, removes the clipped sample and all preceding samples.
     * Allows to shrink the interval manually between two positions.
     */
    clip(): ByteRate {
        if (this._clip) {
            this._clip = false;
            let removes = 0;
            for (const sample of this._samples) {
                this._bytes -= sample.bytes;
                ++removes;
                this._time = sample.time;
                if (sample.clip) {
                    break;
                }
            }
            this._samples.splice(0, removes);
        }
        const lastSample = this._samples[this._samples.length - 1];
        if (lastSample) {
            lastSample.clip = true;
            this._clip = true;
        }
        return this;
    }

    private updateSamples(now = Util.time()) {
        // Remove obsolete sample
        const timeOK = now - this._interval;
        let removes = 0;
        let sample;
        while (this._time < timeOK && (sample = this._samples[removes])) {
            this._bytes -= sample.bytes;
            if (sample.clip) {
                this._clip = sample.clip = false;
            }
            if (sample.time > timeOK) {
                // only a part of the sample to delete !
                sample.bytes *= (sample.time - timeOK) / (sample.time - this._time);
                this._time = timeOK;
                this._bytes += sample.bytes;
                break;
            }
            ++removes;
            this._time = sample.time;
        }

        this._samples.splice(0, removes);
        return this._samples;
    }
}
