/* script.js — final versi lengkap
   Fitur:
   - Memuat questions.json (Kanji, Arti, Hiragana, No)
   - Quiz pilihan ganda: Sequential / Random / JLPT version
   - Tes Hafalan: isian romaji (normalisasi + variasi + typo ringan)
   - Penyimpanan progress per-batch (quiz) dan per-batch mem (hafalan)
   - Tombol hapus progress (juga menghapus mem progress)
   - Tampilan & interaksi responsif
*/

const BATCH_SIZE = 20;
let QUESTIONS = [];
let state = null;

const kanjiKey = "Kanji";
const meaningKey = "Arti";
const hiraganaKey = "Hiragana";
const numberKey = "No";

/// DOM refs
const startBtn = document.getElementById('startBtn');
const memorizeBtn = document.getElementById('memorizeBtn');
const quizModalEl = document.getElementById('quizModal');
const quizModal = new bootstrap.Modal(quizModalEl);
const seqSelect = document.getElementById('seqSelect');
const seqSelectWrap = document.getElementById('seqSelectWrap');
const jlptSelectWrap = document.getElementById('jlptSelectWrap');
const jlptSelect = document.getElementById('jlptSelect');
const quizForm = document.getElementById('quizForm');
const quizArea = document.getElementById('quiz-area');
const totalCountEl = document.getElementById('totalCount');
const overallProgressBar = document.getElementById('overall-progress');
const detectedEl = document.getElementById('detected');
const confettiWrap = document.getElementById('confetti-wrapper');
const clearBtn = document.getElementById('clearProgress');
const clearMsg = document.getElementById('clearMsg');
const examTimerEl = document.getElementById('exam-timer');

const memModalEl = document.getElementById('memModal');
const memModal = new bootstrap.Modal(memModalEl);
const memForm = document.getElementById('memForm');
const memSeqSelect = document.getElementById('memSeqSelect');

startBtn.onclick = ()=> openModal();
memorizeBtn.onclick = ()=> openMemModal();

/* ------------------ LOAD questions.json ------------------ */
async function load(){
  try{
    QUESTIONS = await fetch('questions.json').then(r=>{
      if(!r.ok) throw new Error('404');
      return r.json();
    });
  }catch(e){
    QUESTIONS = [];
    console.warn('Tidak dapat memuat questions.json — pastikan file ada di folder yang sama.', e);
  }
  document.getElementById('title').innerText = `Quiz — ${QUESTIONS.length} item`;
  totalCountEl.innerText = QUESTIONS.length;
  detectedEl.innerText = `Fields — "${kanjiKey}", "${meaningKey}", "${hiraganaKey}"`;
  populateSeqSelect();
  populateJlptSelect();
  populateMemSeqSelect();
  attachClearHandler();
  updateOverallProgress();
}

/* ------------------ modal helpers ------------------ */
function openModal(){
  const el = document.querySelector('#typeSeq');
  if(el) el.checked = true;
  seqSelectWrap.classList.remove('d-none');
  jlptSelectWrap.classList.add('d-none');
  quizModal.show();
}
function openMemModal(){
  const el = document.querySelector('#memSeq');
  if(el) el.checked = true;
  document.getElementById('memSeqWrap').classList.remove('d-none');
  memModal.show();
}

/* fill selects */
function populateSeqSelect(){
  if(!seqSelect) return;
  seqSelect.innerHTML = '';
  const total = Math.ceil(Math.max(1, QUESTIONS.length) / BATCH_SIZE);
  for(let i=0;i<total;i++){
    const start = i*BATCH_SIZE + 1;
    const end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `Quiz ${i+1} — No ${start}–${end}`;
    seqSelect.appendChild(opt);
  }
}
function populateJlptSelect(){
  if(!jlptSelect) return;
  jlptSelect.innerHTML = '';
  const total = Math.ceil(Math.max(1, QUESTIONS.length) / BATCH_SIZE);
  for(let i=0;i<total;i++){
    const start = i*BATCH_SIZE + 1;
    const end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `Tes JLPT ${i+1} — No ${start}–${end}`;
    jlptSelect.appendChild(opt);
  }
}
function populateMemSeqSelect(){
  if(!memSeqSelect) return;
  memSeqSelect.innerHTML = '';
  const total = Math.ceil(Math.max(1, QUESTIONS.length) / BATCH_SIZE);
  for(let i=0;i<total;i++){
    const start = i*BATCH_SIZE + 1;
    const end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `Set ${i+1} — No ${start}–${end}`;
    memSeqSelect.appendChild(opt);
  }
}

