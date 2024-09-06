/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { ILogger } from './ILogger';

/**
 * A logger that adds a prefix to each log message before delegating it to parent logger.
 *
 * @implements {ILogger}
 */
export class PrefixLogger implements ILogger {
    private readonly _prefix: string;
    private _logger: ILogger;

    /**
     * Creates an instance of PrefixLogger.
     *
     * @param {string} prefix - The prefix to add to each message.
     * @param {ILogger} logger - The underlying logger to delegate messages to.
     */
    constructor(prefix: string, logger: ILogger) {
        this._prefix = prefix;
        this._logger = logger;
    }

    log(message?: unknown, ...optionalParams: unknown[]): void {
        this._logger.log(`${this._prefix}${message ? message : ''}`, ...optionalParams);
    }

    warn(message?: unknown, ...optionalParams: unknown[]): void {
        this._logger.warn(`${this._prefix}${message ? message : ''}`, ...optionalParams);
    }

    error(message?: unknown, ...optionalParams: unknown[]): void {
        this._logger.error(`${this._prefix}${message ? message : ''}`, ...optionalParams);
    }
}
