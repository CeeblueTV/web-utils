/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Sample } from '../Media';

// Drive Util.time() from a controllable clock so reception-gap grouping is deterministic.
const { clock } = vi.hoisted(() => ({ clock: { now: 0 } }));
vi.mock('../Util', async importOriginal => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return { ...actual, time: () => clock.now };
});

import { UITimeline } from './UITimeline';

interface TLInternals {
    _canvas: HTMLCanvasElement;
    _hits: Array<{ x0: number; x1: number; y0: number; y1: number }>;
    _ovRect?: { x0: number; x1: number; y0: number; y1: number };
    _down(e: MouseEvent): void;
    _move(e: MouseEvent): void;
    _up(): void;
}
const internals = (tl: UITimeline) => tl as unknown as TLInternals;

const sample = (time: number, opts: { duration?: number; key?: boolean; bytes?: number } = {}): Sample => ({
    time,
    duration: opts.duration ?? 40,
    data: new Uint8Array(opts.bytes ?? 100),
    isKeyFrame: opts.key ?? false
});

/** Parse toCSV() into an array of column-keyed rows (skipping the header). */
const rows = (tl: UITimeline) => {
    const lines = tl.toCSV().split('\n');
    const header = lines[0].split(';');
    return lines
        .slice(1)
        .filter(Boolean)
        .map(line => {
            const cols = line.split(';');
            const o: Record<string, string> = {};
            header.forEach((h, i) => (o[h] = cols[i]));
            return o;
        });
};

/** Bypass the layout-visibility guard so render() actually draws under jsdom. */
const forceVisible = (tl: UITimeline) => {
    const canvas = internals(tl)._canvas;
    Object.defineProperty(canvas, 'offsetParent', { configurable: true, get: () => canvas.parentElement });
};

const created: UITimeline[] = [];
const make = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const tl = new UITimeline(container);
    created.push(tl);
    return tl;
};

afterEach(() => {
    created.forEach(tl => tl.destroy());
    created.length = 0;
    document.body.innerHTML = '';
    clock.now = 0;
});

