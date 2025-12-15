/* landing.js
   Landing Page Controller
   by Ardian Wahyu Saputra
*/

console.log('landing.js loaded');

/* =========================
   CONFIG
========================= */

const MAIN_AREA = '#quiz-area';
const LANDING_ID = 'landing-page';

// tombol navbar (WAJIB sesuai ID)
const NAV_BUTTONS = ['#btnKanji', '#btnHafalan', '#btnQuiz'];

/* =========================
   INIT
========================= */

document.addEventListener('DOMContentLoaded', () => {
  showLanding();
  bindNavbar();
});

/* =========================
   SHOW LANDING
========================= */

function showLanding() {
  const main = document.querySelector(MAIN_AREA);
  if (!main) return;

  // jika landing sudah pernah disembunyikan
  if (sessionStorage.getItem('landingHidden')) return;

  main.innerHTML = `
    <section id="${LANDING_ID}"
      class="d-flex flex-column justify-content-center align-items-center text-center"
      style="min-height:60vh;">

      <div style="font-size:56px;color:#0dcaf0;margin-bottom:12px;">
        文
      </div>

      <h2 class="fw-bold mb-2">
        Hafalan Kanji JFT / JLPT
      </h2>

      <p class="text-muted mb-3"
         style="max-width:560px;font-size:15px;">
        Ini adalah <strong>sistem pembelajaran kanji</strong> yang saya rancang
        dan bangun sendiri untuk membantu proses
        <strong>menghafal kanji JLPT / JFT (N5–N4)</strong>
        secara terstruktur, bertahap, dan praktis.
      </p>

      <p class="text-muted"
         style="max-width:560px;font-size:14px;">
        Aplikasi ini menggabungkan daftar kanji,
        mode hafalan, serta quiz interaktif
        untuk membantu pembelajar memahami dan
        mengingat kanji dengan lebih efektif.
      </p>

      <div class="mt-4 small text-muted">
        Sistem dibuat dan dikembangkan oleh<br>
        <strong>Ardian Wahyu Saputra</strong>
      </div>

    </section>
  `;
}

/* =========================
   HIDE LANDING
========================= */

function hideLanding() {
  const landing = document.getElementById(LANDING_ID);
  if (landing) {
    landing.remove();
    sessionStorage.setItem('landingHidden', 'true');
  }
}

/* =========================
   NAVBAR HANDLER
========================= */

function bindNavbar() {
  NAV_BUTTONS.forEach(selector => {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.addEventListener('click', hideLanding);
  });
}
