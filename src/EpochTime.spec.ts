/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { createCanvas } from 'canvas';
import { encodeTimestamp, decodeTimestamp } from './EpochTime';
// import { writeFileSync } from 'fs';

const BLOCKS = 32;

function makeNowForTest() {
    const sys = new Date();
    return new Date(
        Date.UTC(
            sys.getUTCFullYear(),
            sys.getUTCMonth(),
            13, // day
            11, // hour
            22, // minute
            33, // second
            456 // millisecond
        )
    );
}

/**
 * Creates a canvas of width=W, height=floor(W/32), paints the timestamp line,
 * then decodes it and returns the decoded Date.
 */
function encodeDecode(width: number, height: number, now = makeNowForTest()) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // fullfill the canvas with yellow color
    ctx.fillStyle = 'yellow';
    ctx.fillRect(0, 0, width, height);

    // Encode the test timestamp into the top bar
    encodeTimestamp(ctx as unknown as CanvasRenderingContext2D, width, BLOCKS, now);

    // Uncomment to save the canvas for debugging
    // const buffer = canvas.toBuffer('image/png');
    // writeFileSync(`epoch-${width}.png`, new Uint8Array(buffer));

    // Decode back
    const decoded = decodeTimestamp(ctx as unknown as CanvasRenderingContext2D, width);

    return { decoded, expected: now };
}

describe('EpochTime encode/decode', () => {
    it('decodes correctly when width is a multiple of 32 (1920x*)', () => {
        const { decoded, expected } = encodeDecode(1920, 1080);
        expect(decoded).toBeInstanceOf(Date);
        // Compare exact time; both should be UTC in the same year/month/day/hour/min/sec/ms
        expect(decoded!.toISOString()).toBe(expected.toISOString());
    });

    it('decodes correctly when width is NOT a multiple of 32 (854x*)', () => {
        const { decoded, expected } = encodeDecode(854, 480);
        expect(decoded).toBeInstanceOf(Date);
        expect(decoded!.toISOString()).toBe(expected.toISOString());
    });

    it('still decodes with small widths (edge case, remainder present)', () => {
        // 33 ensures remainder (33/32 => 1px blocks + 1px remainder)
        const { decoded, expected } = encodeDecode(33, 33);
        expect(decoded).toBeInstanceOf(Date);
        expect(decoded!.toISOString()).toBe(expected.toISOString());
    });

    it('does not decode full black square', () => {
        const canvas = createCanvas(128, 128);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 128, 128);
        const decoded = decodeTimestamp(ctx as unknown as CanvasRenderingContext2D, 128);
        expect(decoded).toBeNull();
    });
});
