const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");

async function listCategories(req, res) {
  const db = await readDB();
  const list = db.categories.slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  res.json(list);
}

async function addCategory(req, res) {
  const { title, subtitle, image, link, order } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: "missing_title" });

  const category = {
    id: nanoid(8),
    title: String(title).slice(0, 60),
    subtitle: subtitle ? String(subtitle).slice(0, 80) : "",
    image: image || "",
    link: link || "",
    order: Number.isFinite(Number(order)) ? Number(order) : 999,
  };
  await mutate((db) => db.categories.push(category));
  res.status(201).json(category);
}

async function updateCategory(req, res) {
  const { title, subtitle, image, link, order } = req.body;
  const result = await mutate((db) => {
    const c = db.categories.find((c) => c.id === req.params.id);
    if (!c) return null;
    if (title !== undefined) c.title = String(title).slice(0, 60);
    if (subtitle !== undefined) c.subtitle = String(subtitle).slice(0, 80);
    if (image !== undefined) c.image = image;
    if (link !== undefined) c.link = link;
    if (order !== undefined && Number.isFinite(Number(order))) c.order = Number(order);
    return c;
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json(result);
}

async function removeCategory(req, res) {
  await mutate((db) => {
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
  });
  res.status(204).end();
}

module.exports = { listCategories, addCategory, updateCategory, removeCategory };
