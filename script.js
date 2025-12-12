// /* script.js — final update:
//    - choices show only meaning (hide hiragana)
//    - JLPT mode shows kanji underlined in question; pembahasan includes arti keseluruhan kalimat
//    - Custom range removed
//    - Hapus Progress and Ulangi (reset) clear previous answers and prevent loading old answers
// */

// const BATCH_SIZE = 20;
// let QUESTIONS = [];
// let state = null;

// const kanjiKey = "Kanji";
// const meaningKey = "Arti";
// const hiraganaKey = "Hiragana";
// const numberKey = "No";

// // DOM cache
// const startBtn = document.getElementById('startBtn');
// const quizModalEl = document.getElementById('quizModal');
// const quizModal = new bootstrap.Modal(quizModalEl);
// const seqSelect = document.getElementById('seqSelect');
// const seqSelectWrap = document.getElementById('seqSelectWrap');
// const jlptSelectWrap = document.getElementById('jlptSelectWrap');
// const jlptSelect = document.getElementById('jlptSelect');
// const quizForm = document.getElementById('quizForm');
// const quizArea = document.getElementById('quiz-area');
// const totalCountEl = document.getElementById('totalCount');
// const overallProgressBar = document.getElementById('overall-progress');
// const detectedEl = document.getElementById('detected');
// const confettiWrap = document.getElementById('confetti-wrapper');
// const clearBtn = document.getElementById('clearProgress');
// const clearMsg = document.getElementById('clearMsg');

// startBtn.onclick = ()=> openModal();

// async function load(){
//   try{
//     QUESTIONS = await fetch('questions.json').then(r=>r.json());
//   }catch(e){
//     document.getElementById('title').innerText = 'Gagal memuat data';
//     console.error(e);
//     return;
//   }
//   document.getElementById('title').innerText = `Quiz — ${QUESTIONS.length} kanji`;
//   totalCountEl.innerText = QUESTIONS.length;
//   detectedEl.innerText = `Fields — "${kanjiKey}", "${meaningKey}", "${hiraganaKey}"`;
//   populateSeqSelect();
//   populateJlptSelect();
//   updateOverallProgress();
//   attachClearHandler();
// }

// function openModal(){
//   document.querySelector('#typeSeq').checked = true;
//   seqSelectWrap.classList.remove('d-none');
//   jlptSelectWrap.classList.add('d-none');
//   quizModal.show();
// }

// function populateSeqSelect(){
//   seqSelect.innerHTML = '';
//   const total = Math.ceil(QUESTIONS.length / BATCH_SIZE);
//   for(let i=0;i<total;i++){
//     const start = i*BATCH_SIZE + 1;
//     const end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
//     const opt = document.createElement('option');
//     opt.value = i;
//     opt.innerText = `Quiz ${i+1} — No ${start}–${end}`;
//     seqSelect.appendChild(opt);
//   }
// }

// function populateJlptSelect(){
//   if(!jlptSelect) return;
//   jlptSelect.innerHTML = '';
//   const total = Math.ceil(QUESTIONS.length / BATCH_SIZE);
//   for(let i=0;i<total;i++){
//     const start = i*BATCH_SIZE + 1;
//     const end = Math.min((i+1)*BATCH_SIZE, QUESTIONS.length);
//     const opt = document.createElement('option');
//     opt.value = i;
//     opt.innerText = `Tes JLPT ${i+1} — No ${start}–${end}`;
//     jlptSelect.appendChild(opt);
//   }
// }

// // modal radio toggle logic
// document.querySelectorAll('input[name="type"]').forEach(r=>{
//   r.addEventListener('change', (ev)=>{
//     const v = ev.target.value;
//     if(v === 'seq'){ seqSelectWrap.classList.remove('d-none'); jlptSelectWrap.classList.add('d-none'); }
//     else if(v === 'rand'){ seqSelectWrap.classList.add('d-none'); jlptSelectWrap.classList.add('d-none'); }
//     else if(v === 'jlpt'){ seqSelectWrap.classList.add('d-none'); jlptSelectWrap.classList.remove('d-none'); }
//   });
// });

// // modal submit: choose mode and starting batch
// quizForm.addEventListener('submit', (ev)=>{
//   ev.preventDefault();
//   const type = document.querySelector('input[name="type"]:checked').value;
//   quizModal.hide();

