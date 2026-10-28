// Review moderation for /admin. Protected by the ADMIN_PASSWORD environment variable.
// GET  /api/admin                         → every review, pending and published
// POST /api/admin { id, action }          → action: "publish" | "unpublish" | "delete"
import { createHash, timingSafeEqual } from "node:crypto";
import { loadReviews, updateReviews, json } from "./_store.js";

const digest = (s) => createHash("sha256").update(s).digest();

function denied(request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return json({ error: "ADMIN_PASSWORD is not set in Vercel" }, { status: 503 });
  const given = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!timingSafeEqual(digest(given), digest(password))) return json({ error: "Wrong password" }, { status: 401 });
  return null;
}

export async function GET(request) {
  const error = denied(request);
  if (error) return error;
  const { reviews } = await loadReviews();
  return json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  const error = denied(request);
  if (error) return error;
  const { id, action } = (await request.json().catch(() => null)) || {};
  if (!["publish", "unpublish", "delete"].includes(action)) return json({ error: "Unknown action" }, { status: 400 });

  const reviews = await updateReviews((all) =>
    action === "delete"
      ? all.filter((r) => r.id !== id)
      : all.map((r) => (r.id === id ? { ...r, status: action === "publish" ? "published" : "pending" } : r))
  );
  return json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), {
    headers: { "Cache-Control": "no-store" },
  });
}
