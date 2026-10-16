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
 * Logging interface used throughout the library:
 * - filter logs independently of the browser
 * - subscribe to logs to run some job on them
 * - observe every log before level filtering
 * - intercept logs to change the default behavior
 * - redirect logs to another logging engine
 * - redefine log messages, for example by adding a prefix
 *
 * Four {@link LogLevel} values are available: 'error', 'warn', 'info', and 'debug', matching the
 * browser console methods.
 * Use {@link ILog.level}, {@link ILog.on}, and {@link ILog.observe} to customize log handling.
 *
 * @example
 * // filter log level globally, independently of the browser
 * import { log } from '@ceeblue/web-utils';
 * log.level = LogLevel.WARN; // displays errors and warnings
 *
 * // filter log level only for the Player component
 * player.log.level = false; // no logs at all for the Player component
 *
 * // Intercept and redirect all logs to the console, like the default behavior
 * // but without calling the local log.on handlers
 * import { log } from '@ceeblue/web-utils';
 * log.on = (level:LogLevel,args:unknown[]) => {
 *    console[level](...args.splice(0)); // args is empty after this call = final interception
 * }
 *
 * // Intercept logs from the Player component and display only WARN logs
 * player.log.on = (level:LogLevel,args:unknown[]) => {
 *    if (level !== LogLevel.WARN) {
 *       args.length = 0; // args is empty after this call = final interception
 *    }
 * }
 *
 * // Subscribe and redirect all logs to a file logger
 * import { log } from '@ceeblue/web-utils';
 * log.on = (level:LogLevel,args:unknown[]) => {
 *    fileLogger[level](...args); // unchanged args allow the default behavior to continue
 * }
 *
 * // Observe every log of the Player component, regardless of the configured log levels
 * player.log.observe = (level:LogLevel,args:readonly unknown[]) => {
 *    // read-only: the console and the log.on handlers are unaffected
 *    // format the args rather than retain the live objects they hold,
 *    // noBin skips the binary data (media samples)
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
     * Intercept, redefine, or redirect any log.
     * Clearing `args` intercepts the log, preventing subsequent handlers and console output.
     * An exception thrown by the handler does not reach the caller: it is rethrown in a microtask,
     * where it is reported as an uncaught error. Only the first failure of a handler is reported.
     * @param level log level
     * @param args mutable args of the log: clear them to intercept the log
     */
    on: (level: LogLevel, args: unknown[]) => void;
    /**
     * Observe every log before any level filter or {@link ILog.on} handler, without being able to
     * change it: the console and the {@link ILog.on} handlers behave as without observer.
     * On the global {@link log}, the observer receives logs from every component; otherwise it
     * receives the logs emitted through this logger, including those of the components bound to it.
     *
     * Logs emitted synchronously while an observer runs are not observed, to prevent recursion.
     * @param level log level
     * @param args frozen shallow copy of the arguments. Referenced objects are not cloned or frozen;
     * avoid retaining them when they may contain large or mutable values such as media samples.
     */
    observe?: (level: LogLevel, args: readonly unknown[]) => void;
    /**
     * Change log level, default log level is {@link LogLevel.INFO}.
     * A boolean can be used to let every log pass with `true` or disable every log with `false`.
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
// methods already reported as failing: reporting every failure would flood the uncaught error handlers,
// and loop forever if one of them logs the error through a failing method
const _failedMethods = new WeakSet<Function>();

/**
 * Call an optional log handler.
 * Prevent the caller from catching and misattributing logging errors.
 * Report them asynchronously as uncaught errors instead.
 */
function safeCall<This, Args extends unknown[]>(
    receiver: This,
    method: ((this: This, ...args: Args) => void) | undefined,
    ...args: Args
) {
    if (!method) {
        return;
    }
    try {
        method.apply(receiver, args);
    } catch (e) {
        if (!_failedMethods.has(method)) {
            _failedMethods.add(method);
            queueMicrotask(() => {
                throw e;
            });
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
        safeCall(localLog, localLog.on, level, this._args);
        return this._args.length ? true : false;
    }

    private _bind(level: LogLevel) {
        if (!this._done) {
            this._done = true;
            --_logging;
        }
        // observers see every log, before any filter or interception
        if (!_observing && (log.observe || this._log.observe)) {
            try {
                _observing = true;
                // frozen copy: an observer cannot change the argument list or see it emptied by an interception
                const args = Object.freeze(this._args.slice());
                safeCall(log, log.observe, level, args);
                if (this._log !== log) {
                    safeCall(this._log, this._log.observe, level, args);
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
