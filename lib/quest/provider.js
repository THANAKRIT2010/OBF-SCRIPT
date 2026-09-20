/*
  Safe provider adapter.
  This API does NOT accept Discord user tokens and does not automate user accounts.
  Connect this adapter to an authorized Quest/provider API that you control or are
  permitted to use by setting QUEST_PROVIDER_URL and QUEST_PROVIDER_KEY.
*/

export async function listQuests() {
  const base = process.env.QUEST_PROVIDER_URL;
  if (!base) {
    return {
      source: "demo",
      quests: [
        {
          id: "demo-quest-1",
          title: "Demo Quest",
          description: "Replace the provider adapter with your authorized Quest source.",
          status: "available"
        }
      ]
    };
  }

  const response = await fetch(`${base.replace(/\/$/, "")}/quests`, {
    headers: providerHeaders()
  });

  if (!response.ok) {
    throw new Error(`Provider returned ${response.status}`);
  }

  return await response.json();
}

export async function getQuest(id) {
  const base = process.env.QUEST_PROVIDER_URL;
  if (!base) {
    if (id !== "demo-quest-1") return null;
    return {
      id,
      title: "Demo Quest",
      description: "Demo data",
      status: "available"
    };
  }

  const response = await fetch(`${base.replace(/\/$/, "")}/quests/${encodeURIComponent(id)}`, {
    headers: providerHeaders()
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return await response.json();
}

function providerHeaders() {
  const headers = { accept: "application/json" };
  if (process.env.QUEST_PROVIDER_KEY) {
    headers.authorization = `Bearer ${process.env.QUEST_PROVIDER_KEY}`;
  }
  return headers;
}