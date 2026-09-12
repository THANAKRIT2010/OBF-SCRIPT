"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientQuest = void 0;
const core_1 = require("@discordjs/core");
const rest_1 = require("@discordjs/rest");
const ws_1 = require("@discordjs/ws");
const v10_1 = require("discord-api-types/v10");
const questManager_1 = require("./questManager");
const constants_1 = require("./constants");

const originalSend = ws_1.WebSocketShard.prototype.send;
ws_1.WebSocketShard.prototype.send = function (payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (payload.op === v10_1.GatewayOpcodes.Identify) {
            payload.d = {
                token: payload.d.token,
                properties: Object.assign(Object.assign({}, constants_1.Constants.Properties), { is_fast_connect: false, gateway_connect_reasons: 'AppSkeleton' }),
                capabilities: 0,
                presence: payload.d.presence,
                compress: payload.d.compress,
                client_state: { guild_versions: {} },
            };
        }
        return originalSend.call(this, payload);
    });
};

class ClientQuest extends core_1.Client {
    constructor(token, proxyUrl = null) {
        const makeRequestProxy = function(url, init) {
            return __awaiter(this, void 0, void 0, function* () {
                if (init.headers) {
                    const myHeaders = new Headers(init.headers);
                    if (myHeaders.has('User-Agent')) myHeaders.set('User-Agent', constants_1.Constants.USER_AGENT);
                    if (myHeaders.has('Authorization')) myHeaders.set('Authorization', myHeaders.get('Authorization').replace('Bot ', ''));
                    myHeaders.append('accept-language', 'vi');
                    myHeaders.append('origin', 'https://discord.com');
                    myHeaders.append('pragma', 'no-cache');
                    myHeaders.append('priority', 'u=1, i');
                    myHeaders.append('referer', 'https://discord.com/channels/@me');
                    myHeaders.append('sec-ch-ua', '"Not)A;Brand";v="8", "Chromium";v="130"');
                    myHeaders.append('sec-ch-ua-mobile', '?0');
                    myHeaders.append('sec-ch-ua-platform', '"Windows"');
                    myHeaders.append('sec-fetch-dest', 'empty');
                    myHeaders.append('sec-fetch-mode', 'cors');
                    myHeaders.append('sec-fetch-site', 'same-origin');
                    myHeaders.append('x-debug-options', 'bugReporterEnabled');
                    myHeaders.append('x-discord-locale', 'en-US');
                    myHeaders.append('x-discord-timezone', 'Asia/Saigon');
                    const QuestHandler = require('../H_RealHigh_QUEST');
                    const updatedProperties = {
                        ...constants_1.Constants.Properties,
                        client_build_number: QuestHandler.buildNumber || 560555
                    };
                    myHeaders.append('x-super-properties', Buffer.from(JSON.stringify(updatedProperties)).toString('base64'));
                    init.headers = myHeaders;
                }
                return rest_1.DefaultRestOptions.makeRequest(url, init);
            });
        };

        const restOptions = { version: '10', makeRequest: makeRequestProxy };
        if (proxyUrl) {
            try {
                const url = new URL(proxyUrl);
                let tokenOption;
                if (url.username && url.password) {
                    tokenOption = `Basic ${Buffer.from(`${url.username}:${url.password}`).toString('base64')}`;
                    url.username = '';
                    url.password = '';
                }
                restOptions.agent = new (require('undici').ProxyAgent)({ uri: url.toString(), token: tokenOption });
            } catch (e) {
                console.warn('[ClientQuest] Invalid proxyUrl, using direct connection');
            }
        }

        const rest = new rest_1.REST(restOptions).setToken(token);
        const gateway = new ws_1.WebSocketManager({
            token: token,
            intents: 0,
            rest,
        });

        gateway.fetchGatewayInformation = (force) => {
            return Promise.resolve({
                url: 'wss://gateway.discord.gg',
                shards: 1,
                session_start_limit: {
                    total: 1000,
                    remaining: 1000,
                    reset_after: 14400000,
                    max_concurrency: 1,
                },
            });
        };
        gateway.on('error', () => {});
        super({ rest, gateway });

        this.questManager = null;
        this.websocketManager = gateway;
        this.token = token;
        // ── FIX: เก็บ proxyUrl ไว้ใช้ใน fetchQuests ──
        this.proxyUrl = proxyUrl;
    }

    connect() {
        return this.websocketManager.connect();
    }

    // ── FIX: waitForReady รอ READY event แทน fixed delay ──
    waitForReady(timeoutMs = 8000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                // timeout ไม่ใช่ error ร้ายแรง — ดำเนินต่อได้
                console.warn('[ClientQuest] Gateway ready timeout — continuing anyway');
                resolve();
            }, timeoutMs);

            this.websocketManager.once('ready', () => {
                clearTimeout(timer);
                resolve();
            });

            // ฟัง dispatch event READY ของ Gateway
            this.websocketManager.on('dispatch', (shard, payload) => {
                if (payload.t === 'READY') {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });
    }

    // ── FIX: ส่ง proxyUrl ไปด้วยเสมอ ──
    fetchQuests() {
        const QuestHandler = require('../H_RealHigh_QUEST');
        return QuestHandler.fetchQuests(this.token, this.proxyUrl).then((response) => {
            this.questManager = questManager_1.QuestManager.fromResponse(this, response);
            return this.questManager;
        });
    }
}

exports.ClientQuest = ClientQuest;