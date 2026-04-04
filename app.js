//
const MEALS = [
  {key:'morning', label:'朝食', emoji:'🌅', color:'#f59e0b'},
  {key:'lunch',   label:'昼食', emoji:'☀️',  color:'#10b981'},
  {key:'snack',   label:'おやつ', emoji:'🍪', color:'#ec4899'},
  {key:'dinner',  label:'夕食', emoji:'🌙', color:'#818cf8'},
];
const QUICK_MORNING = [
  {name:'ご飯140g', cal:235, fat:0, carbs:52, protein:4},
  {name:'卵焼き', cal:80, fat:5, carbs:2, protein:6},
  {name:'納豆', cal:100, fat:5, carbs:6, protein:8},
  {name:'味噌汁', cal:40, fat:1, carbs:5, protein:2},
  {name:'レタスサラダ', cal:20, fat:0, carbs:3, protein:1},
  {name:'りんご', cal:80, fat:0, carbs:20, protein:0},
  {name:'みかん', cal:45, fat:0, carbs:11, protein:1},
];

let apiKey = '';
let goalCal = 1800;
let goalRice = 600;
let weightPw = '';
let weightUnlocked = false;
let mealData = {morning:[], lunch:[], snack:[], dinner:[]};
let weightData = {};
let favorites = [];
let openSecs = {morning:true, lunch:true, snack:true, dinner:true};
let aeteMealKey = 'lunch';
let habits = []; // [{id, name}]
let habitChecks = {}; // {date: {id: bool}}
let currentDate = '';

//
function load() {
  try {
    apiKey      = localStorage.getItem('c_apikey') || '';
    goalCal     = parseInt(localStorage.getItem('c_goalcal')) || 1800;
    goalRice    = parseInt(localStorage.getItem('c_goalrice')) || 600;
    weightPw    = localStorage.getItem('c_weightpw') || '';
    weightData  = JSON.parse(localStorage.getItem('c_weight') || '{}');
    favorites   = JSON.parse(localStorage.getItem('c_favs') || '[]');
    habits      = JSON.parse(localStorage.getItem('c_habits') || '[]');
    habitChecks = JSON.parse(localStorage.getItem('c_habit_checks') || '{}');
  } catch(e) {}
}
function loadMealData() {
  try {
    const saved = localStorage.getItem('c_meals_' + currentDate);
    mealData = saved ? JSON.parse(saved) : {morning:[], lunch:[], snack:[], dinner:[]};
  } catch(e) {
    mealData = {morning:[], lunch:[], snack:[], dinner:[]};
  }
}
function saveMealData() {
  save('c_meals_' + currentDate, mealData);
}
function changeDate(delta) {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const newDate = d.toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  if (newDate > today) return; // can't go to future
  currentDate = newDate;
  loadMealData();
  updateDateLabel();
  renderAll();
}
function updateDateLabel() {
  const today = new Date().toISOString().slice(0,10);
  const d = new Date(currentDate + 'T00:00:00');
  const label = d.toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
  const isToday = currentDate === today;
  document.getElementById('date-lbl').textContent = label;
  const nextBtn = document.getElementById('date-next');
  const prevBtn = document.getElementById('date-prev');
  if (nextBtn) {
    if (isToday) {
      nextBtn.setAttribute('disabled', 'true');
      nextBtn.style.opacity = '0.2';
      nextBtn.style.pointerEvents = 'none';
    } else {
      nextBtn.removeAttribute('disabled');
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }
  }
}
function save(key, val) { try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch(e) {} }

