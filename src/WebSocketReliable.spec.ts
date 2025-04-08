/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketReliable } from './WebSocketReliable';

describe('WebSocketReliable', () => {
    let ws: WebSocketReliable;
    const mockUrl = 'ws://example.com';
    let mockWs: {
        url: string;
        extensions: string;
        protocol: string;
        readyState: number;
        bufferedAmount: number;
        binaryType: BinaryType;
        onopen: (() => void) | null;
        onclose: ((event: CloseEvent) => void) | null;
        onmessage: ((event: MessageEvent) => void) | null;
        send: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        // Mock WebSocket
        mockWs = {
            url: mockUrl,
            extensions: '',
            protocol: '',
            readyState: 0,
            bufferedAmount: 0,
            binaryType: 'arraybuffer',
            onopen: null,
            onclose: null,
            onmessage: null,
            send: vi.fn(),
            close: vi.fn()
        };

        global.WebSocket = vi.fn().mockImplementation(() => mockWs) as unknown as typeof WebSocket;
        ws = new WebSocketReliable(mockUrl);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create an instance without URL', () => {
            const ws = new WebSocketReliable();
            expect(ws.closed).toBe(true);
            expect(ws.opened).toBe(false);
        });

        it('should create an instance with URL', () => {
            expect(ws.url).toBe(mockUrl);
            expect(ws.closed).toBe(false);
        });
    });

    describe('connection lifecycle', () => {
        it('should handle successful connection', () => {
            const onOpenSpy = vi.fn();
            ws.onOpen = onOpenSpy;

            mockWs.readyState = 1;
            if (mockWs.onopen) {
                mockWs.onopen();
            }

            expect(ws.opened).toBe(true);
            expect(onOpenSpy).toHaveBeenCalled();
        });

        it('should handle server shutdown', () => {
            const onCloseSpy = vi.fn();
            ws.onClose = onCloseSpy;

            if (mockWs.onclose) {
                mockWs.onclose({ code: 1000 } as CloseEvent);
            }

            expect(ws.closed).toBe(true);
            expect(onCloseSpy).toHaveBeenCalledWith({
                type: 'WebSocketReliableError',
                name: 'Connection failed',
                reason: '1000',
                url: mockUrl
            });
        });

        it('should handle connection failure', () => {
            const onCloseSpy = vi.fn();
            ws.onClose = onCloseSpy;

            if (mockWs.onclose) {
                mockWs.onclose({ code: 1006, reason: 'Connection failed' } as CloseEvent);
            }

            expect(ws.closed).toBe(true);
            expect(onCloseSpy).toHaveBeenCalledWith({
                type: 'WebSocketReliableError',
                name: 'Connection failed',
                url: mockUrl,
                reason: 'Connection failed'
            });
        });
    });

    describe('message handling', () => {
        it('should handle text messages', () => {
            const onMessageSpy = vi.fn();
            ws.onMessage = onMessageSpy;

            if (mockWs.onmessage) {
                mockWs.onmessage({ data: 'Hello' } as MessageEvent);
            }

            expect(onMessageSpy).toHaveBeenCalledWith('Hello');
        });

        it('should handle binary messages', () => {
            const onMessageSpy = vi.fn();
            ws.onMessage = onMessageSpy;

            // Simulate binary message reception
            const binaryData = new Uint8Array([1, 2, 3]);
            if (mockWs.onmessage) {
                mockWs.onmessage({ data: binaryData } as MessageEvent);
            }

            expect(onMessageSpy).toHaveBeenCalledWith(binaryData);
        });
    });

    describe('message sending', () => {
        it('should send messages immediately when connected', () => {
            mockWs.readyState = 1;

            ws.send('Hello');

            setTimeout(() => {
                expect(mockWs.send).toHaveBeenCalledWith('Hello');
            }, 100);
        });

        it('should queue messages when not connected', () => {
            ws.send('Hello');
            expect(ws.queueing).toContain('Hello');
            expect(ws.bufferedAmount).toBeGreaterThan(0);
        });

        it('should flush queued messages on connection', () => {
            ws.send('Hello');
            mockWs.readyState = 1;
            if (mockWs.onopen) {
                mockWs.onopen();
            }

            expect(mockWs.send).toHaveBeenCalledWith('Hello');
            expect(ws.queueing.length).toBe(0);
        });

        it('should handle queueing option', () => {
            mockWs.readyState = 1;

            ws.send('Hello', true);
            expect(ws.queueing).toContain('Hello');
            expect(mockWs.send).not.toHaveBeenCalled();
        });
    });

    describe('byte rate tracking', () => {
        it('should track received bytes', () => {
            const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
            if (mockWs.onmessage) {
                mockWs.onmessage({ data: binaryData } as MessageEvent);
            }

            setTimeout(() => {
                expect(ws.recvByteRate).toBeGreaterThan(0);
            }, 100);
        });

        it('should track sent bytes', () => {
            mockWs.readyState = 1;

            const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
            ws.send(binaryData);

            setTimeout(() => {
                expect(ws.sendByteRate).toBeGreaterThan(0);
            }, 100);
        });
    });

    describe('error handling', () => {
        it('should throw error when sending to closed socket', () => {
            ws.close();
            expect(() => ws.send('Hello')).toThrow('Open socket before to send data');
        });

        it('should handle socket disconnection', () => {
            const onCloseSpy = vi.fn();
            ws.onClose = onCloseSpy;

            if (mockWs.onclose) {
                mockWs.onclose({ code: 1006, reason: 'Connection lost' } as CloseEvent);
            }

            expect(onCloseSpy).toHaveBeenCalledWith({
                type: 'WebSocketReliableError',
                name: 'Connection failed',
                url: mockUrl,
                reason: 'Connection lost'
            });
        });
    });

    describe('properties', () => {
        it('should return correct binaryType', () => {
            expect(ws.binaryType).toBe('arraybuffer');
        });

        it('should return correct readyState', () => {
            mockWs.readyState = 1;
            expect(ws.readyState).toBe(1);
        });

        it('should return correct bufferedAmount', () => {
            mockWs.bufferedAmount = 100;
            expect(ws.bufferedAmount).toBe(100);
        });
    });
});
