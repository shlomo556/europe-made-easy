// All reviews live in one private Vercel Blob file, reviews.json.
// Writes are conditional on the file's ETag, so two reviews submitted at the
// same moment can't overwrite each other.
import { get, put } from "@vercel/blob";

const FILE = "reviews.json";

export async function loadReviews() {
  const res = await get(FILE, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return { reviews: [], etag: null };
  const reviews = await new Response(res.stream).json();
  return { reviews: Array.isArray(reviews) ? reviews : [], etag: res.blob.etag };
}

// change(reviews) returns the new array. Retries if someone else wrote first.
export async function updateReviews(change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { reviews, etag } = await loadReviews();
    const next = change(reviews);
    try {
      await put(FILE, JSON.stringify(next, null, 2), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        // No file yet: create it, but fail if another request just did.
        ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
      });
      return next;
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }
}

export const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