//   if(type === 'seq'){
//     const idx = Number(seqSelect.value);
//     startBatch(idx, 'default');
//   } else if(type === 'rand'){
//     startRandom('default');
//   } else if(type === 'jlpt'){
//     const idx = (jlptSelect && jlptSelect.value) ? Number(jlptSelect.value) : Number(seqSelect.value || 0);
//     startBatch(idx, 'jlpt');
//   }
// });

// /* Start helpers */
// function startBatch(batchIndex, mode='default'){
//   const start = batchIndex * BATCH_SIZE;
//   const batch = QUESTIONS.slice(start, start+BATCH_SIZE);
//   prepareAndStart(batch, batchIndex, mode, { loadSaved: true });
// }

// function startRandom(mode='default'){
//   const total = QUESTIONS.length;
//   if(total <= BATCH_SIZE){
//     prepareAndStart(QUESTIONS.slice(), 0, mode, { loadSaved: true });
//     return;
//   }
//   const start = Math.floor(Math.random() * (total - BATCH_SIZE + 1));
//   const batch = QUESTIONS.slice(start, start+BATCH_SIZE);
//   prepareAndStart(batch, -1, mode, { loadSaved: true });
// }

// /* Core: prepare and start (option loadSaved controls whether to load previous answers) */
// function prepareAndStart(batch, batchIndex, mode='default', opts = { loadSaved: true }){
//   // pool of unique distractors
//   const poolObjects = QUESTIONS.map(r=>({
//     meaning: String(r[meaningKey]||'').trim(),
//     hiragana: String(r[hiraganaKey]||'').trim()
//   })).filter(o=>o.meaning);

//   const uniquePool = [];
//   const seen = new Set();
//   for(const o of poolObjects){
//     const k = o.meaning + '||' + o.hiragana;
//     if(!seen.has(k)){ seen.add(k); uniquePool.push(o); }
//   }

//   // prepare choices (exclusion of hiragana substrings still applied)
//   const choicesPerQ = batch.map((q, idx) => {
//     const correct = { meaning: String(q[meaningKey]||'').trim(), hiragana: String(q[hiraganaKey]||'').trim() };

//     const questionKanjiRaw = String(q[kanjiKey] || '');
//     const questionHiraSubstrings = extractHiraganaSubstrings(questionKanjiRaw);
//     if(correct.hiragana){
//       const parts = splitIntoHiraganaChunks(correct.hiragana);
//       for(const p of parts) if(p) questionHiraSubstrings.push(p);
//     }

//     let distractors = uniquePool.filter(o => {
//       if(o.meaning === correct.meaning && o.hiragana === correct.hiragana) return false;
//       if(!o.hiragana) return true;
//       for(const sub of questionHiraSubstrings){
//         if(!sub) continue;
//         if(o.hiragana.includes(sub)) return false;
//       }
//       return true;
//     });

//     shuffleArray(distractors);
//     let chosen = distractors.slice(0,3);

//     if(chosen.length < 3){
//       const fallback = uniquePool.filter(o => !(o.meaning === correct.meaning && o.hiragana === correct.hiragana));
//       shuffleArray(fallback);
//       for(const f of fallback){
//         if(chosen.find(x=>x.meaning===f.meaning && x.hiragana===f.hiragana)) continue;
//         chosen.push(f);
//         if(chosen.length >= 3) break;
//       }
//     }

//     const arr = [correct, ...chosen.slice(0,3)];
//     shuffleArray(arr);
//     return arr;
//   });

//   // initialize state: answers empty (fresh)
//   state = {
//     batchIndex,
//     batch,
//     current: 0,
//     mode,
//     answers: Array(batch.length).fill(null),
//     choicesPerQ
//   };

//   // only load saved answers if explicitly allowed AND batchIndex >=0
//   if(opts && opts.loadSaved && batchIndex >= 0){
//     const saved = loadProgress(batchIndex);
//     if(saved && Array.isArray(saved.answers)){
//       // only accept saved when loaded intentionally
//       state.answers = saved.answers.slice(0, state.batch.length);
//       state.current = saved.current || 0;
//     }
//   }

//   renderQuestion(true);
// }

