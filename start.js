const { spawn } = require('child_process');

const colors = {
    reset:   '\x1b[0m',
    bright:  '\x1b[1m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m'
};

const CONFIG = {
    script:         'index.js',
    minUptimeMs:    10_000,
    baseDelayMs:    3_000,
    maxDelayMs:     60_000,
    backoffFactor:  2,
    forceKillMs:    10_000,
};

let restartCount   = 0;
let crashStreak    = 0;
let currentDelayMs = CONFIG.baseDelayMs;
let botProcess     = null;
let isShuttingDown = false;
let restartTimer   = null;
let startedAt      = null;

function log(message, color = colors.reset) {
    const timestamp = new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour12:   false
    });
    console.log(`${color}${colors.bright}[${timestamp}] ${message}${colors.reset}`);
}

function exitCodeDescription(code) {
    const map = {
        0:   'ปิดตัวปกติ (exit 0)',
        1:   'Error ทั่วไป',
        2:   'Misuse of shell command',
        126: 'Permission denied / ไม่สามารถ execute ได้',
        127: 'ไม่พบ command / ไฟล์',
        130: 'ถูกหยุดโดย Ctrl+C (SIGINT)',
        137: 'ถูก SIGKILL — อาจ OOM หรือถูก kill จากภายนอก',
        143: 'ถูก SIGTERM',
    };
    return map[code] ?? `exit code ${code}`;
}

function scheduleRestart(delayMs) {
    if (isShuttingDown) return;

    log(`🔄 รีสตาร์ทใน ${delayMs / 1000} วินาที... (streak: ${crashStreak})`, colors.yellow);

    restartTimer = setTimeout(() => {
        restartTimer = null;
        if (!isShuttingDown) {
            log('♻️  กำลังรีสตาร์ทบอท...', colors.green);
            startBot();
        }
    }, delayMs);
}

function startBot() {
    if (isShuttingDown) return;

    restartCount++;
    startedAt = Date.now();

    log(`🚀 เริ่มบอท (ครั้งที่ ${restartCount})...`, colors.cyan);

    botProcess = spawn('node', [CONFIG.script], {
        cwd:   __dirname,
        env:   process.env,
        stdio: 'inherit',
    });

    botProcess.on('close', (code, signal) => {
        botProcess = null;

        if (isShuttingDown) {
            log('⛔ ระบบกำลังปิดตัวลง — ไม่รีสตาร์ท', colors.red);
            return;
        }

        const uptimeMs  = Date.now() - startedAt;
        const uptimeSec = (uptimeMs / 1000).toFixed(1);
        const isCrashFast = uptimeMs < CONFIG.minUptimeMs;

        if (signal) {
            log(`❌ บอทหยุดด้วย signal: ${signal} (uptime: ${uptimeSec}s)`, colors.red);
        } else {
            log(`❌ บอทหยุดด้วย: ${exitCodeDescription(code)} (uptime: ${uptimeSec}s)`, colors.red);
        }

        if (code === 0) {
            crashStreak    = 0;
            currentDelayMs = CONFIG.baseDelayMs;
            scheduleRestart(currentDelayMs);
            return;
        }

        if (isCrashFast) {
            crashStreak++;
            currentDelayMs = Math.min(
                CONFIG.baseDelayMs * Math.pow(CONFIG.backoffFactor, crashStreak - 1),
                CONFIG.maxDelayMs
            );
            log(`⚠️  Crash เร็วต่อกัน ${crashStreak} ครั้ง — delay ${currentDelayMs / 1000}s`, colors.yellow);
        } else {
            crashStreak    = 0;
            currentDelayMs = CONFIG.baseDelayMs;
        }

        scheduleRestart(currentDelayMs);
    });

    botProcess.on('error', (err) => {
        botProcess = null;
        if (isShuttingDown) return;

        log(`💥 Spawn error: ${err.message}`, colors.red);

        crashStreak++;
        currentDelayMs = Math.min(
            CONFIG.baseDelayMs * Math.pow(CONFIG.backoffFactor, crashStreak - 1),
            CONFIG.maxDelayMs
        );
        scheduleRestart(currentDelayMs);
    });
}

function handleShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    log(`\n🛑 ได้รับ ${signal} — กำลังปิดระบบ...`, colors.magenta);

    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
        log('🚫 ยกเลิก restart timer ที่ค้างอยู่', colors.yellow);
    }

    if (!botProcess) {
        log('✅ ไม่มี process ค้างอยู่ — ปิดเรียบร้อย', colors.green);
        process.exit(0);
        return;
    }

    log('⏹️  ส่ง SIGTERM ไปยังบอท...', colors.yellow);
    botProcess.kill('SIGTERM');

    const forceKill = setTimeout(() => {
        if (botProcess) {
            log('⚠️  บอทไม่หยุด — บังคับ SIGKILL', colors.red);
            botProcess.kill('SIGKILL');
        }
        process.exit(0);
    }, CONFIG.forceKillMs);

    botProcess.on('close', () => {
        clearTimeout(forceKill);
        log('✅ บอทหยุดเรียบร้อย', colors.green);
        process.exit(0);
    });
}

process.on('SIGINT',  () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGHUP',  () => handleShutdown('SIGHUP'));

process.on('uncaughtException', (err) => {
    log(`💀 Uncaught Exception: ${err.message}`, colors.red);
    console.error(err.stack);
    log('⚠️  ระบบ wrapper ยังทำงานต่อ...', colors.yellow);
});

process.on('unhandledRejection', (reason) => {
    log(`💀 Unhandled Rejection: ${reason}`, colors.red);
    log('⚠️  ระบบ wrapper ยังทำงานต่อ...', colors.yellow);
});

log('═══════════════════════════════════════════', colors.cyan);
log('🤖 ระบบ Auto-Restart สำหรับ Discord Bot', colors.cyan);
log('📌 Version: 2.0.0', colors.cyan);
log(`⚙️  Base delay: ${CONFIG.baseDelayMs / 1000}s | Max delay: ${CONFIG.maxDelayMs / 1000}s`, colors.cyan);
log('═══════════════════════════════════════════', colors.cyan);

startBot();