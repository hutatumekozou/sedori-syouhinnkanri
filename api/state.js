import { neon } from "@neondatabase/serverless";

const STATE_ID = "main";

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;

  const body = await readBody(request);
  if (!body) return {};
  return JSON.parse(body);
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS relist_manager_state (
      id TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(request, response) {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    sendJson(response, 500, { error: "DATABASE_URL is not configured." });
    return;
  }

  const sql = neon(databaseUrl);
  await ensureTable(sql);

  if (request.method === "GET") {
    const rows = await sql`
      SELECT value
      FROM relist_manager_state
      WHERE id = ${STATE_ID}
      LIMIT 1
    `;
    sendJson(response, 200, rows[0]?.value || { items: [], archivedItems: [] });
    return;
  }

  if (request.method === "POST" || request.method === "PUT") {
    const payload = await readJson(request);
    const state = {
      items: Array.isArray(payload.items) ? payload.items : [],
      archivedItems: Array.isArray(payload.archivedItems) ? payload.archivedItems : [],
    };

    await sql`
      INSERT INTO relist_manager_state (id, value, updated_at)
      VALUES (${STATE_ID}, ${JSON.stringify(state)}::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    sendJson(response, 200, { ok: true });
    return;
  }

  response.setHeader("Allow", "GET, POST, PUT");
  sendJson(response, 405, { error: "Method not allowed." });
}
