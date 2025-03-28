/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

/**
 * Decode the timestamp from a video element and compute the latency between the timestamp and the current date.
 *
 * @param {HTMLVideoElement} sourceEl the video element to get the image from
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} context
 * @param {Date} now current date, new Date() by default
 * @param {Number} blocksPerRow number of blocks in the line, 32 by default
 * @param {Number} tolerance percentage of tolerance for the black and white threshold, 0.2 by default
 * @returns {Number} The latency in millisecond between 'now' and the decoded timestamp, 0 if the timestamp cannot be decoded
 */
export function getLatency(
    sourceEl: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    now: Date = new Date(),
    blocksPerRow: number = 32,
    tolerance: number = 0.2
) {
    canvas.width = sourceEl.videoWidth;
    canvas.height = Math.floor(canvas.width / blocksPerRow);
    if (!canvas.width || !canvas.height) {
        // No pixel to parse!
        return 0;
    }

    context.drawImage(sourceEl, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

    const timestamp = decodeTimestamp(context, canvas.width, blocksPerRow, tolerance);
    return timestamp == null ? 0 : now.getTime() - timestamp.getTime();
}

/**
 * Decode a previously encoded timestamp from a canvas
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Number} lineWidth width of the line in pixels
 * @param {Number} blocksPerRow number of blocks in the line, 32 by default
 * @param {Number} tolerance percentage of tolerance for the black and white threshold, 0.2 by default
 * @returns {Date|null} The Date object representing the timestamp or null if the timestamp cannot be decoded
 */
export function decodeTimestamp(
    context: CanvasRenderingContext2D,
    lineWidth: number,
    blocksPerRow: number = 32,
    tolerance: number = 0.2
) {
    const blockSize = lineWidth / blocksPerRow;
    let binaryTime = '';
    let i = blockSize / 2;

    const data = context.getImageData(0, Math.round(i), lineWidth, 1).data;
    const pixels = new Uint32Array(data.buffer);
    const blackThreshold = 0xff * tolerance;
    const whiteThreshold = 0xff * (1 - tolerance);

    while (i < pixels.length) {
        const pixel = pixels[Math.round(i)] & 0xffffff;
        // Extract luminance from RGB
        const Y = 0.299 * ((pixel >> 16) & 0xff) + 0.587 * ((pixel >> 8) & 0xff) + 0.114 * (pixel & 0xff);
        if (Y < blackThreshold) {
            // Black
            binaryTime += '1';
        } else if (Y > whiteThreshold) {
            // White
            binaryTime += '0';
        } else {
            return;
        }
        i += blockSize;
    }

    const day = parseInt(binaryTime.slice(0, 5), 2);
    const hour = parseInt(binaryTime.slice(5, 10), 2);
    const minute = parseInt(binaryTime.slice(10, 16), 2);
    const second = parseInt(binaryTime.slice(16, 22), 2);
    const millisecond = parseInt(binaryTime.slice(22, 32), 2);

    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minute, second, millisecond));
}

/**
 * Encode the current timestamp into a line composed of blocks of black and white pixels
 * written on the top of the canvas.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Number} lineWidth width of the line in pixels
 * @param {Number} blocksPerRow number of blocks in the line, 32 by default
 * @param {Date} now current date, new Date() by default
 */
export function encodeTimestamp(
    context: CanvasRenderingContext2D,
    lineWidth: number,
    blocksPerRow: number = 32,
    now: Date = new Date()
) {
    const blockSize = Math.floor(lineWidth / blocksPerRow);

    const day = now.getUTCDate();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const second = now.getUTCSeconds();
    const millisecond = now.getUTCMilliseconds();

    const binaryDay = day.toString(2).padStart(5, '0');
    const binaryHour = hour.toString(2).padStart(5, '0');
    const binaryMinute = minute.toString(2).padStart(6, '0');
    const binarySecond = second.toString(2).padStart(6, '0');
    const binaryMillisecond = millisecond.toString(2).padStart(10, '0');
    const binaryTime = binaryDay + binaryHour + binaryMinute + binarySecond + binaryMillisecond;

    for (let i = 0; i < binaryTime.length; i++) {
        const x = (i % blocksPerRow) * blockSize;
        const y = Math.floor(i / blocksPerRow) * blockSize;

        context.fillStyle = binaryTime[i] === '1' ? 'black' : 'white';
        context.fillRect(x, y, blockSize, blockSize);
    }
}
