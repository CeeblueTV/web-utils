/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import * as Util from './Util';

/**
 * Log levels
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

/**
 * Log interface to deal with log everywhere:
 * - filter log level: filter log level independantly of the browser
 * - subscribe logs: listen logs to effectuate some specific job related logs
 * - intercept logs: intercept logs to change the default behavior
 * - redirect logs: redirect logs to one other logger engine
 * - redefine logs: change log text like adding a prefix
 *
 * You have 4 {@link LogLevel} 'error','warn','info',and 'debug', as commonly managed by browsers.
 * You can use {@link ILog.level} or {@link ILog.on} to customer log level and behavior.
 *
 * @example
 * // filter log level globally, independantly of the browser
 * import { log } from '@ceeblue/web-utils';
 * log.level = LogLevel.WARN; // displays errors and warns
 *
 * // filter log level only for Player compoment
 * player.log.level = false; // no logs at all for player compoment
 *
 * // Intercept and redirect all the logs to the console (default behavior)
 * import { log } from '@ceeblue/web-utils';
 * log.on = (level:LogLevel,args:unknown[]) => {
 *    console[level](...args.splice(0)); // args is empty after this call = final interception
 * }
 *
 * // Intercept the logs from Player compoment and displays only WARN logs
 * player.log.on = (level:LogLevel,args:unknown[]) => {
 *    if (level !== LogLevel.WARN) {
 *       args.length = 0; // args is empty after this call = final interception
 *    }
 * }
 *
 * // Subscribe and redirect all the logs to a file logger
 * import { log } from '@ceeblue/web-utils';
 * log.on = (level:LogLevel,args:unknown[]) => {
 *    fileLogger[level](...args); // args stays unchanged to let's continue the default behavior
 * }
 *
 * // Observe every log of the Player component, whatever the log levels, without changing them
 * player.log.observe = (level:LogLevel,args:readonly unknown[]) => {
 *    // read-only: the console and the log.on handlers are unaffected
 *    // format the args rather than keep them, noBin to not encode the binary data (media samples)
 *    telemetry.push(level, Util.stringify(args, { noBin: true }));
 * }
 *
 * // Redefine the log to add some prefix indication
 * class Player {
 *    connector = new Connector();
 *    constructor() {
 *       connector.log = this.log.bind(this,"Connector log:");
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
     * Intercept,redefine or redirect any log
     * If you clear args you intercept the log and nothing happen more after this call.
     * @param level log level
     * @param args args
     * @returns
     */
    on: (level: LogLevel, args: unknown[]) => void;
    /**
     * Observe every log before any level filter, without changing it: the console and {@link ILog.on}
     * behave as without observer, even if it throws (only its first failure is reported). On the
     * global {@link log} it observes the logs of every component. The logs emitted while an observer
     * runs are not observed, to prevent recursion.
     * @param level log level
     * @param args frozen shallow copy of the args: the objects inside are the caller's live objects,
     * format them rather than keep them if they may hold large data (buffers, samples)
     */
    observe?: (level: LogLevel, args: readonly unknown[]) => void;
    /**
     * Change log level, default log level is {@link LogLevel.INFO},
     * Boolean can be user to lets pass all the logs with `true` or disables all the logs with `false`.
     * @remarks To debug production code without modifying it you can use a special query parameter
     * called !cb-override-log-level to override this configuration.
     */
    level?: LogLevel | boolean;
}

// check coder issuer: everytime we don't forget to use the built Log
let _logging = 0;
setInterval(() => {
    console.assert(_logging === 0, _logging.toFixed(), 'calls to log was useless');
}, 10000);

// !cb-override-log-level
const _overrideLogLevel = Util.options()['!cb-override-log-level'];

const _charLevels = new Array(128);
_charLevels[101] = _charLevels[69] = 1; // error
_charLevels[119] = _charLevels[87] = 2; // warn
_charLevels[105] = _charLevels[73] = 3; // info
_charLevels[100] = _charLevels[68] = 4; // debug

// true while an observer runs: the logs it emits are not observed, otherwise it would recurse
let _observing = false;
// observers already reported as failing, to not flood the console with one error per log
const _failedObservers = new WeakSet<NonNullable<ILog['observe']>>();

// a failing observer must break neither the log nor its caller
function observe(localLog: ILog, level: LogLevel, args: readonly unknown[]) {
    const observer = localLog.observe;
    if (!observer) {
        return;
    }
    try {
        observer(level, args);
    } catch (e) {
        if (!_failedObservers.has(observer)) {
            _failedObservers.add(observer);
            console.error('Log observer failed, next failures will be silent:', e);
        }
    }
}

/**
 * Log instance
 */
export class Log {
    get error() {
        return this._bind(LogLevel.ERROR);
    }
    get warn() {
        return this._bind(LogLevel.WARN);
    }
    get info() {
        return this._bind(LogLevel.INFO);
    }
    get debug() {
        return this._bind(LogLevel.DEBUG);
    }

    private _args: unknown[];
    private _done?: boolean;
    private _log: ILog;

    constructor(log: ILog, ...args: unknown[]) {
        if (!args.length) {
            // cannot have 0 args to be called correctly!
            args.push(undefined);
        }
        this._args = args;
        this._log = log;
        ++_logging;
    }

    private _onLog(localLog: ILog, level: LogLevel): boolean {
        // we take like log-level by priority order:
        // 1- the overrideLogLevel
        // 2- the localLog.level
        // 3- the global log.level
        // 4- LogLevel.INFO
        const logLevel = _overrideLogLevel ?? localLog.level ?? log.level ?? LogLevel.INFO;
        if (logLevel === false) {
            // explicit null, no log at all!
            return false;
        }
        if (logLevel !== true && _charLevels[level.charCodeAt(0)] > _charLevels[logLevel.charCodeAt(0)]) {
            return false;
        }
        if (localLog.on) {
            localLog.on(level, this._args);
        }
        return this._args.length ? true : false;
    }

    private _bind(level: LogLevel) {
        if (!this._done) {
            this._done = true;
            --_logging;
        }
        // observers see every log, before any filter or interception
        if (!_observing && (log.observe || this._log.observe)) {
            // frozen copy: an observer can neither change the log nor see its args emptied by an interception
            const args = Object.freeze(this._args.slice());
            _observing = true;
            try {
                observe(log, level, args);
                if (this._log !== log) {
                    observe(this._log, level, args);
                }
            } finally {
                _observing = false;
            }
        }
        // call the global onLog in first (global filter)
        if (!this._onLog(log, level)) {
            return Util.EMPTY_FUNCTION;
        }
        // call the local onLog (local filter)
        if (this._log !== log && !this._onLog(this._log, level)) {
            return Util.EMPTY_FUNCTION;
        }
        // if not intercepted display the log
        return console[level].bind(console, ...this._args);
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
        return new Log(this.log, ...args);
    }) as ILog;
}

/**
 * Global log
 */
export const log = ((...args: unknown[]) => {
    return new Log(log, ...args);
}) as ILog;
