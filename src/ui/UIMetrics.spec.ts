/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { UIMetrics } from './UIMetrics';

// Capture requestAnimationFrame callbacks so display()'s innerHTML flush is deterministic.
let rafQueue: FrameRequestCallback[] = [];
const flushRaf = () => {
    const q = rafQueue;
    rafQueue = [];
    q.forEach(cb => cb(0));
};

const created: UIMetrics[] = [];
const make = () => {
    const ui = document.createElement('ul');
    // jsdom has no layout, so force a width for display() to compute displayable points.
    Object.defineProperty(ui, 'clientWidth', { configurable: true, value: 600 });
    document.body.appendChild(ui);
    const m = new UIMetrics(ui);
    created.push(m);
    return { ui, m };
};

beforeEach(() => {
    rafQueue = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafQueue.push(cb));
});

afterEach(() => {
    created.forEach(m => m.destroy());
    created.length = 0;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
});

describe('UIMetrics', () => {
    it('tags its container and self-hosts its stylesheet', () => {
        const { ui } = make();
        expect(ui.classList.contains('cb-stats-list')).toBe(true);
        // jsdom lacks constructable stylesheets, so the <style> fallback is used.
        expect(document.querySelector('style[data-cb-uimetrics]')).not.toBeNull();
    });

    it('exposes configurable pixel getters/setters', () => {
        const { m } = make();
        m.graphMargin = 6;
        m.textMargin = 7;
        m.lineHeight = 50;
        m.labelWidth = 120;
        m.legendFontSize = 12;
        m.stepSize = 8;
        expect(m.graphMargin).toBe(6);
        expect(m.textMargin).toBe(7);
        expect(m.lineHeight).toBe(50);
        expect(m.labelWidth).toBe(120);
        expect(m.legendFontSize).toBe(12);
        expect(m.stepSize).toBe(8);
        expect(m.averageDisplayWidth).toBeGreaterThan(0);
        expect(typeof m.displayableCount).toBe('number');
    });

    it('renders an <svg> row per metric on display()', () => {
        const { ui, m } = make();
        ui.dispatchEvent(new MouseEvent('mousemove')); // exercise the hover branch
        const stats = new Map<string, Array<string | number>>([
            ['Bitrate', [1000, 1100, 900, 1200, 1050]],
            ['FPS', [30, 30, 30, 30, 30]]
        ]);
        m.display(stats);
        flushRaf();
        expect((ui.innerHTML.match(/<svg/g) || []).length).toBe(2);
        ui.dispatchEvent(new MouseEvent('mouseleave'));
    });

    it('skips overlapping display() calls until the frame flushes', () => {
        const { m } = make();
        const stats = new Map<string, Array<string | number>>([['A', [1, 2, 3]]]);
        m.display(stats);
        m.display(stats); // returns early: the previous frame has not flushed yet
        expect(rafQueue.length).toBe(1);
        flushRaf();
    });

    it('reset() rescales and destroy() detaches listeners without throwing', () => {
        const { m } = make();
        m.display(new Map<string, Array<string | number>>([['A', [1, 2, 3]]]));
        flushRaf();
        m.reset();
        expect(() => m.destroy()).not.toThrow();
    });
});