/* radio toggle for quiz modal */
document.querySelectorAll('input[name="type"]').forEach(r=>{
  r.addEventListener('change', (ev)=>{
    const v = ev.target.value;
    if(v === 'seq'){ seqSelectWrap.classList.remove('d-none'); jlptSelectWrap.classList.add('d-none'); }
    else if(v === 'rand'){ seqSelectWrap.classList.add('d-none'); jlptSelectWrap.classList.add('d-none'); }
    else if(v === 'jlpt'){ seqSelectWrap.classList.remove('d-none'); jlptSelectWrap.classList.remove('d-none'); seqSelectWrap.classList.add('d-none'); }
  });
});

/* quiz modal submit */
quizForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const type = document.querySelector('input[name="type"]:checked').value;
  quizModal.hide();

  if(type === 'seq'){
    const idx = Number(seqSelect.value);
    startBatch(idx, 'default');
  } else if(type === 'rand'){
    startRandom('default');
  } else if(type === 'jlpt'){
    const idx = (jlptSelect && jlptSelect.value) ? Number(jlptSelect.value) : Number(seqSelect.value || 0);
    startBatch(idx, 'jlpt');
  }
});

/* mem modal submit */
memForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const type = document.querySelector('input[name="memType"]:checked').value;
  memModal.hide();
  if(type === 'seq'){
    const idx = Number(memSeqSelect.value);
    startMemBatch(idx);
  } else {
    startMemRandom();
  }
});

/* ------------------ Regular quiz starters ------------------ */
function startBatch(batchIndex, mode='default'){
  const start = batchIndex * BATCH_SIZE;
  const batch = QUESTIONS.slice(start, start+BATCH_SIZE);
  prepareAndStart(batch, batchIndex, mode, { loadSaved: true });
}
function startRandom(mode='default'){
  const total = QUESTIONS.length;
  if(total <= BATCH_SIZE){
    prepareAndStart(QUESTIONS.slice(), 0, mode, { loadSaved: true });
    return;
  }
  const start = Math.floor(Math.random() * (total - BATCH_SIZE + 1));
  const batch = QUESTIONS.slice(start, start+BATCH_SIZE);
  prepareAndStart(batch, -1, mode, { loadSaved: true });
}

/* prepare for regular MCQ */
function prepareAndStart(batch, batchIndex, mode='default', opts = { loadSaved: true }){
  // build pool for distractors
  const poolObjects = QUESTIONS.map(r=>({
    meaning: String(r[meaningKey]||'').trim(),
    hiragana: String(r[hiraganaKey]||'').trim()
  })).filter(o=>o.meaning);

  const uniquePool = [];
  const seen = new Set();
  for(const o of poolObjects){
    const k = o.meaning + '||' + o.hiragana;
    if(!seen.has(k)){ seen.add(k); uniquePool.push(o); }
  }

  const choicesPerQ = batch.map((q, idx) => {
    const correct = { meaning: String(q[meaningKey]||'').trim(), hiragana: String(q[hiraganaKey]||'').trim() };

    const questionKanjiRaw = String(q[kanjiKey] || '');
    const questionHiraSubstrings = extractHiraganaSubstrings(questionKanjiRaw);
    if(correct.hiragana){
      const parts = splitIntoHiraganaChunks(correct.hiragana);
      for(const p of parts) if(p) questionHiraSubstrings.push(p);
    }

    let distractors = uniquePool.filter(o => {
      if(o.meaning === correct.meaning && o.hiragana === correct.hiragana) return false;
      if(!o.hiragana) return true;
      for(const sub of questionHiraSubstrings){
        if(!sub) continue;
        if(o.hiragana.includes(sub)) return false;
      }
      return true;
    });

    shuffleArray(distractors);
    let chosen = distractors.slice(0,3);

    if(chosen.length < 3){
      const fallback = uniquePool.filter(o => !(o.meaning === correct.meaning && o.hiragana === correct.hiragana));
      shuffleArray(fallback);
      for(const f of fallback){
        if(chosen.find(x=>x.meaning===f.meaning && x.hiragana===f.hiragana)) continue;
        chosen.push(f);
        if(chosen.length >= 3) break;
      }
    }

    const arr = [correct, ...chosen.slice(0,3)];
    shuffleArray(arr);
    return arr;
  });

  state = {
    batchIndex,
    batch,
    current: 0,
    mode,
    answers: Array(batch.length).fill(null),
    choicesPerQ,
    examMode: false,
    examTimer: null,
    examEnd: null
  };

  if(opts && opts.loadSaved && batchIndex >= 0){
    const saved = loadProgress(batchIndex);
    if(saved && Array.isArray(saved.answers)){
      state.answers = saved.answers.slice(0, state.batch.length);
      state.current = saved.current || 0;
    }
  }

  renderQuestion(true);
}

