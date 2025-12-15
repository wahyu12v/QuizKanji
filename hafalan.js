console.log("hafalan.js loaded");

let KANJI_DATA = [];

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("daftarHafalanBtn");
  if (!btn) return;

  btn.addEventListener("click", openRangeModal);
});

/* ===============================
   LOAD JSON
================================ */
async function loadKanjiData() {
  if (KANJI_DATA.length > 0) return;

  const res = await fetch("n4n5.json");
  KANJI_DATA = await res.json();
}

/* ===============================
   MODAL RANGE
================================ */
async function openRangeModal() {
  await loadKanjiData();

  if (!document.getElementById("rangeModal")) {
    buildRangeModal();
  }

  const modal = new bootstrap.Modal(
    document.getElementById("rangeModal")
  );
  modal.show();
}

function buildRangeModal() {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.id = "rangeModal";
  modal.tabIndex = -1;

  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Pilih Range Hafalan</h5>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="rangeList" class="d-flex flex-wrap gap-3"></div>
        </div>

        <div class="modal-footer">
          <button id="rangeClear" class="btn btn-outline-secondary btn-sm">
            Bersihkan
          </button>
          <button id="rangeConfirm" class="btn btn-primary btn-sm">
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  buildRangeCheckboxes();

  document.getElementById("rangeClear").onclick = () => {
    document
      .querySelectorAll(".range-check")
      .forEach(c => (c.checked = false));
  };

  document.getElementById("rangeConfirm").onclick = () => {
    applySelectedRanges();
    bootstrap.Modal.getInstance(
      document.getElementById("rangeModal")
    ).hide();
  };
}

function hiraToRomaji(hira) {
  if (!hira) return "-";

  const map = {
    あ:"a",い:"i",う:"u",え:"e",お:"o",
    か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",
    さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",
    た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",
    な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",
    は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",
    ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",
    や:"ya",ゆ:"yu",よ:"yo",
    ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",
    わ:"wa",を:"o",ん:"n",
    が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",
    ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",
    だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",
    ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",
    ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",
    きゃ:"kya",きゅ:"kyu",きょ:"kyo",
    しゃ:"sha",しゅ:"shu",しょ:"sho",
    ちゃ:"cha",ちゅ:"chu",ちょ:"cho",
    にゃ:"nya",にゅ:"nyu",にょ:"nyo",
    みゃ:"mya",みゅ:"myu",みょ:"myo",
    りゃ:"rya",りゅ:"ryu",りょ:"ryo"
  };

  let out = "";
  for (let i = 0; i < hira.length; i++) {
    const two = hira.substring(i, i + 2);
    if (map[two]) {
      out += map[two];
      i++;
    } else {
      out += map[hira[i]] || "";
    }
  }
  return out;
}


function buildRangeCheckboxes() {
  const wrap = document.getElementById("rangeList");
  wrap.innerHTML = "";

  const per = 20;
  const total = KANJI_DATA.length;
  const groups = Math.ceil(total / per);

  for (let i = 0; i < groups; i++) {
    const start = i * per + 1;
    const end = Math.min((i + 1) * per, total);

    const label = document.createElement("label");
    label.className = "form-check";

    label.innerHTML = `
      <input type="checkbox" class="form-check-input range-check"
        value="${start}-${end}">
      <span class="form-check-label">${start}–${end}</span>
    `;

    wrap.appendChild(label);
  }
}

/* ===============================
   APPLY RANGE & RENDER TABLE
================================ */
function applySelectedRanges() {
  const checked = Array.from(
    document.querySelectorAll(".range-check:checked")
  );

  if (checked.length === 0) return;

  let selected = [];

  checked.forEach(cb => {
    const [s, e] = cb.value.split("-").map(Number);
    selected.push(
      ...KANJI_DATA.filter(
        k => k.No >= s && k.No <= e
      )
    );
  });

  selected.sort((a, b) => a.No - b.No);
  renderTable(selected);
}

function renderTable(data) {
  const area = document.getElementById("quiz-area");

  area.innerHTML = `
    <div class="container">
      <h4 class="mb-3">Daftar Hafalan Kanji</h4>

      <div class="row g-3" id="hafalanGrid"></div>
    </div>
  `;

  const grid = document.getElementById("hafalanGrid");

  data.forEach(k => {
    const col = document.createElement("div");

    // responsive columns:
    // col-12 = mobile
    // col-md-6 = tablet (2 kolom)
    // col-lg-4 = desktop (3 kolom)
    col.className = "col-12 col-md-6 col-lg-4";

    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body">

          <div class="text-muted small mb-1">
            No. ${k.No}
          </div>

          <div class="fs-3 fw-bold mb-1">
            ${k.Kanji}
          </div>

          <div class="text-muted mb-1">
            ${hiraToRomaji(k.Hiragana)}
          </div>

          <div>
            ${k.Arti}
          </div>

        </div>
      </div>
    `;

    grid.appendChild(col);
  });
}

