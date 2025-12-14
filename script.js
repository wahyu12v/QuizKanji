/* script.js — FULL integrated final
   - JLPT behaves like Random (checkbox ranges)
   - Contoh kombinasi dihapus
   - Contoh kalimat tetap dengan terjemahan
   - Enter pada input hafalan -> next / confirm
   - All previous features preserved
*/

const BATCH_SIZE = 20;
let QUESTIONS = [];
let state = null; // current session state

// expected fields in questions.json
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
const rangeListQuiz = document.getElementById('rangeListQuiz');
const selectAllRangeQuiz = document.getElementById('selectAllRangeQuiz');
const clearAllRangeQuiz = document.getElementById('clearAllRangeQuiz');

const quizForm = document.getElementById('quizForm');
const quizArea = document.getElementById('quiz-area');
const totalCountEl = document.getElementById('totalCount');
const overallProgressBar = document.getElementById('overall-progress');
const detectedEl = document.getElementById('detected');
const confettiWrap = document.getElementById('confetti-wrapper');
const clearBtn = document.getElementById('clearProgress');
const clearMsg = document.getElementById('clearMsg');
const memProgressEl = document.getElementById('mem-progress');

const memModalEl = document.getElementById('memModal');
const memModal = new bootstrap.Modal(memModalEl);
const memForm = document.getElementById('memForm');
const memSeqSelect = document.getElementById('memSeqSelect');
const rangeListMem = document.getElementById('rangeListMem');
const selectAllRangeMem = document.getElementById('selectAllRangeMem');
const clearAllRangeMem = document.getElementById('clearAllRangeMem');

const confirmModalEl = document.getElementById('confirmModal');
const confirmModal = new bootstrap.Modal(confirmModalEl);
const confirmSummary = document.getElementById('confirmSummary');
const confirmSend = document.getElementById('confirmSend');

startBtn.onclick = ()=> openModal();
memorizeBtn.onclick = ()=> openMemModal();

/* ------------------ Load questions.json ------------------ */
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
  totalCountEl.innerText = QUESTIONS.length;
  detectedEl.innerText = `Fields — "${kanjiKey}", "${meaningKey}", "${hiraganaKey}"`;
  populateSeqSelect();
  populateMemSeqSelect();
  buildRangeCheckboxes();
  attachRangeButtons();
  attachClearHandler();
  wireModalVisibilityToggles();
  updateOverallProgress();
  updateMemProgressDisplay();
}

/* ------------------ Helpers to build UI selects & ranges ------------------ */
function populateSeqSelect(){
  if(!seqSelect) return;
  seqSelect.innerHTML = '';
  const total = Math.ceil(Math.max(1, QUESTIONS.length)/BATCH_SIZE);
  for(let i=0;i<total;i++){
    const start = i*BATCH_SIZE + 1, end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
    const opt = document.createElement('option'); opt.value = i; opt.innerText = `Quiz ${i+1} — No ${start}–${end}`;
    seqSelect.appendChild(opt);
  }
}
function populateMemSeqSelect(){
  if(!memSeqSelect) return;
  memSeqSelect.innerHTML = '';
  const total = Math.ceil(Math.max(1, QUESTIONS.length)/BATCH_SIZE);
  for(let i=0;i<total;i++){
    const start = i*BATCH_SIZE + 1, end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
    const opt = document.createElement('option'); opt.value = i; opt.innerText = `Set ${i+1} — No ${start}–${end}`;
    memSeqSelect.appendChild(opt);
  }
}
function buildRangeCheckboxes(){
  const total = Math.ceil(Math.max(1, QUESTIONS.length)/BATCH_SIZE);
  rangeListQuiz.innerHTML = '';
  rangeListMem.innerHTML = '';
  for(let i=0;i<total;i++){
    const start = i*BATCH_SIZE + 1, end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
    const idQ = `rangeQ_${i}`, idM = `rangeM_${i}`;
    const wrapperQ = document.createElement('div'); wrapperQ.className = 'form-check me-3';
    wrapperQ.innerHTML = `<input class="form-check-input" type="checkbox" id="${idQ}" data-index="${i}"><label class="form-check-label" for="${idQ}">${start}–${end}</label>`;
    rangeListQuiz.appendChild(wrapperQ);
    const wrapperM = document.createElement('div'); wrapperM.className = 'form-check me-3';
    wrapperM.innerHTML = `<input class="form-check-input" type="checkbox" id="${idM}" data-index="${i}"><label class="form-check-label" for="${idM}">${start}–${end}</label>`;
    rangeListMem.appendChild(wrapperM);
  }
}
function attachRangeButtons(){
  if(selectAllRangeQuiz) selectAllRangeQuiz.onclick = ()=> {
    rangeListQuiz.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked = true);
  };
  if(clearAllRangeQuiz) clearAllRangeQuiz.onclick = ()=> {
    rangeListQuiz.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked = false);
  };
  if(selectAllRangeMem) selectAllRangeMem.onclick = ()=> {
    rangeListMem.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked = true);
  };
  if(clearAllRangeMem) clearAllRangeMem.onclick = ()=> {
    rangeListMem.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked = false);
  };
}