// /* Helpers to detect hiragana runs & split long hiragana */
// function extractHiraganaSubstrings(s){
//   if(!s) return [];
//   const runs = s.match(/[\u3040-\u309F]+/g) || [];
//   return runs.map(r=>r.trim()).filter(r=>r.length>0);
// }
// function splitIntoHiraganaChunks(h){
//   if(!h) return [];
//   const cleaned = String(h).trim();
//   const parts = cleaned.split(/[\s、。·・\/\-]+/).filter(p=>p);
//   if(parts.length > 1) return parts;
//   const out = [];
//   let i = 0;
//   while(i < cleaned.length){
//     const remain = cleaned.length - i;
//     const chunkLen = remain > 4 ? 3 : remain;
//     out.push(cleaned.substr(i, chunkLen));
//     i += chunkLen;
//   }
//   return out;
// }

// /* Render dispatcher (JLPT uses different layout) */
// function renderQuestion(withAnim=false){
//   if(!state) return;
//   if(state.mode === 'jlpt') return renderQuestionJLPT(withAnim);
//   return renderQuestionDefault(withAnim);
// }

// /* Default render: choices show ONLY meaning (no hiragana) */
// function renderQuestionDefault(withAnim=false){
//   quizArea.innerHTML = '';
//   const q = state.batch[state.current];
//   const qNo = state.current + 1;
//   const kanji = String(q[kanjiKey] || '').trim() || '—';
//   const choices = state.choicesPerQ[state.current];

//   const c = document.createElement('div'); c.className = 'card card-kanji mb-3';
//   const b = document.createElement('div'); b.className = 'card-body';

//   const header = document.createElement('div'); header.className = 'd-flex justify-content-between align-items-center mb-2';
//   header.innerHTML = `<div><h5 class="mb-0">Soal ${qNo} / ${state.batch.length}</h5><div class="small text-muted">Quiz ${state.batchIndex === -1 ? 'Random' : (state.batchIndex+1)}</div></div>
//                       <div class="text-end"><div class="small text-muted">No: ${q[numberKey] || '-'}</div><div class="small text-muted">${answeredCount()}/${state.batch.length} terjawab</div></div>`;

//   const kanjiDiv = document.createElement('div'); kanjiDiv.className = 'kanji-big'; kanjiDiv.innerText = kanji;

//   const grid = document.createElement('div'); grid.className = 'row g-2';
//   choices.forEach((o, idx)=>{
//     const col = document.createElement('div'); col.className = 'col-12 col-md-6';
//     const cardBtn = document.createElement('div'); cardBtn.className = 'choice-card';
//     cardBtn.setAttribute('role','button');
//     cardBtn.tabIndex = 0;
//     // show only meaning (hide hiragana)
//     cardBtn.innerHTML = `<div class="fw-semibold">${escapeHtml(o.meaning)}</div>`;
//     cardBtn.onclick = ()=>{
//       state.answers[state.current] = idx;
//       saveProgressIfSequential();
//       renderQuestion();
//     };
//     cardBtn.onkeypress = (e)=>{ if(e.key === 'Enter'){ cardBtn.click(); } };
//     if(state.answers[state.current] === idx) cardBtn.classList.add('choice-selected');
//     col.appendChild(cardBtn);
//     grid.appendChild(col);
//   });

//   const controls = document.createElement('div'); controls.className = 'mt-3 d-flex gap-2 flex-wrap';
//   const prev = createBtn('Sebelumnya', 'btn btn-outline-dark', ()=>{ if(state.current>0){ state.current--; saveProgressIfSequential(); renderQuestion(); } });
//   const next = createBtn('Berikutnya', 'btn btn-outline-dark', ()=>{ if(state.current < state.batch.length-1){ state.current++; saveProgressIfSequential(); renderQuestion(); } });
//   const submit = createBtn('Kirim', 'btn btn-primary ms-auto', ()=> evaluate());
//   controls.appendChild(prev); controls.appendChild(next); controls.appendChild(submit);

//   b.appendChild(header);
//   b.appendChild(kanjiDiv);
//   b.appendChild(grid);
//   b.appendChild(controls);
//   c.appendChild(b);
//   quizArea.appendChild(c);

//   const hint = document.createElement('div'); hint.className = 'small text-muted mt-2'; hint.innerText = 'Pilihan hanya menampilkan arti — hiragana akan ditampilkan di pembahasan setelah submit.';
//   quizArea.appendChild(hint);

//   if(withAnim){
//     c.style.opacity = 0; c.style.transform = 'translateY(6px)';
//     requestAnimationFrame(()=>{ c.style.transition='all .28s ease'; c.style.opacity=1; c.style.transform='translateY(0)'; });
//   }
// }

