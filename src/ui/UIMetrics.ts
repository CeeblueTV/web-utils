/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

// The widget's stylesheet lives in a co-located .css file, bundled to a string at build time.
import styleCss from './UIMetrics.css';

/** Shared constructable stylesheet — created once, adopted into each root the widget renders in. */
let sheet: CSSStyleSheet | undefined;

/**
 * An user-interface compoment to vizualize real-time metrics
 */
export class UIMetrics {
    /**
     * get graph margin in pixels
     */
    get graphMargin(): number {
        return this._graphMargin;
    }
    /**
     * set graph margin in pixels
     */
    set graphMargin(value: number) {
        this._graphMargin = value;
    }

    /**
     * get text margin in pixels
     */
    get textMargin(): number {
        return this._textMargin;
    }
    /**
     * set text margin in pixels
     */
    set textMargin(value: number) {
        this._textMargin = value;
    }

    /**
     * get metric line height in pixels
     */
    get lineHeight(): number {
        return this._lineHeight;
    }
    /**
     * set metric line height in pixels
     */
    set lineHeight(value: number) {
        this._lineHeight = value;
    }

    /**
     * get label width in pixels
     */
    get labelWidth(): number {
        return this._labelWidth;
    }
    /**
     * set label width in pixels
     */
    set labelWidth(value: number) {
        this._labelWidth = value;
    }

    /**
     * get legend font size in pixels
     */
    get legendFontSize(): number {
        return this._legendFontSize;
    }
    /**
     * set legend font size in pixels
     */
    set legendFontSize(value: number) {
        this._legendFontSize = value;
    }

    /**
     * get the metric unit-step in pixels
     */
    get stepSize(): number {
        return this._stepSize;
    }
    /**
     * set the metric unit-step in pixels
     */
    set stepSize(value: number) {
        this._stepSize = value;
    }

    /**
     * Return the space width available to display average metric
     */
    get averageDisplayWidth(): number {
        // 7 chars (1 char width ≈ fontSize/2)
        return (this._legendFontSize / 2) * 7;
    }

    /**
     * Return the count of displayable metrics regarding the space available on the screen
     */
    get displayableCount(): number {
        const width = this._ui.clientWidth - this.averageDisplayWidth;
        return Math.ceil((width - this._labelWidth) / this._stepSize);
    }

    private _ui: HTMLElement;
    private _html?: string;
    private _lineHeight: number;
    private _labelWidth: number;
    private _graphMargin: number;
    private _textMargin: number;
    private _legendFontSize: number;
    private _stepSize: number;
    private _ranges: { [key: string]: { min: number; max: number } };
    private _mouseX?: number;
    private _onMouseMove: (event: MouseEvent) => void;
    private _onMouseLeave: () => void;

    constructor(ui: HTMLElement) {
        this._ui = ui;
        // Self-host the widget stylesheet in whatever root it lives in (document or a shadow root),
        // so it needs no external CSS; only the --cb-* tokens are read from :root.
        ui.classList.add('cb-stats-list');
        this._injectStyles();
        this._onMouseMove = (event: MouseEvent) => {
            this._mouseX = event.offsetX;
        };
        this._onMouseLeave = () => {
            this._mouseX = undefined;
        };
        ui.addEventListener('mousemove', this._onMouseMove);
        ui.addEventListener('mouseleave', this._onMouseLeave);
        // default values in pixels
        this._lineHeight = 40;
        this._labelWidth = 170;
        this._graphMargin = 5;
        this._textMargin = 5;
        this._legendFontSize = 13;
        this._stepSize = 10;
        this._ranges = {};
    }

    /**
     * Detach the listeners added in the constructor. The self-hosted stylesheet is shared per root
     * and left in place.
     */
    destroy() {
        this._ui.removeEventListener('mousemove', this._onMouseMove);
        this._ui.removeEventListener('mouseleave', this._onMouseLeave);
    }

    private _injectStyles() {
        // The widget's root: the document, or its shadow root when embedded as <cb-metrics>.
        const root = this._ui.getRootNode() as Document | ShadowRoot;
        // Modern path: one shared constructable stylesheet, adopted once per root.
        if (typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
            if (!sheet) {
                sheet = new CSSStyleSheet();
                sheet.replaceSync(styleCss);
            }
            const s = sheet;
            if (root.adoptedStyleSheets.indexOf(s) === -1) {
                root.adoptedStyleSheets = [...root.adoptedStyleSheets, s];
            }
            return;
        }
        // Fallback for environments without constructable stylesheets (old Safari, non-DOM test envs):
        // a <style> element, injected once per root.
        if (!root.querySelector('style[data-cb-uimetrics]')) {
            const style = document.createElement('style');
            style.setAttribute('data-cb-uimetrics', '');
            style.textContent = styleCss;
            (root instanceof Document ? root.head : root).appendChild(style);
        }
    }

    /**
     * Reset metrics stats, essentially rescaling the metrics
     */
    reset() {
        this._ranges = {};
    }

