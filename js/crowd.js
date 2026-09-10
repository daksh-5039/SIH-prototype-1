/* ============================================================
   crowd.js
   Logic for crowd.html (Crowd & Peak Hours page) only.
   Depends on Chart.js (loaded via CDN in crowd.html).
   Load AFTER data.js, nav.js and common.js.
   ============================================================ */

let peakChartInstance = null;

/* ============ CROWD + PEAK HOUR VIEW ============ */
function renderCrowd(){
  renderChips('crowd-chips', renderCrowdDetail);
  renderCrowdDetail();
}
function renderCrowdDetail(){
  document.querySelectorAll('#crowd-chips .dest-chip').forEach(c=>c.classList.toggle('active', c.dataset.id===getCurrentDest()));
  const d = destinations.find(x=>x.id===getCurrentDest());
  const ctx = document.getElementById('peakChart').getContext('2d');
  if(peakChartInstance) peakChartInstance.destroy();
  peakChartInstance = new Chart(ctx, {
    type:'bar',
    data:{ labels: Array.from({length:24},(_,i)=>i+':00'),
      datasets:[{ data:d.hourly, backgroundColor: d.hourly.map(v=> v>=70? '#e0432e' : v>=40? '#e08a1e' : '#0f9d78'), borderRadius:3, barPercentage:0.7 }]},
    options:{ responsive:true, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>c.parsed.y+'% capacity'}}},
      scales:{ x:{ticks:{color:'#6b7280',font:{size:10},maxRotation:0,autoSkip:true,maxTicksLimit:8}, grid:{display:false}},
               y:{ticks:{color:'#6b7280',font:{size:10}}, grid:{color:'#e6e8ef'}, max:100} } }
  });
  document.getElementById('crowd-chart-note').textContent = `${d.name} — estimated visitor density by hour, based on historical footfall patterns.`;
  const minVal = Math.min(...d.hourly);
  const bestHourIdx = d.hourly.indexOf(minVal);
  document.getElementById('best-hour-pill').textContent = `Quietest around ${bestHourIdx.toString().padStart(2,'0')}:00 — ${minVal}% capacity`;

  let alertHtml = '';
  if(d.crowd === 'high'){
    const alts = destinations.filter(x=>x.id!==d.id && x.crowd!=='high').slice(0,2);
    alertHtml = `<div class="alert-box"><strong>High crowd alert</strong>${d.name} is running busy right now (${d.crowdReason}). Consider shifting your visit or trying a quieter spot.
      <div class="alt-suggest">${alts.map(a=>`<div class="alt-item"><span>${a.name}</span><span class="crowd-badge crowd-${a.crowd}" style="padding:3px 9px;font-size:11px;">${a.crowd}</span></div>`).join('')}</div></div>`;
  }
  document.getElementById('crowd-status').innerHTML = `
    <h4>Live status</h4>
    <span class="crowd-badge crowd-${d.crowd}"><span class="crowd-dot"></span>${d.crowd.charAt(0).toUpperCase()+d.crowd.slice(1)} crowd right now</span>
    <p style="font-size:13px;color:var(--text-soft);margin-top:10px;">${d.crowdReason}</p>
    ${alertHtml}
  `;
}

