import "./globals.css";

const base = "https://api.flexozy.online/api/v1";

export default function Home() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="brand"><span>F</span> Flexozy</div>
        <div className="status"><i /> API Gateway Online</div>
      </nav>

      <section className="hero">
        <div className="pill">FLEXOZY API • V1</div>
        <h1>Simple API Gateway<br /><em>for your Discord bot.</em></h1>
        <p>
          ให้บอทของคุณเรียกผ่าน Flexozy API ตัวกลางเพียง URL เดียว
          โดยไม่ต้องเปิดเผย Provider URL หรือ Provider Key ในโค้ดบอท
        </p>
        <div className="actions">
          <a className="primary" href="#docs">ดู API Documentation</a>
          <a className="secondary" href={base} target="_blank" rel="noreferrer">เปิด API</a>
        </div>
      </section>

      <section className="card base-card">
        <div>
          <small>BASE URL</small>
          <code>{base}</code>
        </div>
        <button onClick={() => navigator.clipboard.writeText(base)}>Copy</button>
      </section>

      <section id="docs" className="docs">
        <div className="section-title">
          <small>DOCUMENTATION</small>
          <h2>เชื่อมต่อบอทของคุณ</h2>
        </div>

        <div className="grid">
          <article className="card">
            <div className="method get">GET</div>
            <h3>/health</h3>
            <p>ตรวจสอบสถานะ API Gateway</p>
            <pre>{`const API_URL = "${base}";

const res = await fetch(
  API_URL + "/health"
);

const data = await res.json();
console.log(data);`}</pre>
          </article>

          <article className="card">
            <div className="method get">GET</div>
            <h3>/quests</h3>
            <p>ดึงรายการ Quest ผ่าน Gateway</p>
            <pre>{`const API_URL = "${base}";
const API_KEY = "YOUR_FLEXOZY_API_KEY";

const res = await fetch(
  API_URL + "/quests",
  {
    headers: {
      "x-api-key": API_KEY
    }
  }
);

const data = await res.json();`}</pre>
          </article>

          <article className="card wide">
            <div className="method get">GET</div>
            <h3>/quests/:id</h3>
            <p>ดึงข้อมูล Quest รายตัว</p>
            <pre>{`const questId = "QUEST_ID";

const res = await fetch(
  API_URL + "/quests/" + questId,
  {
    headers: {
      "x-api-key": API_KEY
    }
  }
);

const data = await res.json();`}</pre>
          </article>
        </div>
      </section>

      <section className="flow card">
        <small>REQUEST FLOW</small>
        <div className="flow-row">
          <strong>Discord Bot</strong><b>→</b>
          <strong>Flexozy Gateway</strong><b>→</b>
          <strong>Quest Provider</strong><b>→</b>
          <strong>Bot</strong>
        </div>
      </section>

      <footer>© 2026 Flexozy • API Gateway</footer>
    </main>
  );
}