/* ------------------ Modal open helpers ------------------ */
function openModal(){
  const seqRadio = document.querySelector('#typeSeq');
  if(seqRadio) seqRadio.checked = true;
  const seqWrapEl = document.getElementById('seqSelectWrap');
  if(seqWrapEl) seqWrapEl.classList.remove('d-none');
  quizModal.show();
}
function openMemModal(){
  const memSeq = document.querySelector('#memSeq');
  if(memSeq) memSeq.checked = true;
  if(memSeqSelect && memSeqSelect.parentElement) memSeqSelect.parentElement.classList.remove('d-none');
  memModal.show();
}

/* ------------------ Modal submit handlers ------------------ */
quizForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const type = document.querySelector('input[name="type"]:checked').value;
  quizModal.hide();

  if(type === 'seq'){
    const batchIdx = Number(seqSelect.value);
    const poolIndices = [];
    for(let j=batchIdx*BATCH_SIZE; j<Math.min((batchIdx+1)*BATCH_SIZE, QUESTIONS.length); j++) poolIndices.push(j);
    const order = shuffleArray(poolIndices.slice());
    startSessionFromIndices(order, 'quiz', {batchIndex: batchIdx, mode:'seq'});
  } else if(type === 'rand' || type === 'jlpt'){
    const checked = Array.from(rangeListQuiz.querySelectorAll('input[type=checkbox]:checked')).map(i=>Number(i.dataset.index));
    let poolIndices = [];
    if(checked.length > 0){
      for(const idx of checked){
        for(let j=idx*BATCH_SIZE; j<Math.min((idx+1)*BATCH_SIZE, QUESTIONS.length); j++) poolIndices.push(j);
      }
    } else {
      poolIndices = QUESTIONS.map((_,i)=>i);
    }
    poolIndices = Array.from(new Set(poolIndices));
    if(poolIndices.length === 0){
      alert('Pool kosong — tidak ada soal pada range yang dipilih.');
      return;
    }
    const order = shuffleArray(poolIndices.slice());
    startSessionFromIndices(order, 'quiz', {batchIndex:-1, mode: type});
  }
});

memForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const type = document.querySelector('input[name="memType"]:checked').value;
  memModal.hide();

  if(type === 'seq'){
    const batchIdx = Number(memSeqSelect.value);
    const poolIndices = [];
    for(let j=batchIdx*BATCH_SIZE; j<Math.min((batchIdx+1)*BATCH_SIZE, QUESTIONS.length); j++) poolIndices.push(j);
    const order = shuffleArray(poolIndices.slice());
    startSessionFromIndices(order, 'mem', {batchIndex: batchIdx, mode:'seq'});
  } else {
    const checked = Array.from(rangeListMem.querySelectorAll('input[type=checkbox]:checked')).map(i=>Number(i.dataset.index));
    let poolIndices = [];
    if(checked.length > 0){
      for(const idx of checked){
        for(let j=idx*BATCH_SIZE; j<Math.min((idx+1)*BATCH_SIZE, QUESTIONS.length); j++) poolIndices.push(j);
      }
    } else {
      poolIndices = QUESTIONS.map((_,i)=>i);
    }
    poolIndices = Array.from(new Set(poolIndices));
    if(poolIndices.length === 0){
      alert('Pool kosong — tidak ada soal pada range yang dipilih.');
      return;
    }
    const order = shuffleArray(poolIndices.slice());
    startSessionFromIndices(order, 'mem', {batchIndex:-1, mode:'rand'});
  }
});

/* ------------------ Start session from list of indices ------------------ */
function startSessionFromIndices(orderIndices, sessionType='quiz', meta={}){
  const batch = orderIndices.map(i=>QUESTIONS[i]);
  const answers = sessionType === 'mem' ? Array(batch.length).fill('') : Array(batch.length).fill(null);
  state = {
    sessionType,
    meta,
    orderIndices,
    batch,
    current: 0,
    answers,
    choicesPerQ: sessionType === 'quiz' ? buildChoicesForBatch(orderIndices) : null
  };
  renderQuestion(true);
}

