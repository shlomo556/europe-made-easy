// Form submissions are emailed via FormSubmit (https://formsubmit.co).
// The first submission sends a one-time activation email to this address.
const FORM_ENDPOINT = "https://formsubmit.co/ajax/info@EuropeMadeEasy.org";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Header: transparent over the hero photo, solid after scrolling
const bar = document.querySelector(".bar");
// Floating WhatsApp button waits until the banner (which has its own buttons) is scrolled past
const waFloat = document.querySelector(".wa-float");
const banner = document.querySelector(".hero, .page-hero");
const onScroll = () => {
  bar.classList.toggle("solid", window.scrollY > 40);
  if (waFloat) waFloat.classList.toggle("show", !banner || window.scrollY > banner.offsetHeight * 0.6);
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// Mobile menu
const burger = document.querySelector(".burger");
const nav = document.querySelector(".nav");
if (burger && nav) {
  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    bar.classList.toggle("menu", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
}

// Footer year
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Home hero: rotate city photos, tabs pick a city
const hero = document.querySelector(".hero");
if (hero) {
  const slides = [...hero.querySelectorAll(".hero-media img")];
  const tabs = [...hero.querySelectorAll(".hero-tab")];
  let current = 0;
  let timer;

  // Slides after the first load on demand (data-srcset / data-src)
  const load = (img) => {
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      img.removeAttribute("data-srcset");
    }
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    }
  };

  const show = (i) => {
    current = (i + slides.length) % slides.length;
    const img = slides[current];
    load(img);
    slides.forEach((s, j) => s.classList.toggle("show", j === current));
    tabs.forEach((t, j) => {
      t.setAttribute("aria-selected", String(j === current));
      // restart the progress bar animation
      t.style.animation = "none";
      void t.offsetWidth;
      t.style.animation = "";
    });
    // warm up the next photo
    load(slides[(current + 1) % slides.length]);
  };
  const start = () => {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => show(current + 1), 6000);
  };

  tabs.forEach((t, i) =>
    t.addEventListener("click", () => {
      show(i);
      start();
    })
  );
  if (reduceMotion) hero.classList.add("paused");
  show(0);
  start();
}

// Home film: one tap plays it with sound; native controls take over after that
const film = document.querySelector(".film");
if (film) {
  const video = film.querySelector("video");
  film.querySelector(".film-play").addEventListener("click", () => {
    video.controls = true;
    video.play();
  });
  video.addEventListener("play", () => film.classList.add("playing"));
}

// Preselect destination on the contact form (contact.html?city=rome)
const destination = document.querySelector("#destination");
if (destination) {
  const city = new URLSearchParams(location.search).get("city");
  const match = city && [...destination.options].find((o) => o.value.toLowerCase() === city.toLowerCase());
  if (match) destination.value = match.value;
}

// Review dialog
const sheet = document.querySelector("#reviewSheet");
if (sheet) {
  const sheetForm = sheet.querySelector("form");
  const sheetDone = sheet.querySelector(".sheet-done");
  document.querySelectorAll("[data-open-review]").forEach((b) =>
    b.addEventListener("click", () => {
      // Back to a fresh form if the last review was already sent
      sheetForm.hidden = false;
      sheetDone.hidden = true;
      sheet.showModal();
    })
  );
  sheet.querySelectorAll(".x, [data-close-sheet]").forEach((b) => b.addEventListener("click", () => sheet.close()));
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) sheet.close();
  });
}

// Forms
document.querySelectorAll("form[data-ajax]").forEach((form) => {
  const status = form.querySelector(".form-status");
  const button = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return;

    button.disabled = true;
    const label = button.innerHTML;
    button.textContent = "Sending…";
    status.className = "form-status";
    status.textContent = "";

    try {
      const send = (url, body) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        });
      const res = await send(form.dataset.endpoint || FORM_ENDPOINT, data);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === "false" || json.success === false) throw new Error(json.message || "Send failed");
      // Saved to our own API (reviews): also email a heads-up with the approval link
      if (form.dataset.endpoint) send(FORM_ENDPOINT, { ...data, approve_at: `${location.origin}/admin` }).catch(() => {});
      form.reset();
      const done = form.parentElement.querySelector(".sheet-done");
      if (done) {
        // Review dialog: swap the form for a thank-you screen
        form.hidden = true;
        done.hidden = false;
        done.querySelector("button").focus();
      } else {
        status.textContent = form.dataset.success;
        status.className = "form-status ok";
      }
    } catch (err) {
      status.innerHTML =
        'Sorry, something went wrong. Please email us at <a href="mailto:info@EuropeMadeEasy.org">info@EuropeMadeEasy.org</a> or message us on <a href="https://wa.me/32456741479" target="_blank" rel="noopener">WhatsApp</a>.';
      status.className = "form-status err";
    } finally {
      button.disabled = false;
      button.innerHTML = label;
    }
  });
});

// Published reviews (approve submitted reviews at /admin)
const reviewList = document.querySelector("#review-list");
if (reviewList) {
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const stars = (n) => `<span class="stars" aria-label="${n} out of 5 stars">${"★".repeat(n)}<span class="off">${"★".repeat(5 - n)}</span></span>`;
  const month = (iso) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const person = (r, detail = r.trip) => `<span class="avatar" aria-hidden="true">${escape(r.name.trim()[0] || "?").toUpperCase()}</span>
    <div><strong>${escape(r.name)}</strong>${detail ? escape(detail) : ""}</div>`;

  fetch("/api/reviews")
    .then((res) => (res.ok ? res.json() : []))
    .then((reviews) => {
      if (!Array.isArray(reviews) || reviews.length === 0) return;
      reviews.forEach((r) => (r.rating = Math.max(1, Math.min(5, Number(r.rating) || 5))));

      const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const summary = document.querySelector("#rating-summary");
      summary.innerHTML = `<b>${average.toFixed(1)}</b>${stars(Math.round(average))}<span>from ${reviews.length} review${reviews.length === 1 ? "" : "s"}</span>`;
      summary.hidden = false;

      // Feature the newest five-star review with something to say; the rest go in the grid
      const featured = reviews.find((r) => r.rating === 5 && r.review.length > 80) || reviews[0];
      const rest = reviews.filter((r) => r !== featured);
      reviewList.innerHTML =
        `<figure class="review-feature">
          <span class="quote-mark" aria-hidden="true">“</span>
          <blockquote>
            ${stars(featured.rating)}
            <p>${escape(featured.review)}</p>
            <footer>${person(featured, featured.trip || month(featured.createdAt))}</footer>
          </blockquote>
        </figure>` +
        (rest.length
          ? `<div class="review-grid">${rest
              .map(
                (r) => `<article class="review">
                  <div class="review-top">${stars(r.rating)}<time datetime="${escape(r.createdAt)}">${month(r.createdAt)}</time></div>
                  <p>${escape(r.review)}</p>
                  <footer>${person(r)}</footer>
                </article>`
              )
              .join("")}</div>`
          : "");
    })
    .catch(() => {});
}
