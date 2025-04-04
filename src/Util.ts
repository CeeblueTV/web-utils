/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

const _decoder = new TextDecoder();
const _encoder = new TextEncoder();

/* eslint-disable @typescript-eslint/no-explicit-any */

const _perf = performance; // to increase x10 now performance!

/**
 * Some basic utility functions
 */

/**
 * An empty lambda function, pratical to disable default behavior of function or events which are not expected to be null
 * @example
 * console.log = Util.EMPTY_FUNCTION; // disable logs without breaking calls
 */
export const EMPTY_FUNCTION = () => {};

/**
 * Efficient and high resolution timestamp in milliseconds elapsed since {@link Util.timeOrigin}
 */
export function time(): number {
    return Math.floor(_perf.now());
}

/**
 * Time origin represents the time when the application has started
 */
export function timeOrigin(): number {
    return Math.floor(_perf.timeOrigin);
}

/**
 * Parse query and returns it in an easy-to-use Javascript object form
 * @param urlOrQueryOrSearch string, url, or searchParams containing query. If not set it uses `location.search` to determinate query.
 * @returns An javascript object containing each option
 */
export function options(
    urlOrQueryOrSearch: URL | URLSearchParams | string | object | undefined = typeof location === 'undefined'
        ? undefined
        : location
): Record<string, unknown> {
    if (!urlOrQueryOrSearch) {
        return {};
    }
    try {
        const url = String(urlOrQueryOrSearch);
        urlOrQueryOrSearch = new URL(url).searchParams;
    } catch (e) {
        if (typeof urlOrQueryOrSearch == 'string') {
            if (urlOrQueryOrSearch.startsWith('?')) {
                urlOrQueryOrSearch = urlOrQueryOrSearch.substring(1);
            }
            urlOrQueryOrSearch = new URLSearchParams(urlOrQueryOrSearch);
        }
    }
    // works same if urlOrQueryOrSearch is null, integer, or a already object etc...
    return objectFrom(urlOrQueryOrSearch, { withType: true, noEmptyString: true });
}

/**
 * Returns an easy-to-use Javascript object something iterable, such as a Map, Set, or Array
 * @param value iterable input
 * @param params.withType `false`, if set it tries to cast string value to a JS number/boolean/undefined/null type.
 * @param params.noEmptyString `false`, if set it converts empty string value to a true boolean, usefull to allow a `if(result.key)` check for example
 * @returns An javascript object
 */
export function objectFrom(value: any, params: { withType: boolean; noEmptyString: boolean }): any {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    params = Object.assign({ withType: false, noEmptyString: false }, params);
    const obj: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!value) {
        return obj;
    }
    for (const [key, val] of iterableEntries(value)) {
        value = val;
        if (params.withType && value != null && value.substring) {
            if (value) {
                const number = Number(value);
                if (isNaN(number)) {
                    switch (value.toLowerCase()) {
                        case 'true':
                            value = true;
                            break;
                        case 'false':
                            value = false;
                            break;
                        case 'null':
                            value = null;
                            break;
                        case 'undefined':
                            value = undefined;
                            break;
                    }
                } else {
                    value = number;
                }
            } else if (params.noEmptyString) {
                // if empty string => TRUE to allow a if(options.key) check for example
                value = true;
            }
        }
        if (obj[key]) {
            if (!Array.isArray(obj[key])) {
                obj[key] = new Array(obj[key]);
            }
            obj[key].push(value);
        } else {
            obj[key] = value;
        }
    }
    return obj;
}

/**
 * Returns a IterableIterator<[string, any]> from any iterable input like Map, Set, Array, or Object.
 *
 * For all other types of values (including `null` or `undefined`) it returns an empty iterator.
 *
 * @param value An iterable input
 * @returns a IterableIterator<[string, any]>
 */
export function iterableEntries(value: any): IterableIterator<[string, any]> {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!value) {
        return (function* () {})();
    }
    if (typeof value.entries === 'function') {
        value = value.entries();
    }
    if (typeof value[Symbol.iterator] === 'function') {
        return value;
    }
    return (function* () {
        for (const key in value) {
            yield [key.toString(), value[key]];
        }
    })();
}

