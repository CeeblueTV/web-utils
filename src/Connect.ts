/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import * as Util from './Util';
import { NetAddress } from './NetAddress';

/**
 * Parameters of connections
 */
export type Params = {
    /**
     * endPoint to connect. Can be only a host(:port) but accept also a full url of connection,
     * it can help to force a path or indicate a protocol preference
     */
    endPoint: string;
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
     * Optional media extension (mp4, flv, ts, rts), usefull for protocol like WebRTS which supports different container type.
     * When not set, it's also an output parameter to indicate what is the media type selected
     */
    mediaExt?: string;
    /**
     * Optional query to add into the generated url of connection
     */
    query?: Record<string, string>;
};

/**
 * Type of connection
 */
export enum Type {
    HESP = 'HESP',
    WRTS = 'WebRTS',
    WEBRTC = 'WebRTC',
    META = 'Meta',
    DATA = 'Data'
}

/**
 * Some connection utility functions
 */

/**
 * Defines the {@link Params.mediaExt} based on the type of parameters and its endpoint.
 * This method always assigns a value to params.mediaExt, defaulting to an empty string if indeterminable,
 * allowing detection of whether the function has been applied to the parameters.
 * @param type The type of parameters to define.
 * @param params The parameters for which the media extension is to be defined
 */
export function defineMediaExt(type: Type, params: Params) {
    // Fix mediaExt
    /// remove all the possible '.' prefix
    if (params.mediaExt) {
        let i = 0;
        while (params.mediaExt.charAt(i) === '.') {
            ++i;
        }
        params.mediaExt = params.mediaExt.substring(i);
    }
    /// Set mediaExt out parameter if not set!
    switch (type) {
        case Type.HESP:
            params.mediaExt = 'mp4';
            break;
        case Type.WEBRTC:
            params.mediaExt = 'rtp';
            break;
        case Type.WRTS: {
            try {
                const url = new URL(params.endPoint);
                const ext = Util.getExtension(Util.getFile(url.pathname));
                // set extension just if not json, json means a manifest file endPoint
                if (ext && ext !== 'json') {
                    params.mediaExt = ext;
                }
            } catch (_) {
                // not an URL, it's only a host => keep mediaExt unchanged to build the URL
            }
            if (!params.mediaExt) {
                // set to its default rts value => always set for WRTS!
                params.mediaExt = 'rts';
            }
            break;
        }
        case Type.META:
            params.mediaExt = 'js';
            break;
        case Type.DATA:
            params.mediaExt = 'json';
            break;
        default:
            params.mediaExt = ''; // set always a value to know that the parameters have been fixed
            console.warn('Unknown params type ' + type);
            break;
    }
}

/**
 * Build an URL from {@link Type | type} and {@link Params | params}
 * @param type Type of the connection wanted
 * @param params Connection parameters
 * @param protocol Optional parameter to choose the prefered protocol to connect
 * @returns The URL of connection
 */
export function buildURL(type: Type, params: Params, protocol: string = 'wss'): URL {
    defineMediaExt(type, params);

    const url = new URL(NetAddress.fixProtocol(protocol, params.endPoint));

    if (url.pathname.length <= 1) {
        // build ceeblue path!
        switch (type) {
            case Type.HESP:
                url.pathname = '/hesp/' + params.streamName + '/index.json';
                break;
            case Type.WEBRTC:
                url.pathname = '/webrtc/' + params.streamName;
                break;
            case Type.WRTS:
                url.pathname = '/wrts/' + params.streamName;
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
