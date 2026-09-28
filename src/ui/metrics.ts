/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

/**
 * Registers the `<cb-metrics>` custom element on import, so a page can embed it with a single tag
 * and no build step:
 * ```html
 * <script type="module" src="https://cdn.jsdelivr.net/npm/@ceeblue/web-utils@8/dist/ui/metrics.min.js"></script>
 * <cb-metrics></cb-metrics>
 * ```
 * The `UIMetrics` engine and `CbMetricsElement` class are re-exported for programmatic use.
 */
import { defineMetrics } from './UIMetrics';

defineMetrics();

export { UIMetrics, CbMetricsElement } from './UIMetrics';
