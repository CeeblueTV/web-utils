/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { defineConfig } from 'vitest/config';

// Mirror the rollup build: import `.css` files as strings, so a component that self-hosts a co-located
// stylesheet (e.g. UIMetrics) can be imported in tests.
const cssString = () => ({
    name: 'css-string',
    enforce: 'pre',
    transform(code: string, id: string) {
        if (id.endsWith('.css')) {
            return { code: `export default ${JSON.stringify(code)};`, map: null };
        }
        return null;
    }
});

export default defineConfig({
    plugins: [cssString()],
    test: {
        globals: true,
        environment: 'jsdom',
        coverage: {
            include: ['src/**/*.ts'],
            provider: 'istanbul',
            reporter: ['text', 'lcov'],
            reportsDirectory: './coverage',
            reportOnFailure: true
        },
        testTimeout: 10000,
        silent: true
    }
});