describe('UITimeline', () => {
    it('has no data before any sample is pushed', () => {
        const tl = make();
        expect(tl.hasData).toBe(false);
        expect(rows(tl)).toHaveLength(0);
    });

    it('opens a new video sequence on each keyframe', () => {
        clock.now = 1000;
        const tl = make();
        tl.pushVideo(1, sample(0, { key: true, bytes: 100 }));
        tl.pushVideo(1, sample(40, { bytes: 50 }));
        tl.pushVideo(1, sample(80, { bytes: 50 }));
        tl.pushVideo(1, sample(120, { key: true, bytes: 100 }));
        tl.pushVideo(1, sample(160, { bytes: 40 }));

        const vids = rows(tl).filter(r => r.type === '2');
        expect(vids).toHaveLength(2);
        expect(vids[0]).toMatchObject({
            seq: '0',
            frames: '3',
            bytes: '200',
            dtsStart_ms: '0',
            dtsEnd_ms: '120',
            keyframe: '1'
        });
        expect(vids[1]).toMatchObject({
            seq: '1',
            frames: '2',
            bytes: '140',
            dtsStart_ms: '120',
            dtsEnd_ms: '200',
            keyframe: '1'
        });
        expect(tl.hasData).toBe(true);
    });

    it('groups audio/data samples under the current video sequence number', () => {
        clock.now = 1000;
        const tl = make();
        tl.pushVideo(1, sample(0, { key: true }));
        tl.pushAudio(2, sample(0, { bytes: 10 }));
        tl.pushAudio(2, sample(20, { bytes: 10 }));
        tl.pushVideo(1, sample(40)); // still sequence 0 (no new keyframe)
        tl.pushAudio(2, sample(40, { bytes: 10 }));

        const audio = rows(tl).filter(r => r.type === '1');
        expect(audio).toHaveLength(1);
        expect(audio[0]).toMatchObject({ track: '2', seq: '0', frames: '3', bytes: '30' });
    });

    it('groups a no-video track into fixed 2s media-time buckets (fallback GOP)', () => {
        clock.now = 1000;
        const tl = make();
        tl.pushData(3, sample(0, { bytes: 10 }));
        tl.pushData(3, sample(500, { bytes: 10 }));
        tl.pushData(3, sample(1900, { bytes: 10 })); // all within the first 2s bucket
        tl.pushData(3, sample(2100, { bytes: 10 })); // crosses into the next bucket → new sequence
        tl.pushData(3, sample(3000, { bytes: 10 }));

        const data = rows(tl).filter(r => r.type === '0');
        expect(data).toHaveLength(2);
        expect(data.map(r => r.frames)).toEqual(['3', '2']);
    });

    it('keeps a steady audio-only cadence in one sequence (no one-sliver-per-sample)', () => {
        clock.now = 1000;
        const tl = make();
        // ~45ms Opus/AAC-like frames: reception gaps exceed the old ~30ms heuristic threshold, but
        // they all fall inside one 2s media-time bucket, so they group into a single sequence.
        for (let i = 0; i < 10; ++i) {
            clock.now += 45;
            tl.pushAudio(2, sample(i * 45, { bytes: 10 }));
        }
        const audio = rows(tl).filter(r => r.type === '1');
        expect(audio).toHaveLength(1);
        expect(audio[0].frames).toBe('10');
    });

    it('trims old sequences past MAX_SEQUENCES', () => {
        const prev = UITimeline.MAX_SEQUENCES;
        UITimeline.MAX_SEQUENCES = 2;
        try {
            clock.now = 1000;
            const tl = make();
            for (let i = 0; i < 5; ++i) {
                tl.pushData(3, sample(i * 2000, { bytes: 10 })); // each in its own 2s bucket → 5 sequences
            }
            expect(rows(tl).filter(r => r.type === '0')).toHaveLength(2);
        } finally {
            UITimeline.MAX_SEQUENCES = prev;
        }
    });

    it('reset() clears all data and returns to live', () => {
        clock.now = 1000;
        const tl = make();
        tl.pushVideo(1, sample(0, { key: true }));
        tl.following = false;
        tl.reset();
        expect(tl.hasData).toBe(false);
        expect(tl.following).toBe(true);
        expect(rows(tl)).toHaveLength(0);
    });

    it('clamps windowDuration to at least 1 second', () => {
        const tl = make();
        expect(tl.windowDuration).toBe(10);
        tl.windowDuration = 30;
        expect(tl.windowDuration).toBe(30);
        tl.windowDuration = 0;
        expect(tl.windowDuration).toBe(1);
        tl.windowDuration = -5;
        expect(tl.windowDuration).toBe(1);
    });

    it('fires onFollowingChange only on real transitions', () => {
        const tl = make();
        const fired: boolean[] = [];
        tl.onFollowingChange = f => fired.push(f);
        tl.following = false;
        tl.following = false; // no-op, no event
        tl.following = true;
        expect(fired).toEqual([false, true]);
        expect(tl.following).toBe(true);
    });

    it('switches axis and keeps the frozen view mapped across axes', () => {
        clock.now = 1000;
        const tl = make();
        tl.pushVideo(1, sample(0, { key: true }));
        tl.pushVideo(1, sample(40));
        expect(tl.axis).toBe('reception');
        tl.following = false; // frozen → axis change runs the value mapping
        tl.axis = 'media';
        expect(tl.axis).toBe('media');
        tl.axis = 'media'; // no-op branch
        tl.axis = 'reception';
        expect(tl.axis).toBe('reception');
    });

    it('renders the waiting state, populated state and media axis without throwing', () => {
        const tl = make();
        forceVisible(tl);
        expect(() => tl.render()).not.toThrow(); // "waiting for media…"

        clock.now = 1000;
        for (let i = 0; i < 8; ++i) {
            clock.now = 1000 + i * 50;
            tl.pushVideo(1, sample(i * 40, { key: i % 3 === 0 }));
        }
        tl.pushAudio(2, sample(0, { bytes: 20 }));
        tl.pushData(3, sample(0, { bytes: 20 }));
        expect(() => tl.render()).not.toThrow(); // reception axis, full draw

        tl.axis = 'media';
        tl.getMediaTime = () => 0; // playhead within the visible window
        expect(() => tl.render()).not.toThrow();
    });

    it('pans on drag (pausing follow) and scrubs the overview minimap', () => {
        clock.now = 1000;
        const tl = make();
        forceVisible(tl);
        for (let i = 0; i < 8; ++i) {
            clock.now = 1000 + i * 50;
            tl.pushVideo(1, sample(i * 40, { key: i % 3 === 0 }));
        }
        tl.render(); // builds hit-boxes + overview rect
        const tl_ = internals(tl);

        // hover a sequence → tooltip path
        const hit = tl_._hits[0];
        expect(hit).toBeDefined();
        tl_._move(new MouseEvent('mousemove', { clientX: hit.x0 + 1, clientY: hit.y0 + 1 }));

        // drag the plot to the right → pan into the past, pausing follow
        tl_._down(new MouseEvent('mousedown', { clientX: 120, clientY: hit.y0 + 1 }));
        tl_._move(new MouseEvent('mousemove', { clientX: 260, clientY: hit.y0 + 1 }));
        tl_._up();
        expect(tl.following).toBe(false);

        // scrub the overview band → absolute jump
        const ov = tl_._ovRect;
        expect(ov).toBeDefined();
        if (ov) {
            const midY = (ov.y0 + ov.y1) / 2;
            tl_._down(new MouseEvent('mousedown', { clientX: (ov.x0 + ov.x1) / 2, clientY: midY }));
            tl_._move(new MouseEvent('mousemove', { clientX: ov.x0 + 4, clientY: midY }));
            tl_._up();
        }
    });

    it('destroy() removes its elements from the container', () => {
        const tl = make();
        const canvas = internals(tl)._canvas;
        expect(canvas.parentElement).not.toBeNull();
        tl.destroy();
        expect(canvas.parentElement).toBeNull();
    });
});
