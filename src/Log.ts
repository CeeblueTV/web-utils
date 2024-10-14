/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import * as Util from './Util';

/**
 * Log interface to deal with log everywhere:
 * - subscribe logs: listen logs to effectuate some specific job related logs
 * - intercept logs: intercept logs to change the default behavior
 * - redirect logs: redirect logs to one other logger engine
 * - redefine logs: change log text like adding a prefix
 *
 * You have 4 {@link LogType} 'error', 'warn', 'info', and 'debug', as commonly managed by browsers.
 *
 * @example
 * // Intercept and redirect all the logs to the console (default behavior)
 * import { log } from '@ceeblue/web-utils';
 * log.on(type:LogType, args:uknown[]) => {
 *    console[type](...args.splice(0)); // args is empty after this call = final interception
 * }
 *
 * // Intercept and redirect the logs from Player compoment to the console
 * player.log.on(type:LogType, args:uknown[]) => {
 *    console[type](...args.splice(0)); // args is empty after this call = final interception
 * }
 *
 * // Subscribe and redirect all the logs to a file logger
 * log.on(type:LogType, args:uknown[]) => {
 *    fileLogger[type](...args); // args stays unchanged to let's continue the default behavior
 * }
 *
 * // Redefine the log to add some prefix indication
 * class Player {
 *    connector = new Connector();
 *    constructor() {
 *       connector.log = this.log.bind(this, "Connector log:");
 *    }
 * }
 *
 */
export interface ILog {
    /**
     * Build a log
     */
    (...args: unknown[]): Log;
    /**
     * Intercept, redefine or redirect any log
     * If you clear args you intercept the log and nothing happen more after this call.
     * @param type log level
     * @param args args
     * @returns
     */
    on: (type: LogType, args: unknown[]) => void;
}

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