/* ------------------ Hiragana helpers ------------------ */
function extractHiraganaSubstrings(s){
  if(!s) return [];
  const runs = s.match(/[\u3040-\u309F]+/g) || [];
  return runs.map(r=>r.trim()).filter(r=>r.length>0);
}
function splitIntoHiraganaChunks(h){
  if(!h) return [];
  const cleaned = String(h).trim();
  const parts = cleaned.split(/[\s、。·・\/\-]+/).filter(p=>p);
  if(parts.length > 1) return parts;
  const out = [];
  let i = 0;
  while(i < cleaned.length){
    const remain = cleaned.length - i;
    const chunkLen = remain > 4 ? 3 : remain;
    out.push(cleaned.substr(i, chunkLen));
    i += chunkLen;
  }
  return out;
}

/* ------------------ Render dispatcher ------------------ */
function renderQuestion(withAnim=false){
  if(!state) return;
  if(state.mode === 'jlpt') return renderQuestionJLPT(withAnim);
  if(state.mode === 'memorize') return renderMemQuestion(withAnim);
  return renderQuestionDefault(withAnim);
}

/* ------------------ Default render (MCQ) ------------------ */
function renderQuestionDefault(withAnim=false){
  quizArea.innerHTML = '';
  const q = state.batch[state.current];
  const qNo = state.current + 1;
  const kanji = String(q[kanjiKey] || '').trim() || '—';
  const choices = state.choicesPerQ[state.current];

  const c = document.createElement('div'); c.className = 'card card-kanji mb-3';
  const b = document.createElement('div'); b.className = 'card-body';

  const header = document.createElement('div'); header.className = 'd-flex justify-content-between align-items-center mb-2';
  header.innerHTML = `<div><h5 class="mb-0">Soal ${qNo} / ${state.batch.length}</h5><div class="small text-muted">${state.batchIndex === -1 ? 'Quiz Random' : 'Quiz '+(state.batchIndex+1)}</div></div>
                      <div class="text-end"><div class="small text-muted">No: ${q[numberKey] || '-'}</div><div class="small text-muted">${answeredCount()}/${state.batch.length} terjawab</div></div>`;

  const kanjiDiv = document.createElement('div'); kanjiDiv.className = 'kanji-big'; kanjiDiv.innerText = kanji;

  const grid = document.createElement('div'); grid.className = 'row g-2';
  choices.forEach((o, idx)=>{
    const col = document.createElement('div'); col.className = 'col-12 col-md-6';
    const cardBtn = document.createElement('div'); cardBtn.className = 'choice-card';
    cardBtn.setAttribute('role','button');
    cardBtn.tabIndex = 0;
    cardBtn.innerHTML = `<div class="fw-semibold">${escapeHtml(o.meaning)}</div>`;
    cardBtn.onclick = ()=>{
      state.answers[state.current] = idx;
      if(!state.examMode) saveProgressIfSequential();
      renderQuestion();
    };
    cardBtn.onkeypress = (e)=>{ if(e.key === 'Enter'){ cardBtn.click(); } };
    if(state.answers[state.current] === idx) cardBtn.classList.add('choice-selected');
    col.appendChild(cardBtn);
    grid.appendChild(col);
  });

  const controls = document.createElement('div'); controls.className = 'mt-3 d-flex gap-2 flex-wrap';
  const prev = createBtn('Sebelumnya', 'btn btn-outline-dark', ()=>{ if(state.current>0){ state.current--; if(!state.examMode) saveProgressIfSequential(); renderQuestion(); } });
  const next = createBtn('Berikutnya', 'btn btn-outline-dark', ()=>{ if(state.current < state.batch.length-1){ state.current++; if(!state.examMode) saveProgressIfSequential(); renderQuestion(); } });
  const submit = createBtn('Kirim', 'btn btn-primary ms-auto', ()=> evaluate());
  controls.appendChild(prev); controls.appendChild(next); controls.appendChild(submit);

  b.appendChild(header);
  b.appendChild(kanjiDiv);
  b.appendChild(grid);
  b.appendChild(controls);
  c.appendChild(b);
  quizArea.appendChild(c);

  const hint = document.createElement('div'); hint.className = 'small text-muted mt-2'; hint.innerText = 'Pilihan hanya menampilkan arti — hiragana akan ditampilkan di pembahasan setelah submit.';
  quizArea.appendChild(hint);

  if(withAnim){
    c.style.opacity = 0; c.style.transform = 'translateY(6px)';
    requestAnimationFrame(()=>{ c.style.transition='all .28s ease'; c.style.opacity=1; c.style.transform='translateY(0)'; });
  }
}

