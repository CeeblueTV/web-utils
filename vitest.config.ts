/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { defineConfig } from 'vitest/config';
import type { BrowserProvider } from 'vitest/node';
import { webdriverio as wdio } from '@vitest/browser-webdriverio';
import type { BrowserInstanceOption } from 'vitest/node';

type LtMatrixCombo = {
    browser: string;
    version: string;
    platform: string;
};

type Protocol = 'http' | 'https';

interface LambdaTestOptions {
    platformName: string;
    project: string;
    build: string;
    name: string;
    w3c: true;
    selenium_version?: string;
    tunnel: boolean;
    tunnelName?: string;
    idleTimeout: number;
    isRealMobile?: boolean;
    deviceName?: string;
}

interface ChromeOptions {
    args?: string[];
    mobileEmulation?: { deviceName: string };
}

interface FirefoxPrefs {
    [pref: string]: string | number | boolean;
}

interface FirefoxOptions {
    prefs: FirefoxPrefs;
}

interface EdgeOptions {
    args?: string[];
}

interface WebDriverCapabilities {
    browserName?: string;
    browserVersion?: string;
    webSocketUrl?: boolean;

    ['goog:chromeOptions']?: ChromeOptions;
    ['moz:firefoxOptions']?: FirefoxOptions;
    ['ms:edgeOptions']?: EdgeOptions;
    ['safari:autoplay']?: boolean;

    ['LT:Options']?: LambdaTestOptions;
}

interface WdioProviderConfig {
    hostname: string;
    protocol: Protocol;
    port: number;
    path: string;
    user?: string;
    key?: string;
    capabilities: WebDriverCapabilities;
}

const env = process.env;

const readBool = (value: string | undefined, defaultValue: boolean): boolean =>
    value === undefined ? defaultValue : value !== '0' && value.toLowerCase() !== 'false';

const readNumber = (value: string | undefined, fallback: number): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const readCsv = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

const defaultBrowser = env.TEST_BROWSER || 'chrome';
const rawBrowserNames: string[] = ((): string[] => {
    const csv = env.TEST_BROWSERS;
    const names = csv ? readCsv(csv) : [defaultBrowser];
    return Array.from(new Set(names));
})();

function getLtMatrix(): LtMatrixCombo[] {
    const raw = env.LT_BROWSER_MATRIX;
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as { combos?: unknown };
        const combos = (parsed as { combos?: LtMatrixCombo[] }).combos ?? [];

        return combos?.filter(
            (c: LtMatrixCombo) =>
                !!c && typeof c.browser === 'string' && typeof c.platform === 'string' && typeof c.version === 'string'
        );
    } catch {
        return [];
    }
}

const ltMatrix = getLtMatrix();

const isMobileCombo = (c: LtMatrixCombo): boolean => /^(iOS|Android)\b/i.test(c.platform);

const browserNames: string[] = ltMatrix.length ? Array.from(new Set(ltMatrix.map(c => c.browser))) : rawBrowserNames;

const hasSafari = browserNames.includes('safari');

const ltUser = env.LT_USERNAME;
const ltKey = env.LT_ACCESS_KEY;
const isLambdaTest = Boolean(ltUser && ltKey);

const ltHostname = env.LT_GRID_URL || 'hub.lambdatest.com';
const ltProject = env.LT_PROJECT || 'web-utils';
const ltBuild = env.LT_BUILD || new Date().toISOString().slice(0, 10);
const ltPlatform = env.LT_PLATFORM || 'Windows 11';
const ltSeleniumVersion = env.LT_SELENIUM_VERSION || '4.0';
const ltTunnelEnabled = readBool(env.LT_TUNNEL, true);
const ltTunnelName = env.LT_TUNNEL_NAME;
const ltIdleTimeout = readNumber(env.LT_IDLE_TIMEOUT, 300);
const useRealMobile = env.LT_USE_REAL_MOBILE === '1';

const LT_LOCALHOST = env.LT_LOCALHOST || 'localhost.lambdatest.com';

function getLtBrowserVersion(name: string): string | undefined {
    const common = env.LT_BROWSER_VERSION;
    if (common) {
        return common;
    }

    return env[`LT_${name.toUpperCase()}_VERSION`];
}

function getLtBrowserVersions(name: string): string[] {
    const specificCsv = env[`LT_${name.toUpperCase()}_VERSIONS`];
    if (typeof specificCsv === 'string' && specificCsv.trim()) {
        return readCsv(specificCsv);
    }

    const commonCsv = env.LT_VERSIONS;
    if (typeof commonCsv === 'string' && commonCsv.trim()) {
        return readCsv(commonCsv);
    }

    const single = getLtBrowserVersion(name);
    if (single) {
        return [single];
    }

    return [];
}

