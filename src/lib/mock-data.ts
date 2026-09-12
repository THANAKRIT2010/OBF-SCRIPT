export type BotStatus = "running" | "stopped" | "starting" | "error";

export type BotServer = {
  id: string;
  name: string;
  description: string;
  status: BotStatus;
  runtime: "Node.js 20" | "Python 3.12" | "Java 21";
  plan: string;
  cpu: number;
  ram: number;
  ramLimit: number;
  disk: number;
  diskLimit: number;
  uptime: string;
  region: string;
  owner: string;
};

export const servers: BotServer[] = [
  {
    id: "flexo-music",
    name: "Flexozy Music",
    description: "บอทเพลง 24/7 รองรับ Spotify / YouTube",
    status: "running",
    runtime: "Node.js 20",
    plan: "Pro",
    cpu: 34,
    ram: 612,
    ramLimit: 2048,
    disk: 1240,
    diskLimit: 10240,
    uptime: "12d 4h 32m",
    region: "Singapore",
    owner: "thanakrit",
  },
  {
    id: "flexo-mod",
    name: "Flexozy Moderator",
    description: "ระบบดูแลห้อง ออโต้แบน และ log",
    status: "running",
    runtime: "Python 3.12",
    plan: "Starter",
    cpu: 12,
    ram: 188,
    ramLimit: 1024,
    disk: 420,
    diskLimit: 5120,
    uptime: "3d 18h 02m",
    region: "Singapore",
    owner: "thanakrit",
  },
  {
    id: "flexo-ticket",
    name: "Ticket Support",
    description: "ระบบตั๋วซัพพอร์ตพร้อมทรานสคริปต์",
    status: "stopped",
    runtime: "Node.js 20",
    plan: "Free",
    cpu: 0,
    ram: 0,
    ramLimit: 512,
    disk: 96,
    diskLimit: 1024,
    uptime: "—",
    region: "Frankfurt",
    owner: "thanakrit",
  },
  {
    id: "flexo-econ",
    name: "Economy Game",
    description: "บอทเกมเศรษฐกิจ พร้อมฐานข้อมูล",
    status: "error",
    runtime: "Java 21",
    plan: "Pro",
    cpu: 3,
    ram: 74,
    ramLimit: 2048,
    disk: 2210,
    diskLimit: 10240,
    uptime: "—",
    region: "Singapore",
    owner: "thanakrit",
  },
];

export const statusLabel: Record<BotStatus, string> = {
  running: "กำลังทำงาน",
  stopped: "หยุดทำงาน",
  starting: "กำลังเริ่ม",
  error: "ผิดพลาด",
};

export const consoleLines = [
  "[06:12:01] [INFO] Booting container flexozy-runtime v2.4.1",
  "[06:12:02] [INFO] Installing dependencies (discord.js@14.16.3)",
  "[06:12:09] [INFO] Dependencies installed in 7.1s",
  "[06:12:10] [INFO] Starting process: node index.js",
  "[06:12:12] [INFO] Logged in as Flexozy Music#4821",
  "[06:12:12] [INFO] Loaded 42 slash commands",
  "[06:12:13] [INFO] Connected to 1,284 guilds",
  "[06:14:55] [WARN] Voice gateway reconnect (guild 812…441)",
  "[06:15:01] [INFO] Voice gateway restored",
  "[06:20:30] [INFO] Heartbeat OK — 38ms",
];

export type FileNode = {
  name: string;
  type: "folder" | "file";
  size: string;
  modified: string;
};

export const files: FileNode[] = [
  { name: "commands", type: "folder", size: "—", modified: "2 ชม. ที่แล้ว" },
  { name: "events", type: "folder", size: "—", modified: "2 ชม. ที่แล้ว" },
  { name: "node_modules", type: "folder", size: "—", modified: "12 วันที่แล้ว" },
  { name: "index.js", type: "file", size: "4.2 KB", modified: "2 ชม. ที่แล้ว" },
  { name: "config.json", type: "file", size: "812 B", modified: "1 วันที่แล้ว" },
  { name: "package.json", type: "file", size: "1.1 KB", modified: "12 วันที่แล้ว" },
  { name: ".env", type: "file", size: "246 B", modified: "12 วันที่แล้ว" },
];

export const plans = [
  {
    name: "Free",
    price: "0",
    tagline: "ลองใช้งานก่อนตัดสินใจ",
    features: ["RAM 512 MB", "พื้นที่ 1 GB", "1 บอท", "ซัพพอร์ตชุมชน"],
    highlighted: false,
  },
  {
    name: "Starter",
    price: "89",
    tagline: "เหมาะกับบอทขนาดเล็ก",
    features: ["RAM 1 GB", "พื้นที่ 5 GB", "3 บอท", "แบ็กอัพรายวัน"],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "249",
    tagline: "สำหรับบอทที่มีผู้ใช้เยอะ",
    features: ["RAM 2 GB", "พื้นที่ 10 GB", "10 บอท", "ซัพพอร์ตด่วน 24/7"],
    highlighted: false,
  },
];

export const invoices = [
  { id: "INV-2026-0912", date: "1 ก.ย. 2026", plan: "Pro", amount: "฿249.00", status: "จ่ายแล้ว" },
  { id: "INV-2026-0811", date: "1 ส.ค. 2026", plan: "Pro", amount: "฿249.00", status: "จ่ายแล้ว" },
  { id: "INV-2026-0710", date: "1 ก.ค. 2026", plan: "Starter", amount: "฿89.00", status: "จ่ายแล้ว" },
  { id: "INV-2026-0609", date: "1 มิ.ย. 2026", plan: "Starter", amount: "฿89.00", status: "คืนเงิน" },
];

export const adminUsers = [
  { id: "1", name: "thanakrit", discord: "thanakrit#0001", role: "owner", servers: 4, plan: "Pro", joined: "12 ม.ค. 2026" },
  { id: "2", name: "mintcha", discord: "mintcha#7712", role: "admin", servers: 2, plan: "Starter", joined: "3 ก.พ. 2026" },
  { id: "3", name: "kiroo", discord: "kiroo#1188", role: "user", servers: 1, plan: "Free", joined: "18 มี.ค. 2026" },
  { id: "4", name: "peachy", discord: "peachy#5540", role: "user", servers: 3, plan: "Pro", joined: "2 พ.ค. 2026" },
  { id: "5", name: "nonzz", discord: "nonzz#9021", role: "user", servers: 0, plan: "Free", joined: "9 ก.ค. 2026" },
];

export const adminNodes = [
  { name: "sg-node-01", region: "Singapore", load: 64, servers: 128, status: "online" },
  { name: "sg-node-02", region: "Singapore", load: 41, servers: 96, status: "online" },
  { name: "fra-node-01", region: "Frankfurt", load: 88, servers: 152, status: "ใกล้เต็ม" },
];
