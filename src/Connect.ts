/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { NetAddress } from './NetAddress';

/**
 * Parameters of connections
 */
export type Params = {
    /**
     * Host to connect. Can include port, and accept also an url format with port and path,
     * it can help to force a path OR try to give a protocol preference
     */
    host: string;
    /**
     * The name of the stream to join
     */
    streamName: string;
    /**
     * Optional access token to use to join a private stream
     */
    accessToken?: string;
    /**
     * iceServer to use while connecting to a WebRTC stream
     */
    iceServer?: RTCIceServer; // Authentication value
    /**
     * Optional query to add into the generated url of connection
     */
    query?: Record<string, string>;
};

/**
 * Type of connection
 */
export enum Type {
    HESP = 'hesp',
    WEBRTS = 'webrts',
    WEBRTC = 'webrtc',
    META = 'meta',
    DATA = 'data'
}

/**
 * Some connection utility functions
 */

/**
 * Build an URL from {@link Type | type} and {@link Params | params}
 * @param type Type of the connection wanted
 * @param params Connection parameters
 * @param protocol Optional parameter to choose the prefered protocol to connect
 * @returns The URL of connection
 */
export function buildURL(type: Type, params: Params, protocol: string = 'wss'): URL {
    const url = new URL(NetAddress.fixProtocol(protocol, params.host));

    if (url.pathname.length <= 1) {
        // build ceeblue path!
        switch (type) {
            case Type.HESP:
                url.pathname = '/hesp/' + params.streamName + '/index.json';
                break;
            case Type.WEBRTC:
                url.pathname = '/webrtc/' + params.streamName;
                break;
            case Type.WEBRTS:
                url.pathname = '/webrts/' + params.streamName;
                break;
            case Type.META:
                url.pathname = '/json_' + params.streamName + '.js';
                break;
            case Type.DATA:
                url.pathname = '/' + params.streamName + '.json';
                break;
            default:
                console.warn('Unknown url type ' + type);
                break;
        }
    } // Host has already a path! keep it unchanged, it's user intentionnal (used with some other WHIP/WHEP server?)
    if (params.accessToken) {
        url.searchParams.set('id', params.accessToken);
    }

    for (const key in params.query) {
        url.searchParams.set(key, params.query[key]);
    }
    return url;
}
