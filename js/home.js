/* ============================================================
   home.js
   Logic for index.html (Home page) only.
   Load AFTER data.js, nav.js and common.js.
   ============================================================ */

const featureCopy = [
  {t:'Trip planning', d:'How to get there, when to go, and what to see on the way — one card per destination.'},
  {t:'Crowd management', d:'Alerts when your pick is packed, with quieter nearby spots suggested automatically.'},
  {t:'Expense calculator', d:'Give a budget and headcount, get a realistic stay / travel / food / activity split.'},
  {t:'Peak hour insight', d:'A 24-hour density chart so you know exactly when to show up.'},
  {t:'Weather advisory', d:'A clear go / wait / reroute call whenever conditions turn against your plans.'},
  {t:'One connected view', d:'Search a destination once — every tool below updates with it.'}
];
const featureIcons = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 20l-5.5-2V6L9 8m0 12l6-2m-6 2V8m6 10l5.5 2V8L15 6m0 12V6m0 0L9 8"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/><path d="M8 19l4-4 4 4M12 15v9"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6M4.2 4.2l4.2 4.2m7.2 7.2l4.2 4.2M1 12h6m10 0h6M4.2 19.8l4.2-4.2m7.2-7.2l4.2-4.2"/></svg>'
];

/* ============ HOME FEATURE GRID ============ */
function renderFeatureGrid(){
  const grid = document.getElementById('feature-grid');
  grid.innerHTML = featureCopy.map((f,i)=>`
    <div class="feature-card">
      <div class="feature-icon">${featureIcons[i]}</div>
      <h3>${f.t}</h3>
      <p>${f.d}</p>
    </div>`).join('');
}

/* ============ SEARCH BAR ============ */
const searchInput = document.getElementById('dest-search');
const suggestList = document.getElementById('suggest-list');

searchInput.addEventListener('input', ()=>{
  const q = searchInput.value.trim().toLowerCase();
  if(!q){ suggestList.classList.remove('open'); return; }
  const matches = destinations.filter(d=> d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q));
  if(matches.length===0){
    suggestList.innerHTML = `<div class="suggest-item"><span class="sr">No matches — try "Goa" or "Jaipur"</span></div>`;
  } else {
    suggestList.innerHTML = matches.map(d=>`
      <div class="suggest-item" data-id="${d.id}">
        <div><div class="sn">${d.name}</div><div class="sr">${d.region}</div></div>
        <span class="sb crowd-${d.crowd}">${d.crowd}</span>
      </div>`).join('');
  }
  suggestList.classList.add('open');
});
searchInput.addEventListener('keydown', e=>{ if(e.key==='Enter') runSearch(searchInput.value); });
document.getElementById('search-go-btn').addEventListener('click', ()=> runSearch(searchInput.value));
suggestList.addEventListener('click', e=>{
  const item = e.target.closest('.suggest-item[data-id]');
  if(!item) return;
  selectDestinationFromSearch(item.dataset.id);
});
document.querySelectorAll('.ptag').forEach(tag=>{
  tag.addEventListener('click', ()=> selectDestinationFromSearch(tag.dataset.id));
});
document.addEventListener('click', e=>{
  if(!e.target.closest('.search-input-wrap')) suggestList.classList.remove('open');
});
function runSearch(query){
  const q = query.trim().toLowerCase();
  const match = destinations.find(d=> d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q));
  if(match) selectDestinationFromSearch(match.id);
}
function selectDestinationFromSearch(id){
  setCurrentDest(id);
  searchInput.value = destinations.find(d=>d.id===id).name;
  suggestList.classList.remove('open');
  renderQuickPanel(id);
}
function renderQuickPanel(id){
  const d = destinations.find(x=>x.id===id);
  const minVal = Math.min(...d.hourly);
  const bestHourIdx = d.hourly.indexOf(minVal);
  const panel = document.getElementById('quick-panel');
  panel.innerHTML = `
    <div class="qp-head">
      <div><h3>${d.name}</h3><div class="region">${d.region}</div></div>
      <span class="crowd-badge crowd-${d.crowd}"><span class="crowd-dot"></span>${d.crowd.charAt(0).toUpperCase()+d.crowd.slice(1)} crowd right now</span>
    </div>
    <div class="qp-grid">
      <div class="qp-item"><div class="k">Best time to visit</div><div class="v">${d.bestTime}</div></div>
      <div class="qp-item"><div class="k">Quietest hour</div><div class="v">${bestHourIdx.toString().padStart(2,'0')}:00 (${minVal}%)</div></div>
      <div class="qp-item"><div class="k">Getting there</div><div class="v">${d.modes.join(', ')}</div></div>
      <div class="qp-item"><div class="k">Today's weather</div><div class="v">${d.weather.temp}°C, ${d.weather.cond}</div></div>
    </div>
    <div class="qp-actions">
      <button class="qp-btn primary" onclick="navigateTo('planner')">View full trip plan</button>
      <button class="qp-btn" onclick="navigateTo('crowd')">Check peak hours</button>
      <button class="qp-btn" onclick="navigateTo('expense')">Estimate cost</button>
      <button class="qp-btn" onclick="navigateTo('weather')">Weather advisory</button>
    </div>
  `;
  panel.classList.add('show');
  panel.scrollIntoView({behavior:'smooth', block:'center'});
}
