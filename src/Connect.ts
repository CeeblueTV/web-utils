/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import * as Util from './Util';
import { NetAddress } from './NetAddress';
import { log } from './Log';

/**
 * Parameters of the createMediaKeySystemConfigurations helper function
 *
 * These parameters allow to write concise configurations for encrypted streams by specifying
 * common audio/video content types, robustness values, and a base configuration.
 */
export type MediaKeySystemConfigurationParams = {
    audioContentTypes?: string | string[];
    videoContentTypes?: string | string[];
    audioRobustness?: string | string[];
    videoRobustness?: string | string[];
    baseConfiguration?: MediaKeySystemConfiguration;
};

/**
 * Helper to create the MediaKeySystem.configurations from :
 *  - common audio/video content types
 *  - base configuration (with other parameters)
 *  - robustness values
 * It generates all combinations of audio and video content types and robustness values, and merges them with
 * the base configuration if provided.
 *
 * The returned configurations can be assigned to {@link MediaKeySystem.configurations}. When the caller
 * omits capability content types, a DRM implementation may enrich those templates with stream metadata before
 * passing the final configurations to `requestMediaKeySystemAccess()`.
 *
 * Example of usage :
 *
 * ```ts
 * const keySystem: MediaKeySystem = {
 *      license: 'https://license-server.com/getLicense',
 *      configurations: createMediaKeySystemConfigurations({
 *          audioContentTypes: ['audio/mp4; codecs="mp4a.40.2"'],
 *          videoContentTypes: ['video/mp4; codecs="avc1.640028"', 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
 *          audioRobustness: ['SW_SECURE_CRYPTO', 'HW_SECURE_CRYPTO'],
 *          videoRobustness: ['SW_SECURE_DECODE', 'HW_SECURE_DECODE']
 *      })
 * };
 * ```
 *
 * @returns An array of MediaKeySystemConfiguration templates.
 */
export function createMediaKeySystemConfigurations(
    params: MediaKeySystemConfigurationParams
): MediaKeySystemConfiguration[] {
    const audioContentTypes = Util.toStringArray(params.audioContentTypes);
    const videoContentTypes = Util.toStringArray(params.videoContentTypes);
    const requestedAudioRobustness = Util.toStringArray(params.audioRobustness);
    const requestedVideoRobustness = Util.toStringArray(params.videoRobustness);

    if (!audioContentTypes.length && !videoContentTypes.length) {
        if (!requestedAudioRobustness.length && !requestedVideoRobustness.length) {
            return params.baseConfiguration ? [{ ...params.baseConfiguration }] : [{}];
        }
        // If no content types are provided, we create a single configuration with robustness values only
        return [
            {
                ...params.baseConfiguration,
                ...(requestedAudioRobustness.length > 0 && {
                    audioCapabilities: requestedAudioRobustness.map(robustness => ({ ...{ robustness } }))
                }),
                ...(requestedVideoRobustness.length > 0 && {
                    videoCapabilities: requestedVideoRobustness.map(robustness => ({ ...{ robustness } }))
                })
            }
        ];
    }

    const configurations: MediaKeySystemConfiguration[] = [];

    const audioRobustness = audioContentTypes.length ? Util.toStringArray(params.audioRobustness, ['']) : [''];
    const videoRobustness = videoContentTypes.length ? Util.toStringArray(params.videoRobustness, ['']) : [''];
    const unresolvedAudioCapabilities =
        requestedAudioRobustness.length > 0
            ? requestedAudioRobustness.map(robustness => ({
                  ...(robustness && { robustness })
              }))
            : undefined;
    const unresolvedVideoCapabilities =
        requestedVideoRobustness.length > 0
            ? requestedVideoRobustness.map(robustness => ({
                  ...(robustness && { robustness })
              }))
            : undefined;
    const audioInputs = audioContentTypes.length ? audioContentTypes : [''];
    const videoInputs = videoContentTypes.length ? videoContentTypes : [''];

    // Create a complete configuration for each combination of audio/video content types and robustness values
    for (const audioContentType of audioInputs) {
        for (const videoContentType of videoInputs) {
            for (const audioR of audioRobustness) {
                for (const videoR of videoRobustness) {
                    const audioCapabilities = audioContentType
                        ? [{ contentType: audioContentType, ...(audioR && { robustness: audioR }) }]
                        : unresolvedAudioCapabilities;
                    const videoCapabilities = videoContentType
                        ? [{ contentType: videoContentType, ...(videoR && { robustness: videoR }) }]
                        : unresolvedVideoCapabilities;

                    const config: MediaKeySystemConfiguration = {
                        ...params.baseConfiguration,
                        ...(audioCapabilities && { audioCapabilities }),
                        ...(videoCapabilities && { videoCapabilities })
                    };
                    configurations.push(config);
                }
            }
        }
    }

    return configurations;
}

export type MediaKeyLicense =
    | string
    | {
          url: string;
          headers?: Record<string, string>;
      };

export type MediaKeyCertificate =
    | string
    | Uint8Array
    | {
          url: string;
          headers?: Record<string, string>;
      };

/**
 * Parameters of a key system for encrypted streams (DRM)
 *
 * If the key system is a string, it's the URL of the license server.
 *
 * If the key system is an object, it's a key system configuration with more parameters.
 */
export type MediaKeySystem =
    | string
    | {
          /**
           * The license URL or configuration for the key system. If it's a string, it's the URL of the license server.
           */
          license?: MediaKeyLicense;
          /**
           * The certificate URL if needed (for FairPlay) or the certificate data as Uint8Array.
           */
          certificate?: MediaKeyCertificate;
          /**
           * Optional MediaKeySystemConfiguration[].
           *
           * If metadata is available, configuration may enrich capabilities that do not define `contentType`
           * before calling `requestMediaKeySystemAccess()`. Explicit `contentType` values provided by the user should
           * take precedence over metadata-derived values.
           *
           * If metadata is not available, these configurations are expected to be complete enough to be used as-is.
           */
          configurations?: MediaKeySystemConfiguration[];
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
    contentProtection?: Record<string, MediaKeySystem>;
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
    DIRECT_STREAMING = 'DirectStreaming',
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
        } catch {
            // not an URL, it's only a host
            params.mediaExt = '';
        }
    }
    // Normalize mediaExt in removing the possible '.' prefix and change it to lower case
    params.mediaExt = Util.trimStart(params.mediaExt, '.').toLowerCase();
    switch (type) {
        case Type.DIRECT_STREAMING:
            if (!params.mediaExt) {
                params.mediaExt = 'mp4';
            }
            break;
        case Type.HESP:
            params.mediaExt = 'mp4';
            break;
        case Type.WEBRTC:
            params.mediaExt = 'rtp';
            break;
        case Type.WRTS: {
            // json means a manifest file endPoint, replace with default rts media extension
            if (!params.mediaExt || params.mediaExt === 'json') {
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
            log('Unknown params type ' + type).warn();
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
            case Type.DIRECT_STREAMING:
                url.pathname = '/live/' + params.streamName + '.' + params.mediaExt;
                break;
            case Type.META:
                url.pathname = '/json_' + params.streamName + '.js';
                break;
            case Type.DATA:
                url.pathname = '/' + params.streamName + '.json';
                break;
            default:
                log('Unknown url type ' + type).warn();
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
