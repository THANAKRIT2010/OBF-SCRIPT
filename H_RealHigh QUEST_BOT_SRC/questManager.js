"use strict";
const QuestHandler = require("../H_RealHigh_QUEST");
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
exports.QuestManager = void 0;
const quest_1 = require("./quest");

class QuestManager {
    constructor(client, quests = []) {
        this.quests = new Map();
        this.client = client;
        quests.forEach((quest) => this.quests.set(quest.id, quest));
    }

    static fromResponse(client, response) {
        const rawQuests = Array.isArray(response) ? response : (response?.quests || []);
        return new QuestManager(client, rawQuests.map((quest) => quest_1.Quest.create(quest)));
    }

    [Symbol.iterator]() { return this.quests.values(); }
    get size() { return this.quests.size; }
    list() { return Array.from(this.quests.values()); }
    get(id) { return this.quests.get(id); }
    upsert(quest) { this.quests.set(quest.id, quest); }
    remove(id) { return this.quests.delete(id); }
    clear() { this.quests.clear(); }
    getExpired(date = new Date()) { return this.list().filter((q) => q.isExpired(date)); }
    getCompleted() { return this.list().filter((q) => q.isCompleted()); }
    getClaimable() { return this.list().filter((q) => q.isCompleted() && !q.hasClaimedRewards()); }
    hasQuest(id) { return this.quests.has(id); }

    // ── ตรวจว่า targeted_content มีข้อมูลจริง (ไม่ใช่แค่ null / {} / []) ──
    _hasRealTargetedContent(tc) {
        if (tc == null) return false;
        if (Array.isArray(tc)) return tc.length > 0;
        if (typeof tc === 'object') return Object.keys(tc).length > 0;
        return true;
    }

    filterQuestsValid() {
        return this.list().filter((q) => {
            if (q.id === '1412491570820812933') return false;
            if (q.isCompleted() || q.isExpired() || q.preview) return false;
            if (this._hasRealTargetedContent(q.targetedContent)) return false; // ต้องสั่งซื้อล่วงหน้า/รับตั๋ว
            const taskCfg = this._resolveTaskConfig(q.config);
            if (!taskCfg?.tasks) return false;
            const keys = Object.keys(taskCfg.tasks);
            // ❌ ไม่รองรับ ACTIVITY — heartbeat ไม่ work จริง
            if (keys.some(k => k.includes('ACTIVITY'))) return false;
            return keys.some(k => taskCfg.tasks[k]?.target > 0);
        });
    }

    timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ── ดึง proxyUrl จาก client ──
    get _proxy() {
        return this.client?.proxyUrl || null;
    }

    // ── Enroll พร้อม retry ──
    acceptQuest(questId) {
        return __awaiter(this, void 0, void 0, function* () {
            const MAX_ENROLL_RETRY = 3;
            for (let attempt = 1; attempt <= MAX_ENROLL_RETRY; attempt++) {
                try {
                    const res = yield QuestHandler.enroll(this.client.token, questId, this._proxy);
                    // API อาจ return error message
                    if (res?.message && res.code) {
                        throw new Error(`Discord API: ${res.message} (code: ${res.code})`);
                    }
                    const quest = this.get(questId);
                    if (quest) quest.updateUserStatus(res);
                    return quest;
                } catch (error) {
                    console.error(`[QUEST] Enroll attempt ${attempt}/${MAX_ENROLL_RETRY} error ${questId}:`, error.message);
                    if (attempt >= MAX_ENROLL_RETRY) throw error;
                    yield this.timeout(2000 * attempt);
                }
            }
        });
    }