/* ------------------ JLPT render ------------------ */
function renderQuestionJLPT(withAnim=false){
  quizArea.innerHTML = '';
  const q = state.batch[state.current];
  const qNo = state.current + 1;
  const kanji = String(q[kanjiKey] || '').trim() || '—';
  const choices = state.choicesPerQ[state.current];

  const templates = [
    "{KANJI} を 書きました。",
    "昨日、{KANJI} を 見ました。",
    "私は {KANJI} が 好きです。",
    "{KANJI} を つかって います。",
    "この 本は {KANJI} が 多いです。"
  ];
  const tmpl = templates[qNo % templates.length];
  const sentence = tmpl.replace("{KANJI}", `<u class="jlpt-underline">${escapeHtml(kanji)}</u>`);

  const c = document.createElement('div'); c.className = 'card card-kanji mb-3';
  const b = document.createElement('div'); b.className = 'card-body';

  const header = document.createElement('div'); header.className = 'd-flex justify-content-between align-items-center mb-2';
  header.innerHTML = `<div><h5 class="mb-0">Soal ${qNo} / ${state.batch.length}</h5><div class="small text-muted">Tes Kanji — JLPT Version</div></div>
                      <div class="text-end"><div class="small text-muted">No: ${q[numberKey] || '-'}</div><div class="small text-muted">${answeredCount()}/${state.batch.length} terjawab</div></div>`;

  const sentenceDiv = document.createElement('div'); sentenceDiv.className = 'py-4 text-center';
  const sentInner = document.createElement('div'); sentInner.style.fontSize = '34px'; sentInner.style.fontWeight = '700'; sentInner.innerHTML = sentence;
  sentenceDiv.appendChild(sentInner);

  const grid = document.createElement('div'); grid.className = 'row g-2';
  choices.forEach((o, idx)=>{
    const col = document.createElement('div'); col.className = 'col-12 col-md-6';
    const cardBtn = document.createElement('div'); cardBtn.className = 'choice-card';
    cardBtn.setAttribute('role','button');
    cardBtn.tabIndex = 0;
    cardBtn.innerHTML = `<div class="fw-semibold">${escapeHtml(o.meaning)}</div>`;
    cardBtn.onclick = ()=>{
      state.answers[state.current] = idx;
      if(!state.examMode) saveProgressIfSequential();
      renderQuestionJLPT();
    };
    if(state.answers[state.current] === idx) cardBtn.classList.add('choice-selected');
    col.appendChild(cardBtn);
    grid.appendChild(col);
  });

  const controls = document.createElement('div'); controls.className = 'mt-3 d-flex gap-2 flex-wrap';
  const prev = createBtn('Sebelumnya', 'btn btn-outline-dark', ()=>{ if(state.current>0){ state.current--; if(!state.examMode) saveProgressIfSequential(); renderQuestionJLPT(); } });
  const next = createBtn('Berikutnya', 'btn btn-outline-dark', ()=>{ if(state.current < state.batch.length-1){ state.current++; if(!state.examMode) saveProgressIfSequential(); renderQuestionJLPT(); } });
  const submit = createBtn('Kirim', 'btn btn-primary ms-auto', ()=> evaluate());
  controls.appendChild(prev); controls.appendChild(next); controls.appendChild(submit);

  b.appendChild(header);
  b.appendChild(sentenceDiv);
  b.appendChild(grid);
  b.appendChild(controls);
  c.appendChild(b);
  quizArea.appendChild(c);

  const hint = document.createElement('div'); hint.className = 'small text-muted mt-2'; hint.innerText = 'Pilihan hanya menampilkan arti — hiragana akan ditampilkan di pembahasan setelah submit.';
  quizArea.appendChild(hint);

  if(withAnim){
    c.style.opacity = 0; c.style.transform = 'translateY(6px)';
    requestAnimationFrame(()=>{ c.style.transition='all .28s ease'; c.style.opacity=1; c.style.transform='translateY(0)'; });
  }
}

/* ------------------ Memorization (romaji input) ------------------ */
function startMemBatch(batchIndex){
  const start = batchIndex * BATCH_SIZE;
  const batch = QUESTIONS.slice(start, start+BATCH_SIZE);
  prepareAndStartMem(batch, batchIndex);
}
function startMemRandom(){
  const total = QUESTIONS.length;
  if(total <= BATCH_SIZE){
    prepareAndStartMem(QUESTIONS.slice(), 0);
    return;
  }
  const start = Math.floor(Math.random() * (total - BATCH_SIZE + 1));
  const batch = QUESTIONS.slice(start, start+BATCH_SIZE);
  prepareAndStartMem(batch, -1);
}
function prepareAndStartMem(batch, batchIndex){
  const savedKey = `mem_batch_${batchIndex}_progress`;
  let saved = null;
  if(batchIndex >= 0){
    try{ saved = JSON.parse(localStorage.getItem(savedKey) || 'null'); }catch(e){ saved = null; }
  }
  state = {
    batchIndex,
    batch,
    current: saved && saved.current ? saved.current : 0,
    mode: 'memorize',
    answers: saved && Array.isArray(saved.answers) ? saved.answers.slice(0, batch.length) : Array(batch.length).fill(''),
    examMode: false
  };
  renderMemQuestion(true);
}
function saveMemProgress(){
  if(!state || state.mode !== 'memorize') return;
  const key = `mem_batch_${state.batchIndex}_progress`;
  try{
    if(state.batchIndex >= 0) localStorage.setItem(key, JSON.stringify({ current: state.current, answers: state.answers }));
  }catch(e){}
}