    /**
     * build metric from stats
     * @param stats Map with stats per entry
     * @returns
     */
    display(stats: Map<string, Array<string | number>>) {
        if (this._html != null) {
            // CPU processing, skip one stats!
            return;
        }
        this._html = '';

        const averageDisplayWidth = this.averageDisplayWidth;
        const averageCenter = averageDisplayWidth / 2;
        const width = this._ui.clientWidth - averageDisplayWidth;
        const graphHeight = this._lineHeight - 2 * this._graphMargin;
        const graphMiddle = Math.round(this._lineHeight / 2);
        const textY = Math.round(this._lineHeight / 2 + this._textMargin);
        const titleWidth = this._labelWidth - 2 * this._textMargin;

        for (const [key, fullValues] of stats) {
            const displayableCount = Math.ceil((width - this._labelWidth) / this._stepSize);
            const values = fullValues.slice(Math.max(0, fullValues.length - displayableCount));
            if (!values.length) {
                continue;
            }

            let x = this._labelWidth + values.length * this._stepSize;

            /*
			<svg class="list-group-item p-0" style="height: 40px;" xmlns="http://www.w3.org/2000/svg">
				<text x="5" y="22">M text</text>
				<path fill="none" d="M100 0 110 22 120 0 130 20" stroke-width="1" stroke="brown"/>
			</svg>
			*/
            this._html +=
                '<svg class="list-group-item p-0" style="height: ' +
                this._lineHeight +
                'px" xmlns="http://www.w3.org/2000/svg">';
            this._html += '<text x="' + this._textMargin + '" y="' + textY + '">' + key + '</text>';
            this._html +=
                '<text x="' +
                titleWidth +
                '" y="' +
                textY +
                '" text-anchor="end">' +
                values[values.length - 1].toString() +
                '</text>';

            this._html += '<path fill="none" d="M' + this._labelWidth + ' ' + graphMiddle;
            this._html += 'H' + (width + averageCenter);
            this._html += '" stroke-width="1" stroke="lightgray" stroke-dasharray="10,10"/>';

            this._html += '<path fill="none" stroke-width="1" stroke="brown" d="M';

            let min = Number.POSITIVE_INFINITY;
            let max = Number.NEGATIVE_INFINITY;
            for (let i = 0; i < values.length; ++i) {
                const value = parseFloat(values[i].toString());
                if (value < min) {
                    min = value;
                }
                if (value > max) {
                    max = value;
                }
            }
            let range = this._ranges[key];
            if (!range) {
                this._ranges[key] = range = { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
            }
            range.min = Math.min(range.min, min);
            range.max = Math.max(range.max, max);
            const delta = range.max - range.min;

            let minCircle = '';
            let maxCircle = '';

            let mouseCircle = this._mouseX == null || this._mouseX > x ? null : '';
            for (let i = 0; i < values.length; ++i) {
                x -= this._stepSize;
                const value = parseFloat(values[i].toString());
                const y = graphMiddle + (delta ? Math.round((0.5 - (value - range.min) / delta) * graphHeight) : 0);
                this._html += x + ' ' + y + ' ';
                if (value === min) {
                    maxCircle = maxCircle || this._drawCircle(x, y, value);
                } else if (value === max) {
                    minCircle = minCircle || this._drawCircle(x, y, value);
                }
                if (mouseCircle === '' && x <= (this._mouseX || 0)) {
                    mouseCircle = this._drawCircle(x, y, value, 'blue', '');
                }
            }

            this._html += '" />'; // end path

            // Average
            const average = Math.round((max - min) / 2);
            this._html += '<text text-anchor="middle" font-size="' + this._legendFontSize + '" y="' + textY + '">';
            this._html +=
                '<tspan x="' +
                (width + averageCenter) +
                '" dy="-0.5em">' +
                (min !== max ? '≈' : '=') +
                (min + average) +
                '</tspan>';
            this._html += '<tspan x="' + (width + averageCenter) + '" dy="1em">±' + average + '</tspan>';
            this._html += '</text>';

            this._html += minCircle + maxCircle + (mouseCircle ?? '');
            if (mouseCircle) {
                this._html += mouseCircle;
            }
            this._html += '</svg>';
        }
        requestAnimationFrame(() => {
            if (this._html != null) {
                this._ui.innerHTML = this._html;
                this._html = undefined;
            }
        });
    }

    private _drawCircle(x: number, y: number, value: number, color = 'green', fontStyle = 'italic') {
        let circle = '<circle cx="' + x + '" cy="' + y + '" r="2" fill="' + color + '" />';
        const legendFontHeight = 0.7 * this._legendFontSize;
        const graphMiddle = Math.round(this._lineHeight / 2);
        if (y < graphMiddle) {
            // legend below
            y += this.textMargin + legendFontHeight;
        } else {
            // legend above
            y -= this.textMargin;
        }
        circle +=
            '<text font-style="' +
            fontStyle +
            '" font-size="' +
            this._legendFontSize +
            '" x="' +
            (x - this._legendFontSize) +
            '" y="' +
            y +
            '">' +
            value +
            '</text>';
        return circle;
    }
}

/**
 * `<cb-metrics>` — a Web Component wrapping {@link UIMetrics} in its own shadow root, so a page can
 * embed it with a single tag and no build step. Register it with {@link defineMetrics} (or import the
 * `@ceeblue/web-utils/ui/metrics` entry, which registers it for you). The widget self-hosts its
 * stylesheet into the shadow root and themes from the `--cb-*` tokens on `:root`.
 */
export class CbMetricsElement extends HTMLElement {
    private _metrics?: UIMetrics;

    connectedCallback() {
        if (this._metrics) {
            return;
        }
        const shadow = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = ':host{display:block;width:100%}';
        const list = document.createElement('div');
        shadow.append(style, list);
        // UIMetrics tags `list` and injects its own stylesheet into this shadow root.
        this._metrics = new UIMetrics(list);
    }

    disconnectedCallback() {
        this._metrics?.destroy();
        this._metrics = undefined;
    }

    /** Render a metrics snapshot: one history array per metric name. */
    display(stats: Map<string, Array<string | number>>) {
        this._metrics?.display(stats);
    }

    /** The underlying widget for advanced use. */
    get metrics(): UIMetrics | undefined {
        return this._metrics;
    }
}

/** Register the `<cb-metrics>` custom element (idempotent). */
export function defineMetrics() {
    if (!customElements.get('cb-metrics')) {
        customElements.define('cb-metrics', CbMetricsElement);
    }
}
