/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encodeTimestamp, decodeTimestamp, getLatency } from './EpochTime';

describe('EpochTime', () => {
    let canvas: HTMLCanvasElement;
    let context: CanvasRenderingContext2D;
    const testWidth = 320;
    const testHeight = 10;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = testWidth;
        canvas.height = testHeight;
        context = canvas.getContext('2d')!;
    });

    describe('encodeTimestamp', () => {
        it('should encode timestamp correctly', () => {
            const testDate = new Date(Date.UTC(2025, 0, 15, 12, 30, 45, 500));
            encodeTimestamp(context, testWidth, 32, testDate);

            const decodedDate = decodeTimestamp(context, testWidth, 32);
            expect(decodedDate).not.toBeNull();
            expect(decodedDate!.getUTCDate()).toBe(15);
            expect(decodedDate!.getUTCHours()).toBe(12);
            expect(decodedDate!.getUTCMinutes()).toBe(30);
            expect(decodedDate!.getUTCSeconds()).toBe(45);
            expect(decodedDate!.getUTCMilliseconds()).toBe(500);
        });
    });

    describe('getLatency', () => {
        it('should calculate latency correctly', () => {
            const video = document.createElement('video');
            video.width = testWidth;
            video.height = testHeight;

            const testDate = new Date(Date.UTC(2025, 0, 15, 12, 30, 45, 500));
            encodeTimestamp(context, testWidth, 32, testDate);

            const mockDrawImage = vi.spyOn(context, 'drawImage');
            mockDrawImage.mockImplementation(() => {
                context.drawImage(canvas, 0, 0, testWidth, testHeight, 0, 0, testWidth, testHeight);
            });

            const now = new Date();
            const latency = getLatency(video, canvas, context, now);

            expect(latency).toBeGreaterThanOrEqual(0);
            expect(latency).toBeLessThan(1000);
        });

        it('should handle zero dimensions', () => {
            const video = document.createElement('video');
            video.width = 0;
            video.height = 0;

            const latency = getLatency(video, canvas, context);
            expect(latency).toBe(0);
        });
    });
});
