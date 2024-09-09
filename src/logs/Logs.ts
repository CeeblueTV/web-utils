/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { EventEmitter } from '../EventEmitter';
import { ILogger } from './ILogger';

export class Logs extends EventEmitter {
    /**
     * Raises on any log error
     * @param error
     * @event
     */
    onError(error: string) {}

    get lastError(): string {
        return this._lastError;
    }
    set lastError(error: string) {
        this._lastError = error;
        if (error) {
            this.onError(error);
        }
    }

    get logger(): ILogger {
        return this._logger;
    }
    set logger(logger: ILogger) {
        this._logger = logger;
    }

    private _lastError: string;
    private _logger: ILogger;

    constructor() {
        super();
        this._lastError = '';
        this._logger = console;
    }
}

export const logs = new Logs();
