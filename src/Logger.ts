/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
/**
 * Represents a generic logger interface that provides methods for logging messages
 * with different severity levels: info, warning, and error.
 *
 * @interface
 */
export interface Logger {
    /**
     * Logs a message and optional parameters.
     *
     * @param {unknown} [message] - The primary message to be logged. This can be of any type.
     * @param {...unknown} optionalParams - Additional parameters to be logged. These can be of any type.
     * Each parameter is logged after the main message.
     *
     * @returns {void} This method does not return a value.
     */
    log(message?: unknown, ...optionalParams: unknown[]): void;

    /**
     * Logs a warning message and optional parameters.
     *
     * @param {unknown} [message] - The primary message to be logged. This can be of any type.
     * @param {...unknown} optionalParams - Additional parameters to be logged. These can be of any type.
     * Each parameter is logged after the main message.
     *
     * @returns {void} This method does not return a value.
     */
    warn(message?: unknown, ...optionalParams: unknown[]): void;

    /**
     * Logs an error message and optional parameters.
     *
     * @param {unknown} [message] - The primary message to be logged. This can be of any type.
     * @param {...unknown} optionalParams - Additional parameters to be logged. These can be of any type.
     * Each parameter is logged after the main message.
     *
     * @returns {void} This method does not return a value.
     */
    error(message?: unknown, ...optionalParams: unknown[]): void;
}