// /* JLPT-style render: sentence with underlined kanji; choices show meanings only */
// function renderQuestionJLPT(withAnim=false){
//   quizArea.innerHTML = '';
//   const q = state.batch[state.current];
//   const qNo = state.current + 1;
//   const kanji = String(q[kanjiKey] || '').trim() || '—';
//   const choices = state.choicesPerQ[state.current];

//   const templates = [
//     "{KANJI} を 書きました。",
//     "昨日、{KANJI} を 見ました。",
//     "私は {KANJI} が 好きです。",
//     "{KANJI} を つかって います。",
//     "この 本は {KANJI} が 多いです。"
//   ];
//   // use same indexing logic for templates
//   const tmpl = templates[qNo % templates.length];
//   const sentence = tmpl.replace("{KANJI}", `<u class="jlpt-underline">${escapeHtml(kanji)}</u>`);

//   const c = document.createElement('div'); c.className = 'card card-kanji mb-3';
//   const b = document.createElement('div'); b.className = 'card-body';

//   const header = document.createElement('div'); header.className = 'd-flex justify-content-between align-items-center mb-2';
//   header.innerHTML = `<div><h5 class="mb-0">Soal ${qNo} / ${state.batch.length}</h5><div class="small text-muted">Tes Kanji — JLPT Version</div></div>
//                       <div class="text-end"><div class="small text-muted">No: ${q[numberKey] || '-'}</div><div class="small text-muted">${answeredCount()}/${state.batch.length} terjawab</div></div>`;

//   const sentenceDiv = document.createElement('div'); sentenceDiv.className = 'py-4 text-center';
//   const sentInner = document.createElement('div'); sentInner.style.fontSize = '34px'; sentInner.style.fontWeight = '700'; sentInner.innerHTML = sentence;
//   sentenceDiv.appendChild(sentInner);

//   const grid = document.createElement('div'); grid.className = 'row g-2';
//   choices.forEach((o, idx)=>{
//     const col = document.createElement('div'); col.className = 'col-12 col-md-6';
//     const cardBtn = document.createElement('div'); cardBtn.className = 'choice-card';
//     cardBtn.setAttribute('role','button');
//     cardBtn.tabIndex = 0;
//     cardBtn.innerHTML = `<div class="fw-semibold">${escapeHtml(o.meaning)}</div>`;
//     cardBtn.onclick = ()=>{
//       state.answers[state.current] = idx;
//       saveProgressIfSequential();
//       renderQuestionJLPT();
//     };
//     if(state.answers[state.current] === idx) cardBtn.classList.add('choice-selected');
//     col.appendChild(cardBtn);
//     grid.appendChild(col);
//   });

//   const controls = document.createElement('div'); controls.className = 'mt-3 d-flex gap-2 flex-wrap';
//   const prev = createBtn('Sebelumnya', 'btn btn-outline-dark', ()=>{ if(state.current>0){ state.current--; saveProgressIfSequential(); renderQuestionJLPT(); } });
//   const next = createBtn('Berikutnya', 'btn btn-outline-dark', ()=>{ if(state.current < state.batch.length-1){ state.current++; saveProgressIfSequential(); renderQuestionJLPT(); } });
//   const submit = createBtn('Kirim', 'btn btn-primary ms-auto', ()=> evaluate());
//   controls.appendChild(prev); controls.appendChild(next); controls.appendChild(submit);

//   b.appendChild(header);
//   b.appendChild(sentenceDiv);
//   b.appendChild(grid);
//   b.appendChild(controls);
//   c.appendChild(b);
//   quizArea.appendChild(c);

//   const hint = document.createElement('div'); hint.className = 'small text-muted mt-2'; hint.innerText = 'Pilihan hanya menampilkan arti — hiragana akan ditampilkan di pembahasan setelah submit.';
//   quizArea.appendChild(hint);

//   if(withAnim){
//     c.style.opacity = 0; c.style.transform = 'translateY(6px)';
//     requestAnimationFrame(()=>{ c.style.transition='all .28s ease'; c.style.opacity=1; c.style.transform='translateY(0)'; });
//   }
// }

