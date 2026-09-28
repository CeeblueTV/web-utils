/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { defineTimeline, CbTimelineElement } from './UITimeline';
import { defineMetrics, CbMetricsElement } from './UIMetrics';
// Importing the entry modules registers the tags on import (covers ui/timeline.ts and ui/metrics.ts).
import './timeline';
import './metrics';

afterEach(() => {
    document.body.innerHTML = '';
});

describe('custom elements', () => {
    it('the entry modules register both tags', () => {
        expect(customElements.get('cb-timeline')).toBe(CbTimelineElement);
        expect(customElements.get('cb-metrics')).toBe(CbMetricsElement);
    });

    it('defineTimeline/defineMetrics are idempotent (guarded against re-registration)', () => {
        expect(() => {
            defineTimeline();
            defineMetrics();
        }).not.toThrow();
    });

    it('<cb-timeline> reaches the widget, applies attributes, delegates samples and cleans up', () => {
        const el = document.createElement('cb-timeline') as CbTimelineElement;
        el.setAttribute('axis', 'media');
        el.setAttribute('window', '5');
        document.body.appendChild(el);

        expect(el.timeline).toBeDefined();
        expect(el.timeline?.axis).toBe('media');
        expect(el.timeline?.windowDuration).toBe(5);

        el.pushVideo(1, { time: 0, duration: 40, isKeyFrame: true, data: new Uint8Array(10) });
        el.pushAudio(2, { time: 0, duration: 40, data: new Uint8Array(5) });
        el.pushData(3, { time: 0, duration: 40, data: new Uint8Array(5) });
        expect(el.timeline?.hasData).toBe(true);

        // attributeChangedCallback on a connected element
        el.setAttribute('axis', 'reception');
        expect(el.timeline?.axis).toBe('reception');
        el.setAttribute('window', '8');
        expect(el.timeline?.windowDuration).toBe(8);

        el.remove(); // disconnectedCallback tears the widget down
        expect(el.timeline).toBeUndefined();
    });

    it('<cb-metrics> reaches the widget, delegates display and cleans up', () => {
        const el = document.createElement('cb-metrics') as CbMetricsElement;
        document.body.appendChild(el);
        expect(el.metrics).toBeDefined();
        expect(() => el.display(new Map<string, Array<string | number>>([['A', [1, 2, 3]]]))).not.toThrow();
        el.remove();
        expect(el.metrics).toBeUndefined();
    });
});
