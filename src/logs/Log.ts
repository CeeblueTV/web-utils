/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { ILog } from './ILog';
import { logs } from './Logs';
import { ILogger } from './ILogger';

let logging = 0;
setInterval(() => {
    console.assert(logging === 0, logging.toFixed(), 'calls to log was useless');
}, 10000);

export class Log implements ILog {
    onError(error: string) {}

    get error() {
        this.onError((logs.lastError = this._args.join(' ')));
        return this._bind('error');
    }
    get warn() {
        return this._bind('warn');
    }
    get info() {
        return this._bind('info');
    }
    get debug() {
        return this._bind('debug');
    }

    private _logger: ILogger;
    private _args: unknown[];
    private _done?: boolean;

    constructor(logger: ILogger, ...args: unknown[]) {
        this._args = args;
        this._logger = logger;
        ++logging;
    }

    private _bind(type: 'error' | 'warn' | 'info' | 'debug') {
        if (!this._done) {
            this._done = true;
            --logging;
        }
        return this._logger[type].bind(this._logger, ...this._args);
    }
}

export function log(...args: unknown[]): ILog {
    return new Log(logs.logger, ...args);
}
