// utils/permissions.js — รายการสิทธิ์ย่อยที่มอบให้ทีมงานได้ทีละส่วน (ไม่ต้องเป็นแอดมินเต็มถึงจะจัดการได้)
// แอดมินเต็ม (ADMIN_DISCORD_IDS) จะข้ามการเช็คนี้เสมอ มีสิทธิ์ทุกส่วนโดยอัตโนมัติ
const PERMISSIONS = [
  { key: "scripts", label: "จัดการสคริปต์", desc: "ลบ/แก้ไขสคริปต์ของคนอื่นได้" },
  { key: "roblox", label: "คลังเสียง Roblox ID", desc: "เพิ่ม/ลบเพลงในคลัง" },
  { key: "partners", label: "พาร์ทเนอร์", desc: "เพิ่ม/แก้ไข/ลบพาร์ทเนอร์" },
  { key: "vault", label: "ดูลิงก์ฝากสคริปต์ทั้งหมด", desc: "ดูลิงก์ Vault ของทุกคนในระบบ รวมถึงเปิดดูโค้ดที่ล็อกรหัสได้" },
  { key: "settings", label: "ตั้งค่าเว็บไซต์", desc: "แก้ไขตั้งค่าเว็บและป็อปอัพต้อนรับ" },
  { key: "members", label: "ดูรายชื่อสมาชิก", desc: "ดูสถิติสมาชิกและเวลาเข้าเว็บล่าสุด" },
  { key: "webhooks", label: "ตั้งค่าแจ้งเตือน Discord", desc: "เพิ่ม/ลบ Webhook และเลือกหมวดที่จะแจ้งเตือน" },
  { key: "moderation", label: "รายงาน/แบนผู้ใช้", desc: "จัดการรายงานที่มีคนแจ้งเข้ามา และแบนผู้ใช้" },
  { key: "categories", label: "หมวดหมู่หน้าแรก", desc: "เพิ่ม/แก้ไข/ลบการ์ดหมวดหมู่บนหน้าแรก" },
  { key: "apikeys", label: "อนุมัติ API Key เช็คสลิป", desc: "อนุมัติ/ปฏิเสธคำขอ API key และตั้งโควตาการใช้งาน" },
];
const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

module.exports = { PERMISSIONS, PERMISSION_KEYS };