/* ------------------ build MCQ choices for a batch (avoid hiragana overlap) ------------------ */
function buildChoicesForBatch(orderIndices){
  const poolObjects = QUESTIONS.map(r=>({
    meaning: String(r[meaningKey]||'').trim(),
    hiragana: String(r[hiraganaKey]||'').trim()
  })).filter(o=>o.meaning);

  const uniquePool = []; const seen = new Set();
  for(const o of poolObjects){ const k = o.meaning + '||' + o.hiragana; if(!seen.has(k)){ seen.add(k); uniquePool.push(o); } }

  return orderIndices.map(origIdx => {
    const q = QUESTIONS[origIdx];
    const correct = { meaning: String(q[meaningKey]||'').trim(), hiragana: String(q[hiraganaKey]||'').trim() };
    const questionKanjiRaw = String(q[kanjiKey]||'');
    const questionHiraSubstrings = extractHiraganaSubstrings(questionKanjiRaw);
    if(correct.hiragana){
      const parts = splitIntoHiraganaChunks(correct.hiragana);
      for(const p of parts) if(p) questionHiraSubstrings.push(p);
    }
    let distractors = uniquePool.filter(o=>{
      if(o.meaning === correct.meaning && o.hiragana === correct.hiragana) return false;
      if(!o.hiragana) return true;
      for(const sub of questionHiraSubstrings){ if(sub && o.hiragana.includes(sub)) return false; }
      return true;
    });
    shuffleArray(distractors);
    let chosen = distractors.slice(0,3);
    if(chosen.length < 3){
      const fallback = uniquePool.filter(o => !(o.meaning === correct.meaning && o.hiragana === correct.hiragana));
      shuffleArray(fallback);
      for(const f of fallback){
        if(chosen.find(x=>x.meaning===f.meaning && x.hiragana===f.hiragana)) continue;
        chosen.push(f); if(chosen.length>=3) break;
      }
    }
    const arr = [correct, ...chosen.slice(0,3)];
    shuffleArray(arr);
    return arr;
  });
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
  const out = []; let i=0;
  while(i<cleaned.length){ const remain = cleaned.length - i; const chunkLen = remain > 4 ? 3 : remain; out.push(cleaned.substr(i,chunkLen)); i+=chunkLen; }
  return out;
}

/* ------------------ Render dispatcher ------------------ */
function renderQuestion(withAnim=false){
  if(!state) return;
  if(state.sessionType === 'mem') return renderMemQuestion(withAnim);
  return renderQuestionQuiz(withAnim);
}

/* ------------------ Render Quiz (MCQ / JLPT) ------------------ */
function renderQuestionQuiz(withAnim=false){
  quizArea.innerHTML = '';
  const idx = state.current;
  const q = state.batch[idx];
  const qNo = idx + 1;
  const origIdx = state.orderIndices[idx];
  const kanji = String(q[kanjiKey]||'').trim() || '—';
  const choices = state.choicesPerQ[idx];

  const c = document.createElement('div'); c.className='card card-kanji mb-3';
  const b = document.createElement('div'); b.className='card-body';

  const header = document.createElement('div'); header.className='d-flex justify-content-between align-items-center mb-2';
  header.innerHTML = `<div><h5 class="mb-0">Soal ${qNo} / ${state.batch.length}</h5><div class="small text-muted">No asli: ${ (QUESTIONS[origIdx] && QUESTIONS[origIdx][numberKey]) || (origIdx+1)}</div></div>
    <div class="text-end"><div class="small text-muted">${answeredCount()}/${state.batch.length} terjawab</div></div>`;

  const kanjiDiv = document.createElement('div'); kanjiDiv.className='kanji-big'; kanjiDiv.innerText = kanji;

  const grid = document.createElement('div'); grid.className='row g-2';
  choices.forEach((o, choiceIdx)=>{
    const col = document.createElement('div'); col.className='col-12 col-md-6';
    const cardBtn = document.createElement('div'); cardBtn.className='choice-card';
    cardBtn.setAttribute('role','button'); cardBtn.tabIndex=0;
    cardBtn.innerHTML = `<div class="fw-semibold">${escapeHtml(o.meaning)}</div>`;
    cardBtn.onclick = ()=>{
      state.answers[idx] = choiceIdx;
      saveProgressMappingIfApplicable(origIdx, state.sessionType, state.answers, state.orderIndices);
      autoNextAfterAnswer();
      renderQuestion();
    };
    cardBtn.onkeypress = (e)=> { if(e.key==='Enter'){ cardBtn.click(); } };
    if(state.answers[idx] === choiceIdx) cardBtn.classList.add('choice-selected');
    col.appendChild(cardBtn);
    grid.appendChild(col);
  });

  const controls = document.createElement('div'); controls.className='mt-3 d-flex gap-2 btn-row';
  const prev = createBtn('Sebelumnya', 'btn btn-outline-dark', ()=>{
    if(state.current>0){ state.current--; renderQuestion(); }
  });
  const lupa = createBtn('Tidak tahu / Lupa', 'btn btn-lupa', ()=> {
    state.answers[idx] = 'Lupa';
    saveProgressMappingIfApplicable(origIdx, state.sessionType, state.answers, state.orderIndices);
    autoNextAfterAnswer();
    renderQuestion();
  });
  const nextBtn = createBtn('Berikutnya', 'btn btn-outline-dark', ()=> {
    if(state.current < state.batch.length-1){ state.current++; renderQuestion(); }
  });
  const submit = createBtn('Kirim', 'btn btn-primary ms-auto', ()=> confirmSendModal('quiz'));

  controls.appendChild(prev);
  controls.appendChild(lupa);
  if(state.current < state.batch.length - 1) controls.appendChild(nextBtn);
  controls.appendChild(submit);

  b.appendChild(header); b.appendChild(kanjiDiv); b.appendChild(grid); b.appendChild(controls);
  c.appendChild(b); quizArea.appendChild(c);

  const hint = document.createElement('div'); hint.className='small text-muted mt-2';
  hint.innerText = 'Pilihan menampilkan arti. Hiragana hanya tampil di pembahasan setelah submit.';
  quizArea.appendChild(hint);

  if(withAnim){
    c.style.opacity=0; c.style.transform='translateY(6px)';
    requestAnimationFrame(()=>{ c.style.transition='all .28s ease'; c.style.opacity=1; c.style.transform='translateY(0)'; });
  }

  c.scrollIntoView({behavior:'smooth', block:'center'});
}

