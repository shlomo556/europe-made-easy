// GET  /api/reviews  → published reviews, newest first
// POST /api/reviews  → submit a review; it waits as "pending" until approved at /admin
import { randomUUID } from "node:crypto";
import { loadReviews, updateReviews, json } from "./_store.js";

const MAX_PENDING = 200;

const clean = (value, max) =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);

export async function GET() {
  try {
    const { reviews } = await loadReviews();
    const published = reviews
      .filter((r) => r.status === "published")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ name, rating, trip, review, createdAt }) => ({ name, rating, trip, review, createdAt }));
    // Cached at Vercel's edge for a minute; newly approved reviews show up shortly after.
    return json(published, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } });
  } catch (err) {
    console.error(err);
    return json({ error: "Could not load reviews" }, { status: 500 });
  }
}

export async function POST(request) {
  const data = await request.json().catch(() => null);
  if (!data) return json({ error: "Invalid request" }, { status: 400 });
  // Honeypot field filled in: almost certainly a bot. Pretend it worked.
  if (data._honey) return json({ ok: true });

  const review = {
    id: randomUUID(),
    name: clean(data.name, 60),
    rating: Math.round(Number(data.rating)),
    trip: clean(data.trip, 80),
    review: clean(data.review, 2000),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  if (!review.name || !review.review || !(review.rating >= 1 && review.rating <= 5)) {
    return json({ error: "Please fill in your name, a rating and your review" }, { status: 400 });
  }

  try {
    let full = false;
    await updateReviews((reviews) => {
      full = reviews.filter((r) => r.status === "pending").length >= MAX_PENDING;
      return full ? reviews : [...reviews, review];
    });
    if (full) return json({ error: "Too many reviews are waiting for approval" }, { status: 503 });
    return json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return json({ error: "Could not save your review" }, { status: 500 });
  }
}
