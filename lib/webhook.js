import { signPayload } from "./auth.js";

export async function sendWebhook(url, secret, event) {
  const body = JSON.stringify(event);
  const signature = secret ? signPayload(body, secret) : "";

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.WEBHOOK_TIMEOUT_MS || 8000)
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Flexozy-API/1.0",
        ...(signature ? { "x-flexozy-signature": signature } : {})
      },
      body,
      signal: controller.signal
    });

    return {
      ok: response.ok,
      status: response.status
    };
  } finally {
    clearTimeout(timeout);
  }
}