/**
 * Converts various data types, such as objects, strings, exceptions, errors,
 * or numbers, into a string representation. Since it offers a more comprehensive format,
 * this function is preferred to `JSON.stringify()`.
 * @param obj Any objects, strings, exceptions, errors, or number
 * @param params.space `''`, allows to configure space in the string representation
 * @param params.decimal `2`, allows to choose the number of decimal to display in the string representation
 * @param params.recursion `1`, recursion depth to stringify recursively every object value until this depth, beware if a value refers to a already parsed value an infinite loop will occur
 * @param params.noBin `false`, when set skip binary encoding and write inplace a bin-length information
 * @returns the final string representation
 */
// Online Javascript Editor for free
// Write, Edit and Run your Javascript code using JS Online Compiler
export function stringify(
    obj: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    params: { space?: string; decimal?: number; recursion?: number; noBin?: boolean } = {}
): string {
    params = Object.assign({ space: ' ', decimal: 2, recursion: 1, noBin: false }, params);
    if (obj == null) {
        return String(obj);
    }
    const error = obj.error || obj.message;
    if (error) {
        // is a error!
        obj = error;
    }
    // number
    if (obj.toFixed) {
        return obj.toFixed(Number(params.decimal) || 0);
    }
    if (obj.byteLength != null && obj?.[Symbol.iterator]) {
        // Binary!
        if (!params.noBin) {
            return _decoder.decode(obj);
        }
        return '[' + obj.byteLength + '#bytes]';
    }
    // boolean or string type or stop recursivity
    if (typeof obj === 'boolean' || obj.substring || !params.recursion) {
        // is already a string OR has to be stringified
        return String(obj);
    }

    const space = params.space || '';

    if (Array.isArray(obj)) {
        // Array!
        let res = '';
        for (const value of obj) {
            res += (res ? ',' : '[') + space;
            res += stringify(value, Object.assign({ ...params }, { recursion: params.recursion - 1 }));
        }
        return (res += space + ']');
    }
    let res = '{';
    for (const name in obj) {
        if (res.length > 1) {
            res += ',';
        }
        res += space + name + ':';
        res += stringify(obj[name], Object.assign({ ...params }, { recursion: params.recursion - 1 })) + space;
    }
    return (res += '}');
}

/**
 * Encode a string to a binary representation using UTF-8.
 *
 * @param value string value to convert
 * @returns binary conversion
 */
export function toBin(value: string): Uint8Array {
    return _encoder.encode(value);
}

/**
 * Execute a promise in a safe way with a timeout if caller doesn't resolve it in the accurate time
 */
export async function safePromise<T>(timeout: number, promise: Promise<T>): Promise<T> {
    // Returns a race between our timeout and the passed in promise
    let timer: ReturnType<typeof setTimeout> | undefined = void 0;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`Promise timedout after ${timeout}ms`));
        }, timeout);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

/**
 * Wait in milliseconds, requires a call with await keyword!
 */
export async function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

/**
 * Compares two values for equality, including simple arrays and iterators,
 * Nested iterators and objects are not supported.
 */
export function equal(a: unknown, b: unknown) {
    if (isIterator(a) && isIterator(b)) {
        return iteratorsEqual(a, b);
    }

    if (typeof a === 'object' && typeof b === 'object') {
        if (a === null || b === null) {
            return a === b;
        }

        return compareObjects(a as Record<string, unknown>, b as Record<string, unknown>);
    }

    return sameValue(a, b);
}

/**
 * Compares two objects with primitive values, doesn't compare nested objects or iterators.
 */
