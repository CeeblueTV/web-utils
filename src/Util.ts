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
 * Returns an efficient timestamp in milliseconds elapsed since {@link performance.timeOrigin},
 * representing the start of the current JavaScript execution context.
 *
 * Note: Each Web Worker runs in a separate JS context, so timestamps
 * are not directly comparable between different workers. Use {@link unixTime}
 * for comparable timestamps across different Web Workers.
 */
export function time(): number {
    return Math.floor(_perf.now());
}

/**
 * Returns an efficient Unix timestamp in milliseconds.
 *
 * Unix timestamps are universally comparable across different JavaScript
 * contexts (e.g., Web Workers), as they reference the number of milliseconds
 * elapsed since January 1, 1970 (UNIX epoch).
 */
export function unixTime(): number {
    return Math.floor(_perf.timeOrigin + _perf.now());
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
): any {
    if (!urlOrQueryOrSearch) {
        return {};
    }
    try {
        const url: any = urlOrQueryOrSearch;
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
    params = Object.assign({ withType: false, noEmptyString: false }, params);
    const obj: any = {};
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
    obj: any,
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
 * Encode a string to a binary representation
 * @param value string value to convert
 * @returns binary conversion
 */
export function toBin(value: string): Uint8Array {
    return _encoder.encode(value);
}

/**
 * Execute a promise in a safe way with a timeout if caller doesn't resolve it in the accurate time
 */
export function safePromise<T>(timeout: number, promise: Promise<T>) {
    // Returns a race between our timeout and the passed in promise
    let timer: NodeJS.Timeout;
    return Promise.race([
        promise instanceof Promise ? promise : new Promise(promise),
        new Promise((resolve, reject) => (timer = setTimeout(() => reject('timed out in ' + timeout + 'ms'), timeout)))
    ]).finally(() => clearTimeout(timer));
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
 * Test equality between two value whatever their type, object and array included
 */
export function equal(a: any, b: any, seen = new WeakMap()): boolean {
    // 1. Check primitve identiy or NaN
    if (a === b) {
        return true;
    }
    if (Number.isNaN(a) && Number.isNaN(b)) {
        return true;
    }

    // 2. Check the both are complexe object
    if (Object(a) !== a || Object(b) !== b) {
        return false;
    }

    // 3. Catch circular reference
    if (seen.has(a)) {
        return seen.get(a) === b;
    }
    seen.set(a, b);

    // 4. Check « toStringTag » (Date, RegExp, Map, Set…)
    const tagA = Object.prototype.toString.call(a);
    if (tagA !== Object.prototype.toString.call(b)) {
        return false;
    }

    // 5. Special Case
    switch (tagA) {
        case '[object Date]':
            return a.getTime() === b.getTime();
        case '[object RegExp]':
            return a.source === b.source && a.flags === b.flags;
        case '[object Set]':
        case '[object Map]': {
            if (a.size !== b.size) {
                return false;
            }
            const aKeys = a.keys();
            const bKeys = a.keys();
            const aValues = a.values();
            const bValues = b.values();
            let aKey;
            while (!(aKey = aKeys.next()).done) {
                if (!equal(aKey.value, bKeys.next().value)) {
                    return false;
                }
                const aValue = aValues.next().value;
                const bValue = bValues.next().value;
                if (aValue !== aKey && !equal(aValue, bValue)) {
                    return false;
                }
            }
            return true;
        }
    }

    // 6. Arrays
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!equal(a[i], b[i], seen)) {
                return false;
            }
        }
        return true;
    }

    // 7. Generic object : keys + symbols
    const keysA = [...Object.keys(a), ...(Object.getOwnPropertySymbols(a) as any)];
    if (keysA.length !== Object.keys(b).length + Object.getOwnPropertySymbols(b).length) {
        return false;
    }
    for (const key of keysA) {
        if (!equal(a[key], b[key], seen)) {
            return false;
        }
    }
    return true;
}

/**
 * Fetch help method adding an explicit error property when Response is NOK, with the more accurate textual error inside
 */
export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response & { error?: string }> {
    const response = (await self.fetch(input, init)) as Response & { error?: string };
    if (!response.ok) {
        if (response.body) {
            response.error = await response.text();
        }
        if (!response.error) {
            response.error = response.statusText || response.status.toString() || 'Unknown error';
        }
    }
    return response;
}

/**
 * Fetch help method adding an explicit error property when Response is NOK, with the more accurate textual error inside
 * Also measure the rtt of fetching and returns it in the property Response.rtt (guaranteed to be ≥ 1),
 * supports subtracting server processing time using either the Response-Delay or CMSD-rd header when available
 */
export async function fetchWithRTT(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response & { rtt: number; error?: string }> {
    // a first HEAD request to try to ensure a connection
    await fetch(input, { ...init, method: 'HEAD' });
    // the true request
    const startTime = time();
    const response = (await fetch(input, init)) as Response & { rtt: number; error?: string };
    response.rtt = time() - startTime;
    // remove the ResponseDelay if indicated by the server
    let responseDelay = Number(response.headers.get('Response-Delay')) || 0;
    if (!responseDelay) {
        // search if we have a CMSD info?
        // cmsd-dynamic "fly";rd=1
        const cmsd = response.headers.get('cmsd-dynamic');
        if (cmsd) {
            for (const param of cmsd.split(';')) {
                const [name, value] = param.split('=');
                if (name.trim().toLowerCase() === 'rd') {
                    responseDelay = Number(value) || responseDelay;
                }
            }
        }
    }
    response.rtt = Math.max(1, response.rtt - responseDelay);
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

function codesFromString(value: string): Array<number> {
    const codes = [];
    for (let i = 0; i < value.length; ++i) {
        codes.push(value.charCodeAt(i));
    }
    return codes;
}

/**
 * String Trim function with customizable chars
 * @param value string to trim
 * @param chars chars to use to trim
 * @returns string trimmed
 */
export function trim(value: string, chars: string = ' '): string {
    const codes = codesFromString(chars);
    let start = 0;
    while (start < value.length && codes.includes(value.charCodeAt(start))) {
        ++start;
    }
    let end = value.length;
    while (end > 0 && codes.includes(value.charCodeAt(end - 1))) {
        --end;
    }
    return value.substring(start, end);
}

/**
 * String Trim Start function with customizable chars
 * @param value string to trim start
 * @param chars chars to use to trim start
 * @returns string trimmed
 */
export function trimStart(value: string, chars: string = ' '): string {
    const codes = codesFromString(chars);
    let i = 0;
    while (i < value.length && codes.includes(value.charCodeAt(i))) {
        ++i;
    }
    return value.substring(i);
}

/**
 * String Trim End function with customizable chars
 * @param value string to trim end
 * @param chars chars to use to trim end
 * @returns string trimmed
 */
export function trimEnd(value: string, chars: string = ' '): string {
    const codes = codesFromString(chars);
    let i = value.length;
    while (i > 0 && codes.includes(value.charCodeAt(i - 1))) {
        --i;
    }
    return value.substring(0, i);
}
