/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { EventEmitter } from '../EventEmitter';
import { ILog } from './ILog';
import { Log } from './Log';
import { logs } from './Logs';

export class Loggable extends EventEmitter {
    /**
     * Raises on log error
     * @param error
     * @event
     */
    onError(error: string) {}
    /**
     * Start a log
     * @param args
     * @returns a ILog object with the levels of log to call
     */
    log(...args: unknown[]): ILog {
        const log = new Log(logs.logger, ...args);
        log.onError = (error: string) => this.onError(error);
        return log;
    }
}