function compareObjects(a: Record<string, unknown>, b: Record<string, unknown>) {
    for (const key in a) {
        if (!(key in b) || !sameValue(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

/**
 * Implements https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevalue
 */
function sameValue(a: unknown, b: unknown) {
    // If SameType(x, y) is false, return false.
    if (typeof a !== typeof b) {
        return false;
    }

    // 2. If x is a Number, then
    // a. Return Number::sameValue(x, y).
    if (typeof a === 'number' && typeof b === 'number') {
        // we compare b to narrow down the type.
        if (isNaN(a)) {
            // If x is NaN and y is NaN, return true.
            return isNaN(b);
        }

        // 2. If x is +0𝔽 and y is -0𝔽, return false.
        // 3. If x is -0𝔽 and y is +0𝔽, return false.
        // 4. If x is y, return true.
        // 5. Return false.
        return a === b;
    }

    return a === b;
}

// Compares two iterables by their iterator values.
function iteratorsEqual(a: Iterable<unknown>, b: Iterable<unknown>): boolean {
    const aIter = a[Symbol.iterator]();
    const bIter = b[Symbol.iterator]();

    for (;;) {
        const aNext = aIter.next();
        const bNext = bIter.next();

        if (aNext.done && bNext.done) {
            return true;
        }

        if (aNext.done !== bNext.done) {
            return false;
        }

        if (!sameValue(aNext.value, bNext.value)) {
            return false;
        }
    }
}

function isIterator(value: unknown): value is Iterable<unknown> {
    return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

/**
 * fetch help method with few usefull fix:
 * - throw an string exception if response code is not 200 with the text of the response or uses statusText
 */
export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await globalThis.fetch(input, init);

    // This is a simple helper to expect a final response (200-299).
    // Not a redirect, not a client error, not a server error.
    if (!response.ok) {
        const errorMessage = (await response.text()) || response.statusText;

        throw new Error(`Fetching a response failed with status ${response.status} - ${errorMessage}`);
    }

    return response;
}

/**
 * Get Extension part from path
 * @param path path to parse
 * @returns the extension
 */
export function getExtension(path: string): string {
    const dot = path.lastIndexOf('.');
    const ext = dot >= 0 && dot > path.lastIndexOf('/') ? path.substring(dot) : '';
    return ext;
}

/**
 * Get File part from path
 * @param path path to parse
 * @returns the file name
 */
export function getFile(path: string): string {
    return path.substring(path.lastIndexOf('/') + 1);
}

/**
 * Get Base File part from path, without extension
 * @param path path to parse
 * @returns the base file name
 */
export function getBaseFile(path: string): string {
    const dot = path.lastIndexOf('.');
    const file = path.lastIndexOf('/') + 1;
    return dot >= 0 && dot >= file ? path.substring(file, dot) : path.substring(file);
}

/**
 * String Trim function with customizable unicode characters to trim.
 *
 * @param value string to trim
 * @param chars chars to use to trim
 * @returns string trimmed
 */
export function trim(value: string, chars?: string): string {
    if (typeof chars !== 'string') {
        return value.trim();
    }

    return trimStart(trimEnd(value, chars), chars);
}

/**
 * String Trim Start function with customizable chars
 * @param value string to trim start
 * @param chars chars to use to trim start
 * @returns string trimmed
 */
export function trimStart(value: string, chars?: string): string {
    if (typeof chars !== 'string') {
        if (typeof value.trimStart === 'function') {
            return value.trimStart();
        }

        // add polyfill during build instead?
        return value.replace(/^[\s\uFEFF\xA0]+/, '');
    }

    const unicodeChars = [...chars];

    let trimLength = 0;
    for (const char of value) {
        if (!unicodeChars.includes(char)) {
            break;
        }

        trimLength += char.length;
    }

    return value.slice(trimLength);
}

/**
 * String Trim End function with customizable chars
 * @param value string to trim end
 * @param chars chars to use to trim end
 * @returns string trimmed
 */
export function trimEnd(value: string, chars?: string): string {
    if (typeof chars !== 'string') {
        if (typeof value.trimEnd === 'function') {
            return value.trimEnd();
        }

        // add polyfill during build instead?
        return value.replace(/[\s\uFEFF\xA0]+$/, '');
    }

    const unicodeChars = [...chars];
    let trimLength = value.length;
    while (trimLength > 0) {
        let length = 1;

        // Check if the current position is the low surrogate of a surrogate pair.
        if (value.charCodeAt(trimLength - 1) >= 0xdc00 && value.charCodeAt(trimLength - 1) <= 0xdfff) {
            // If yes, adjust the index to include the high surrogate.
            length = 2;
        }

        const char = value.slice(trimLength - length, trimLength);

        if (!unicodeChars.includes(char)) {
            break;
        }

        trimLength -= length;
    }

    return value.slice(0, trimLength);
}