function renderMemQuestion(withAnim=false){
  quizArea.innerHTML = '';
  const q = state.batch[state.current];
  const qNo = state.current + 1;
  const kanji = String(q[kanjiKey] || '').trim() || '—';
  const existing = state.answers[state.current] || '';

  const c = document.createElement('div'); c.className = 'card card-kanji mb-3';
  const b = document.createElement('div'); b.className = 'card-body';

  const header = document.createElement('div'); header.className = 'd-flex justify-content-between align-items-center mb-2';
  header.innerHTML = `<div><h5 class="mb-0">Tes Hafalan ${qNo} / ${state.batch.length}</h5><div class="small text-muted">Ketik romaji untuk bacaan kanji</div></div>
                      <div class="text-end"><div class="small text-muted">No: ${q[numberKey] || '-'}</div><div class="small text-muted">${(state.answers.filter(a=>a && a.length>0).length)}/${state.batch.length} terisi</div></div>`;

  const kanjiDiv = document.createElement('div'); kanjiDiv.className = 'kanji-big'; kanjiDiv.innerText = kanji;

  const inputWrap = document.createElement('div'); inputWrap.className = 'mt-3';
  const label = document.createElement('label'); label.className = 'form-label small text-muted'; label.innerText = 'Jawaban (romaji)';
  const input = document.createElement('input'); input.className = 'form-control form-control-lg';
  input.placeholder = 'Contoh: taberu, gakkou, denwa';
  input.value = existing;
  input.autocomplete = 'off';
  input.addEventListener('input', (e)=>{
    state.answers[state.current] = e.target.value;
    saveMemProgress();
  });
  inputWrap.appendChild(label); inputWrap.appendChild(input);

  const controls = document.createElement('div'); controls.className = 'mt-3 d-flex gap-2 flex-wrap';
  const prev = createBtn('Sebelumnya', 'btn btn-outline-dark', ()=>{ if(state.current>0){ state.current--; saveMemProgress(); renderMemQuestion(); } });
  const next = createBtn('Berikutnya', 'btn btn-outline-dark', ()=>{ if(state.current < state.batch.length-1){ state.current++; saveMemProgress(); renderMemQuestion(); } });
  const submit = createBtn('Kirim Tes Hafalan', 'btn btn-success ms-auto', ()=> {
    if(confirm('Kirim jawaban hafalan sekarang?')) evaluateMem();
  });
  const showHiraBtn = createBtn('Tunjukkan Hiragana (preview)', 'btn btn-outline-secondary', ()=>{
    alert(`Hiragana soal: ${String(q[hiraganaKey]||'—')}\n\n(Catatan: hiragana tidak akan otomatis disimpan sebagai jawaban.)`);
  });
  controls.appendChild(prev); controls.appendChild(next); controls.appendChild(showHiraBtn); controls.appendChild(submit);

  b.appendChild(header);
  b.appendChild(kanjiDiv);
  b.appendChild(inputWrap);
  b.appendChild(controls);
  c.appendChild(b);
  quizArea.appendChild(c);

  if(withAnim){
    c.style.opacity = 0; c.style.transform = 'translateY(6px)';
    requestAnimationFrame(()=>{ c.style.transition='all .28s ease'; c.style.opacity=1; c.style.transform='translateY(0)'; });
  }

  setTimeout(()=> input.focus(), 80);
}

