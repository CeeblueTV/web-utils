/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { log, Loggable, LogLevel } from './Log';

class Component extends Loggable {}

describe('Log.observe', () => {
    const globalLevel = log.level;
    let seen: Array<[LogLevel, readonly unknown[]]>;

    beforeEach(() => {
        seen = [];
        log.level = LogLevel.ERROR;
        for (const level of ['error', 'warn', 'info', 'debug'] as const) {
            vi.spyOn(console, level).mockImplementation(() => {});
        }
    });

    afterEach(() => {
        log.level = globalLevel;
        log.observe = undefined;
        vi.restoreAllMocks();
    });

    it('sees every log of its logger before the level filters, without printing them', () => {
        const component = new Component();
        component.log.observe = (level, args) => seen.push([level, args]);
        component.log('frame', 7).debug();
        component.log('failed').error();
        expect(seen).toEqual([
            [LogLevel.DEBUG, ['frame', 7]],
            [LogLevel.ERROR, ['failed']]
        ]);
        expect(console.debug).not.toHaveBeenCalled(); // filtered out as without observer
        expect(console.error).toHaveBeenCalledWith('failed');
    });

    it('sees the lines of the components bound to its logger, prefix included', () => {
        const parent = new Component();
        const child = new Component();
        child.log = parent.log.bind(parent, 'Child:');
        parent.log.observe = (level, args) => seen.push([level, args]);
        child.log('ready').info();
        expect(seen).toEqual([[LogLevel.INFO, ['Child:', 'ready']]]);
    });

    it('on the global log, sees the logs of every component', () => {
        log.observe = (level, args) => seen.push([level, args]);
        new Component().log('a').debug();
        log('b').warn();
        expect(seen.map(([level, args]) => [level, args[0]])).toEqual([
            [LogLevel.DEBUG, 'a'],
            [LogLevel.WARN, 'b']
        ]);
    });

    it('changes neither the on handlers nor what is printed', () => {
        const component = new Component();
        const on = vi.fn();
        component.log.on = on;
        log.level = true; // the component's own level decides
        component.log.level = LogLevel.WARN;
        component.log.observe = () => {};
        component.log('noise').info();
        component.log('careful').warn();
        expect(on).toHaveBeenCalledTimes(1);
        expect(on).toHaveBeenCalledWith(LogLevel.WARN, ['careful']);
        expect(console.info).not.toHaveBeenCalled();
    });

    it('keeps its args intact when an on handler intercepts the log', () => {
        const component = new Component();
        component.log.observe = (level, args) => seen.push([level, args]);
        component.log.on = (level, args) => {
            args.length = 0; // final interception
        };
        component.log('captured').error();
        expect(seen).toEqual([[LogLevel.ERROR, ['captured']]]);
        expect(console.error).not.toHaveBeenCalled();
    });

    it('cannot change the args seen by the on handlers or printed', () => {
        const component = new Component();
        const on = vi.fn();
        component.log.on = on;
        component.log.observe = (level, args) => seen.push([level, args]);
        component.log('original').error();
        expect(Object.isFrozen(seen[0][1])).toBe(true);
        expect(() => (seen[0][1] as unknown[]).push('injected')).toThrow(TypeError);
        expect(on).toHaveBeenCalledWith(LogLevel.ERROR, ['original']);
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith('original');
    });

    it('still prints and reaches the on handlers when an observer throws', () => {
        const component = new Component();
        const on = vi.fn();
        component.log.on = on;
        const failure = new Error('telemetry full');
        log.observe = () => {
            throw failure;
        };
        component.log.observe = (level, args) => seen.push([level, args]);
        expect(() => component.log('failed').error()).not.toThrow();
        expect(seen).toEqual([[LogLevel.ERROR, ['failed']]]); // the component observer still runs
        expect(on).toHaveBeenCalledWith(LogLevel.ERROR, ['failed']);
        expect(console.error).toHaveBeenCalledWith('Log observer failed:', failure);
        expect(console.error).toHaveBeenCalledWith('failed');
    });
});
