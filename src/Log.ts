/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import * as Util from './Util';

let _logging = 0;
setInterval(() => {
    console.assert(_logging === 0, _logging.toFixed(), 'calls to log was useless');
}, 10000);

/**
 * Log types
 */
export enum LogType {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

/**
 * Log instance
 */
export class Log {
    get error() {
        return this._bind(LogType.ERROR);
    }
    get warn() {
        return this._bind(LogType.WARN);
    }
    get info() {
        return this._bind(LogType.INFO);
    }
    get debug() {
        return this._bind(LogType.DEBUG);
    }

    private _args: unknown[];
    private _done?: boolean;
    private _onLog: Function;

    constructor(onLog: Function, ...args: unknown[]) {
        if (!args.length) {
            // cannot have 0 args to be called correctly!
            args.push(undefined);
        }
        this._args = args;
        this._onLog = onLog;
        ++_logging;
    }

    private _bind(type: LogType) {
        if (!this._done) {
            this._done = true;
            --_logging;
        }
        // call the local onLog
        if (this._onLog) {
            this._onLog(type, this._args);
        }
        // call the global onLog
        if (this._args.length && log.on) {
            log.on(type, this._args);
        }
        // if not intercepted display the log
        return this._args.length ? console[type].bind(console, ...this._args) : Util.EMPTY_FUNCTION;
    }
}

/**
 * ILog interface used by log methods
 */
export interface ILog {
    /**
     * Build a log
     */
    (...args: unknown[]): Log;
    /**
     * Intercept or redefine any log
     * @param type log level
     * @param args args
     * @returns
     */
    on: (type: LogType, args: unknown[]) => void;
}

/**
 * Inherits from this class to use logs
 */
export class Loggable {
    /**
     * Start a log
     * @param args
     * @returns a Log object with the levels of log to call
     */
    log = ((...args: unknown[]): Log => {
        return new Log(this.log.on, ...args);
    }) as ILog;
}

/**
 * Global log
 */
export const log = ((...args: unknown[]) => {
    return new Log(() => {}, ...args);
}) as ILog;