// /* Evaluate: show results and reveal hiragana + full sentence meaning for JLPT */
// function evaluate(){
//   if(!state) return;
//   let correct = 0;
//   const results = state.batch.map((q,i)=>{
//     const choices = state.choicesPerQ[i];
//     const chosenIdx = state.answers[i];
//     const chosen = (chosenIdx === null || chosenIdx === undefined) ? null : choices[chosenIdx];
//     const right = { meaning: String(q[meaningKey]||'').trim(), hiragana: String(q[hiraganaKey]||'').trim() };
//     const isCorrect = chosen && chosen.meaning === right.meaning && chosen.hiragana === right.hiragana;
//     if(isCorrect) correct++;
//     return { q, chosen, right, isCorrect };
//   });

//   quizArea.innerHTML = '';
//   const card = document.createElement('div'); card.className = 'card shadow-sm';
//   const body = document.createElement('div'); body.className = 'card-body';
//   body.innerHTML = `<h4>Hasil</h4><p class="mb-2">Skor: <strong>${correct}</strong> / ${state.batch.length}</p>`;

//   const pct = Math.round((correct/state.batch.length)*100);
//   const feedback = document.createElement('div'); feedback.className = 'mb-3';
//   feedback.innerHTML = `<div class="h5">${pct}%</div><div class="small text-muted">${pct>=70 ? 'Mantap! Kamu lancar.' : (pct>=40 ? 'Bagus, lanjutkan latihan.' : 'Latihan lagi ya — pelan tapi pasti.')}</div>`;
//   body.appendChild(feedback);

//   // JLPT templates & Indonesian mapping
//   const jlptTemplates = [
//     "{KANJI} を 書きました。",
//     "昨日、{KANJI} を 見ました。",
//     "私は {KANJI} が 好きです。",
//     "{KANJI} を つかって います。",
//     "この 本は {KANJI} が 多いです。"
//   ];

//   results.forEach((r,i)=>{
//     const item = document.createElement('div'); item.className = 'py-2 border-top';
//     const rightText = `${r.right.meaning}${r.right.hiragana ? ' — '+r.right.hiragana : ''}`;
//     const chosenText = r.chosen ? `${r.chosen.meaning}${r.chosen.hiragana ? ' — '+r.chosen.hiragana : ''}` : '(kosong)';

//     // JLPT: build sentence + meaning
//     let sentenceMarkup = '';
//     if(state.mode === 'jlpt'){
//       const tmpl = jlptTemplates[(i+1) % jlptTemplates.length];
//       const sentence = tmpl.replace("{KANJI}", `<u class="jlpt-underline">${escapeHtml(String(r.q[kanjiKey]||''))}</u>`);
//       const sentenceMeaning = getJlptSentenceMeaning(tmpl, r.right.meaning);
//       sentenceMarkup = `<div class="mt-1 small text-muted">Contoh kalimat: ${sentence}</div>
//                         <div class="small text-muted">Arti kalimat: <em>${escapeHtml(sentenceMeaning)}</em></div>`;
//     }

//     item.innerHTML = `<div><strong>Soal ${i+1}:</strong> ${String(r.q[kanjiKey]||'')}</div>
//                       <div class="small text-muted">Jawaban benar: <em>${escapeHtml(rightText)}</em></div>
//                       <div>Jawaban Anda: <strong>${escapeHtml(chosenText)}</strong> — ${r.isCorrect ? '<span style="color:var(--accent-2)">Benar</span>' : '<span style="color:#c23">Salah</span>'}</div>
//                       ${sentenceMarkup}`;
//     body.appendChild(item);
//   });

//   // Ulangi: restart same batch but force clearing saved answers
//   const retry = createBtn('Ulangi (reset jawaban)', 'btn btn-outline-primary mt-3', ()=> {
//     if(state && state.batchIndex >= 0){
//       localStorage.removeItem(`quiz_batch_${state.batchIndex}_progress`);
//     }
//     prepareAndStart(state.batch, state.batchIndex, state.mode, { loadSaved: false });
//   });

//   const backToStart = createBtn('Kembali ke quiz', 'btn btn-primary mt-3 ms-2', ()=> {
//     if(state){
//       state.current = 0;
//       renderQuestion();
//     }
//   });

//   body.appendChild(retry);
//   body.appendChild(backToStart);

//   card.appendChild(body);
//   quizArea.appendChild(card);

//   if(pct >= 50) launchConfetti(Math.min(120, 30 + pct));
//   updateOverallProgress();
// }