/* ------------------ Evaluate regular MCQ ------------------ */
function evaluate(){
  if(!state) return;

  let correct = 0;
  const results = state.batch.map((q,i)=>{
    const choices = state.choicesPerQ[i];
    const chosenIdx = state.answers[i];
    const chosen = (chosenIdx === null || chosenIdx === undefined) ? null : choices[chosenIdx];
    const right = { meaning: String(q[meaningKey]||'').trim(), hiragana: String(q[hiraganaKey]||'').trim() };
    const isCorrect = chosen && chosen.meaning === right.meaning && chosen.hiragana === right.hiragana;
    if(isCorrect) correct++;
    return { q, chosen, right, isCorrect };
  });

  // render results
  quizArea.innerHTML = '';
  const card = document.createElement('div'); card.className = 'card shadow-sm';
  const body = document.createElement('div'); body.className = 'card-body';
  body.innerHTML = `<h4>Hasil</h4><p class="mb-2">Skor: <strong>${correct}</strong> / ${state.batch.length}</p>`;

  const pct = Math.round((correct/state.batch.length)*100);
  const feedback = document.createElement('div'); feedback.className = 'mb-3';
  feedback.innerHTML = `<div class="h5">${pct}%</div><div class="small text-muted">${pct>=70 ? 'Mantap! Kamu lancar.' : (pct>=40 ? 'Bagus, lanjutkan latihan.' : 'Latihan lagi ya — pelan tapi pasti.')}</div>`;
  body.appendChild(feedback);

  results.forEach((r,i)=>{
    const item = document.createElement('div'); item.className = 'py-2 border-top';
    const rightText = `${r.right.meaning}${r.right.hiragana ? ' — '+r.right.hiragana : ''}`;
    const chosenText = r.chosen ? `${r.chosen.meaning}${r.chosen.hiragana ? ' — '+r.chosen.hiragana : ''}` : '(kosong)';
    item.innerHTML = `<div><strong>Soal ${i+1}:</strong> ${String(r.q[kanjiKey]||'')}</div>
                      <div class="small text-muted">Jawaban benar: <em>${escapeHtml(rightText)}</em></div>
                      <div>Jawaban Anda: <strong>${escapeHtml(chosenText)}</strong> — ${r.isCorrect ? '<span style="color:var(--accent-dark)">Benar</span>' : '<span style="color:#c23">Salah</span>'}</div>`;
    body.appendChild(item);
  });

  const retry = createBtn('Ulangi (reset jawaban)', 'btn btn-outline-primary mt-3', ()=> {
    if(state && state.batchIndex >= 0){
      localStorage.removeItem(`quiz_batch_${state.batchIndex}_progress`);
    }
    prepareAndStart(state.batch, state.batchIndex, state.mode, { loadSaved: false });
  });

  const backToStart = createBtn('Kembali ke quiz', 'btn btn-primary mt-3 ms-2', ()=> {
    if(state){
      state.current = 0;
      renderQuestion();
    }
  });

  body.appendChild(retry);
  body.appendChild(backToStart);

  card.appendChild(body);
  quizArea.appendChild(card);

  if(pct >= 50) launchConfetti(Math.min(120, 30 + pct));
  updateOverallProgress();
}

/* ------------------ Evaluate memorization (romaji) ------------------ */
function evaluateMem(){
  if(!state || state.mode !== 'memorize') return;

  let correct = 0;
  const results = state.batch.map((q,i)=>{
    const userRaw = (state.answers[i] || '').trim();
    const hiragana = String(q[hiraganaKey] || '').trim();
    // split multiple readings if provided
    const candidates = hiragana.split(/[,\/;、\s]+/).map(s=>s.trim()).filter(s=>s);
    const romCandidates = candidates.map(h => normalizeRomaji(hiraToRomaji(h)));
    const userNorm = normalizeRomaji(userRaw);

    // exact match?
    let isCorrect = romCandidates.some(rc => rc && userNorm === rc);

    // if not exact, allow small typo (Levenshtein <=1)
    if(!isCorrect){
      isCorrect = romCandidates.some(rc => levenshtein(userNorm, rc) <= 1);
    }

    // also allow common variant mappings: e.g. 'ou' vs 'oo' etc handled by normalizeRomaji already
    if(isCorrect) correct++;
    return { q, userRaw, hiragana, romCandidates, isCorrect, userNorm };
  });

  // render results
  quizArea.innerHTML = '';
  const card = document.createElement('div'); card.className = 'card shadow-sm';
  const body = document.createElement('div'); body.className = 'card-body';
  body.innerHTML = `<h4>Hasil Tes Hafalan</h4><p class="mb-2">Skor: <strong>${correct}</strong> / ${state.batch.length}</p>`;

  const pct = Math.round((correct/state.batch.length)*100);
  const feedback = document.createElement('div'); feedback.className = 'mb-3';
  feedback.innerHTML = `<div class="h5">${pct}%</div><div class="small text-muted">${pct>=70 ? 'Hebat — hafalan kuat!' : (pct>=40 ? 'Bagus, lanjutkan latihan.' : 'Latihan lagi ya — tambah pengulangan.')}</div>`;
  body.appendChild(feedback);

  results.forEach((r,i)=>{
    const item = document.createElement('div'); item.className = 'py-2 border-top';
    const roms = r.romCandidates.length ? r.romCandidates.join(' / ') : hiraToRomaji(r.hiragana);
    const verdict = r.isCorrect ? `<span style="color:var(--accent-dark)">Benar</span>` : `<span style="color:#c23">Salah</span>`;
    const note = (!r.isCorrect && levenshtein(normalizeRomaji(r.userRaw), r.romCandidates[0] || '') <= 1) ? ' (typo ringan → diterima)' : '';
    item.innerHTML = `<div><strong>Soal ${i+1}:</strong> ${String(r.q[kanjiKey]||'')}</div>
                      <div class="small text-muted">Hiragana: <em>${escapeHtml(r.hiragana || '(tidak tersedia)')}</em></div>
                      <div class="small text-muted">Romaji (benar): <em>${escapeHtml(roms)}</em></div>
                      <div>Jawaban Anda: <strong>${escapeHtml(r.userRaw||'(kosong)')}</strong> — ${verdict}${r.isCorrect ? (levenshtein(r.userNorm, r.romCandidates[0]||'')===1 ? ' <span class="small text-muted">(typo ringan)</span>' : '') : ''}</div>`;
    body.appendChild(item);
  });

  const retry = createBtn('Ulangi Tes Hafalan (reset jawaban)', 'btn btn-outline-primary mt-3', ()=> {
    if(state && state.batchIndex >= 0){
      localStorage.removeItem(`mem_batch_${state.batchIndex}_progress`);
    }
    prepareAndStartMem(state.batch, state.batchIndex);
  });

  const backToStart = createBtn('Kembali', 'btn btn-primary mt-3 ms-2', ()=> {
    state = null;
    quizArea.innerHTML = '';
  });

  body.appendChild(retry);
  body.appendChild(backToStart);

  card.appendChild(body);
  quizArea.appendChild(card);

  if(pct >= 50) launchConfetti(Math.min(120, 30 + pct));
}