/* auto-next helper */
function autoNextAfterAnswer(){
  if(state.current < state.batch.length - 1){
    state.current++;
  } else {
    // stay on last so submit visible
  }
}

/* ------------------ Confirm modal flow ------------------ */
function confirmSendModal(sessionType){
  if(!state) return;
  const total = state.batch.length;
  const answered = state.answers.filter(a=>a !== null && a !== undefined && (sessionType==='mem' ? String(a).trim().length>0 : true)).length;
  const empty = total - answered;
  confirmSummary.innerHTML = `<div>Total soal: <strong>${total}</strong></div>
    <div>Terjawab: <strong>${answered}</strong></div>
    <div>Belum/empty: <strong>${empty}</strong></div>
    <div class="small text-muted mt-2">Klik "Kirim Sekarang" untuk melihat pembahasan.</div>`;
  confirmSend.onclick = ()=> {
    confirmModal.hide();
    if(sessionType === 'quiz') evaluateQuiz();
    else evaluateMem();
  };
  confirmModal.show();
}

/* ------------------ Render Mem (hafalan) ------------------ */
function renderMemQuestion(withAnim=false){
  quizArea.innerHTML = '';
  const idx = state.current;
  const q = state.batch[idx];
  const qNo = idx + 1;
  const origIdx = state.orderIndices[idx];
  const kanji = String(q[kanjiKey]||'').trim() || '—';
  const existing = state.answers[idx] || '';

  const c = document.createElement('div'); c.className='card card-kanji mb-3';
  const b = document.createElement('div'); b.className='card-body';

  const header = document.createElement('div'); header.className='d-flex justify-content-between align-items-center mb-2';
  header.innerHTML = `<div><h5 class="mb-0">Tes Hafalan ${qNo} / ${state.batch.length}</h5><div class="small text-muted">No asli: ${ (QUESTIONS[origIdx] && QUESTIONS[origIdx][numberKey]) || (origIdx+1)}</div></div>
    <div class="text-end"><div class="small text-muted">${(state.answers.filter(a=>String(a).trim().length>0).length)}/${state.batch.length} terisi</div></div>`;

  const kanjiDiv = document.createElement('div'); kanjiDiv.className='kanji-big'; kanjiDiv.innerText = kanji;

  const inputWrap = document.createElement('div'); inputWrap.className='mt-3';
  const label = document.createElement('label'); label.className = 'form-label small text-muted'; label.innerText = 'Jawaban (romaji)';
  const input = document.createElement('input'); input.className = 'form-control form-control-lg';
  input.value = existing;
  input.autocomplete = 'off';
  input.addEventListener('input', (e)=>{
    state.answers[idx] = e.target.value;
    saveMemProgressSession(state);
  });

  // ENTER key: pindah next otomatis (atau konfirmasi jika terakhir)
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      saveMemProgressSession(state);
      if(state.current < state.batch.length - 1){
        state.current++;
        saveMemProgressSession(state);
        renderMemQuestion();
      } else {
        confirmSendModal('mem');
      }
    }
  });

  inputWrap.appendChild(label); inputWrap.appendChild(input);

  const controls = document.createElement('div'); controls.className='mt-3 d-flex gap-2 btn-row';
  const prev = createBtn('Sebelumnya', 'btn btn-outline-dark', ()=>{ if(state.current>0){ state.current--; saveMemProgressSession(state); renderMemQuestion(); } });
  const lupa = createBtn('Tidak tahu / Lupa', 'btn btn-lupa', ()=> {
    state.answers[idx] = 'Lupa';
    saveMemProgressSession(state);
    autoNextAfterAnswer();
    renderMemQuestion();
  });
  const nextBtn = createBtn('Berikutnya', 'btn btn-outline-dark', ()=>{ if(state.current < state.batch.length-1){ state.current++; saveMemProgressSession(state); renderMemQuestion(); } });
  const submit = createBtn('Kirim Tes Hafalan', 'btn btn-success ms-auto', ()=> confirmSendModal('mem'));
  controls.appendChild(prev); controls.appendChild(lupa);
  if(state.current < state.batch.length - 1) controls.appendChild(nextBtn);
  controls.appendChild(submit);

  b.appendChild(header); b.appendChild(kanjiDiv); b.appendChild(inputWrap); b.appendChild(controls);
  c.appendChild(b); quizArea.appendChild(c);

  if(withAnim){
    c.style.opacity=0; c.style.transform='translateY(6px)';
    requestAnimationFrame(()=>{ c.style.transition='all .28s ease'; c.style.opacity=1; c.style.transform='translateY(0)'; });
  }
  setTimeout(()=> input.focus(), 80);
  c.scrollIntoView({behavior:'smooth', block:'center'});
}