//
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function saveApiKey() {
  const v = document.getElementById('api-input').value.trim();
  if (!v) return;
  apiKey = v;
  save('c_apikey', v);
  document.getElementById('api-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  startApp();
}

function openKeyModal() {
  document.getElementById('key-modal-input').value = apiKey;
  document.getElementById('key-modal').style.display = 'flex';
}
function saveKeyModal() {
  const v = document.getElementById('key-modal-input').value.trim();
  if (v) { apiKey = v; save('c_apikey', v); }
  closeModal('key-modal');
}

function openGoalModal() {
  document.getElementById('goal-cal-input').value = goalCal;
  document.getElementById('goal-rice-input').value = goalRice;
  document.getElementById('goal-pw-input').value = weightPw;
  document.getElementById('goal-modal').style.display = 'flex';
}
function saveGoalModal() {
  const c = parseInt(document.getElementById('goal-cal-input').value);
  const r = parseInt(document.getElementById('goal-rice-input').value);
  const pw = document.getElementById('goal-pw-input').value;
  if (c > 0) { goalCal = c; save('c_goalcal', c); }
  if (r > 0) { goalRice = r; save('c_goalrice', r); }
  weightPw = pw;
  weightUnlocked = false;
  save('c_weightpw', pw);
  renderAll();
  closeModal('goal-modal');
}

function checkPw() {
  const v = document.getElementById('pw-input').value;
  if (v === weightPw) {
    weightUnlocked = true;
    closeModal('pw-modal');
    doShowWeight();
  } else {
    document.getElementById('pw-error').style.display = 'block';
    document.getElementById('pw-input').value = '';
  }
}

//
function showTab(tab) {
  if (tab === 'weight') {
    if (weightPw && !weightUnlocked) {
      document.getElementById('pw-input').value = '';
      document.getElementById('pw-error').style.display = 'none';
      document.getElementById('pw-modal').style.display = 'flex';
      return;
    }
    doShowWeight();
    return;
  }
  if (tab === 'habit') {
    weightUnlocked = false;
    document.getElementById('sections').style.display = 'none';
    document.getElementById('w-section').style.display = 'none';
    document.getElementById('h-section').style.display = 'block';
    document.getElementById('rice-box').style.display = 'none';
    document.getElementById('tab-food').className = 'tab-btn';
    document.getElementById('tab-weight').className = 'tab-btn';
    document.getElementById('tab-habit').className = 'tab-btn active';
    renderHabits();
    return;
  }
  // food tab
  weightUnlocked = false;
  document.getElementById('sections').style.display = 'block';
  document.getElementById('w-section').style.display = 'none';
  document.getElementById('h-section').style.display = 'none';
  document.getElementById('rice-box').style.display = '';
  document.getElementById('tab-food').className = 'tab-btn active';
  document.getElementById('tab-weight').className = 'tab-btn';
  document.getElementById('tab-habit').className = 'tab-btn';
}
function doShowWeight() {
  document.getElementById('sections').style.display = 'none';
  document.getElementById('w-section').style.display = 'block';
  document.getElementById('h-section').style.display = 'none';
  document.getElementById('rice-box').style.display = 'none';
  document.getElementById('tab-food').className = 'tab-btn';
  document.getElementById('tab-weight').className = 'tab-btn active';
  document.getElementById('tab-habit').className = 'tab-btn';
  renderWeightSection();
}

//
function getTotals(keys) {
  return (keys || ['morning','lunch','snack','dinner']).reduce((a, k) => {
    (mealData[k]||[]).forEach(e => {
      a.calories += e.total?.calories || 0;
      a.fat      += e.total?.fat      || 0;
      a.carbs    += e.total?.carbs    || 0;
      a.protein  += e.total?.protein  || 0;
    });
    return a;
  }, {calories:0, fat:0, carbs:0, protein:0});
}

//
function renderGauge(t) {
  const pct = Math.min(1, t.calories / goalCal);
  const over = t.calories > goalCal;
  const color = over ? '#ef4444' : pct > 0.85 ? '#f97316' : pct > 0.55 ? '#f59e0b' : '#22d3ee';
  const arc = document.getElementById('gauge-arc');
  arc.style.strokeDashoffset = 2 * Math.PI * 76 * (1 - pct);
  arc.style.stroke = color;
  const calEl = document.getElementById('gauge-cal');
  calEl.textContent = t.calories;
  calEl.style.color = color;
  const remEl = document.getElementById('gauge-rem');
  remEl.textContent = over ? `+${t.calories - goalCal} kcal 超過` : `残り ${goalCal - t.calories} kcal`;
  remEl.style.color = over ? '#ef4444' : '#666';
  document.getElementById('gauge-sub').innerHTML = `目標 ${goalCal} kcal<br>ご飯 ${goalRice}g/日`;
}

//
function renderMacros(t) {
  const G = {fat:60, carbs:220, protein:80};
  ['fat','carbs','protein'].forEach(k => {
    document.getElementById(k+'-val').textContent = t[k] + 'g';
    const bar = document.getElementById(k+'-bar');
    bar.style.width = Math.min(100, t[k]/G[k]*100) + '%';
  });
  document.getElementById('fat-bar').style.background    = t.fat     > G.fat     ? '#ef4444' : '#ec4899';
  document.getElementById('carbs-bar').style.background  = t.carbs   > G.carbs   ? '#ef4444' : '#818cf8';
  document.getElementById('protein-bar').style.background= t.protein > G.protein ? '#ef4444' : '#22d3ee';
}

//
function renderSeg() {
  const bar = document.getElementById('seg-bar');
  const legend = document.getElementById('seg-legend');
  bar.innerHTML = ''; legend.innerHTML = '';
  MEALS.forEach(m => {
    const cal = (mealData[m.key]||[]).reduce((s,e)=>s+(e.total?.calories||0),0);
    const d = document.createElement('div');
    d.style.cssText = `width:${Math.min(100,cal/goalCal*100)}%;background:${m.color};transition:width .5s`;
    bar.appendChild(d);
    const item = document.createElement('div');
    item.className = 'seg-item';
    item.innerHTML = `<div class="seg-dot" style="background:${m.color}"></div>${m.label}<span style="color:${cal>0?m.color:'#333'}">${cal>0?cal:'—'}</span>`;
    legend.appendChild(item);
  });
}

//
function renderRice() {
  const box = document.getElementById('rice-box');
  const cnt = document.getElementById('rice-content');
  const sf = getTotals(['morning','lunch','snack']);
  if (!sf.calories) { box.style.display='none'; return; }
  box.style.display = 'block';
  if ((mealData.dinner||[]).length > 0) {
    // Hide rice box when summary is shown
    box.style.display = 'none';
    return;
  }
  const totalCarbsAsRice = Math.round(sf.carbs / 37 * 100);
  const riceRem = Math.max(0, goalRice - totalCarbsAsRice);
  const remCal = goalCal - sf.calories;
  const riceKcal = Math.round(riceRem * 1.68);
  const bowl = riceRem >= 250 ? '大盛り' : riceRem >= 180 ? '普通盛り' : riceRem >= 120 ? '小盛り' : riceRem >= 60 ? '少量' : 'なし';
  cnt.innerHTML = riceRem <= 0
    ? `糖質がご飯目標に達しています。夕食は <span style="color:#f59e0b;font-weight:700">ご飯なし</span> でおかず中心に。残り ${remCal} kcal。`
    : `糖質合計 ${sf.carbs}g → ご飯換算 ${totalCarbsAsRice}g（目標 ${goalRice}g）<br>🍚 夕食のご飯 <span style="color:#10b981;font-weight:700;font-size:17px">${riceRem}g（${bowl}）</span><br><span style="font-size:12px;color:#555">ご飯で ${riceKcal} kcal・おかずで残り ${remCal - riceKcal} kcal</span>`;
}

//
function renderSections() {
  const sec = document.getElementById('sections');
  sec.innerHTML = '';
  MEALS.forEach(m => {
    const entries = mealData[m.key] || [];
    const total = entries.reduce((s,e)=>s+(e.total?.calories||0),0);
    const isOpen = openSecs[m.key];
    const miniW = Math.min(100, total/(goalCal*0.35)*100);
    const myFavs = favorites.filter(f => f.mealKey === m.key || !f.mealKey);

    const div = document.createElement('div');
    div.className = 'meal-sec';
    if (entries.length > 0) div.style.borderColor = m.color + '30';

    const entriesHTML = entries.map((e,i) => `
      <div class="entry">
        <div class="entry-hdr" onclick="toggleEntry('${m.key}',${i})">
          <div class="entry-text">
            <div class="entry-name">${e.input}</div>
            <div class="entry-nums">
              <span class="entry-kcal">${e.total?.calories||0} kcal</span>
              <span>脂 ${e.total?.fat||0}g</span>
              <span>糖 ${e.total?.carbs||0}g</span>
              <span>P ${e.total?.protein||0}g</span>
            </div>
          </div>
          <button class="fav-star" onclick="event.stopPropagation();toggleFav('${m.key}',${i})" title="お気に入り">${favorites.some(f=>f.input===e.input)?'⭐':'☆'}</button>
          <button class="entry-del" onclick="event.stopPropagation();deleteEntry('${m.key}',${i})">✕</button>
        </div>
        <div class="entry-detail" id="det-${m.key}-${i}" style="display:${e.advice ? 'block' : 'none'}">
          ${(e.meals||[]).map(f=>`<div class="entry-row"><span>${f.name} <span style="color:#333">(${f.amount})</span></span><span>${f.calories} kcal</span></div>`).join('')}
          ${e.advice ? `<div class="advice-box">💬 ${e.advice}</div>` : ''}
        </div>
      </div>`).join('');

    const favsHTML = myFavs.length ? `<div class="fav-chips">${myFavs.map((f,fi)=>`
      <div class="fav-chip" onclick="applyFav('${m.key}',${favorites.indexOf(f)})">
        ⭐ ${f.input.length>12?f.input.slice(0,12)+'…':f.input}
        <span class="fav-chip-kcal">${f.total?.calories||0}kcal</span>
        <span class="fav-chip-del" onclick="event.stopPropagation();deleteFav(${favorites.indexOf(f)})">✕</span>
      </div>`).join('')}</div>` : '';

    const quickHTML = m.key === 'morning' ? `<div class="quick-btns">${
      QUICK_MORNING.map(q=>`<button class="quick-btn" onclick="addQuick('morning','${q.name}',${q.cal},${q.fat},${q.carbs},${q.protein})">${q.name}</button>`).join('')
    }</div>` : '';

    const aeteBtnHTML = m.key === 'lunch' ? `<button class="aete-btn" onclick="openAete('lunch')">🍱 あえて</button>` : '';

    div.innerHTML = `
      <div class="meal-hdr" onclick="toggleSec('${m.key}')">
        <span style="font-size:18px">${m.emoji}</span>
        <div class="meal-info">
          <div class="meal-title-row">
            <span class="meal-name">${m.label}</span>
            ${total > 0 ? `<span class="meal-kcal" style="color:${m.color}">${total} kcal</span>` : ''}
            ${entries.length > 0 ? `<span class="meal-cnt">${entries.length}件</span>` : ''}
          </div>
          <div class="meal-mini"><div class="meal-mini-fill" style="width:${miniW}%;background:${m.color}"></div></div>
        </div>
        <span style="color:#333;font-size:11px">${isOpen?'▲':'▼'}</span>
      </div>
      ${isOpen ? `<div class="meal-body">
        ${entriesHTML}
        ${favsHTML}
        ${quickHTML}
        <div class="input-box">
          <textarea id="ta-${m.key}" rows="2" placeholder="${m.label}を入力… 例: ご飯1杯・鮭の塩焼き" style="width:100%;background:none;border:none;color:#ccc;font-size:13px;line-height:1.6"></textarea>
          <div class="input-footer">
            <span class="input-hint">Enterで送信</span>
            <div class="input-btns">
              ${aeteBtnHTML}
              <button class="analyze-btn" id="btn-${m.key}" onclick="analyze('${m.key}')" style="background:${m.color};color:#000">解析する</button>
            </div>
          </div>
          <div class="err-msg" id="err-${m.key}"></div>
        </div>
      </div>` : ''}`;
    sec.appendChild(div);

    if (isOpen) {
      const ta = document.getElementById(`ta-${m.key}`);
      if (ta) ta.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); analyze(m.key); }
      });
    }
  });
}

