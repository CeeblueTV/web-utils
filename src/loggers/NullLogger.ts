/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { ILogger } from './ILogger';

/**
 * An implementation of the {@link ILogger} interface that performs no operations.
 * This logger can be used as a placeholder when logging is not needed
 */
export class NullLogger implements ILogger {
    log(message?: unknown, ...optionalParams: unknown[]): void {}
    warn(message?: unknown, ...optionalParams: unknown[]): void {}
    error(message?: unknown, ...optionalParams: unknown[]): void {}
}
