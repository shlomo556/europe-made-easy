# Europe Made Easy

Static website for Europe Made Easy — kosher-friendly sightseeing in Rome, Venice, Amsterdam, Paris and London. Plain HTML/CSS/JS, deployed on Vercel (no build step). Reviews are stored in Vercel Blob through two small Vercel Functions in `api/`.

## Pages
- `index.html` — Home
- `about.html` — About Us
- `cities.html` — Cities (Rome, Venice, Amsterdam, Paris, London)
- `reviews.html` — Reviews + review submission form
- `contact.html` — Contact details + trip enquiry form
- `admin.html` — Password-protected page for approving reviews (at `/admin`)

## Contact form
The contact form emails **info@EuropeMadeEasy.org** using [FormSubmit](https://formsubmit.co) (free, no account).
The **first** submission triggers a one-time activation email to that inbox — click the link in it, and all later submissions arrive as normal emails.

## Reviews
Submitted reviews are saved in Vercel Blob as **pending** and an email heads-up is sent (via FormSubmit). They appear on the site only after you publish them at **/admin**, where you can also unpublish or delete them.

One-time setup in the Vercel dashboard:
1. **Storage → Create → Blob**, choose **Private** access, and connect it to this project. This adds `BLOB_READ_WRITE_TOKEN` automatically.
2. **Settings → Environment Variables**: add `ADMIN_PASSWORD` (the password for `/admin`).
3. Redeploy.

All reviews live in a single `reviews.json` file in the Blob store. Newly published reviews show on the site within about a minute.

## Photos
City photos from [Unsplash](https://unsplash.com) (free to use under the Unsplash License).
