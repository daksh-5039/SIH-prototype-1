/* ============================================================
   common.js
   Small pieces shared by more than one page (but not nav-related).
   Load AFTER data.js.
   ============================================================ */

/* ============ DESTINATION CHIPS (shared by planner/crowd/weather) ============ */
function renderChips(containerId, onSelect){
  const el = document.getElementById(containerId);
  const current = getCurrentDest();
  el.innerHTML = destinations.map(d=>`<button class="dest-chip ${d.id===current?'active':''}" data-id="${d.id}">${d.name}</button>`).join('');
  el.querySelectorAll('.dest-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{ setCurrentDest(chip.dataset.id); onSelect(); });
  });
}
