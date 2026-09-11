/* ============================================================
   crowd.js
   Logic for crowd.html (Crowd & Peak Hours page) only.
   Depends on Chart.js (loaded via CDN in crowd.html).
   Load AFTER data.js, nav.js and common.js.
   ============================================================ */

let peakChartInstance = null;
let selectedCrowdPlace = 'city';

/* ============ CROWD + PEAK HOUR VIEW ============ */
function renderCrowd(){
  renderChips('crowd-chips', renderCrowdDetail);
  renderCrowdDetail();
}
function renderCrowdDetail(){
  document.querySelectorAll('#crowd-chips .dest-chip').forEach(c=>c.classList.toggle('active', c.dataset.id===getCurrentDest()));
  const d = destinations.find(x=>x.id===getCurrentDest());
  if(selectedCrowdPlace !== 'city' && !d.connecting.some(place => place.name === selectedCrowdPlace)) selectedCrowdPlace = 'city';
  renderCrowdPlaceScopes(d);
  const profile = selectedCrowdPlace === 'city'
    ? { id:d.id, name:d.name, hourly:d.hourly, isPlace:false }
    : getPlaceCrowdProfile(d, d.connecting.find(place => place.name === selectedCrowdPlace));
  const ctx = document.getElementById('peakChart').getContext('2d');
  if(peakChartInstance) peakChartInstance.destroy();
  peakChartInstance = new Chart(ctx, {
    type:'bar',
    data:{ labels: Array.from({length:24},(_,i)=>i+':00'),
      datasets:[{ data:profile.hourly, backgroundColor: profile.hourly.map(v=> v>=70? '#e0432e' : v>=40? '#e08a1e' : '#0f9d78'), borderRadius:3, barPercentage:0.7 }]},
    options:{ responsive:true, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>c.parsed.y+'% capacity'}}},
      scales:{ x:{ticks:{color:'#6b7280',font:{size:10},maxRotation:0,autoSkip:true,maxTicksLimit:8}, grid:{display:false}},
               y:{ticks:{color:'#6b7280',font:{size:10}}, grid:{color:'#e6e8ef'}, max:100} } }
  });
  document.getElementById('crowd-chart-note').textContent = `${profile.name} — expected visitor density by hour, calculated from its historical footfall pattern.`;
  const minVal = Math.min(...profile.hourly);
  const bestHourIdx = profile.hourly.indexOf(minVal);
  document.getElementById('best-hour-pill').textContent = `Quietest around ${bestHourIdx.toString().padStart(2,'0')}:00 — ${minVal}% capacity`;

  document.getElementById('crowd-status').innerHTML = `
    <h4>Expected crowd now</h4>
    <div id="crowd-forecast-read"></div>
    <p class="crowd-source-note">Free historical-footfall forecast, not a live sensor/camera count. It updates automatically for the current local hour.</p>
    <div class="crowd-forecast-box" id="crowd-forecast-box"></div>
  `;
  renderCrowdForecast(profile);
}

function renderCrowdPlaceScopes(d){
  const scope = document.getElementById('crowd-place-scopes');
  scope.innerHTML = `<span class="scope-label">Viewing</span><button type="button" class="place-scope-chip ${selectedCrowdPlace==='city'?'active':''}" data-place="city">${d.name} city</button>${d.connecting.map(place => `<button type="button" class="place-scope-chip ${selectedCrowdPlace===place.name?'active':''}" data-place="${escapeHtml(place.name)}">${escapeHtml(place.name)}</button>`).join('')}`;
  scope.querySelectorAll('[data-place]').forEach(button => button.addEventListener('click', () => { selectedCrowdPlace = button.dataset.place; renderCrowdDetail(); }));
}

function renderCrowdForecast(d){
  const hour = new Date().getHours();
  const expected = d.hourly[hour];
  const average = Math.round(d.hourly.reduce((sum, value) => sum + value, 0) / d.hourly.length);
  const peak = Math.max(...d.hourly);
  const peakHour = d.hourly.indexOf(peak);
  const quiet = Math.min(...d.hourly);
  const quietHour = d.hourly.indexOf(quiet);
  const level = expected >= 70 ? 'high' : expected >= 40 ? 'medium' : 'low';
  const label = level === 'high' ? 'High expected crowd' : level === 'medium' ? 'Moderate expected crowd' : 'Low expected crowd';
  const read = document.getElementById('crowd-forecast-read');
  const box = document.getElementById('crowd-forecast-box');
  if(read) read.innerHTML = `<span class="crowd-badge crowd-${level}"><span class="crowd-dot"></span>${label}</span><p class="live-read-detail">${String(hour).padStart(2,'0')}:00 forecast: ${expected}% typical capacity</p>`;
  if(box) box.innerHTML = `
    <div><span>All-day average</span><strong>${average}% capacity</strong></div>
    <div><span>Quietest window</span><strong>${String(quietHour).padStart(2,'0')}:00 · ${quiet}%</strong></div>
    <div><span>Typical peak</span><strong>${String(peakHour).padStart(2,'0')}:00 · ${peak}%</strong></div>`;
}
