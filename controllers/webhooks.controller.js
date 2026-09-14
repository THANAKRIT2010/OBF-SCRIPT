// controllers/webhooks.controller.js — จัดการ Discord Webhook หลายอันพร้อมกัน (โครงสร้าง V2)
// แต่ละ webhook เลือกได้ว่าจะรับแจ้งเตือนหมวดไหนบ้าง หรือรับ "ทั้งหมด" (events: ['all'])
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const { NOTIFY_EVENTS, NOTIFY_EVENT_KEYS, notifyEvent } = require("../services/notifyService");
const axios = require("axios");

function cleanEvents(input) {
  if (!Array.isArray(input) || !input.length) return [];
  if (input.includes("all")) return ["all"];
  return input.filter((e) => NOTIFY_EVENT_KEYS.includes(e));
}

// GET /api/admin/webhooks — คืนรายการ webhook + รายการหมวดแจ้งเตือนทั้งหมดให้ frontend เอาไปสร้าง checkbox
async function listWebhooks(req, res) {
  const db = await readDB();
  res.json({ webhooks: db.webhooks, available_events: NOTIFY_EVENTS });
}

// POST /api/admin/webhooks — เพิ่ม webhook ใหม่ (ปุ่ม + ในหน้าแอดมิน)
async function addWebhook(req, res) {
  const { url, name, events } = req.body;
  if (!url || !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) {
    return res.status(400).json({ error: "invalid_webhook_url" });
  }
  const webhook = {
    id: nanoid(10),
    name: name ? String(name).slice(0, 60) : "Webhook",
    url: String(url).slice(0, 500),
    events: cleanEvents(events),
    created_at: Math.floor(Date.now() / 1000),
  };
  await mutate((db) => db.webhooks.push(webhook));
  res.status(201).json(webhook);
}

// PATCH /api/admin/webhooks/:id — แก้ชื่อ/หมวดที่รับแจ้งเตือน (ปุ่ม - ไม่ได้ลบ url แต่ใช้ปรับ events)
async function updateWebhook(req, res) {
  const { name, events, url } = req.body;
  const result = await mutate((db) => {
    const w = db.webhooks.find((w) => w.id === req.params.id);
    if (!w) return null;
    if (name !== undefined) w.name = String(name).slice(0, 60);
    if (events !== undefined) w.events = cleanEvents(events);
    if (url !== undefined && /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) w.url = url;
    return w;
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json(result);
}

// DELETE /api/admin/webhooks/:id — ปุ่ม - ลบ webhook ทิ้งทั้งอัน
async function removeWebhook(req, res) {
  await mutate((db) => {
    db.webhooks = db.webhooks.filter((w) => w.id !== req.params.id);
  });
  res.status(204).end();
}

// POST /api/admin/webhooks/:id/test — ส่งข้อความทดสอบไปยัง webhook นี้ทันที
async function testWebhook(req, res) {
  const db = await readDB();
  const w = db.webhooks.find((w) => w.id === req.params.id);
  if (!w) return res.status(404).json({ error: "not_found" });
  try {
    await axios.post(w.url, {
      embeds: [{ title: "🔔 ทดสอบการแจ้งเตือน", description: `Webhook "${w.name}" เชื่อมต่อสำเร็จแล้ว`, color: 0x22c55e, timestamp: new Date().toISOString() }],
    });
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: "webhook_unreachable" });
  }
}

module.exports = { listWebhooks, addWebhook, updateWebhook, removeWebhook, testWebhook };
