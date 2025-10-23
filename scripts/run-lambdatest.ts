#!/usr/bin/env -S node --loader tsx
/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { createInterface } from 'node:readline/promises';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Maybe<T> = T | undefined;

type LtBrowserRecord = {
    os?: string;
    os_version?: string;
    osVersion?: string;
    browser?: string;
    versions?: string[];
};

type PlatformsResponse = {
    platforms?: {
        Desktop?: Array<{
            platform?: string;
            browsers?: Array<{ browser_name?: string; version?: string }>;
        }>;
        Mobile?: Array<{
            platform?: string;
            devices?: Array<{ device?: string }>;
        }>;
    };
};

type OsKey = { os: string; osVersion: string };
type OsId = string;
type Browser = string;
type Version = string;

type BrowserIndex = Map<Browser, Map<OsId, { key: OsKey; versions: Set<Version> }>>;

type SavedPick = {
    globalPlatform?: OsId;
    selections: Array<{ browser: Browser; platform: OsId; versions: Version[] }>;
};

type Prefs = {
    picks?: SavedPick;
    lastUsedAt?: string;
};

const DEFAULT_BROWSER_CANDIDATES = ['chrome', 'edge', 'firefox', 'safari'] as const;
const PREFS_FILE = 'run-lambdatest.prefs.json';
const SECRETS_FILE = 'run-lambdatest.secrets.json';
const LT_API_URL = 'https://api.lambdatest.com/automation/api/v1/platforms';

const scriptDir = (): string => {
    const p = fileURLToPath(import.meta.url);
    return path.dirname(p);
};

const isNonInteractive = (): boolean => {
    const { LT_NON_INTERACTIVE, CI } = process.env;
    return LT_NON_INTERACTIVE === '1' || CI === 'true' || CI === '1';
};

const rl = createInterface({ input: process.stdin, output: process.stdout });

const ask = async (query: string): Promise<string> => (await rl.question(query)).trim();

const fileExists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

const loadJson = async <T>(file: string): Promise<Maybe<T>> => {
    try {
        const raw = await fs.readFile(file, 'utf8');
        return JSON.parse(raw) as T;
    } catch {
        return undefined;
    }
};

const saveJson = async (file: string, data: unknown): Promise<void> => {
    try {
        await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
    } catch {
        console.error(`Failed to save JSON to ${file}:`, data);
    }
};

async function ensureCredentials(): Promise<void> {
    const secretsPath = path.join(scriptDir(), SECRETS_FILE);

    if (await fileExists(secretsPath)) {
        const parsed = await loadJson<Record<string, string>>(secretsPath);
        if (parsed) {
            if (!process.env.LT_USERNAME && typeof parsed.LT_USERNAME === 'string') {
                process.env.LT_USERNAME = parsed.LT_USERNAME;
            }
            if (!process.env.LT_ACCESS_KEY && typeof parsed.LT_ACCESS_KEY === 'string') {
                process.env.LT_ACCESS_KEY = parsed.LT_ACCESS_KEY;
            }
        }
    }

    let { LT_USERNAME, LT_ACCESS_KEY } = process.env as Record<string, string | undefined>;

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        if (isNonInteractive()) {
            throw new Error(
                'Missing LT_USERNAME/LT_ACCESS_KEY in non-interactive mode. Set env vars or provide scripts/run-lambdatest.secrets.json'
            );
        }
        while (!LT_USERNAME || !LT_USERNAME.trim()) {
            LT_USERNAME = await ask('LambdaTest Username: ');
        }
        while (!LT_ACCESS_KEY || !LT_ACCESS_KEY.trim()) {
            LT_ACCESS_KEY = await ask('LambdaTest Access Key: ');
        }
    }

    process.env.LT_USERNAME = LT_USERNAME!;
    process.env.LT_ACCESS_KEY = LT_ACCESS_KEY!;
    await saveJson(secretsPath, { LT_USERNAME, LT_ACCESS_KEY });
}

