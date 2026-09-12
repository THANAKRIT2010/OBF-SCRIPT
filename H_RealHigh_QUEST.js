const logger = console;
const { ProxyAgent } = require('undici');

function getDispatcher(proxyUrl) {
    if (!proxyUrl) return null;
    try {
        const url = new URL(proxyUrl);
        let tokenOption;
        if (url.username && url.password) {
            tokenOption = `Basic ${Buffer.from(`${url.username}:${url.password}`).toString('base64')}`;
            url.username = '';
            url.password = '';
        }
        return new ProxyAgent({ uri: url.toString(), token: tokenOption });
    } catch (e) {
        logger.warn(`[QuestAPI] Invalid proxy URL: ${proxyUrl}`);
        return null;
    }
}

class QuestHandler {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9188 Chrome/130.0.6723.137 Electron/33.2.1 Safari/537.36';
        this.buildNumber = 0;
        this.superProperties = '';
        this.MAX_RETRIES = 3;
        this._ready = this._init();
    }

    // ── retry + rate limit + network error ──
    async _fetchWithRetry(url, options, retries = this.MAX_RETRIES) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const res = await fetch(url, options);
                if (res.status === 429) {
                    const retryAfter = parseFloat(res.headers.get('Retry-After') || '2');
                    const waitMs = Math.ceil(retryAfter * 1000) + 500;
                    logger.warn(`[RateLimit] โดน Rate Limit, รอ ${waitMs}ms... (attempt ${attempt}/${retries})`);
                    await this.wait(waitMs);
                    continue;
                }
                return res;
            } catch (err) {
                if (attempt >= retries) throw err;
                logger.warn(`[Retry] Network error (${attempt}/${retries}): ${err.message} — รอ ${attempt * 2}s`);
                await this.wait(attempt * 2000);
            }
        }
        throw new Error(`Request failed after ${retries} retries`);
    }

    async _init() {
        const FALLBACK_BUILD = 560555;
        // ── set fallback ทันที ไม่ block ──
        this.buildNumber = FALLBACK_BUILD;
        this._rebuildSuperProperties();
        this._buildNumberCachedAt = Date.now();
        logger.log(`[QuestAPI] \`✅\` พร้อมใช้งาน (fallback build: ${FALLBACK_BUILD}) — กำลัง fetch build จริงใน background...`);

        // ── fetch จริงใน background ไม่รอ ──
        const TIMEOUT_MS = 10000;
        Promise.race([
            this._fetchBuildNumber(),
            new Promise((_, rej) =>
                setTimeout(() => rej(new Error(`timeout ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
            )
        ]).then(buildNum => {
            this.buildNumber = buildNum;
            this._rebuildSuperProperties();
            logger.log(`[QuestAPI] \`✅\` อัปเดต Build Number จริง: ${this.buildNumber}`);
        }).catch(err => {
            logger.warn(`[QuestAPI] \`⚠️\` ใช้ fallback ต่อไป | ${err.message}`);
        });
    }

    async _fetchBuildNumber() {
        const pageRes = await fetch('https://discord.com/login', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        const pageHtml = await pageRes.text();
        const allScripts = [];
        const scriptRegex = /\/assets\/([a-zA-Z0-9_.-]+)\.js/g;
        let match;
        while ((match = scriptRegex.exec(pageHtml)) !== null) {
            allScripts.push(match[0]);
        }
        const scripts = [...new Set(allScripts)];
        logger.log(`[QuestAPI] พบ ${scripts.length} script files`);

        const webScripts = scripts.filter(s => s.includes('/web.'));
        const otherScripts = scripts.filter(s => !s.includes('/web.'));
        const orderedScripts = [...webScripts, ...otherScripts];

        const patterns = [
            /buildNumber:"(\d{5,7})"/,
            /buildNumber:"(\d{5,7})"/i,
            /build_number:"(\d{5,7})"/i,
            /buildNumber:(\d{5,7})/i,
            /build_number:\s*(\d{5,7})/i,
            /"buildNumber",\s*"(\d{5,7})"/,
            /"client_build_number"\s*:\s*(\d{5,7})/,
        ];

        for (const scriptPath of orderedScripts) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000); // timeout 5 วิต่อไฟล์
            try {
                const scriptRes = await fetch(`https://discord.com${scriptPath}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
                    },
                    signal: controller.signal
                });
                const scriptText = await scriptRes.text();
                for (const pat of patterns) {
                    const m = scriptText.match(pat);
                    if (m) {
                        logger.log(`[QuestAPI] พบ build_number ในไฟล์: ${scriptPath}`);
                        return parseInt(m[1], 10);
                    }
                }
            } catch (e) {
                // timeout หรือ network error → ข้ามไฟล์นี้ไปเลย
            } finally {
                clearTimeout(timer);
            }
        }
        throw new Error('ไม่พบ build_number ในไฟล์ script ใดๆ ของ Discord');
    }

    _rebuildSuperProperties() {
        const properties = {
            os: 'Windows',
            browser: 'Discord Client',
            release_channel: 'stable',
            client_version: '1.0.9188',
            os_version: '10.0.22631',
            os_arch: 'x64',
            app_arch: 'x64',
            system_locale: 'en-US',
            browser_user_agent: this.userAgent,
            browser_version: '130.0.6723.137',
            client_build_number: this.buildNumber,
            native_build_number: null,
            client_event_source: null,
            design_id: 0
        };
        this.superProperties = Buffer.from(JSON.stringify(properties)).toString('base64');
    }

    getHeaders(token) {
        return {
            'Authorization': token.replace('Bot ', ''),
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://discord.com',
            'Referer': 'https://discord.com/channels/@me',
            'X-Super-Properties': this.superProperties,
            'X-Discord-Locale': 'en-US',
            'X-Debug-Options': 'bugReporterEnabled',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Ch-Ua': '"Chromium";v="130", "Not?A_Brand";v="99"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        };
    }

    async validateToken(token, proxyUrl = null) {
        await this._ready;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000); // timeout 15 วิ
            const fetchOptions = { method: 'GET', headers: this.getHeaders(token), signal: controller.signal };
            const dispatcher = getDispatcher(proxyUrl);
            if (dispatcher) fetchOptions.dispatcher = dispatcher;
            const res = await fetch('https://discord.com/api/v9/users/@me', fetchOptions).finally(() => clearTimeout(timer));
            if (res.status === 200) {
                const user = await res.json();
                return { valid: true, user };
            }
            if (res.status === 401) return { valid: false, error: 'TOKEN_EXPIRED' };
            if (res.status === 403) return { valid: false, error: 'TOKEN_BANNED' };
            return { valid: false, error: `HTTP_${res.status}` };
        } catch (error) {
            logger.error(`[QuestAPI] Validate Token Error: ${error.message}`);
            throw error;
        }
    }

    async fetchQuests(token, proxyUrl = null) {
        await this._ready;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000); // timeout 15 วิ
            const fetchOptions = { method: 'GET', headers: this.getHeaders(token), signal: controller.signal };
            const dispatcher = getDispatcher(proxyUrl);
            if (dispatcher) fetchOptions.dispatcher = dispatcher;
            const res = await this._fetchWithRetry('https://discord.com/api/v9/quests/@me', fetchOptions).finally(() => clearTimeout(timer));
            return await res.json();
        } catch (error) {
            logger.error(`[QuestAPI] Fetch Quests Error: ${error.message}`);
            throw error;
        }
    }

    // ── FIX: เพิ่ม proxyUrl parameter ──
    async enroll(token, questId, proxyUrl = null) {
        await this._ready;
        try {
            const fetchOptions = {
                method: 'POST',
                headers: this.getHeaders(token),
                body: JSON.stringify({ location: 11, is_targeted: false, metadata_raw: null })
            };
            const dispatcher = getDispatcher(proxyUrl);
            if (dispatcher) fetchOptions.dispatcher = dispatcher;
            const res = await this._fetchWithRetry(`https://discord.com/api/v9/quests/${questId}/enroll`, fetchOptions);
            return await res.json();
        } catch (error) {
            logger.error(`[QuestAPI] Enroll Error: ${error.message}`);
            throw error;
        }
    }

    // ── FIX: เพิ่ม proxyUrl parameter ──
    async heartbeat(token, questId, applicationId, terminal = false, proxyUrl = null) {
        await this._ready;
        try {
            const fetchOptions = {
                method: 'POST',
                headers: this.getHeaders(token),
                body: JSON.stringify({ application_id: applicationId, terminal })
            };
            const dispatcher = getDispatcher(proxyUrl);
            if (dispatcher) fetchOptions.dispatcher = dispatcher;
            const res = await this._fetchWithRetry(`https://discord.com/api/v9/quests/${questId}/heartbeat`, fetchOptions);
            return await res.json();
        } catch (error) {
            logger.error(`[QuestAPI] Heartbeat Error: ${error.message}`);
            throw error;
        }
    }

    // ── FIX: เพิ่ม proxyUrl parameter ──
    async videoProgress(token, questId, timestamp, proxyUrl = null) {
        await this._ready;
        try {
            const fetchOptions = {
                method: 'POST',
                headers: this.getHeaders(token),
                body: JSON.stringify({ timestamp })
            };
            const dispatcher = getDispatcher(proxyUrl);
            if (dispatcher) fetchOptions.dispatcher = dispatcher;
            const res = await this._fetchWithRetry(`https://discord.com/api/v9/quests/${questId}/video-progress`, fetchOptions);
            return await res.json();
        } catch (error) {
            logger.error(`[QuestAPI] Video Progress Error: ${error.message}`);
            throw error;
        }
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new QuestHandler();
