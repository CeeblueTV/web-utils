/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

/**
 * Registers the `<cb-timeline>` custom element on import, so a page can embed it with a single tag
 * and no build step:
 * ```html
 * <script type="module" src="https://cdn.jsdelivr.net/npm/@ceeblue/web-utils@8/dist/ui/timeline.min.js"></script>
 * <cb-timeline axis="reception" window="10"></cb-timeline>
 * ```
 * The `UITimeline` engine and `CbTimelineElement` class are re-exported for programmatic use.
 */
import { defineTimeline } from './UITimeline';

defineTimeline();

export { UITimeline, UITimelineAxis, CbTimelineElement } from './UITimeline';
