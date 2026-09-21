export default function Home() {
  return (
    <main style={{fontFamily:"Arial",maxWidth:900,margin:"60px auto",padding:24}}>
      <h1>Flexozy</h1>
      <p>Flexozy Web + API Gateway</p>
      <h2>API Base URL</h2>
      <pre>https://api.flexozy.online/api/v1</pre>
      <h2>Bot example</h2>
      <pre>{`const API_URL = "https://api.flexozy.online/api/v1";
const API_KEY = "YOUR_API_KEY";

const response = await fetch(\`${"${API_URL}"}/quests\`, {
  headers: {
    Authorization: \`Bearer ${"${API_KEY}"}\`
  }
});

const data = await response.json();`}</pre>
    </main>
  );
}
