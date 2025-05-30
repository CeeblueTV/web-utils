/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
export default {
    extends: ['@commitlint/config-conventional'],
    ignores: [commit => /^[^\r\n]*\[skip ci\]/.test(commit)]
};