/* ------------------ Evaluate Quiz ------------------ */
function evaluateQuiz(){
  if(!state || state.sessionType !== 'quiz') return;
  let correct = 0;
  const results = state.batch.map((q, i)=>{
    const choices = state.choicesPerQ[i];
    const chosen = state.answers[i];
    const right = { meaning: String(q[meaningKey]||'').trim(), hiragana: String(q[hiraganaKey]||'').trim() };
    const isCorrect = (chosen !== null && chosen !== undefined && chosen !== 'Lupa') ? (choices[chosen].meaning === right.meaning && choices[chosen].hiragana === right.hiragana) : false;
    if(isCorrect) correct++;
    return { q, chosen: chosen==='Lupa'? 'Lupa' : choices[chosen] || null, right, isCorrect, origIdx: state.orderIndices[i] };
  });

  quizArea.innerHTML = '';
  const card = document.createElement('div'); card.className='card shadow-sm';
  const body = document.createElement('div'); body.className='card-body';
  body.innerHTML = `<h4>Hasil</h4><p class="mb-2">Skor: <strong>${correct}</strong> / ${state.batch.length}</p>`;
  const pct = Math.round((correct/state.batch.length)*100);
  const feedback = document.createElement('div'); feedback.className='mb-3';
  feedback.innerHTML = `<div class="h5">${pct}%</div><div class="small text-muted">${pct>=70 ? 'Mantap! Kamu lancar.' : (pct>=40 ? 'Bagus, lanjutkan latihan.' : 'Latihan lagi ya — pelan tapi pasti.')}</div>`;
  body.appendChild(feedback);

  results.forEach((r,i)=>{
    const item = document.createElement('div'); item.className='py-2 border-top';
    const kanji = String(r.q[kanjiKey]||'');
    const hira = r.right.hiragana || '(tidak tersedia)';
    const arti = r.right.meaning || '(tidak tersedia)';
    const userAnsText = (r.chosen === 'Lupa') ? 'Lupa' : (r.chosen ? `${r.chosen.meaning}${r.chosen.hiragana ? ' — '+r.chosen.hiragana : ''}` : '(kosong)');
    const verdict = r.isCorrect ? `<span style="color:var(--accent-dark)">Benar</span>` : `<span style="color:#c23">Salah</span>`;
    const sample = generateSampleSentence(kanji, arti);
    item.innerHTML = `<div><strong>Soal ${i+1}:</strong> ${escapeHtml(kanji)}</div>
      <div class="small text-muted">Hiragana: <em>${escapeHtml(hira)}</em></div>
      <div class="small text-muted">Arti kanji: <em>${escapeHtml(arti)}</em></div>
      <div class="small text-muted">Jawaban Anda: <strong>${escapeHtml(userAnsText)}</strong> — ${verdict}</div>
      <div class="small text-muted">Contoh kalimat: <em>${escapeHtml(sample)}</em></div>`;
    body.appendChild(item);
  });

  const retry = createBtn('Ulangi (reset jawaban)', 'btn btn-outline-primary mt-3', ()=> {
    clearSessionProgress(state);
    state = null; quizArea.innerHTML = '';
  });
  const back = createBtn('Kembali', 'btn btn-primary mt-3 ms-2', ()=> { state = null; quizArea.innerHTML = ''; });
  body.appendChild(retry); body.appendChild(back);
  card.appendChild(body); quizArea.appendChild(card);

  if(pct >= 50) launchConfetti(Math.min(120, 30 + pct));
  persistQuizResultIfApplicable(state, results);
  updateOverallProgress();
}

/* ------------------ Evaluate Mem (hafalan) ------------------ */
function evaluateMem(){
  if(!state || state.sessionType !== 'mem') return;
  let correct = 0;
  const results = state.batch.map((q,i)=>{
    const userRaw = (state.answers[i] || '').trim();
    const hiragana = String(q[hiraganaKey]||'').trim();
    const romTrue = normalizeRomaji(hiraToRomaji(hiragana));
    const userNorm = normalizeRomaji(userRaw);
    const isCorrect = userRaw && userRaw !== 'Lupa' ? (userNorm === romTrue) : false; // typo disabled
    if(isCorrect) correct++;
    return { q, userRaw, hiragana, romTrue, isCorrect, origIdx: state.orderIndices[i] };
  });

  quizArea.innerHTML = '';
  const card = document.createElement('div'); card.className='card shadow-sm';
  const body = document.createElement('div'); body.className='card-body';
  body.innerHTML = `<h4>Hasil Tes Hafalan</h4><p class="mb-2">Skor: <strong>${correct}</strong> / ${state.batch.length}</p>`;
  const pct = Math.round((correct/state.batch.length)*100);
  const feedback = document.createElement('div'); feedback.className='mb-3';
  feedback.innerHTML = `<div class="h5">${pct}%</div><div class="small text-muted">${pct>=70 ? 'Hebat — hafalan kuat!' : (pct>=40 ? 'Bagus, lanjutkan latihan.' : 'Latihan lagi ya — tambah pengulangan.')}</div>`;
  body.appendChild(feedback);

  results.forEach((r,i)=>{
    const item = document.createElement('div'); item.className='py-2 border-top';
    const kanji = String(r.q[kanjiKey]||'');
    const arti = String(r.q[meaningKey]||'(tidak tersedia)');
    const sample = generateSampleSentence(kanji, arti);
    const verdict = r.isCorrect ? `<span style="color:var(--accent-dark)">Benar</span>` : `<span style="color:#c23">Salah</span>`;
    item.innerHTML = `<div><strong>Soal ${i+1}:</strong> ${escapeHtml(kanji)}</div>
      <div class="small text-muted">Hiragana: <em>${escapeHtml(r.hiragana||'(tidak tersedia)')}</em></div>
      <div class="small text-muted">Romaji (benar): <em>${escapeHtml(r.romTrue||'(tidak tersedia)')}</em></div>
      <div class="small text-muted">Arti kanji: <em>${escapeHtml(arti)}</em></div>
      <div class="small text-muted">Jawaban Anda: <strong>${escapeHtml(r.userRaw||'(kosong)')}</strong> — ${verdict}</div>
      <div class="small text-muted">Contoh kalimat: <em>${escapeHtml(sample)}</em></div>`;
    body.appendChild(item);
  });

  const retry = createBtn('Ulangi Tes Hafalan (reset jawaban)', 'btn btn-outline-primary mt-3', ()=> {
    clearSessionProgress(state);
    state = null; quizArea.innerHTML = '';
    updateMemProgressDisplay();
  });
  const back = createBtn('Kembali', 'btn btn-primary mt-3 ms-2', ()=> { state = null; quizArea.innerHTML = ''; updateMemProgressDisplay(); });
  body.appendChild(retry); body.appendChild(back);
  card.appendChild(body); quizArea.appendChild(card);

  persistMemResult(state, results);
  updateMemProgressDisplay();
  if(pct >= 50) launchConfetti(Math.min(120, 30 + pct));
}