function renderAll() {
  const t = getTotals();
  renderGauge(t);
  renderMacros(t);
  renderSeg();
  renderSections();
  renderRice();
  renderSummary();
}

//
function toggleSec(key) { openSecs[key] = !openSecs[key]; renderAll(); }
function toggleEntry(key, i) {
  const el = document.getElementById(`det-${key}-${i}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function deleteEntry(key, i) { mealData[key].splice(i, 1); saveMealData(); renderAll(); }

function toggleFav(key, i) {
  const entry = mealData[key][i];
  if (!entry) return;
  const idx = favorites.findIndex(f => f.input === entry.input);
  if (idx >= 0) { favorites.splice(idx, 1); }
  else { favorites.push({...entry, mealKey: key}); }
  save('c_favs', favorites);
  renderAll();
}
function applyFav(key, fi) {
  const f = favorites[fi];
  if (!f) return;
  mealData[key].push({...f, id: Date.now()});
  saveMealData();
  renderAll();
}
function deleteFav(fi) { favorites.splice(fi, 1); save('c_favs', favorites); renderAll(); }

function addQuick(key, name, cal, fat, carbs, protein) {
  mealData[key].push({
    input: name,
    meals: [{name, calories:cal, fat, carbs, protein, amount:'1食分'}],
    total: {calories:cal, fat, carbs, protein},
    advice: '', score: 7, id: Date.now()
  });
  saveMealData();
  renderAll();
}

async function analyze(mealKey) {
  const ta = document.getElementById(`ta-${mealKey}`);
  const btn = document.getElementById(`btn-${mealKey}`);
  const err = document.getElementById(`err-${mealKey}`);
  const text = ta.value.trim();
  if (!text) return;
  const color = MEALS.find(m=>m.key===mealKey).color;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 解析中…';
  btn.style.background = '#1a1a2e'; btn.style.color = '#555';
  err.style.display = 'none';
  try {
    const res = await fetch('/api/analyze', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text, apiKey}),
    });
    const parsed = await res.json();
    if (!res.ok) throw new Error(parsed.error || 'HTTP ' + res.status);
    mealData[mealKey].push({input:text, ...parsed, id:Date.now()});
    saveMealData();
    ta.value = '';
    renderAll();
  } catch(e) {
    err.textContent = '⚠️ ' + e.message;
    err.style.display = 'block';
  }
  btn.disabled = false; btn.innerHTML = '解析する';
  btn.style.background = color; btn.style.color = '#000';
}

//
const AETE_DB = AETE_DB_DATA;


function openAete(key) {
  aeteMealKey = key;
  document.getElementById('aete-search').value = '';
  renderAeteList();
  document.getElementById('aete-modal').style.display = 'flex';
}
function renderAeteList() {
  const q = document.getElementById('aete-search').value.toLowerCase();
  const filtered = q ? AETE_DB.filter(i=>i.name.toLowerCase().includes(q)) : AETE_DB;
  document.getElementById('aete-list').innerHTML = filtered.map(item=>`
    <div onclick="applyAete(${item.id})" style="padding:12px 14px;border-bottom:1px solid #0f0f1c;cursor:pointer;display:flex;justify-content:space-between;align-items:center">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:#ccc;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">No.${item.id} ${item.name}</div>
        <div style="font-size:11px;color:#555;display:flex;gap:10px">
          <span style="color:#f59e0b">${item.calories}kcal</span>
          <span>脂${item.fat}g</span>
          <span>糖${item.sugar||item.carbs}g</span>
          <span>P${item.protein}g</span>
        </div>
      </div>
      <span style="color:#818cf8;font-size:20px;margin-left:10px;flex-shrink:0">+</span>
    </div>`).join('') || '<div style="padding:20px;text-align:center;color:#555;font-size:13px">見つかりません</div>';
}
function applyAete(id) {
  const item = AETE_DB.find(x=>x.id===id);
  if (!item) return;
  mealData[aeteMealKey].push({
    input: `あえて、No.${item.id} ${item.name}`,
    meals: [{name:item.name, calories:item.calories, fat:item.fat, carbs:item.carbs, protein:item.protein, amount:'1食'}],
    total: {calories:item.calories, fat:item.fat, carbs:item.carbs, protein:item.protein},
    advice: `糖質${item.sugar||item.carbs}g・タンパク質${item.protein}gで栄養バランスの良いお弁当です。`,
    score: 8, id: Date.now()
  });
  saveMealData();
  renderAll();
  closeModal('aete-modal');
}

//
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + day;
}

function saveWeight() {
  const v = parseFloat(document.getElementById('w-input').value);
  if (!v || v < 20 || v > 300) return;
  weightData[todayStr()] = v;
  save('c_weight', weightData);
  renderWeightSection();
}

function renderWeightSection() {
  const today = todayStr();
  if (weightData[today]) document.getElementById('w-input').value = weightData[today];
  const cmp = document.getElementById('w-compare');
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  const yKey = yest.toISOString().slice(0,10);
  const tVal = weightData[today], yVal = weightData[yKey];
  if (tVal && yVal) {
    const diff = (tVal-yVal).toFixed(1);
    const color = diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : '#555';
    const emoji = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
    cmp.innerHTML = `<span style="color:${color};font-size:15px;font-weight:700">${emoji} 前日比 ${diff>0?'+':''}${diff} kg</span>`;
  } else { cmp.textContent = tVal ? '前日のデータなし' : ''; }
  drawChart();
  const keys = Object.keys(weightData).sort().slice(-7).reverse();
  document.getElementById('w-list').innerHTML = keys.map(k => {
    const d = new Date(k+'T00:00:00');
    const label = d.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
    const val = weightData[k];
    const allKeys = Object.keys(weightData).sort();
    const prev = weightData[allKeys[allKeys.indexOf(k)-1]];
    let diffStr = '';
    if (prev) { const df=(val-prev).toFixed(1); diffStr=`<span style="font-size:11px;color:${df>0?'#ef4444':df<0?'#10b981':'#555'}">${df>0?'+':''}${df}</span>`; }
    const isT = k === today;
    return `<div class="w-list-item"><span style="color:${isT?'#818cf8':'#666'}">${label}${isT?' 今日':''}</span><div style="display:flex;align-items:center;gap:8px">${diffStr}<span style="font-family:monospace;font-size:14px;color:${isT?'#818cf8':'#ccc'};font-weight:${isT?700:400}">${val} kg</span></div></div>`;
  }).join('');
}

function drawChart() {
  const canvas = document.getElementById('w-chart');
  if (!canvas) return;
  const W = canvas.offsetWidth||320, H = 160, dpr = window.devicePixelRatio||1;
  canvas.width = W*dpr; canvas.height = H*dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const days = Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(13-i));return d.toISOString().slice(0,10);});
  const vals = days.map(d=>weightData[d]||null);
  const valid = vals.filter(v=>v!==null);
  if (!valid.length) { ctx.fillStyle='#333';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('データがありません',W/2,H/2);return; }
  const minV=Math.min(...valid)-1, maxV=Math.max(...valid)+1;
  const pad={t:14,b:22,l:30,r:10}, gW=W-pad.l-pad.r, gH=H-pad.t-pad.b;
  const xS=i=>pad.l+i/13*gW, yS=v=>pad.t+gH-(v-minV)/(maxV-minV)*gH;
  ctx.strokeStyle='#1a1a2e';ctx.lineWidth=1;
  [0,1,2,3].forEach(i=>{const y=pad.t+i/3*gH;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillStyle='#333';ctx.font='9px monospace';ctx.textAlign='right';ctx.fillText((maxV-i/3*(maxV-minV)).toFixed(1),pad.l-3,y+3);});
  days.forEach((d,i)=>{if(i%2===0){const dd=new Date(d+'T00:00:00');ctx.fillStyle='#333';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(`${dd.getMonth()+1}/${dd.getDate()}`,xS(i),H-4);}});
  const pts=vals.map((v,i)=>v!==null?{x:xS(i),y:yS(v)}:null).filter(Boolean);
  if (!pts.length) return;
  ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x,H-pad.b);ctx.lineTo(pts[0].x,H-pad.b);ctx.closePath();
  ctx.fillStyle='rgba(129,140,248,0.12)';ctx.fill();
  ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.strokeStyle='#818cf8';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  const today=todayStr();
  vals.forEach((v,i)=>{if(!v)return;const isT=days[i]===today;ctx.beginPath();ctx.arc(xS(i),yS(v),isT?5:3,0,Math.PI*2);ctx.fillStyle='#818cf8';ctx.fill();if(isT){ctx.beginPath();ctx.arc(xS(i),yS(v),5,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}});
}

//
// Habit functions
function addHabit() {
  const input = document.getElementById('habit-input');
  const name = input.value.trim();
  if (!name) return;
  habits.push({id: Date.now(), name});
  save('c_habits', habits);
  input.value = '';
  renderHabits();
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  save('c_habits', habits);
  renderHabits();
}

function toggleHabit(id) {
  if (!habitChecks[currentDate]) habitChecks[currentDate] = {};
  habitChecks[currentDate][id] = !habitChecks[currentDate][id];
  save('c_habit_checks', habitChecks);
  renderHabits();
}

function renderHabits() {
  const list = document.getElementById('habit-list');
  if (!list) return;
  const checks = habitChecks[currentDate] || {};
  const doneCount = habits.filter(h => checks[h.id]).length;
  const total = habits.length;

  if (habits.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:#333;font-size:13px;padding:30px">習慣を追加してください</div>';
    return;
  }

  // Progress bar
  const pct = total > 0 ? Math.round(doneCount/total*100) : 0;
  list.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:6px">
        <span>今日の達成</span>
        <span style="color:${pct===100?'#10b981':'#818cf8'}">${doneCount}/${total} (${pct}%)</span>
      </div>
      <div style="height:6px;background:#1a1a2e;border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct===100?'#10b981':'#818cf8'};border-radius:99px;transition:width .5s"></div>
      </div>
    </div>
    ${habits.map(h => {
      const done = !!checks[h.id];
      return `<div class="habit-item">
        <button class="habit-check ${done?'done':''}" onclick="toggleHabit(${h.id})">
          ${done ? '✓' : ''}
        </button>
        <span class="habit-name ${done?'done':''}">${h.name}</span>
        <button class="habit-del" onclick="deleteHabit(${h.id})">✕</button>
      </div>`;
    }).join('')}
  `;
}

function renderSummary() {
  const existing = document.getElementById('daily-summary');
  if (existing) existing.remove();

  const all = getTotals();
  if (all.calories === 0) return;

  // Check if all 4 meals have entries
  const allMealsDone = MEALS.every(m => (mealData[m.key]||[]).length > 0);

  // Always show summary if any data exists, highlight if complete
  const remCal = goalCal - all.calories;
  const over = all.calories > goalCal;
  const pfc_p = Math.round(all.protein * 4 / all.calories * 100);
  const pfc_f = Math.round(all.fat * 9 / all.calories * 100);
  const pfc_c = Math.round(all.carbs * 4 / all.calories * 100);

  let grade = '';
  let comment = '';
  let color = '#818cf8';

  if (allMealsDone) {
    if (!over && pfc_p >= 20 && pfc_f <= 30) {
      grade = '🏆 完璧なバランス！';
      comment = `素晴らしい1日でした！カロリーは目標内に収まり、PFCバランスもP${pfc_p}%・F${pfc_f}%・C${pfc_c}%と理想的です。タンパク質もしっかり摂れていて、筋肉を維持しながらダイエットできています。この調子を続けましょう！`;
      color = '#10b981';
    } else if (!over && pfc_p >= 15) {
      grade = '👍 よく頑張りました！';
      comment = `カロリーは目標内に収まりました。PFCバランスはP${pfc_p}%・F${pfc_f}%・C${pfc_c}%です。タンパク質をもう少し増やすと（肉・魚・卵・豆腐など）、筋肉を維持しながらより効果的なダイエットになります。`;
      color = '#f59e0b';
    } else if (over && (all.calories - goalCal) <= 100) {
      grade = '😅 惜しい！';
      comment = `目標まであと少しでした。${all.calories - goalCal}kcalのオーバーです。夕食のおかずを少し減らすか、おやつを控えると目標に届きます。明日また頑張りましょう！`;
      color = '#f97316';
    } else if (over) {
      grade = '⚠️ カロリー超過';
      comment = `今日は目標より${all.calories - goalCal}kcal多く摂取しました。糖質が${all.carbs}gと多めです。明日はご飯の量を少し減らして、野菜やタンパク質を増やしてみましょう。1日の超過は取り戻せます！`;
      color = '#ef4444';
    } else {
      grade = '🌱 まずまず';
      comment = `カロリーは目標内です。PFCバランスはP${pfc_p}%・F${pfc_f}%・C${pfc_c}%。タンパク質を意識して摂ると体型維持に効果的です。引き続き頑張りましょう！`;
      color = '#818cf8';
    }
  } else {
    comment = `現在 ${all.calories} kcal摂取中。残り ${Math.max(0, remCal)} kcal。全食事を記録すると詳しい総評が表示されます。`;
    color = '#555';
  }

  const div = document.createElement('div');
  div.id = 'daily-summary';
  div.style.cssText = `margin:10px 14px 0;background:#09090f;border:1px solid ${color}30;border-radius:14px;padding:14px`;
  div.innerHTML = `
    <div style="font-size:10px;color:${color};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">📊 今日の総評${grade ? ' ' + grade : ''}</div>
    <div style="font-size:13px;color:#ccc;line-height:1.7">${comment}</div>
    ${allMealsDone ? `<div style="display:flex;gap:8px;margin-top:10px">
      <div style="flex:1;background:#0f0f1a;border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#555;margin-bottom:2px">P</div>
        <div style="font-size:14px;font-weight:700;color:#22d3ee">${pfc_p}%</div>
      </div>
      <div style="flex:1;background:#0f0f1a;border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#555;margin-bottom:2px">F</div>
        <div style="font-size:14px;font-weight:700;color:#ec4899">${pfc_f}%</div>
      </div>
      <div style="flex:1;background:#0f0f1a;border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#555;margin-bottom:2px">C</div>
        <div style="font-size:14px;font-weight:700;color:#818cf8">${pfc_c}%</div>
      </div>
    </div>` : ''}
  `;

  // Insert after rice-box
  const riceBox = document.getElementById('rice-box');
  riceBox.parentNode.insertBefore(div, riceBox.nextSibling);
}

function startApp() {
  currentDate = todayStr();
  loadMealData();
  updateDateLabel();
  renderAll();
}

load();
if (apiKey) {
  document.getElementById('api-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  startApp();
}