    updateGatewayPresence(applicationId, applicationName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const activities = applicationId && applicationName ? [{
                    name: applicationName,
                    type: 0,
                    application_id: applicationId,
                    timestamps: { start: Date.now() }
                }] : [];
                yield this.client.websocketManager.send(0, {
                    op: 3,
                    d: { since: null, activities, status: 'online', afk: false }
                });
            } catch (e) {
                console.warn('[Gateway] presence update failed:', e.message);
            }
        });
    }

    // ── หา task_config รองรับทุก key format ──
    _resolveTaskConfig(rawConfig) {
        return rawConfig.task_config
            || rawConfig.task_config_v2
            || rawConfig.taskConfig
            || rawConfig.taskConfigV2
            || null;
    }

    // ── หา taskName ที่มี target ─ VIDEO ก่อนเสมอ ──
    _resolveTaskName(taskConfig) {
        if (!taskConfig?.tasks) return null;
        const keys = Object.keys(taskConfig.tasks);
        return keys.find(k => k.includes('VIDEO') && taskConfig.tasks[k]?.target)
            || keys.find(k => taskConfig.tasks[k]?.target)
            || null;
    }

    // ── classify quest type ──
    _getQuestType(taskName) {
        if (!taskName) return 'UNKNOWN';
        if (taskName.includes('VIDEO')) return 'VIDEO';
        if (taskName.includes('STREAM')) return 'STREAM';
        if (taskName.includes('ACTIVITY')) return 'ACTIVITY';
        return 'GAME';  // PLAY_ON_DESKTOP / default
    }

    doingQuest(quest) {
        return __awaiter(this, void 0, void 0, function* () {
            const questName = quest.config.messages?.quest_name || quest.config.application?.name || quest.id;

            // ── 1. Enroll ถ้ายังไม่ได้รับ ──
            if (!quest.isEnrolledQuest()) {
                console.log(`[QUEST] \x1b[33mกำลังลงทะเบียนเควส: ${questName}...\x1b[0m`);
                try {
                    yield this.acceptQuest(quest.id);
                } catch (enrollErr) {
                    throw new Error(`ลงทะเบียนเควสไม่สำเร็จ: ${enrollErr.message}`);
                }
                yield this.timeout(2000);
                if (!quest.isEnrolledQuest()) {
                    throw new Error('ลงทะเบียนเควสไม่สำเร็จ — ลองกดรับเองใน Discord ก่อนแล้วค่อยทำใหม่');
                }
                console.log(`[QUEST] \x1b[32m\`✅\` ลงทะเบียนเควสสำเร็จ: ${questName}\x1b[0m`);
            } else {
                console.log(`[QUEST] \x1b[36m\`✅\` ลงทะเบียนแล้ว: ${questName}\x1b[0m`);
            }

            const applicationId   = quest.config.application?.id;
            const applicationName = quest.config.application?.name;
            const rawConfig       = quest.config;
            const taskConfig      = this._resolveTaskConfig(rawConfig);

            if (!taskConfig?.tasks) {
                throw new Error(`ไม่พบ task_config ในเควสนี้ (อาจเป็นประเภทใหม่ที่ไม่รองรับ)`);
            }

            const taskName = this._resolveTaskName(taskConfig);
            if (!taskName) {
                throw new Error(`ไม่พบ task ที่รองรับ (พบ: ${Object.keys(taskConfig.tasks).join(', ')})`);
            }

            const secondsNeeded = taskConfig.tasks[taskName].target;
            const questType = this._getQuestType(taskName);
            console.log(`[QUEST] \x1b[35mประเภท: ${questType} | Task: ${taskName} | เป้าหมาย: ${secondsNeeded}s\x1b[0m`);

            // ── 2. VIDEO QUEST ──
            if (questType === 'VIDEO') {
                yield this._doVideoQuest(quest, questName, taskName, secondsNeeded);
                return;
            }

            // ── 3. GAME / STREAM / ACTIVITY QUEST (heartbeat) ──
            yield this._doHeartbeatQuest(quest, questName, taskName, secondsNeeded, applicationId, applicationName);
        });
    }

    // ── VIDEO QUEST: spoof video progress ──
    _doVideoQuest(quest, questName, taskName, secondsNeeded) {
        return __awaiter(this, void 0, void 0, function* () {
            let secondsDone = 0;
            if (quest.userStatus?.progress?.[taskName]) {
                secondsDone = quest.userStatus.progress[taskName].value ?? 0;
            }

            // enrolledAt สำหรับคำนวณ max timestamp ที่ Discord ยอมรับ
            const enrolledAt = new Date(quest.userStatus?.enrolled_at ?? new Date().toISOString()).getTime();
            const maxFuture  = 8;   // Discord ยอมให้ล่วงหน้าได้ ~10s
            let speed    = 7;       // จำนวน sec ต่อ request
            let interval = 1.0;     // delay ระหว่าง request (s)
            let completed = false;

            console.log(`[QUEST] \x1b[35mSpoof วิดีโอ: ${questName} (${Math.round(secondsDone)}/${secondsNeeded}s)\x1b[0m`);

            let retryCount = 0;
            const MAX_VIDEO_RETRY = 5;

            while (!completed && secondsDone < secondsNeeded) {
                const elapsed    = (Date.now() - enrolledAt) / 1000;
                const maxAllowed = elapsed + maxFuture;

                if (maxAllowed - secondsDone < speed) {
                    // รอให้ real-time ทัน
                    yield this.timeout(1000);
                    continue;
                }

                const jitter    = (Math.random() - 0.5) * 2;         // ±1s
                const nextTs    = Math.min(secondsNeeded, secondsDone + speed + jitter);

                try {
                    const res = yield QuestHandler.videoProgress(
                        this.client.token, quest.id, nextTs, this._proxy
                    );

                    // completed check — รองรับทุก format response
                    completed = !!(
                        res?.completed_at ||
                        res?.user_status?.completed_at ||
                        res?.progress?.[taskName]?.value >= secondsNeeded
                    );

                    if (res?.user_status) quest.updateUserStatus(res);

                    secondsDone = Math.min(secondsNeeded, secondsDone + speed);
                    speed       = Math.floor(Math.random() * 4) + 6;   // 6-9s
                    interval    = Math.random() * 0.5 + 0.8;           // 0.8-1.3s
                    retryCount  = 0;

                    const pct = Math.round((secondsDone / secondsNeeded) * 100);
                    process.stdout.write(`\r[VIDEO] ${questName}: ${Math.round(secondsDone)}/${secondsNeeded}s (${pct}%)  `);

                } catch (e) {
                    retryCount++;
                    console.error(`\n[QUEST] videoProgress error (${retryCount}/${MAX_VIDEO_RETRY}):`, e.message);
                    if (retryCount >= MAX_VIDEO_RETRY) throw new Error(`Video progress ล้มเหลวเกิน ${MAX_VIDEO_RETRY} ครั้ง`);
                    yield this.timeout(3000 * retryCount);
                    continue;
                }

                if (!completed && secondsDone < secondsNeeded) {
                    yield this.timeout(interval * 1000);
                }
            }

            // ส่ง timestamp สุดท้ายถ้ายังไม่ complete
            if (!completed) {
                try {
                    const res = yield QuestHandler.videoProgress(
                        this.client.token, quest.id, secondsNeeded, this._proxy
                    );
                    if (res?.user_status) quest.updateUserStatus(res);
                } catch (_) {}
            }

            process.stdout.write('\n');
            console.log(`[QUEST] \x1b[32m\`✅\` ทำเควสวิดีโอสำเร็จ: ${questName}\x1b[0m`);
        });
    }

    // ── GAME / STREAM QUEST: heartbeat loop (ACTIVITY ถูกกรองออกก่อนถึงตรงนี้แล้ว) ──
    _doHeartbeatQuest(quest, questName, taskName, secondsNeeded, applicationId, applicationName) {
        return __awaiter(this, void 0, void 0, function* () {
            // Safety net: ไม่ควรถึงตรงนี้ถ้าเป็น ACTIVITY แต่ป้องกันไว้
            if (taskName.includes('ACTIVITY')) {
                throw new Error(`เควสประเภท Activity ไม่รองรับ (${questName})`);
            }
            console.log(`[QUEST] \x1b[35mSpoof เกม [${taskName}]: ${questName} (เป้าหมาย ${Math.round(secondsNeeded/60)}min)\x1b[0m`);

            // ── ตั้ง Presence ครั้งแรก ──
            try {
                yield this.updateGatewayPresence(applicationId, applicationName);
                yield this.timeout(2000);
            } catch (e) {
                console.warn('[Gateway] Initial presence failed:', e.message);
            }

            let retryCount = 0;
            const MAX_RETRY = 5;
            let heartbeatCount = 0;

            while (!quest.isCompleted()) {
                const progress = quest.userStatus?.progress?.[taskName]?.value ?? 0;
                if (progress >= secondsNeeded) break;

                try {
                    const res = yield QuestHandler.heartbeat(
                        this.client.token, quest.id, applicationId, false, this._proxy
                    );

                    if (res?.message && res.code) {
                        // Discord error response
                        console.warn(`[QUEST] heartbeat warning: ${res.message} (code: ${res.code})`);
                        retryCount++;
                        if (retryCount >= MAX_RETRY) {
                            throw new Error(`Heartbeat Discord error ${MAX_RETRY} ครั้ง: ${res.message}`);
                        }
                        yield this.timeout(5000 * retryCount);
                        continue;
                    }

                    if (res) {
                        quest.updateUserStatus(res);
                        retryCount = 0;
                    }

                    heartbeatCount++;
                    const currentProgress = quest.userStatus?.progress?.[taskName]?.value ?? 0;
                    const pct = Math.round((currentProgress / secondsNeeded) * 100);
                    process.stdout.write(`\r[GAME] ${questName}: ${Math.round(currentProgress)}/${secondsNeeded}s (${pct}%) | HB#${heartbeatCount}  `);

                } catch (err) {
                    retryCount++;
                    console.error(`\n\x1b[31m[Heartbeat Error]\x1b[0m (${retryCount}/${MAX_RETRY}):`, err.message);
                    if (retryCount >= MAX_RETRY) throw new Error(`Heartbeat ล้มเหลว ${MAX_RETRY} ครั้ง: ${err.message}`);
                    yield this.timeout(5000 * retryCount);
                    continue;
                }

                // Discord heartbeat interval ~60s + jitter
                const jitter = Math.random() * 10 - 5;
                yield this.timeout((60 + jitter) * 1000);
            }

            process.stdout.write('\n');

            // ── Terminal heartbeat ──
            try {
                yield (QuestManager.presenceMutex = QuestManager.presenceMutex.then(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.updateGatewayPresence(applicationId, applicationName);
                    yield this.timeout(2000);
                    const res = yield QuestHandler.heartbeat(
                        this.client.token, quest.id, applicationId, true, this._proxy
                    );
                    quest.updateUserStatus(res);
                    yield this.timeout(1000);
                    yield this.updateGatewayPresence(null, null);
                })));
            } catch (e) {
                console.warn('[QUEST] Terminal heartbeat error:', e.message);
            }

            console.log(`[QUEST] \x1b[32m\`✅\` ทำเควสสำเร็จ: ${questName}\x1b[0m`);
        });
    }
}

exports.QuestManager = QuestManager;
QuestManager.presenceMutex = Promise.resolve();