// /* Helper: produce Indonesian translation for the JLPT templates */
// function getJlptSentenceMeaning(tmpl, meaning){
//   const map = {
//     "{KANJI} を 書きました。": `Menulis ${meaning}.`,
//     "昨日、{KANJI} を 見ました。": `Kemarin melihat ${meaning}.`,
//     "私は {KANJI} が 好きです。": `Saya suka ${meaning}.`,
//     "{KANJI} を つかって います。": `Menggunakan ${meaning}.`,
//     "この 本は {KANJI} が 多いです。": `Buku ini memiliki banyak ${meaning}.`
//   };
//   return map[tmpl] || tmpl.replace("{KANJI}", meaning);
// }

// /* Helpers & persistence */
// function prepareAndStartSameBatch(){ if(!state) return; const batchIndex = state.batchIndex; if(batchIndex >= 0) startBatch(batchIndex, state.mode); else startRandom(state.mode); }
// function createBtn(text, cls, onClick){ const b = document.createElement('button'); b.className = cls; b.innerText = text; b.onclick = onClick; return b; }
// function answeredCount(){ return state.answers.filter(a=>a!==null && a!==undefined).length; }
// function saveProgressIfSequential(){ try{ if(state.batchIndex >= 0){ localStorage.setItem(`quiz_batch_${state.batchIndex}_progress`, JSON.stringify({answers: state.answers, current: state.current})); updateOverallProgress(); } }catch(e){} }
// function loadProgress(idx){ try{ return JSON.parse(localStorage.getItem(`quiz_batch_${idx}_progress`) || 'null'); }catch(e){ return null; } }

// function updateOverallProgress(){
//   const total = Math.ceil(QUESTIONS.length / BATCH_SIZE);
//   let filled = 0;
//   for(let b=0;b<total;b++){
//     const p = loadProgress(b);
//     if(p && Array.isArray(p.answers)){
//       const answered = p.answers.filter(a => a !== null && a !== undefined).length;
//       filled += (answered / (BATCH_SIZE));
//     }
//   }
//   const percent = Math.round((filled / total) * 100);
//   overallProgressBar.style.width = `${percent}%`;
// }

// function attachClearHandler(){
//   if(!clearBtn) return;
//   clearBtn.onclick = ()=>{
//     const total = Math.ceil(QUESTIONS.length / BATCH_SIZE);
//     for(let i=0;i<total;i++) localStorage.removeItem(`quiz_batch_${i}_progress`);
//     // also clear current state answers if present
//     if(state){ state.answers = Array(state.batch.length).fill(null); state.current = 0; }
//     updateOverallProgress();
//     clearMsg.style.display = 'inline-block';
//     setTimeout(()=> clearMsg.style.display = 'none', 2500);
//   };
// }

// function launchConfetti(n=50){
//   const colors = ['var(--accent-2)','var(--accent)','var(--kanji-color)','#fff'];
//   const frag = document.createDocumentFragment();
//   const W = window.innerWidth;
//   for(let i=0;i<n;i++){
//     const el = document.createElement('div');
//     el.className = 'confetti';
//     const size = 6 + Math.random()*10;
//     el.style.position = 'absolute';
//     el.style.left = (Math.random()*W) + 'px';
//     el.style.top = '-10px';
//     el.style.width = size+'px';
//     el.style.height = size*0.6+'px';
//     el.style.background = colors[Math.floor(Math.random()*colors.length)];
//     el.style.opacity = 0.95;
//     el.style.transform = `rotate(${Math.random()*360}deg)`;
//     el.style.borderRadius = '2px';
//     el.style.pointerEvents = 'none';
//     el.style.zIndex = 2200;
//     frag.appendChild(el);
//     const endY = window.innerHeight + 60 + Math.random()*200;
//     el.animate([
//       { transform: `translateY(0) rotate(${Math.random()*360}deg)`, opacity:1 },
//       { transform: `translateY(${endY}px) rotate(${Math.random()*720}deg)`, opacity:0.2 }
//     ], {
//       duration: 1200 + Math.random()*900,
//       easing: 'cubic-bezier(.15,.8,.25,1)'
//     });
//     setTimeout(()=> el.remove(), 2200);
//     confettiWrap.appendChild(el);
//   }
// }
// function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
// function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// /* initial load */
// load();



/* script.js — Quiz reguler (tanpa JFT)
   - Memuat questions.json (kanji pool)
   - Sequential / Random / JLPT version
   - Pilihan multiple-choice (arti); hiragana ditampilkan di pembahasan
   - Simpan progress per batch di localStorage
*/

