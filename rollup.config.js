/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

// For an extensive guide to getting started with the rollup.js JavaScript bundler, visit:
// https://blog.openreplay.com/the-ultimate-guide-to-getting-started-with-the-rollup-js-javascript-bundler

import replace from '@rollup/plugin-replace';
import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { transform as transformCss } from 'lightningcss';

// Import `.css` files as strings, so a component can self-host a co-located, editable stylesheet:
// edited as real CSS, minified by lightningcss at build time (comments, incl. the license header, are
// dropped) and injected at runtime.
const cssString = () => ({
    name: 'css-string',
    transform(code, id) {
        if (!id.endsWith('.css')) {
            return null;
        }
        const { code: min } = transformCss({ filename: id, code: Buffer.from(code), minify: true });
        return { code: `export default ${JSON.stringify(min.toString())};`, map: null };
    }
});

// Public entry points, each emitted as a self-contained bundle in dist/:
//  - index: pure logic (no DOM, no CSS) → `@ceeblue/web-utils`
//  - ui/index: DOM/canvas components → `@ceeblue/web-utils/ui`
const entries = [
    { input: 'index.ts', out: 'dist/web-utils' },
    { input: 'src/ui/index.ts', out: 'dist/ui/web-utils-ui' }, // distinct basename: safe if files get flattened
    { input: 'src/ui/timeline.ts', out: 'dist/ui/timeline' }, // <cb-timeline> custom element (self-registers on import)
    { input: 'src/ui/metrics.ts', out: 'dist/ui/metrics' } // <cb-metrics> custom element (self-registers on import)
];

export default args => {
    let target;
    let format = args.format;
    // Determine the target and format based on provided arguments
    if (format) {
        if (format.toLowerCase().startsWith('es')) {
            target = format;
            format = 'es';
        } else {
            target = 'es5';
        }
    } else {
        format = 'es';
        target = 'es6';
    }
    const downlevelIteration = !(Number(target.substring(2)) > 5);

    // Determine the package version by using the 'version' environment variable (for CI/CD processes) or fallback to the version specified in the 'package.json' file.
    let version = process.env.version ?? process.env.npm_package_version;
    // Validate the version format
    if (typeof version === 'string') {
        // https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
        const versionRegex =
            /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
        if (!versionRegex.test(version)) {
            throw new Error(
                'The provided version string does not comply with the Semantic Versioning (SemVer) format required. Please refer to https://semver.org/ for more details on the SemVer specification.'
            );
        }
        console.info('Building version: ' + version);
    } else {
        throw new Error('Version is undefined or not a string.');
    }

    // Each entry yields three sequential builds: bundle → minify the bundle → type definitions.
    return entries.flatMap(entry => [
        {
            // Transpile and bundle the code
            input: entry.input,
            output: {
                name: process.env.npm_package_name,
                format, // iife, es, cjs, umd, amd, system
                compact: true,
                sourcemap: true,
                file: entry.out + '.js'
            },
            plugins: [
                cssString(),
                replace({
                    __lib__version__: "'" + version + "'",
                    preventAssignment: true
                }),
                eslint(),
                typescript({ target, downlevelIteration }),
                nodeResolve()
            ]
        },
        {
            // Minify the bundled code
            input: entry.out + '.js',
            output: {
                compact: true,
                sourcemap: true,
                file: entry.out + '.min.js'
            },
            plugins: [terser()],
            context: 'window' // Useful for ES5 builds, ensures 'this' refers to 'window' in a browser context
        },
        {
            // Generate type definitions
            input: entry.input,
            output: {
                compact: true,
                file: entry.out + '.d.ts'
            },
            plugins: [dts()]
        }
    ]);
};
