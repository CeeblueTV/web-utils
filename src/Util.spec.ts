/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import * as Util from './Util';

describe('Util', () => {
    describe('time functions', () => {
        it('should calculate passed time', async () => {
            const time0 = Util.time();
            await new Promise(resolve => setTimeout(resolve, 100));
            const time100 = Util.time();
            expect(time100).toBeGreaterThanOrEqual(time0 + 100);

            const unixTime = Util.unixTime();
            expect(unixTime).toBeGreaterThanOrEqual(Math.floor(performance.timeOrigin + time0 + 100));
            expect(unixTime).toBeGreaterThanOrEqual(Math.floor(performance.timeOrigin + time100));
        });
    });

    describe('fetch', () => {
        const realFetch = global.fetch;
        afterEach(() => {
            global.fetch = realFetch;
        });

        it('should handle successful response', async () => {
            global.fetch = vi.fn();
            const response = new Response('success');
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(response);

            const result = await Util.fetch('http://example.com');
            expect(result).toBe(response);
        });

        it('should handle error response', async () => {
            global.fetch = vi.fn();
            const response = new Response('superError', { status: 444 });
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(response);

            let result = await Util.fetch('https://example.com');
            expect(result).toBe(response);
            expect(result.error).toBe('superError');

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
                new Response('', { status: 444, statusText: 'superError' })
            );
            result = await Util.fetch('https://example.com');
            expect(result.error).toBe('superError');

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('', { status: 444 }));
            result = await Util.fetch('https://example.com');
            expect(result.error).toBe('444');
        });

        it('should throw on error response', async () => {
            await expect(Util.fetch('https://¤.com')).rejects.toThrow(Error);
        });
    });
});
