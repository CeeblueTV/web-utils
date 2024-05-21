/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { ByteRate } from './ByteRate';
import { EventEmitter } from './EventEmitter';

/**
 * The WebSocketReliable class extends WebSocket to bring up the following improvements:
 * - Fix all possible unintentional closing ways to get always a related error message, {@link onClose | onClose(error?) event}
 * - Make possible message sending while connecting. Indeed no need to wait {@link onOpen} before to send message,
 * you can open the socket and immediately send messages, it will be queue and flushs on connection etablishment
 * - Make possible a delayed connection, or a reconnection. Indeed you can create an unconnected Websocket instance
 * without passing any url argument and starts the conneciton more later with {@link WebSocketReliable.open(url) | open(url)} method
 * - Make possible to control sending/queueing message: send method take an optional queueing=true argument to
 * queue message rather send it, a futur call to flush will send it. Then queueing getter allows to handle the queue
 * if need to purge it or remove some queued message. Use it all together can help to prioritize messages or control overload.
 * @example
 * const ws = new WebSocketReliable(url);
 * ws.onClose = (error?:string) => {
 *    if(error) {
 *       console.error(error);
 *    }
 *    // reconnection attempt every seconds
 *    setTimeout(() => ws.open(url), 1000);
 * }
 * ws.onMessage = (message:string) => {
 *    console.log(message);
 * }
 * ws.send('hello'); // send immediatly a hello message is possible (no need to wait onOpen)
 */
export class WebSocketReliable extends EventEmitter {
    /**
     * @event `open` fired when socket is connected
     */
    onOpen() {}

    /**
     * @event `message` fired on message reception
     * @param message can be binary or string.
     * If you subscribe to the event with message as string type (and not union),
     * it means that you know that all your messages are distributed in a string format
     */
    onMessage(message: ArrayBuffer | string) {}

    /**
     * @event `close` fired on websocket close
     * @param error error description on an improper closure
     */
    onClose(error?: string) {
        if (error) {
            console.error(error);
        }
    }

    /**
     * binaryType, fix binary type to arrayBuffer
     */
    get binaryType(): BinaryType {
        return 'arraybuffer';
    }

    get recvByteRate(): number {
        return this._recvByteRate.value();
    }

    get sendByteRate(): number {
        return this._sendByteRate.value();
    }

    /**
     * url of connection
     */
    get url(): string {
        return this._ws?.url ?? '';
    }

    /**
     * extensions negociated by the server
     */
    get extensions(): string {
        return this._ws?.extensions ?? '';
    }

    /**
     * protocol negociated by the server
     */
    get protocol(): string {
        return this._ws?.protocol ?? '';
    }

    /**
     * opened equals true when connection is etablished, in other word when onOpen event is fired
     */
    get opened(): boolean {
        return this._opened;
    }

    /**
     * {@link https://developer.mozilla.org/docs/Web/API/WebSocket/readyState | Official websocket readyState}
     */
    get readyState(): number {
        return this._ws ? this._ws.readyState : 3;
    }

    /**
     * True when connection is closed, in other words when {@link onClose} event is fired
     * or when WebSocketReliable is build without url (disconnected creation)
     */
    get closed(): boolean {
        return this._closed;
    }

    /**
     * The number of bytes of data that were queued during calls to send() but not yet transmitted to the network
     */
    get bufferedAmount(): number {
        return this._queueingBytes + (this._ws?.bufferedAmount || 0);
    }

    /**
     * Queued messages from a call to send() waiting to be transmit one time websocket connection opened (or with an explicit call to flush() method)
     */
    get queueing(): Array<string | ArrayBuffer | ArrayBufferView> {
        return this._queueing;
    }

    private _opened: boolean;
    private _closed: boolean;
    private _queueing: Array<string | ArrayBuffer | ArrayBufferView>;
    private _queueingBytes: number;
    private _ws?: WebSocket;
    private _recvByteRate: ByteRate;
    private _sendByteRate: ByteRate;
    /**
     * Create a WebSocketReliable object, and open it if an url is passed in argument
     * @param url URL of the WebSocket endpoint or null to start the connection later
     */
    constructor(url?: string | URL, protocols?: string | string[]) {
        super();
        this._queueing = [];
        this._queueingBytes = 0;
        this._opened = false;
        this._closed = true;
        this._recvByteRate = new ByteRate();
        this._sendByteRate = new ByteRate();
        if (url) {
            this.open(url, protocols);
        }
    }

    /**
     * Open a WebSocket connection
     * @param url url of the websocket endpoint
     * @returns this
     */
    open(url: URL | string, protocols?: string | string[]) {
        this._closed = false;
        const ws = (this._ws = new WebSocket(url, protocols));
        ws.binaryType = this.binaryType;
        ws.onmessage = e => {
            this._recvByteRate.addBytes(e.data.byteLength ?? e.data.length);
            this.onMessage(e.data);
        };
        // Add details and fix close ways
        ws.onclose = (e: CloseEvent) => {
            if (!this._opened) {
                // close during connection
                // the caller can differentiate this case of one server shutdown by looking if onOpen was op
                this.close(url.toString() + ' connection failed, ' + String(e.reason || e.code));
            } else if (e.code === 1000 || e.code === 1005) {
                // normal disconnection from server, no error to indicate that a reconnection is possible!
                // the caller can differentiate this case of one explicit websocket.close() call in the encpasulating class
                this.close(url.toString() + ' shutdown');
            } else {
                // abnormal disconnection from server
                this.close(url.toString() + ' disconnection, ' + String(e.reason || e.code));
            }
        };
        // Wrap send method to queue messages until connection is established.
        ws.onopen = _ => {
            this._opened = true;
            this.flush();
            this.onOpen();
        };
        return this;
    }

    /**
     * Send a message
     * @param message
     * @param queueing When set it reports the sending to a more later call to flush
     * @returns this
     */
    send(message: string | ArrayBuffer | ArrayBufferView, queueing: boolean = false) {
        if (this._closed) {
            throw Error('Open socket before to send data');
        }
        if (queueing || !this._opened) {
            this._queueing.push(message);
            this._queueingBytes += typeof message === 'string' ? message.length : message.byteLength;
        } else {
            this._send(message);
        }
        return this;
    }

    /**
     * Send queueing messages
     */
    flush() {
        if (this._ws) {
            for (const message of this._queueing) {
                this._send(message);
            }
        }
        this._queueing.length = 0;
        this._queueingBytes = 0;
    }

    /**
     * Close websocket
     * @param error the error reason if is not a proper close
     */
    close(error?: string) {
        if (!this._ws || this._closed) {
            return;
        }
        this._closed = true;
        this._ws.onopen = this._ws.onclose = this._ws.onmessage = null; // otherwise can receive message AFTER close!
        this._ws.close(); // Don't set to undefined to keep this._ws properties valid!
        // release resources!

        this._queueing.length = 0;
        this._queueingBytes = 0;
        this.onClose(error);
        // Reset _opened in last to allow to differenciate in onClose an error while connecting OR while connected
        // Is welcome to attempt a reconnection when no error OR when error on connection!
        this._opened = false;
    }

    private _send(message: string | ArrayBuffer | ArrayBufferView) {
        if (!this._ws) {
            return;
        }
        this._sendByteRate.addBytes(typeof message === 'string' ? message.length : message.byteLength);
        this._ws.send(message);
    }
}