function baseLtOptions(name: string): LambdaTestOptions {
    return {
        platformName: ltPlatform,
        project: ltProject,
        build: ltBuild,
        name: env.LT_NAME || `vitest:${name}`,
        w3c: true as const,
        selenium_version: ltSeleniumVersion,
        tunnel: ltTunnelEnabled,
        ...(ltTunnelName ? { tunnelName: ltTunnelName } : {}),
        idleTimeout: ltIdleTimeout
    };
}

function buildCapabilities(name: string): WebDriverCapabilities {
    if (isLambdaTest) {
        const browserVersion = getLtBrowserVersion(name);
        const caps: WebDriverCapabilities = {
            browserName: name,
            ...(browserVersion ? { browserVersion } : {}),
            'LT:Options': baseLtOptions(name)
        };
        return caps;
    }

    const caps: WebDriverCapabilities = {
        ...(name !== 'safari' ? { webSocketUrl: true } : {}),
        'goog:chromeOptions': {
            args: [
                '--autoplay-policy=no-user-gesture-required',
                '--enable-precise-memory-info',
                '--js-flags=--expose-gc'
            ]
        },
        'moz:firefoxOptions': {
            prefs: {
                'media.autoplay.default': 0,
                'media.autoplay.enabled.user-gestures-needed': false,
                'media.autoplay.block-webaudio': false,
                'media.autoplay.ask-permission': false,
                'media.autoplay.block-event.enabled': false,
                'media.block-autoplay-until-in-foreground': false
            }
        },
        'ms:edgeOptions': { args: ['--autoplay-policy=no-user-gesture-required'] },
        'safari:autoplay': true
    };

    return caps;
}

const providerBrowserFor = <T extends string>(name: T): Lowercase<T> => name.toLowerCase() as Lowercase<T>;

const rewriteLocalhost = (url: string): string =>
    url
        .replace('://localhost:', `://${LT_LOCALHOST}:`)
        .replace('://127.0.0.1:', `://${LT_LOCALHOST}:`)
        .replace('://0.0.0.0:', `://${LT_LOCALHOST}:`);

function withLtLocalhost<P extends BrowserProvider | ((...args: never[]) => BrowserProvider)>(providerOrFactory: P): P {
    const wrap = (prov: BrowserProvider): BrowserProvider => {
        const open = (prov as BrowserProvider).openPage?.bind(prov);
        if (!open) {
            return prov;
        }

        const wrapped: BrowserProvider = {
            ...prov,
            async openPage(sessionId: string, url: string) {
                return open(sessionId, rewriteLocalhost(url));
            }
        };
        return wrapped;
    };

    if (typeof providerOrFactory === 'function') {
        const factory = (...args: never[]) => wrap((providerOrFactory as (...a: never[]) => BrowserProvider)(...args));
        return factory as unknown as P;
    }
    return wrap(providerOrFactory) as P;
}

function wdioProvider(config: WdioProviderConfig): BrowserProvider {
    const cfg = { ...config } satisfies WdioProviderConfig;

    return wdio(cfg) as unknown as BrowserProvider;
}

