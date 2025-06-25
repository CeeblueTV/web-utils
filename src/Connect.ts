/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import * as Util from './Util';
import { NetAddress } from './NetAddress';

/**
 * Parameters of a key system for encrypted streams (DRM)
 *
 * If the key system is a string, it's the URL of the license server.
 *
 * If the key system is an object, it's a key system configuration with more parameters.
 */
export type KeySystem =
    | string
    | {
          /**
           * The license server URL
           */
          licenseUrl: string;
          /**
           * The certificate URL if needed (for FairPlay)
           *
           * Or directly the certificate
           */
          certificate?: string | Uint8Array;
          /**
           * The additional HTTP headers to send to the license server
           */
          headers?: Record<string, string>;
          /**
           * Audio robustness level
           *
           * A list of robustness levels, prioritized by the order of the array.
           */
          audioRobustness?: string[];
          /**
           * Video robustness level
           *
           * A list of robustness levels, prioritized by the order of the array.
           */
          videoRobustness?: string[];
      };

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
     * The name of the stream to join.
     * If `endPoint` is a complete URL and `streamName` is not provided, {@link buildURL} will set this parameter automatically
     * using the second part of the URL's path (the first part being the protocol name), or the first path if no other part exists.
     */
    streamName?: string;
    /**
     * Optional access token to use to join a private stream
     */
    accessToken?: string;
    /**
     * iceServer to use while connecting to a WebRTC stream
     */
    iceServer?: RTCIceServer; // Authentication value
    /**
     * Map of keys to content protection settings for encrypted streams
     * The key can be "com.apple.fps" for example for FairPlay
     */
    contentProtection?: Record<string, KeySystem>;
    /**
     * Optional media extension (mp4, flv, ts, rts), usefull for protocol like WebRTS which supports different container type.
     * When not set, it's also an output parameter for {@link defineMediaExt} to indicate what is the media type selected
     */
    mediaExt?: string;
    /**
     * Optional query to add into the generated url of connection
     */
    query?: URLSearchParams;
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
    // Compute appropriate mediaExt out parameter
    if (!params.mediaExt) {
        try {
            const url = new URL(params.endPoint);
            // Set mediaExt with ?ext= param when set OR url extension
            params.mediaExt = url.searchParams.get('ext') ?? Util.getExtension(Util.getFile(url.pathname));
        } catch (_) {
            // not an URL, it's only a host
            params.mediaExt = '';
        }
    }
    // Fix mediaExt in removing the possible '.' prefix
    params.mediaExt = Util.trimStart(params.mediaExt, '.');
    switch (type) {
        case Type.HESP:
            params.mediaExt = 'mp4';
            break;
        case Type.WEBRTC:
            params.mediaExt = 'rtp';
            break;
        case Type.WRTS: {
            // json means a manifest file endPoint, replace with default rts media extension
            if (!params.mediaExt || params.mediaExt.toLowerCase() === 'json') {
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
            console.warn('Unknown params type ' + type);
            break;
    }
}

/**
 * Build an URL from {@link Type | type} and {@link Params | params}
 * Can assign {@link Params.mediaExt | params.mediaExt} or {@link Params.streamName | params.streamName}
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
                url.pathname = '/wrts/' + params.streamName + '.' + params.mediaExt;
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
    } else {
        // Host has already a path! keep it unchanged, it's user intentionnal (used with some other WHIP/WHEP server?)
        if (!params.streamName) {
            // extract the second part of the URL's path (the first part being the protocol name), or the first path if no other part exists
            const parts = url.pathname.split('/');
            params.streamName = Util.getBaseFile(parts[2] || parts[1] || parts[0]);
        }
    }
    if (params.accessToken) {
        url.searchParams.set('id', params.accessToken);
    }
    for (const [key, value] of params.query ?? []) {
        url.searchParams.set(key, value);
    }
    return url;
}
