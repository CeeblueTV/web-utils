/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { UIMetrics } from './UIMetrics';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

(isBrowser ? describe : describe.skip)('UIMetrics (browser)', () => {
    it('renders SVG metrics into the DOM after requestAnimationFrame', async () => {
        const container = document.createElement('div');
        container.style.width = '400px';
        document.body.appendChild(container);

        if (!container.clientWidth) {
            Object.defineProperty(container, 'clientWidth', { value: 400 });
        }

        const ui = new UIMetrics(container);
        ui.lineHeight = 40;
        ui.labelWidth = 100;
        ui.stepSize = 10;

        const stats = new Map<string, Array<string | number>>([
            ['CPU', [10, 20, 30, 25, 15]],
            ['NET', [100, 120, 140, 160, 150]]
        ]);

        ui.display(stats);

        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

        expect(container.innerHTML).toContain('<svg');
        expect(container.innerHTML).toContain('CPU');
        expect(container.innerHTML).toContain('NET');
    });
});
