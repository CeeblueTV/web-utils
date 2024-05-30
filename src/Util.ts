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
    return Math.floor(_perf.now() + _perf.timeOrigin);
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
): object {
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
export function objectFrom(value: any, params: { withType: boolean; noEmptyString: boolean }): object {
    params = Object.assign({ withType: false, noEmptyString: false }, params);
    const obj: any = {};
    if (!value) {
        return obj;
    }
    for (const [key, val] of objectEntries(value)) {
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
 * Returns entries from something iterable, such as a Map, Set, or Array
 * @param value iterable input
 * @returns An javascript object
 */
export function objectEntries(value: any): [string, any][] {
    if (value.entries) {
        return value.entries();
    }
    return Array.from({
        [Symbol.iterator]: function* () {
            for (const key in value) {
                yield [key, value[key]];
            }
        }
    });
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
    let res = '';
    for (const name in obj) {
        res += (res ? ',' : '{') + space + name + ':';
        res += stringify(obj[name], Object.assign({ ...params }, { recursion: params.recursion - 1 }));
    }
    return (res += space + '}');
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
export function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

/**
 * Test equality between two value whatever their type, array included
 */
export function equal(a: any, b: any) {
    if (Object(a) !== a) {
        if (Object(b) === b) {
            return false;
        }
        // both primitive (null and undefined included)
        return a === b;
    }
    // complexe object
    if (a[Symbol.iterator]) {
        if (!b[Symbol.iterator]) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i !== a.length; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    return a === b;
}

/**
 * fetch help method with few usefull fix:
 * - throw an string exception if response code is not 200 with the text of the response or uses statusText
 */
export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await self.fetch(input, init);
    if (response.status >= 300) {
        if (response.body) {
            throw (await response.text()) || response.statusText;
        }
        throw response.statusText;
    }
    return response;
}

/**
 * Extension parser
 * @param path path to parse
 * @returns the extension
 */
export function parseExtension(path: string): string {
    const dot = path.lastIndexOf('.');
    const ext = dot >= 0 && dot > path.lastIndexOf('/') ? path.substring(dot) : '';
    return ext;
}
