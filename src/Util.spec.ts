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
});