const BATCH_SIZE = 20;
let QUESTIONS = [];
let state = null;

const kanjiKey = "Kanji";
const meaningKey = "Arti";
const hiraganaKey = "Hiragana";
const numberKey = "No";

/// DOM
const startBtn = document.getElementById('startBtn');
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

startBtn.onclick = ()=> openModal();

/* Load questions.json */
async function load(){
  try{
    QUESTIONS = await fetch('questions.json').then(r=>r.json());
  }catch(e){
    QUESTIONS = [];
    console.error('Gagal memuat questions.json', e);
  }
  document.getElementById('title').innerText = `Quiz — ${QUESTIONS.length} item`;
  totalCountEl.innerText = QUESTIONS.length;
  detectedEl.innerText = `Fields — "${kanjiKey}", "${meaningKey}", "${hiraganaKey}"`;
  populateSeqSelect();
  populateJlptSelect();
  attachClearHandler();
  updateOverallProgress();
}

/* Modal helpers */
function openModal(){
  const el = document.querySelector('#typeSeq');
  if(el) el.checked = true;
  seqSelectWrap.classList.remove('d-none');
  jlptSelectWrap.classList.add('d-none');
  quizModal.show();
}

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

/* radio toggle for modal */
document.querySelectorAll('input[name="type"]').forEach(r=>{
  r.addEventListener('change', (ev)=>{
    const v = ev.target.value;
    if(v === 'seq'){ seqSelectWrap.classList.remove('d-none'); jlptSelectWrap.classList.add('d-none'); }
    else if(v === 'rand'){ seqSelectWrap.classList.add('d-none'); jlptSelectWrap.classList.add('d-none'); }
    else if(v === 'jlpt'){ seqSelectWrap.classList.add('d-none'); jlptSelectWrap.classList.remove('d-none'); }
  });
});

/* modal submit */
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

/* ---------- start batch / random ---------- */
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

/* ---------- prepare and render ---------- */
function prepareAndStart(batch, batchIndex, mode='default', opts = { loadSaved: true }){
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

/* ---------- hiragana helpers ---------- */
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

/* ---------- render dispatcher ---------- */
function renderQuestion(withAnim=false){
  if(!state) return;
  if(state.mode === 'jlpt') return renderQuestionJLPT(withAnim);
  return renderQuestionDefault(withAnim);
}

/* ---------- default render ---------- */
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

/* ---------- JLPT render ---------- */
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

/* ---------- evaluate ---------- */
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
                      <div>Jawaban Anda: <strong>${escapeHtml(chosenText)}</strong> — ${r.isCorrect ? '<span style="color:var(--accent-2)">Benar</span>' : '<span style="color:#c23">Salah</span>'}</div>`;
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

/* ---------- helpers & persistence ---------- */
function createBtn(text, cls, onClick){ const b = document.createElement('button'); b.className = cls; b.innerText = text; b.onclick = onClick; return b; }
function answeredCount(){ return state ? state.answers.filter(a=>a!==null && a!==undefined).length : 0; }
function saveProgressIfSequential(){ try{ if(state && state.examMode) return; if(state && state.batchIndex >= 0){ localStorage.setItem(`quiz_batch_${state.batchIndex}_progress`, JSON.stringify({answers: state.answers, current: state.current})); updateOverallProgress(); } }catch(e){} }
function loadProgress(idx){ try{ return JSON.parse(localStorage.getItem(`quiz_batch_${idx}_progress`) || 'null'); }catch(e){ return null; } }

function updateOverallProgress(){
  const total = Math.ceil(Math.max(1, QUESTIONS.length) / BATCH_SIZE);
  let filled = 0;
  for(let b=0;b<total;b++){
    const p = loadProgress(b);
    if(p && Array.isArray(p.answers)){
      const answered = p.answers.filter(a => a !== null && a !== undefined).length;
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
    for(let i=0;i<total;i++) localStorage.removeItem(`quiz_batch_${i}_progress`);
    if(state && state.batch) { state.answers = Array(state.batch.length).fill(null); state.current = 0; }
    updateOverallProgress();
    clearMsg.style.display = 'inline-block';
    setTimeout(()=> clearMsg.style.display = 'none', 2500);
  };
}

/* ---------- UI niceties ---------- */
function launchConfetti(n=50){
  const colors = ['var(--accent-2)','var(--accent)','var(--kanji-color)','#fff'];
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

/* initial load */
load();