function buildLtInstances(): BrowserInstanceOption[] {
    if (!isLambdaTest) {
        return [];
    }

    if (ltMatrix.length) {
        return ltMatrix.map<BrowserInstanceOption>(combo => {
            const name = combo.browser;
            const mobile = isMobileCombo(combo);

            if (!mobile) {
                const caps = buildCapabilities(name);
                if (!caps['LT:Options']) {
                    throw new Error('Expected LT:Options in capabilities');
                }
                caps['LT:Options'] = {
                    ...caps['LT:Options'],
                    platformName: combo.platform
                };

                const version = combo.version?.toLowerCase() !== 'latest' && combo.version ? combo.version : undefined;
                if (version) {
                    caps.browserVersion = version;
                }

                return {
                    name: `${name}${version ? `-${version}` : ''}@${combo.platform}`,
                    browser: providerBrowserFor(name) as BrowserInstanceOption['browser'],
                    provider: withLtLocalhost(
                        wdioProvider({
                            hostname: ltHostname,
                            protocol: 'https',
                            port: 443,
                            path: '/wd/hub',
                            user: ltUser,
                            key: ltKey,
                            capabilities: caps
                        })
                    ) as unknown as BrowserInstanceOption['provider']
                };
            }

            const platformName = /^iOS/i.test(combo.platform) ? 'iOS' : 'Android';
            const deviceName =
                combo.version && combo.version.toLowerCase() !== 'latest'
                    ? combo.version
                    : platformName === 'iOS'
                      ? env.LT_DEFAULT_IOS_DEVICE || 'iPhone 15'
                      : env.LT_DEFAULT_ANDROID_DEVICE || 'Samsung Galaxy S23';

            if (useRealMobile) {
                const caps: WebDriverCapabilities = {
                    browserName: name,
                    'LT:Options': {
                        ...baseLtOptions(`${name}:mobile`),
                        platformName,
                        isRealMobile: true,
                        deviceName
                    }
                };

                return {
                    name: `${name}-${deviceName}@${platformName}`,
                    browser: providerBrowserFor(name) as BrowserInstanceOption['browser'],
                    provider: withLtLocalhost(
                        wdioProvider({
                            hostname: env.LT_MOBILE_GRID_URL || 'mobile-hub.lambdatest.com',
                            protocol: 'https',
                            port: 443,
                            path: '/wd/hub',
                            user: ltUser,
                            key: ltKey,
                            capabilities: caps
                        })
                    ) as unknown as BrowserInstanceOption['provider']
                };
            }

            if (platformName === 'iOS') {
                const caps = buildCapabilities('safari');
                if (!caps['LT:Options']) {
                    throw new Error('Expected LT:Options for iOS emulation');
                }

                const macPlatform = env.LT_IOS_DESKTOP_PLATFORM || 'macOS Sonoma';
                caps['LT:Options'] = { ...caps['LT:Options'], platformName: macPlatform };

                return {
                    name: `safari-${deviceName}@iOS(emulated)`,
                    browser: providerBrowserFor('safari'),
                    provider: withLtLocalhost(
                        wdioProvider({
                            hostname: ltHostname,
                            protocol: 'https',
                            port: 443,
                            path: '/wd/hub',
                            user: ltUser,
                            key: ltKey,
                            capabilities: caps
                        })
                    ) as unknown as BrowserInstanceOption['provider']
                };
            }

            const caps = buildCapabilities('chrome');
            caps['goog:chromeOptions'] = {
                ...(caps['goog:chromeOptions'] || {}),
                mobileEmulation: { deviceName: deviceName || 'Pixel 7' }
            };

            return {
                name: `chrome-${deviceName || 'Pixel 7'}@Android(emulated)`,
                browser: providerBrowserFor('chrome'),
                provider: withLtLocalhost(
                    wdioProvider({
                        hostname: ltHostname,
                        protocol: 'https',
                        port: 443,
                        path: '/wd/hub',
                        user: ltUser,
                        key: ltKey,
                        capabilities: caps
                    })
                ) as unknown as BrowserInstanceOption['provider']
            };
        });
    }

    return browserNames.flatMap<BrowserInstanceOption>(name => {
        const versions = getLtBrowserVersions(name);
        if (versions.length > 0) {
            return versions.map<BrowserInstanceOption>(ver => {
                const caps = buildCapabilities(name);
                caps.browserVersion = ver;
                return {
                    name: `${name}-${ver}`,
                    browser: providerBrowserFor(name) as BrowserInstanceOption['browser'],
                    provider: withLtLocalhost(
                        wdioProvider({
                            hostname: ltHostname,
                            protocol: 'https',
                            port: 443,
                            path: '/wd/hub',
                            user: ltUser,
                            key: ltKey,
                            capabilities: caps
                        })
                    ) as unknown as BrowserInstanceOption['provider']
                };
            });
        }

        const caps = buildCapabilities(name);
        return [
            {
                name,
                browser: providerBrowserFor(name) as BrowserInstanceOption['browser'],
                provider: withLtLocalhost(
                    wdioProvider({
                        hostname: ltHostname,
                        protocol: 'https',
                        port: 443,
                        path: '/wd/hub',
                        user: ltUser,
                        key: ltKey,
                        capabilities: caps
                    })
                ) as unknown as BrowserInstanceOption['provider']
            }
        ];
    });
}

function buildLocalInstances(): BrowserInstanceOption[] {
    return browserNames.map<BrowserInstanceOption>(name => ({
        name,
        browser: providerBrowserFor(name) as BrowserInstanceOption['browser'],
        capabilities: buildCapabilities(name)
    }));
}

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'nodejs',
                    environment: 'node',
                    include: ['src/**/*.spec.ts', 'src/**/*.test.ts']
                }
            },
            {
                test: {
                    name: 'browser',
                    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
                    browser: {
                        enabled: true,
                        api: { host: '0.0.0.0', strictPort: true },
                        connectTimeout: readNumber(env.VITEST_BROWSER_CONNECT_TIMEOUT, 120_000),
                        provider: wdio(),
                        ui: browserNames.length === 1 && browserNames[0] === 'safari',
                        headless: hasSafari ? false : env.TEST_HEADLESS !== 'false',
                        ...(browserNames.length === 1 &&
                            browserNames[0] !== 'safari' && {
                                viewport: { width: 1920, height: 1080 }
                            }),
                        instances: isLambdaTest ? buildLtInstances() : buildLocalInstances()
                    }
                }
            }
        ]
    }
});