/* ------------------ Romaji normalization & fuzzy matching ------------------ */

/* Convert hiragana string to romaji (simple Hepburn-ish) */
function hiraToRomaji(hira){
  if(!hira) return '';
  hira = String(hira).trim();
  hira = hira.replace(/[\s、。・,\.]/g, '');

  const yoon = {
    きゃ:'kya', きゅ:'kyu', きょ:'kyo',
    しゃ:'sha', しゅ:'shu', しょ:'sho',
    ちゃ:'cha', ちゅ:'chu', ちょ:'cho',
    にゃ:'nya', にゅ:'nyu', にょ:'nyo',
    ひゃ:'hya', ひゅ:'hyu', ひょ:'hyo',
    みゃ:'mya', みゅ:'myu', みょ:'myo',
    りゃ:'rya', りゅ:'ryu', りょ:'ryo',
    ぎゃ:'gya', ぎゅ:'gyu', ぎょ:'gyo',
    じゃ:'ja', じゅ:'ju', じょ:'jo',
    ぢゃ:'ja', ぢゅ:'ju', ぢょ:'jo',
    びゃ:'bya', びゅ:'byu', びょ:'byo',
    ぴゃ:'pya', ぴゅ:'pyu', ぴょ:'pyo'
  };

  const base = {
    あ:'a', い:'i', う:'u', え:'e', お:'o',
    か:'ka', き:'ki', く:'ku', け:'ke', こ:'ko',
    が:'ga', ぎ:'gi', ぐ:'gu', げ:'ge', ご:'go',
    さ:'sa', し:'shi', す:'su', せ:'se', そ:'so',
    ざ:'za', じ:'ji', ず:'zu', ぜ:'ze', ぞ:'zo',
    た:'ta', ち:'chi', つ:'tsu', て:'te', と:'to',
    だ:'da', ぢ:'ji', づ:'zu', で:'de', ど:'do',
    な:'na', に:'ni', ぬ:'nu', ね:'ne', の:'no',
    は:'ha', ひ:'hi', ふ:'fu', へ:'he', ほ:'ho',
    ば:'ba', び:'bi', ぶ:'bu', べ:'be', ぼ:'bo',
    ぱ:'pa', ぴ:'pi', ぷ:'pu', ぺ:'pe', ぽ:'po',
    ま:'ma', み:'mi', む:'mu', め:'me', も:'mo',
    や:'ya', ゆ:'yu', よ:'yo',
    ら:'ra', り:'ri', る:'ru', れ:'re', ろ:'ro',
    わ:'wa', ゐ:'wi', ゑ:'we', を:'o', ん:'n',
    ゔ:'vu',
    ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o'
  };

  let out = '';
  for(let i=0;i<hira.length;i++){
    const ch = hira[i];

    if(ch === 'っ' || ch === 'ッ'){
      const next = hira[i+1] || '';
      // peek pair
      const two = next + (hira[i+2] || '');
      const romNext = yoon[two] || base[next] || '';
      const firstCon = romNext[0] || '';
      if(firstCon) out += firstCon;
      continue;
    }

    const two = hira[i] + (hira[i+1] || '');
    if(yoon[two]){
      out += yoon[two];
      i++;
      continue;
    }

    if(base[ch]){
      out += base[ch];
      continue;
    }

    if(ch === 'ー'){
      const lastVowel = out.slice(-1);
      if('aiueo'.includes(lastVowel)) out += lastVowel;
      continue;
    }
  }

  return out;
}

