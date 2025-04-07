/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { NetAddress } from './NetAddress';

describe('NetAddress', () => {
    describe('constructor', () => {
        it('should parse domain-only address', () => {
            const address = new NetAddress('example.com');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('example.com');
        });

        it('should parse address with port', () => {
            const address = new NetAddress('example.com:8080');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBe(8080);
            expect(address.toString()).toBe('example.com:8080');
        });

        it('should parse address with path', () => {
            const address = new NetAddress('example.com/path');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('example.com/path');
        });

        it('should parse address with protocol', () => {
            const address = new NetAddress('http://example.com');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('http://example.com');
        });

        it('should parse full URL', () => {
            const address = new NetAddress('https://example.com:8080/path');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBe(8080);
            expect(address.toString()).toBe('https://example.com:8080/path');
        });

        it('should use default port when provided', () => {
            const address = new NetAddress('example.com', 80);
            expect(address.domain).toBe('example.com');
            expect(address.port).toBe(80);
            expect(address.toString()).toBe('example.com');
        });

        it('should handle protocol-relative URLs', () => {
            const address = new NetAddress('//example.com');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('//example.com');
        });

        it('should handle root-relative URLs', () => {
            const address = new NetAddress('/example.com');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('/example.com');
        });
    });

    describe('fixProtocol', () => {
        it('should fix protocol for non-SSL address', () => {
            expect(NetAddress.fixProtocol('ws', 'http://example.com')).toBe('ws://example.com');
            expect(NetAddress.fixProtocol('wss', 'http://example.com')).toBe('ws://example.com');
        });

        it('should fix protocol for SSL address', () => {
            expect(NetAddress.fixProtocol('ws', 'https://example.com')).toBe('wss://example.com');
            expect(NetAddress.fixProtocol('wss', 'https://example.com')).toBe('wss://example.com');
        });

        it('should handle address without protocol', () => {
            expect(NetAddress.fixProtocol('ws', 'example.com')).toBe('ws://example.com');
            expect(NetAddress.fixProtocol('wss', 'example.com')).toBe('wss://example.com');
        });

        it('should preserve path when fixing protocol', () => {
            expect(NetAddress.fixProtocol('ws', 'http://example.com/path')).toBe('ws://example.com/path');
            expect(NetAddress.fixProtocol('wss', 'https://example.com/path')).toBe('wss://example.com/path');
        });

        it('should handle protocol-relative URLs', () => {
            expect(NetAddress.fixProtocol('ws', '//example.com')).toBe('ws://example.com');
            expect(NetAddress.fixProtocol('wss', '//example.com')).toBe('wss://example.com');
        });

        it('should handle root-relative URLs', () => {
            expect(NetAddress.fixProtocol('ws', '/example.com')).toBe('ws://example.com');
            expect(NetAddress.fixProtocol('wss', '/example.com')).toBe('wss://example.com');
        });
    });

    describe('edge cases', () => {
        it('should handle invalid port numbers', () => {
            const address = new NetAddress('example.com:99999');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('example.com:99999');
        });

        it('should handle IPV6 addresses', () => {
            const address = new NetAddress('[2001:db8:85a3:8d3:1319:8a2e:370:7348]:8080');
            expect(address.domain).toBe('2001:db8:85a3:8d3:1319:8a2e:370:7348');
            expect(address.port).toBe(8080);
            expect(address.toString()).toBe('[2001:db8:85a3:8d3:1319:8a2e:370:7348]:8080');

            const addressWithZoneIdentifier = new NetAddress('[fe80::1]:8080');
            expect(addressWithZoneIdentifier.domain).toBe('fe80::1');
            expect(addressWithZoneIdentifier.port).toBe(8080);
            expect(addressWithZoneIdentifier.toString()).toBe('[fe80::1]:8080');
        });

        it('should handle multiple slashes in path', () => {
            const address = new NetAddress('example.com/path/to/resource');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('example.com/path/to/resource');
        });

        it('should handle empty address', () => {
            const address = new NetAddress('');
            expect(address.domain).toBe('');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('');
        });

        it('should handle address with query parameters', () => {
            const address = new NetAddress('example.com?param=value');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('example.com?param=value');
        });

        it('should handle address with hash', () => {
            const address = new NetAddress('example.com#section');
            expect(address.domain).toBe('example.com');
            expect(address.port).toBeUndefined();
            expect(address.toString()).toBe('example.com#section');
        });
    });

    describe('valueOf', () => {
        it('should return the original address string', () => {
            const address = new NetAddress('example.com:8080/path');
            expect(address.valueOf()).toBe('example.com:8080/path');
        });

        it('should work with string concatenation', () => {
            const address = new NetAddress('example.com');
            expect('Server: ' + address).toBe('Server: example.com');
        });
    });
});
