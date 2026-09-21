import http from "node:http";

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    ok: true,
    service: "Flexozy",
    message: "Root runtime is running"
  }));
});

server.listen(port, () => {
  console.log(`Flexozy running on port ${port}`);
});