async function fetchLtBrowsers(user: string, key: string): Promise<LtBrowserRecord[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
        const res = await fetch(LT_API_URL, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`,
                Accept: 'application/json'
            },
            signal: controller.signal
        });

        const bodyText = await res.text();
        if (!res.ok) {
            const snippet = bodyText.slice(0, 400);
            throw new Error(
                `[LambdaTest] GET /automation/platforms failed: HTTP ${res.status} ${res.statusText}\n${snippet}`
            );
        }

        const data = JSON.parse(bodyText) as PlatformsResponse;

        const desktop = data.platforms?.Desktop ?? [];
        const mobile = data.platforms?.Mobile ?? [];

        const desktopArr: LtBrowserRecord[] = desktop.flatMap(platform =>
            (platform.browsers ?? []).map(b => {
                let browserName = String(b.browser_name ?? '').toLowerCase();
                // Map microsoftedge to edge for webdriverio provider compatibility
                if (browserName === 'microsoftedge') {
                    browserName = 'edge';
                }
                return {
                    os: platform.platform,
                    browser: browserName,
                    versions: [String(b.version ?? '').trim(), 'latest'].filter(Boolean)
                };
            })
        );

        const mobileArr: LtBrowserRecord[] = mobile.flatMap(platform => {
            const raw = String(platform.platform ?? '').toLowerCase();
            const osName = raw === 'ios' ? 'iOS' : raw === 'android' ? 'Android' : '';
            const mappedBrowser = raw === 'ios' ? 'safari' : raw === 'android' ? 'chrome' : '';
            if (!osName || !mappedBrowser) {
                return [];
            }

            const devices = (platform.devices ?? []).map(d => String(d.device ?? '').trim()).filter(Boolean);

            return [
                {
                    os: osName,
                    os_version: '(Mobile)',
                    browser: mappedBrowser,
                    versions: ['latest', ...devices]
                }
            ];
        });

        const arr = [...desktopArr, ...mobileArr];
        if (arr.length === 0) {
            throw new Error('[LambdaTest] /automation/platforms returned empty list');
        }
        return arr;
    } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') {
            throw new Error('[LambdaTest] request timed out');
        }
        throw new Error(`[LambdaTest] fetch error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        clearTimeout(timeout);
    }
}

const normalizeOs = (rec: LtBrowserRecord): OsKey => ({
    os: rec.os || 'Windows',
    osVersion: String(rec.os_version ?? rec.osVersion ?? '').trim()
});

const osId = (key: OsKey): OsId => `${key.os} ${key.osVersion}`.trim();

function buildIndex(dataset: LtBrowserRecord[]): BrowserIndex {
    const idx: BrowserIndex = new Map();

    for (const rec of dataset) {
        const b = (rec.browser ?? '').toLowerCase();
        if (!b) {
            continue;
        }

        const key = normalizeOs(rec);
        const id = osId(key);

        if (!idx.has(b)) {
            idx.set(b, new Map());
        }
        const osMap = idx.get(b)!;

        if (!osMap.has(id)) {
            osMap.set(id, { key, versions: new Set() });
        }
        const entry = osMap.get(id)!;

        for (const v of rec.versions ?? []) {
            const sv = String(v).trim();
            if (sv) {
                entry.versions.add(sv);
            }
        }
    }

    return idx;
}

function sortVersionsForDisplay(vs: Iterable<string>): string[] {
    const arr = Array.from(vs);
    const latest = arr.filter(v => v.toLowerCase() === 'latest');
    const rest = arr.filter(v => v.toLowerCase() !== 'latest');

    rest.sort((a, b) => {
        const A = a.split('.').map(n => Number(n));
        const B = b.split('.').map(n => Number(n));
        for (let i = 0; i < Math.max(A.length, B.length); i++) {
            const ai = A[i] ?? 0;
            const bi = B[i] ?? 0;
            if (ai !== bi) {
                return bi - ai;
            }
        }
        return 0;
    });

    return [...latest, ...rest];
}

const isMobilePlatformId = (id: string): boolean => /^(iOS|Android)\b/i.test(id) || /\(Mobile\)/i.test(id);

function makeSaneOsDefault(osIds: string[], browserName?: string): string {
    const order = [
        /Windows 11/i,
        /Windows 10/i,
        /macOS (Sequoia|Sonoma|Ventura|Monterey|Big Sur)/i,
        /Ubuntu 22\.04|Ubuntu 20\.04|Ubuntu/i
    ];

    if (browserName && /safari/i.test(browserName)) {
        const macPreferred = osIds.find(id => /macOS/i.test(id));
        if (macPreferred) {
            return macPreferred;
        }
    }

    for (const rx of order) {
        const match = osIds.find(id => rx.test(id));
        if (match) {
            return match;
        }
    }

    return osIds[0];
}

