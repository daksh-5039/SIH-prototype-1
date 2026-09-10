/* ============================================================
   crowd.js
   Logic for crowd.html (Crowd & Peak Hours page) only.
   Depends on Chart.js (loaded via CDN in crowd.html).
   Load AFTER data.js, nav.js and common.js.
   ============================================================ */

let peakChartInstance = null;
let unsubscribeCrowdReports = null;
let liveCrowdTimer = null;
const CROWD_REPORT_WINDOW_MS = 30 * 60 * 1000;

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
  document.getElementById('crowd-chart-note').textContent = `${d.name} — historical hourly pattern. The live status uses recent visitor reports.`;
  const minVal = Math.min(...d.hourly);
  const bestHourIdx = d.hourly.indexOf(minVal);
  document.getElementById('best-hour-pill').textContent = `Quietest around ${bestHourIdx.toString().padStart(2,'0')}:00 — ${minVal}% capacity`;

  document.getElementById('crowd-status').innerHTML = `
    <h4>Live community status</h4>
    <div id="live-crowd-read"><span class="crowd-badge crowd-medium"><span class="crowd-dot"></span>Loading recent reports…</span></div>
    <p class="crowd-source-note">Based only on signed-in visitor reports from the last 30 minutes. One active report per traveller.</p>
    <div class="crowd-report-box">
      <strong>Are you at ${d.name} now?</strong>
      <p>Help other travellers by reporting what you see.</p>
      <div class="crowd-report-actions">
        <button data-level="low">Not busy</button><button data-level="medium">Moderate</button><button data-level="high">Very busy</button>
      </div>
      <p class="crowd-report-note" id="crowd-report-note"></p>
    </div>
  `;
  document.querySelectorAll('.crowd-report-actions button').forEach(button => {
    button.addEventListener('click', () => submitCrowdReport(d, button.dataset.level));
  });
  subscribeToLiveCrowd(d);
}

function subscribeToLiveCrowd(d){
  if(unsubscribeCrowdReports) unsubscribeCrowdReports();
  unsubscribeCrowdReports = window.rahiApi?.subscribeCrowd(d.id, reports => renderLiveCrowdRead(d, reports));
  if(!unsubscribeCrowdReports) renderLiveCrowdRead(d, []);
}

function renderLiveCrowdRead(d, reports){
  if(getCurrentDest() !== d.id) return;
  if(liveCrowdTimer) clearTimeout(liveCrowdTimer);
  const now = Date.now();
  const active = reports.filter(report => report.reportedAt?.toDate && now - report.reportedAt.toDate().getTime() <= CROWD_REPORT_WINDOW_MS);
  const read = document.getElementById('live-crowd-read');
  if(!read) return;
  if(active.length === 0){
    read.innerHTML = `<span class="crowd-badge crowd-medium"><span class="crowd-dot"></span>No recent traveller reports</span><p class="live-read-detail">Be the first verified traveller to report current conditions.</p>`;
    return;
  }
  const weights = {low:1, medium:2, high:3};
  const average = active.reduce((sum, report) => sum + weights[report.level], 0) / active.length;
  const level = average < 1.66 ? 'low' : average < 2.34 ? 'medium' : 'high';
  const label = {low:'Low crowd', medium:'Moderate crowd', high:'High crowd'}[level];
  const latest = Math.max(...active.map(report => report.reportedAt.toDate().getTime()));
  const minutes = Math.max(0, Math.floor((now - latest) / 60000));
  read.innerHTML = `<span class="crowd-badge crowd-${level}"><span class="crowd-dot"></span>${label} right now</span><p class="live-read-detail">${active.length} recent report${active.length===1?'':'s'} · last update ${minutes === 0 ? 'just now' : `${minutes} min ago`}</p>`;
  const nextExpiry = Math.min(...active.map(report => report.reportedAt.toDate().getTime() + CROWD_REPORT_WINDOW_MS));
  liveCrowdTimer = setTimeout(() => renderLiveCrowdRead(d, reports), Math.max(1000, nextExpiry - Date.now() + 50));
}

async function submitCrowdReport(d, level){
  const note = document.getElementById('crowd-report-note');
  if(!window.rahiApi?.currentUser()) { window.rahiApi?.requireUser(); return; }
  note.textContent = 'Saving your live report…';
  try {
    await window.rahiApi.reportCrowd(d.id, level);
    note.textContent = 'Thanks—your report is live for the next 30 minutes.';
  } catch(error) {
    note.textContent = 'Could not save your report. Please try again.';
  }
}