/* improved normalizeRomaji: handle variants (ou/oo), common mappings */
function normalizeRomaji(s){
  if(!s) return '';
  s = String(s).toLowerCase();
  s = s.replace(/[^a-zōŌ]/g,''); // keep letters + macron optionally

  // macron to double vowel
  s = s.replace(/ō/g, 'oo');

  // treat ou as oo
  s = s.replace(/ou/g, 'oo');

  // common variations
  s = s.replace(/shi/g, 'si');
  s = s.replace(/chi/g, 'ti');
  s = s.replace(/tsu/g, 'tu');
  s = s.replace(/fu/g, 'hu');
  s = s.replace(/ji/g, 'zi');
  s = s.replace(/jyo/g, 'jo');
  s = s.replace(/jya/g, 'ja');

  // remove repeated doubles (normalize gakkou -> gako)
  s = s.replace(/(.)\1+/g, '$1');

  return s;
}

/* Levenshtein distance (DP). If difference > 1 we still compute but caller can check threshold. */
function levenshtein(a, b){
  a = a || ''; b = b || '';
  const m = a.length, n = b.length;
  if(Math.abs(m - n) > 2) return Math.max(m, n); // early exit for big diff
  const dp = Array.from({length:m+1}, ()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0] = i;
  for(let j=0;j<=n;j++) dp[0][j] = j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      if(a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1];
      else dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + 1);
    }
  }
  return dp[m][n];
}

/* ------------------ helpers & persistence (regular) ------------------ */
function createBtn(text, cls, onClick){ const b = document.createElement('button'); b.className = cls; b.innerText = text; b.onclick = onClick; return b; }
function answeredCount(){ return state ? state.answers.filter(a=>a!==null && a!==undefined && String(a).length>0).length : 0; }
function saveProgressIfSequential(){ try{ if(state && state.mode === 'memorize') return; if(state && state.batchIndex >= 0){ localStorage.setItem(`quiz_batch_${state.batchIndex}_progress`, JSON.stringify({answers: state.answers, current: state.current})); updateOverallProgress(); } }catch(e){} }
function loadProgress(idx){ try{ return JSON.parse(localStorage.getItem(`quiz_batch_${idx}_progress`) || 'null'); }catch(e){ return null; } }

function updateOverallProgress(){
  const total = Math.ceil(Math.max(1, QUESTIONS.length) / BATCH_SIZE);
  let filled = 0;
  for(let b=0;b<total;b++){
    const p = loadProgress(b);
    if(p && Array.isArray(p.answers)){
      const answered = p.answers.filter(a => a !== null && a !== undefined && String(a).length>0).length;
      filled += (answered / (BATCH_SIZE));
    }
  }
  const percent = Math.round((filled / total) * 100);
  overallProgressBar.style.width = `${percent}%`;
}

function attachClearHandler(){
  if(!clearBtn) return;
  clearBtn.onclick = ()=>{
    const total = Math.ceil(Math.max(1, QUESTIONS.length) / BATCH_SIZE);
    for(let i=0;i<total;i++){
      localStorage.removeItem(`quiz_batch_${i}_progress`);
      localStorage.removeItem(`mem_batch_${i}_progress`);
    }
    if(state && state.batch) { state.answers = Array(state.batch.length).fill(null); state.current = 0; }
    updateOverallProgress();
    clearMsg.style.display = 'inline-block';
    setTimeout(()=> clearMsg.style.display = 'none', 2500);
  };
}

/* ------------------ UI niceties ------------------ */
function launchConfetti(n=50){
  const colors = ['var(--accent-dark)','var(--accent)','var(--kanji-color)','#fff'];
  const frag = document.createDocumentFragment();
  const W = window.innerWidth;
  for(let i=0;i<n;i++){
    const el = document.createElement('div');
    el.className = 'confetti';
    const size = 6 + Math.random()*10;
    el.style.position = 'absolute';
    el.style.left = (Math.random()*W) + 'px';
    el.style.top = '-10px';
    el.style.width = size+'px';
    el.style.height = size*0.6+'px';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.opacity = 0.95;
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    el.style.borderRadius = '2px';
    el.style.pointerEvents = 'none';
    el.style.zIndex = 2200;
    frag.appendChild(el);
    const endY = window.innerHeight + 60 + Math.random()*200;
    el.animate([
      { transform: `translateY(0) rotate(${Math.random()*360}deg)`, opacity:1 },
      { transform: `translateY(${endY}px) rotate(${Math.random()*720}deg)`, opacity:0.2 }
    ], {
      duration: 1200 + Math.random()*900,
      easing: 'cubic-bezier(.15,.8,.25,1)'
    });
    setTimeout(()=> el.remove(), 2200);
    confettiWrap.appendChild(el);
  }
}
function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* ------------------ initial load ------------------ */
load();