async function selectOne(prompt: string, options: string[], def?: string): Promise<string> {
    const numbered = options.map((o, i) => `${i + 1}) ${o}`).join('\n');
    const suffix = def ? ` (default: ${def})` : '';

    const askOnce = async (): Promise<string> => {
        const ans = (await ask(`${prompt}${suffix}\n${numbered}\nSelect [1-${options.length}]: `)).trim();

        if (!ans && def) {
            return def;
        }

        const idx = Number.parseInt(ans, 10);
        if (Number.isInteger(idx) && idx >= 1 && idx <= options.length) {
            return options[idx - 1];
        }

        return askOnce();
    };

    return askOnce();
}

async function selectMany(
    prompt: string,
    options: string[],
    { allowEmpty = true, defaultHint = 'all latest' }: { allowEmpty?: boolean; defaultHint?: string } = {}
): Promise<string[]> {
    const numbered = options.map((o, i) => `${i + 1}) ${o}`).join('\n');
    const hint = allowEmpty ? `empty=${defaultHint}` : 'at least one';
    const ans = (await ask(`${prompt}\n${numbered}\nSelect multiple (comma-separated), ${hint}: `)).trim();
    if (!ans && allowEmpty) {
        return [];
    }
    const indices = ans
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => Number.isInteger(n) && n >= 1 && n <= options.length);

    return Array.from(new Set(indices)).map(i => options[i - 1]);
}

function summarizePick(pick: SavedPick): string {
    const parts: string[] = [];
    if (pick.globalPlatform) {
        parts.push(`Platform: ${pick.globalPlatform}`);
    }
    for (const s of pick.selections) {
        const verStr = s.versions.length ? s.versions.join(',') : 'latest';
        parts.push(`${s.browser} @ ${s.platform} -> ${verStr}`);
    }
    return parts.join(' | ');
}

function validatePickAgainstIndex(pick: SavedPick, idx: BrowserIndex): { ok: true } | { ok: false; reasons: string[] } {
    const reasons: string[] = [];
    for (const s of pick.selections) {
        const b = s.browser.toLowerCase();
        if (!idx.has(b)) {
            reasons.push(`browser not available: ${s.browser}`);
            continue;
        }
        const osMap = idx.get(b)!;
        if (!osMap.has(s.platform)) {
            reasons.push(`platform not supported for ${s.browser}: ${s.platform}`);
            continue;
        }
        const valid = osMap.get(s.platform)!.versions;
        for (const v of s.versions) {
            if (!valid.has(v)) {
                reasons.push(`invalid version for ${s.browser} on ${s.platform}: ${v}`);
            }
        }
        if (s.versions.length === 0 && !valid.has('latest')) {
            reasons.push(`'latest' not supported for ${s.browser} on ${s.platform}. Pick explicit version.`);
        }
    }
    return reasons.length ? { ok: false, reasons } : { ok: true };
}

async function offerReuse(prefsPath: string, idx: BrowserIndex): Promise<Maybe<SavedPick>> {
    const prefs = await loadJson<Prefs>(prefsPath);
    if (!prefs?.picks) {
        return undefined;
    }

    const answer = isNonInteractive()
        ? 'y'
        : (await ask(`Reuse previous selection?\n${summarizePick(prefs.picks)}\n[Y]es / [n]o: `)).toLowerCase();

    if (answer === '' || answer === 'y' || answer === 'yes') {
        const check = validatePickAgainstIndex(prefs.picks, idx);
        if (check.ok) {
            return prefs.picks;
        }

        console.warn('Previous selection is no longer valid:');
        for (const r of check.reasons) {
            console.warn(' -', r);
        }
    }
    return undefined;
}

