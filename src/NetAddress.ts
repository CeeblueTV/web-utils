/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

/**
 * Help class to manipulate and parse a net address. The Address can be only the domain field,
 * or a URL format with protocol and path part `(http://)domain(:port/path)`
 * @example
 * const address = new Address('nl-ams-42.live.ceeblue.tv:80');
 * console.log(address.domain) // 'nl-ams-42.live.ceeblue.tv'
 * console.log(address.port) // '80'
 * console.log(address) // 'nl-ams-42.live.ceeblue.tv:80'
 */
export class NetAddress {
    /**
     * Static help function to build an end point from an address `(proto://)domain(:port/path)`
     *
     * Mainly it fix the protocol, in addition if:
     *  - the address passed is securized (TLS) and protocol is not => it tries to fix protocol to get its securize version
     *  - the address passed is non securized and protocol is (TLS) => it tries to fix protocol to get its unsecurized version
     * @param protocol protocol to set in the end point returned
     * @param address string address to fix with protocol as indicated
     * @returns the end point built
     * @example
     * console.log(NetAddress.fixProtocol('ws','http://domain/path')) // 'ws://domain/path'
     * console.log(NetAddress.fixProtocol('ws','https://domain/path')) // 'wss://domain/path'
     * console.log(NetAddress.fixProtocol('wss','http://domain/path')) // 'ws://domain/path'
     */
    static fixProtocol(protocol: string, address: string): string {
        // Remove leading slashes for absolute pathes!
        address = address.replace(/^[\/]+/, '');
        const found = address.indexOf('://');
        // isolate protocol is present in address
        if (found >= 0) {
            // In this case replace by protocol in keeping SSL like given in address
            if (found > 2 && address.charAt(found - 1).toLowerCase() === 's') {
                // SSL!
                if (protocol.length <= 2 || !protocol.endsWith('s')) {
                    protocol += 's'; // Add SSL
                }
            } else {
                // Not SSL!
                if (protocol.length > 2 && protocol.endsWith('s')) {
                    protocol = protocol.slice(0, -1); // Remove SSL
                }
            }
            // Build address!
            address = address.substring(found + 3);
        }
        return protocol + '://' + address;
    }

    /**
     * The host part from address `(http://)domain:port/path)`
     */
    get host(): string {
        return this._host;
    }

    /**
     * The domain part from address `(http://)domain(:port/path)`
     */
    get domain(): string {
        return this._domain;
    }
    /**
     * The port part from address `(http://)domain(:port/path)`, or defaultPort if passed in NetAddress constructor
     */
    get port(): number | undefined {
        return this._port;
    }

    toString(): string {
        return this._address;
    }
    /**
     * @returns the string address as passed in the constructor
     * @override
     */
    valueOf(): string {
        return this._address;
    }

    private _address: string;
    private _domain: string;
    private _host: string;
    private _port?: number;
    /**
     * Build a NetAddress object and parse address
     * @param address string address to parse, accept an url format with protocol and path `(http://)domain(:port/path)`
     * @param defaultPort set a default port to use if there is no port in the string address parsed
     */
    constructor(address: string, defaultPort?: number) {
        this._address = address;

        // Remove Protocol
        let pos = address.indexOf('/');
        if (pos >= 0) {
            // Remove ://
            if (address.charCodeAt(pos + 1) === 47) {
                // has //
                if (pos > 0) {
                    if (address.charCodeAt(pos - 1) === 58) {
                        // has ://
                        address = address.substring(pos + 2);
                    } //  something else #//
                } else {
                    // otherwise starts by //
                    address = address.substring(2);
                }
            } else if (!pos) {
                // starts by /, remove it
                address = address.substring(1);
            } // else something else #/
        }

        // Remove Path!
        pos = address.indexOf('/');
        if (pos >= 0) {
            address = address.substring(0, pos);
        }

        this._host = address;
        this._domain = address;
        this._port = defaultPort;

        const domainPortMatch = this._host.match(/^(?:\[([0-9a-fA-F:]+)\]|([^:/?#]+))(?::(\d+))?(?=[/#?]|$)/);
        if (domainPortMatch) {
            this._domain = domainPortMatch[1] || domainPortMatch[2];
            if (domainPortMatch[3]) {
                const port = parseInt(domainPortMatch[3]);
                if (port > 0 && port <= 0xffff) {
                    this._port = port;
                }
            }
        }
    }
}