/* ------------------ Persistence & mapping helpers ------------------ */
function saveProgressMappingIfApplicable(origIdx, sessionType, answers, orderIndices){
  if(!state || !state.meta) return;
  const batchIndex = state.meta.batchIndex;
  if(batchIndex >= 0 && sessionType === 'quiz'){
    const savedKey = `quiz_batch_${batchIndex}_progress`;
    try{
      const existing = JSON.parse(localStorage.getItem(savedKey) || 'null') || {answers: Array(BATCH_SIZE).fill(null), current:0};
      for(let i=0;i<orderIndices.length;i++){
        const orig = orderIndices[i];
        const pos = orig - batchIndex*BATCH_SIZE;
        existing.answers[pos] = (answers[i] === 'Lupa' ? 'Lupa' : answers[i]);
      }
      existing.current = state.current;
      localStorage.setItem(savedKey, JSON.stringify(existing));
      updateOverallProgress();
    }catch(e){}
  }
}
function saveMemProgressSession(st){
  if(!st || !st.meta) return;
  const batchIndex = st.meta.batchIndex;
  if(batchIndex >= 0){
    const key = `mem_batch_${batchIndex}_progress`;
    try{ localStorage.setItem(key, JSON.stringify({answers: st.answers, current: st.current})); }catch(e){}
  }
}
function clearSessionProgress(st){
  if(!st || !st.meta) return;
  const batchIndex = st.meta.batchIndex;
  if(batchIndex >= 0){
    if(st.sessionType === 'quiz') localStorage.removeItem(`quiz_batch_${batchIndex}_progress`);
    if(st.sessionType === 'mem') localStorage.removeItem(`mem_batch_${batchIndex}_progress`);
  }
}
function clearSessionProgressByIndex(batchIndex){
  if(batchIndex >= 0){
    localStorage.removeItem(`quiz_batch_${batchIndex}_progress`);
    localStorage.removeItem(`mem_batch_${batchIndex}_progress`);
  }
}

/* persist mem result summary */
function persistMemResult(st, results){
  if(!st) return;
  const batchKey = st.meta.batchIndex >=0 ? `mem_summary_batch_${st.meta.batchIndex}` : `mem_summary_rand`;
  const score = results.filter(r=>r.isCorrect).length;
  const total = results.length;
  const payload = {score, total, date: new Date().toISOString()};
  try{ localStorage.setItem(batchKey, JSON.stringify(payload)); }catch(e){}
}

/* persist quiz result if needed (for analytics) */
function persistQuizResultIfApplicable(st, results){
  if(!st) return;
  const batchKey = st.meta.batchIndex >=0 ? `quiz_summary_batch_${st.meta.batchIndex}` : `quiz_summary_rand`;
  const score = results.filter(r=>r.isCorrect).length;
  const total = results.length;
  const payload = {score, total, date: new Date().toISOString()};
  try{ localStorage.setItem(batchKey, JSON.stringify(payload)); }catch(e){}
}

/* update mem progress display aggregated simple */
function updateMemProgressDisplay(){
  const totalBatches = Math.ceil(Math.max(1, QUESTIONS.length)/BATCH_SIZE);
  let sumCorrect = 0, sumTotal=0;
  for(let i=0;i<totalBatches;i++){
    const p = JSON.parse(localStorage.getItem(`mem_summary_batch_${i}`) || 'null');
    if(p){ sumCorrect += p.score; sumTotal += p.total; }
  }
  const pRand = JSON.parse(localStorage.getItem(`mem_summary_rand`) || 'null');
  if(pRand){ sumCorrect += pRand.score; sumTotal += pRand.total; }
  if(sumTotal === 0) memProgressEl.innerText = '—';
  else memProgressEl.innerText = `${sumCorrect} / ${sumTotal} benar (terakumulasi)`;
}