async function pickUsingApi(idx: BrowserIndex): Promise<SavedPick> {
    const availableBrowsers = DEFAULT_BROWSER_CANDIDATES.filter(b => idx.has(b));
    const defaultBrowser = availableBrowsers.find(b => b === 'chrome') ?? availableBrowsers[0];

    const pickedBrowsers = isNonInteractive()
        ? [defaultBrowser]
        : await selectMany('Pick one or more browsers', availableBrowsers, { allowEmpty: false, defaultHint: 'none' });

    if (pickedBrowsers.length === 0) {
        pickedBrowsers.push(defaultBrowser);
    }

    const osSets = pickedBrowsers.map(b => new Set(Array.from(idx.get(b)?.keys() ?? [])));
    const intersection = osSets.reduce((acc, set) => new Set([...acc].filter(x => set.has(x))));
    const intersectList = Array.from(intersection);

    const selections: SavedPick['selections'] = [];
    let globalPlatform: string | undefined;

    const chooseVersions = async (browser: string, platform: string) => {
        const versions = idx.get(browser)!.get(platform)!.versions;
        const options = sortVersionsForDisplay(versions);
        if (options.length === 0) {
            throw new Error(`No versions available from API for ${browser} on ${platform}`);
        }
        return isNonInteractive()
            ? []
            : await selectMany(`Pick versions for ${browser} on ${platform}`, options, {
                  allowEmpty: true,
                  defaultHint: 'latest'
              });
    };

    if (intersectList.length > 0) {
        intersectList.sort();
        const sane = makeSaneOsDefault(intersectList);

        let usePerBrowser = false;
        if (!isNonInteractive()) {
            const anyMobileAvailable = pickedBrowsers.some(b =>
                Array.from(idx.get(b)!.keys()).some(isMobilePlatformId)
            );
            if (anyMobileAvailable) {
                const withChoice = [...intersectList, '[Pick per-browser platforms (allows mobile)]'];
                const choice = await selectOne(
                    'Pick a platform that supports ALL chosen browsers or pick per-browser',
                    withChoice,
                    sane
                );
                if (choice === '[Pick per-browser platforms (allows mobile)]') {
                    usePerBrowser = true;
                } else {
                    globalPlatform = choice;
                }
            } else {
                globalPlatform = await selectOne(
                    'Pick a platform that supports ALL chosen browsers',
                    intersectList,
                    sane
                );
            }
        } else {
            globalPlatform = sane;
        }

        if (!usePerBrowser && globalPlatform) {
            for (const b of pickedBrowsers) {
                const pickedVers = await chooseVersions(b, globalPlatform);
                selections.push({ browser: b, platform: globalPlatform, versions: pickedVers });
            }
        } else {
            for (const b of pickedBrowsers) {
                const osIds = Array.from(idx.get(b)!.keys()).sort();
                const sanePer = makeSaneOsDefault(osIds, b);
                const chosenOs = isNonInteractive()
                    ? sanePer
                    : await selectOne(`Pick a platform for ${b}`, osIds, sanePer);
                const pickedVers = await chooseVersions(b, chosenOs);
                selections.push({ browser: b, platform: chosenOs, versions: pickedVers });
            }
        }
    } else {
        for (const b of pickedBrowsers) {
            const osIds = Array.from(idx.get(b)!.keys()).sort();
            const sane = makeSaneOsDefault(osIds, b);
            const chosenOs = isNonInteractive() ? sane : await selectOne(`Pick a platform for ${b}`, osIds, sane);
            const pickedVers = await chooseVersions(b, chosenOs);
            selections.push({ browser: b, platform: chosenOs, versions: pickedVers });
        }
    }

    const pick = { globalPlatform, selections };
    const check = validatePickAgainstIndex(pick, idx);
    if (!check.ok) {
        throw new Error('Selection failed validation: [' + check.reasons.join('; ') + ']');
    }
    return pick;
}

