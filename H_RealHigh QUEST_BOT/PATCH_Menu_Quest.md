# วิธีแปะ QuestLog_CV2 เข้า Menu_Quest.js

## 1. เพิ่ม require ด้านบน (หลังบรรทัด require อื่นๆ)

```js
const { createQuestLog } = require('./QuestLog_CV2');
```

---

## 2. แก้บล็อก "ส่ง log ไปช่อง" (ประมาณบรรทัด 464–479)

### ❌ โค้ดเดิม
```js
let logMessage = null;
if (CHANNEL_QUEST_LOG) {
    try {
        const channel = BOT_STATUS.channels.cache.get(CHANNEL_QUEST_LOG)
            || await BOT_STATUS.channels.fetch(CHANNEL_QUEST_LOG).catch(() => null);
        if (channel) {
            logMessage = await channel.send({
                content: `\`\`⏳\`\` **กำลังดำเนินการทำเควส** <@${userID}>`,
                embeds: [startingEmbed]
            }).catch(() => null);
        }
    } catch (e) {}
}

await runQuests(interaction, session, logMessage, selectedNames, totalPrice, BANNER_LOG);
```

### ✅ โค้ดใหม่
```js
let questLog = null;
if (CHANNEL_QUEST_LOG) {
    try {
        const channel = BOT_STATUS.channels.cache.get(CHANNEL_QUEST_LOG)
            || await BOT_STATUS.channels.fetch(CHANNEL_QUEST_LOG).catch(() => null);
        if (channel) {
            questLog = await createQuestLog(channel, {
                user:        interaction.user,
                questNames:  selectedNames.split('\n').map(l => l.replace(/^•\s*/, '')),
                totalPrice,
                questCount:  session.selected.length,
                bannerUrl:   BANNER_LOG || null,
            });
        }
    } catch (e) { console.error('[QuestLog_CV2] init error:', e.message); }
}

await runQuests(interaction, session, questLog, selectedNames, totalPrice, BANNER_LOG);
```

---

## 3. แก้ฟังก์ชัน runQuests — signature + updateUI + finish

### signature เปลี่ยน logMessage → questLog
```js
// เดิม
async function runQuests(interaction, session, logMessage, selectedNames, totalPrice, bannerUrl) {

// ใหม่
async function runQuests(interaction, session, questLog, selectedNames, totalPrice, bannerUrl) {
```

### updateUI ใหม่ (แทนทั้งบล็อกเดิม)
```js
const updateUI = async (isFinished = false) => {
    // อัปเดต CV2 panel ใน log channel
    if (questLog) {
        if (isFinished) await questLog.finish(results);
        else            await questLog.update(results);
    }

    // ephemeral reply ในช่องของ user (ยังคงเป็น embed เดิมได้ หรือจะลบก็ได้)
    const hasFailed  = results.some(r => r.startsWith('❌'));
    const hasSkipped = results.some(r => r.startsWith('⚠️'));
    const content = isFinished
        ? (hasFailed  ? `\`\`❌\`\` **ทำเควสบางรายการล้มเหลว** <@${interaction.user.id}>`
         : hasSkipped ? `\`\`⚠️\`\` **เสร็จแล้ว (มีเควสที่ทำไม่ได้)** <@${interaction.user.id}>`
                      : `\`\`✅\`\` **ทำเควสสำเร็จทุกรายการ** <@${interaction.user.id}>`)
        : `\`\`⏳\`\` **กำลังดำเนินการทำเควสพร้อมกัน** <@${interaction.user.id}>`;

    await interaction.editReply({ content, embeds: [] }).catch(() => {});
};
```

### DM สรุปผล (ใน try block ท้าย runQuests)
```js
// DM สรุปผล
try {
    const hasFailed = results.some(r => r.startsWith('❌'));
    // ส่ง CV2 payload ไป DM (ถ้า questLog มี) — fallback เป็น text
    if (questLog) {
        const dmPayload = questLog.buildFinishPayload(results);
        await interaction.user.send(dmPayload).catch(() => {});
    } else {
        await interaction.user.send({
            content: hasFailed ? '``❌`` **ระบบทำเควสล้มเหลวบางรายการ**' : '``✅`` **ระบบทำเควสเสร็จสิ้นแล้ว**',
        }).catch(() => {});
    }
} catch (e) {}
```

---

## สรุป

| จุด | เปลี่ยนอะไร |
|-----|------------|
| require | เพิ่ม `createQuestLog` |
| logMessage | เปลี่ยนเป็น `questLog` (createQuestLog) |
| runQuests param | `logMessage` → `questLog` |
| updateUI | เรียก `questLog.update()` / `questLog.finish()` |
| DM | เรียก `questLog.buildFinishPayload()` |
| startingEmbed | ลบออกได้ (CV2 panel ทำแทนแล้ว) |
