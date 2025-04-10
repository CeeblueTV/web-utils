/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { Loggable } from './Log';

type FilterOnKey<T> = T extends 'once' | 'on' ? never : T extends `on${infer R}` ? R : never;
type CaseVariations<T extends string> = string extends T ? string : Lowercase<T> | Capitalize<T>;
/**
 * Extract all event keys from a class.
 * @example
 * class Logger extends EventEmitter {
 *   onLog(log:string) { console.log(log); }
 *   onClick(log:string) { console.log(log); }
 * }
 * type LoggerEvents = EventKeys<Logger>; // "log" | "click"
 */
type EventKeys<Keys> = keyof {
    [K in keyof Keys as CaseVariations<FilterOnKey<K>>]: never;
};

/**
 * A advanced EventEmitter which allows to declare event as natural function in the inheriting children class,
 * function must start by `on` prefix to be recognized as an event.
 * The function can define a behavior by default, and user can choose to redefine this behavior,
 * or add an additionnal subscription for this event.
 * In addition you can unsubscribe to multiple events with an `AbortController`
 * @example
 * class Logger extends EventEmitter {
 *    onLog(log:string) { console.log(log); } // behavior by default
 *
 *    test() {
 *       // raise event onLog
 *       this.onLog('test');
 *    }
 * }
 *
 * const logger = new Logger();
 * logger.test(); // displays a log 'test'
 *
 * // redefine default behavior to display nothing
 * logger.onLog = () => {}
 * logger.test(); // displays nothing
 *
 * // add an additionnal subscription
 * logger.on('log', console.log);
 * logger.test(); // displays a log 'test'
 *
 * // remove the additionnal subscription
 * logger.off('log', console.log);
 * logger.test(); // displays nothing
 *
 * // add two additionnal subscriptions with a AbortController
 * const controller = new AbortController();
 * logger.on('log', log => console.log(log), controller);
 * logger.on('log', log => console.error(log), controller);
 * logger.test(); // displays a log 'test' + an error 'test'
 *
 * // Unsubscribe all the subscription with the AbortController
 * controller.abort();
 * logger.test(); // displays nothing
 */
export class EventEmitter extends Loggable {
    private _events: Map<string, Set<Function>>;

    /**
     * Build our EventEmitter, usually call from children class
     */
    constructor() {
        super();
        this._events = new Map();
        // Fill events with events as defined!
        let proto = Object.getPrototypeOf(this);
        while (proto && proto !== Object.prototype) {
            for (const name of Object.getOwnPropertyNames(proto)) {
                if (name.length < 3 || !name.startsWith('on')) {
                    continue;
                }
                let defaultEvent = proto[name];
                if (defaultEvent instanceof Function) {
                    const events = new Set<Function>();
                    this._events.set(name.substring(2).toLowerCase(), events);
                    const raise = (...args: unknown[]) => {
                        // Call default event if not undefined, can happen if assigned to null/undefined
                        const result = defaultEvent ? defaultEvent.call(this, ...args) : undefined;
                        // Call subscribers
                        for (const event of events) {
                            event(...args);
                        }
                        return result;
                    };
                    Object.defineProperties(this, {
                        [name]: {
                            get: () => raise,
                            set: (value: Function | undefined) => {
                                // Assign a default behavior!
                                defaultEvent = value;
                            }
                        }
                    });
                }
            }
            proto = Object.getPrototypeOf(proto);
        }
    }

    /**
     * Event subscription
     * @param name Name of event without the `on` prefix (ex: `log` to `onLog` event declared)
     * @param event Subscriber Function
     * @param options.signal Optional `AbortSignal` to stop this or multiple subscriptions in same time
     */
    on(name: EventKeys<this>, event: Function, options?: { signal?: AbortSignal }) {
        if (typeof event !== 'function') {
            throw Error('event callback must be a function');
        }
        const events = this._event(name as string);
        events.add(event);
        options?.signal?.addEventListener('abort', () => events.delete(event), { once: true });
    }

    /**
     * Event subscription only one time, once time fired it's automatically unsubscribe
     * @param name Name of event without the `on` prefix (ex: `log` to `onLog` event declared)
     * @param event Subscriber Function
     * @param options.abortSignal Optional `AbortSignal` to stop this or multiple subscriptions in same time
     */
    once(name: EventKeys<this>, event: Function, options?: { signal?: AbortSignal }) {
        if (typeof event !== 'function') {
            throw Error('event callback must be a function');
        }
        const events = this._event(name as string);
        const wrapper = (...args: unknown[]) => {
            events.delete(wrapper); // delete the wrapper from events
            event(...args); // execute event
        };
        events.add(wrapper);
        options?.signal?.addEventListener('abort', () => events.delete(wrapper), { once: true });
    }

    /**
     * Event unsubscription
     * @param name Name of event without the 'on' prefix (ex: 'log' to 'onLog' event declared)
     * @param event Unsubscriber Function, must be the one passed to {@link on} or {@link once} subscription methods
     */
    off(name: EventKeys<this>, event: Function) {
        if (!event) {
            throw Error('event to unsubscribe cannot be null');
        }

        return this._event(name as string).delete(event);
    }

    private _event(name: string): Set<Function> {
        const events = this._events.get(name.toLowerCase());
        if (!events) {
            throw Error('No event on' + name + ' on class ' + this.constructor.name);
        }
        return events;
    }
}