function materializeEnvFromPick(pick: SavedPick): void {
    const combos = pick.selections.flatMap(sel => {
        const versions = sel.versions.length ? sel.versions : ['latest'];
        return versions.map(v => ({ browser: sel.browser, version: v, platform: sel.platform }));
    });
    process.env.LT_BROWSER_MATRIX = JSON.stringify({ combos });

    const uniqueBrowsers = Array.from(new Set(pick.selections.map(s => s.browser)));
    if (uniqueBrowsers.length === 1) {
        process.env.TEST_BROWSER = uniqueBrowsers[0];
    } else {
        process.env.TEST_BROWSERS = uniqueBrowsers.join(',');
    }

    const platforms = Array.from(new Set(pick.selections.map(s => s.platform)));
    if (platforms.length === 1) {
        process.env.LT_PLATFORM = platforms[0];
    } else {
        const platformMap: Record<string, string> = {};
        for (const s of pick.selections) {
            platformMap[s.browser.toUpperCase()] = s.platform;
        }
        process.env.LT_PLATFORM_MAP = JSON.stringify(platformMap);
        process.env.LT_PLATFORM = platforms[0];
    }

    if (pick.selections.length === 1) {
        const only = pick.selections[0];
        if (only.versions.length === 1 && only.versions[0].toLowerCase() !== 'latest') {
            process.env.LT_BROWSER_VERSION = only.versions[0];
        } else if (only.versions.length > 1) {
            process.env[`LT_${only.browser.toUpperCase()}_VERSIONS`] = only.versions.join(',');
        }
    } else {
        for (const s of pick.selections) {
            if (s.versions.length > 0) {
                process.env[`LT_${s.browser.toUpperCase()}_VERSIONS`] = s.versions.join(',');
            }
        }
    }

    const anySafari = pick.selections.some(s => /safari/i.test(s.browser));
    if (anySafari) {
        process.env.TEST_HEADLESS = 'false';
    }

    if (!process.env.LT_LOCALHOST) {
        process.env.LT_LOCALHOST = 'localhost.lambdatest.com';
    }
}

async function startTunnel(): Promise<{ api?: { stop(cb: (err?: unknown) => void): void } }> {
    if (process.env.LT_TUNNEL === '0') {
        return {};
    }
    try {
        const { Tunnel } = await import('@lambdatest/node-tunnel');
        const api = new Tunnel();

        await new Promise<void>((resolve, reject) => {
            api.start(
                {
                    user: process.env.LT_USERNAME,
                    key: process.env.LT_ACCESS_KEY,
                    ...(process.env.LT_TUNNEL_NAME ? { tunnelName: process.env.LT_TUNNEL_NAME } : {})
                },
                (err: unknown) => (err ? reject(err) : resolve())
            );
        });

        return { api };
    } catch (e) {
        throw new Error(
            'Failed to start LambdaTest tunnel via @lambdatest/node-tunnel. Set LT_TUNNEL=0 to skip or install the package.'
        );
    }
}

async function main(): Promise<void> {
    await ensureCredentials();

    const user = process.env.LT_USERNAME as string;
    const key = process.env.LT_ACCESS_KEY as string;

    const dataset = await fetchLtBrowsers(user, key);
    const idx = buildIndex(dataset);

    const prefsPath = path.join(scriptDir(), PREFS_FILE);
    const forcePick = process.env.LT_PICK === '1' || process.env.LT_REPICK === '1';

    let pick: SavedPick | undefined;
    if (!forcePick) {
        pick = await offerReuse(prefsPath, idx);
    }
    if (!pick) {
        pick = await pickUsingApi(idx);
    }

    await saveJson(prefsPath, { picks: pick, lastUsedAt: new Date().toISOString() });

    materializeEnvFromPick(pick);
    console.log('\nResolved selection:', summarizePick(pick));
    console.log('LT_BROWSER_MATRIX:', process.env.LT_BROWSER_MATRIX, '\n');

    const { api: tunnelApi } = await startTunnel();

    const cleanup = async () => {
        try {
            if (tunnelApi) {
                await new Promise<void>((resolve, reject) => {
                    tunnelApi.stop((err?: unknown) => (err ? reject(err) : resolve()));
                });
            }
        } finally {
            rl.close();
        }
    };
    process.on('SIGINT', async () => {
        await cleanup();
        process.exit(130);
    });
    process.on('SIGTERM', async () => {
        await cleanup();
        process.exit(143);
    });

    const args = ['vitest', 'run', '--project', 'browser', '--browser.api.host', '0.0.0.0', '--browser.api.strictPort'];

    const child = spawn('npx', args, { stdio: 'inherit', env: process.env });
    child.on('exit', async code => {
        await cleanup();
        process.exit(code ?? 1);
    });
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
