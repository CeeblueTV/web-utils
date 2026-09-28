/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

/**
 * Maximum GOP (group-of-pictures) duration in milliseconds — a convenient averaging window.
 */
export const MAX_GOP_DURATION = 10000;

/**
 * Media type of a track or sample. Numeric so tracks can be ordered (video first).
 */
export enum Type {
    DATA = 0,
    AUDIO = 1,
    VIDEO = 2
}

/**
 * Media codec, empty string when unknown.
 */
export enum Codec {
    UNKNOWN = '',
    // Video
    H264 = 'H264',
    HEVC = 'HEVC',
    VP8 = 'VP8',
    // Audio
    MP3 = 'MP3',
    AAC = 'AAC',
    OPUS = 'OPUS',
    // Data
    ID3 = 'ID3',
    JSON = 'JSON',
    SUBTITLE = 'SUBTITLE'
}

/**
 * A single media sample (frame). This is the protocol-agnostic input vocabulary consumed by UI
 * widgets such as `UITimeline`: any producer able to emit this shape can feed them.
 */
export type Sample = {
    time: number;
    duration: number;
    data: Uint8Array;
    compositionOffset?: number;
    isKeyFrame?: boolean;
    subSamples?: Array<{ clearBytes: number; encryptedBytes: number }>; // DRM field for SENC box
    iv?: Uint8Array; // DRM per-sample IV (when ContentProtection.ivMode === 'sample')
};

/**
 * Track selection.
 */
export type Tracks = {
    /**
     * Audio track, undefined = MBR, -1 = Remove the track
     */
    audio?: number;
    /**
     * Video track, undefined = MBR, -1 = Remove the track
     */
    video?: number;
    /**
     * Datas tracks to receive, undefined = ALL
     */
    data?: Set<number>;
};

/**
 * A pixel resolution.
 */
export type Resolution = {
    width: number;
    height: number;
};

/**
 * Human-readable name of a media {@link Type}.
 * @param type media type
 */
export function typeToString(type: Type) {
    switch (type) {
        case Type.AUDIO:
            return 'audio';
        case Type.VIDEO:
            return 'video';
        case Type.DATA:
            return 'data';
        default:
    }
    return 'unknown';
}

/**
 * The display resolution in device pixels, or undefined outside a browser. In portrait the axes are
 * swapped so the result always represents the maximum fullscreen ability (landscape orientation).
 * @returns the screen {@link Resolution}, or undefined when there is no DOM
 */
export function screenResolution(): Resolution | undefined {
    if (typeof window === 'undefined' || !window.screen) {
        return;
    }
    const ratio = window.devicePixelRatio || 1;
    let height = ratio * window.screen.height;
    let width = ratio * window.screen.width;
    if (height > width) {
        // smartphone, switch to compute max fullscreen ability (height becomes width)
        [width, height] = [height, width];
    }
    return { width, height };
}

/**
 * Whether a resolution exceeds the displayable screen.
 * @param resolution the resolution to test
 * @param screen the screen resolution to compare against
 * @returns true when resolution is larger than screen on both axes
 */
export function overScreenSize(resolution: Resolution, screen?: Resolution) {
    return screen && resolution.height > screen.height && resolution.width > screen.width;
}