/* ------------------ Utility functions ------------------ */
function createBtn(text, cls, onClick){ const b = document.createElement('button'); b.className = cls; b.innerText = text; b.onclick = onClick; return b; }
function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
function answeredCount(){ return state ? state.answers.filter(a=>a!==null && a!==undefined && String(a).trim().length>0).length : 0; }

/* ------------------ Confirmation for clear progress ------------------ */
function attachClearHandler(){
  if(!clearBtn) return;
  clearBtn.onclick = ()=>{
    const total = Math.ceil(Math.max(1, QUESTIONS.length)/BATCH_SIZE);
    for(let i=0;i<total;i++){
      localStorage.removeItem(`quiz_batch_${i}_progress`);
      localStorage.removeItem(`mem_batch_${i}_progress`);
      localStorage.removeItem(`mem_summary_batch_${i}`);
      localStorage.removeItem(`quiz_summary_batch_${i}`);
    }
    localStorage.removeItem('mem_summary_rand');
    localStorage.removeItem('quiz_summary_rand');
    updateOverallProgress(); updateMemProgressDisplay();
    clearMsg.style.display = 'inline-block'; setTimeout(()=> clearMsg.style.display = 'none', 2500);
  };
}

/* ------------------ generateSampleSentence (JP — ID) ------------------ */
function generateSampleSentence(kanji, baseMeaning){
  if(!kanji) return '(tidak tersedia)';
  const templates = [
    { jp: `${kanji} を 使います。`, id: `Menggunakan ${kanji}.` },
    { jp: `昨日、${kanji} を 見ました。`, id: `Kemarin saya melihat ${kanji}.` },
    { jp: `私は ${kanji} が 好きです。`, id: `Saya suka ${kanji}.` },
    { jp: `${kanji} を つかって います。`, id: `Sedang menggunakan ${kanji}.` },
    { jp: `この 本は ${kanji} が 多いです。`, id: `Buku ini banyak berisi ${kanji}.` }
  ];
  const t = templates[Math.floor(Math.random()*templates.length)];
  return `${t.jp} — ${t.id}`;
}

/* ------------------ generateCompounds removed (return empty) ------------------ */
// generateCompounds intentionally returns empty string to hide combinations
function generateCompounds(kanji, baseMeaning){
  return '';
}

/* ------------------ Hiragana -> Romaji converter (for mem evaluation) ------------------ */
function hiraToRomaji(hira) {
  if (!hira) return '';
  hira = String(hira).trim();
  hira = hira.replace(/[\s、。・,\.]/g, '');

  const yoon = {
    きゃ:'kya',きゅ:'kyu',きょ:'kyo',
    しゃ:'sha',しゅ:'shu',しょ:'sho',
    ちゃ:'cha',ちゅ:'chu',ちょ:'cho',
    にゃ:'nya',にゅ:'nyu',にょ:'nyo',
    ひゃ:'hya',ひゅ:'hyu',ひょ:'hyo',
    みゃ:'mya',みゅ:'myu',みょ:'myo',
    りゃ:'rya',りゅ:'ryu',りょ:'ryo',
    ぎゃ:'gya',ぎゅ:'gyu',ぎょ:'gyo',
    じゃ:'ja',じゅ:'ju',じょ:'jo',
    びゃ:'bya',びゅ:'byu',びょ:'byo',
    ぴゃ:'pya',ぴゅ:'pyu',ぴょ:'pyo',
    ふゃ:'fya',ふゅ:'fyu',ふょ:'fyo',
    ゔぁ:'va',ゔぃ:'vi',ゔぇ:'ve',ゔぉ:'vo'
  };

  const base = {
    あ:'a',い:'i',う:'u',え:'e',お:'o',
    か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',
    が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',
    さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',
    ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',
    た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',
    だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',
    な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',
    は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
    ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',
    ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',
    ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',
    や:'ya',ゆ:'yu',よ:'yo',
    ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',
    わ:'wa',を:'o',
    ん:'n',
    ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',
    ゔ:'vu'
  };

  let out = '';

  for (let i = 0; i < hira.length; i++) {
    const ch = hira[i];

    // sokuon (っ)
    if (ch === 'っ' || ch === 'ッ') {
      const next = hira[i + 1] || '';
      const pair = next + (hira[i + 2] || '');
      const rom = yoon[pair] || base[next] || '';
      if (rom) out += rom[0];
      continue;
    }

    // yoon
    const two = ch + (hira[i + 1] || '');
    if (yoon[two]) {
      out += yoon[two];
      i++;
      continue;
    }

    // ん handling
    if (ch === 'ん') {
      const next = hira[i + 1] || '';
      if ('あいうえおやゆよ'.includes(next)) {
        out += "n'";
      } else if ('bmp'.includes((base[next] || '')[0])) {
        out += 'm';
      } else {
        out += 'n';
      }
      continue;
    }

    // base
    if (base[ch]) {
      out += base[ch];
      continue;
    }

    // long vowel
    if (ch === 'ー') {
      const last = out.slice(-1);
      if ('aiueo'.includes(last)) out += last;
    }
  }

  return out;
}

/* normalize romaji (lowercase, ou->oo normalize, simple mappings) */
function normalizeRomaji(s){
  if(!s) return '';
  let str = String(s).toLowerCase();
  str = str.replace(/[^a-zō]/g,'');
  str = str.replace(/ō/g,'oo');
  str = str.replace(/ou/g,'oo');
  str = str.replace(/shi/g,'si');
  str = str.replace(/chi/g,'ti');
  str = str.replace(/tsu/g,'tu');
  str = str.replace(/fu/g,'hu');
  str = str.replace(/ji/g,'zi');
  str = str.replace(/(.)\1+/g,'$1');
  return str;
}

/* ------------------ Misc UI & confetti ------------------ */
function launchConfetti(n=50){
  const colors = ['var(--accent-dark)','var(--accent)','var(--kanji-color)','#fff'];
  const frag = document.createDocumentFragment();
  const W = window.innerWidth;
  for(let i=0;i<n;i++){
    const el = document.createElement('div'); el.className='confetti';
    const size = 6 + Math.random()*10;
    el.style.position='absolute'; el.style.left = (Math.random()*W)+'px'; el.style.top='-10px';
    el.style.width = size+'px'; el.style.height = size*0.6+'px'; el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.opacity = 0.95; el.style.transform = `rotate(${Math.random()*360}deg)`; el.style.borderRadius='2px';
    el.style.pointerEvents='none'; el.style.zIndex=2200;
    frag.appendChild(el);
    const endY = window.innerHeight + 60 + Math.random()*200;
    el.animate([{transform:`translateY(0) rotate(${Math.random()*360}deg)`, opacity:1},{transform:`translateY(${endY}px) rotate(${Math.random()*720}deg)`, opacity:0.2}], {duration:1200+Math.random()*900, easing:'cubic-bezier(.15,.8,.25,1)'});
    setTimeout(()=> el.remove(), 2200);
    confettiWrap.appendChild(el);
  }
}

/* ------------------ Update overall progress (quiz) ------------------ */
function updateOverallProgress(){
  const totalBatches = Math.ceil(Math.max(1, QUESTIONS.length)/BATCH_SIZE);
  let filled = 0;
  for(let b=0;b<totalBatches;b++){
    try{
      const p = JSON.parse(localStorage.getItem(`quiz_batch_${b}_progress`) || 'null');
      if(p && Array.isArray(p.answers)){
        const answered = p.answers.filter(a=>a!==null && a!==undefined && String(a).trim().length>0).length;
        filled += (answered / BATCH_SIZE);
      }
    }catch(e){}
  }
  const percent = Math.round((filled / totalBatches) * 100);
  overallProgressBar.style.width = `${percent}%`;
}

/* ------------------ Visibility toggle: show/hide seq select vs range checkboxes ------------------ */
function wireModalVisibilityToggles(){
  const typeSeqRadio = document.getElementById('typeSeq');
  const typeRandRadio = document.getElementById('typeRand');
  const typeJLPTRadio = document.getElementById('typeJLPT');
  const seqWrap = document.getElementById('seqSelectWrap');
  const rangeWrap = document.getElementById('rangeWrapQuiz');

  function updateQuizVisibility(){
    // Random or JLPT -> show ranges, hide seq
    if((typeRandRadio && typeRandRadio.checked) || (typeJLPTRadio && typeJLPTRadio.checked)){
      if(seqWrap) seqWrap.classList.add('d-none');
      if(rangeWrap) rangeWrap.classList.remove('d-none');
    } else {
      if(seqWrap) seqWrap.classList.remove('d-none');
      if(rangeWrap) rangeWrap.classList.add('d-none');
    }
  }

  if(typeSeqRadio) typeSeqRadio.addEventListener('change', updateQuizVisibility);
  if(typeRandRadio) typeRandRadio.addEventListener('change', updateQuizVisibility);
  if(typeJLPTRadio) typeJLPTRadio.addEventListener('change', updateQuizVisibility);

  // mem modal radios
  const memSeqRadio = document.getElementById('memSeq');
  const memRandRadio = document.getElementById('memRand');
  const memSeqWrap = document.getElementById('memSeqWrap');
  const memRangeWrap = document.getElementById('rangeWrapMem');

  function updateMemVisibility(){
    if(memRandRadio && memRandRadio.checked){
      if(memSeqWrap) memSeqWrap.classList.add('d-none');
      if(memRangeWrap) memRangeWrap.classList.remove('d-none');
    } else {
      if(memSeqWrap) memSeqWrap.classList.remove('d-none');
      if(memRangeWrap) memRangeWrap.classList.add('d-none');
    }
  }

  if(memSeqRadio && memRandRadio){
    memSeqRadio.addEventListener('change', updateMemVisibility);
    memRandRadio.addEventListener('change', updateMemVisibility);
    updateMemVisibility();
  }

  updateQuizVisibility();
}

/* ------------------ Initial load ------------------ */
load();
