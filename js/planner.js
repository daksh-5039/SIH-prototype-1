/* ============================================================
   planner.js
   Logic for planner.html (Trip Planner page) only.
   Load AFTER data.js, nav.js and common.js.
   ============================================================ */

/* ============ PLANNER VIEW ============ */
const selectedMode = {};   // destId -> mode name
const addedPlaces = {};    // destId -> Set of place names
const reviewDraft = {};    // destId -> current star rating being picked
const remoteReviews = {};  // Firestore reviews grouped by destination

function renderPlanner(){
  renderChips('planner-chips', renderPlannerAll);
  renderPlannerAll();
}
function renderPlannerAll(){
  const d = destinations.find(x=>x.id===getCurrentDest());
  if(!selectedMode[d.id]) selectedMode[d.id] = d.travelOptions[0].mode;
  if(!addedPlaces[d.id]) addedPlaces[d.id] = new Set();
  renderPlannerDetail(d);
  renderSelectedModeCard(d);
  renderTravelOptions(d);
  renderConnectingGrid(d);
  renderReviews(d);
}
function renderPlannerDetail(d){
  document.querySelectorAll('#planner-chips .dest-chip').forEach(c=>c.classList.toggle('active', c.dataset.id===getCurrentDest()));
  document.getElementById('planner-detail').innerHTML = `
    <h3>${d.name}</h3>
    <div class="dest-region-tag">${d.region}</div>
    <p style="color:var(--text-soft);font-size:14px;">${d.travelNote}</p>
    <div class="dest-meta-grid">
      <div class="meta-block"><div class="k">Best time to visit</div><div class="v">${d.bestTime}</div></div>
      <div class="meta-block"><div class="k">Current crowd read</div><div style="margin-top:2px;"><span class="crowd-badge crowd-${d.crowd}"><span class="crowd-dot"></span>${d.crowd.charAt(0).toUpperCase()+d.crowd.slice(1)}</span></div></div>
    </div>
  `;
}
function renderSelectedModeCard(d){
  const opt = d.travelOptions.find(o=>o.mode===selectedMode[d.id]);
  const added = addedPlaces[d.id];
  document.getElementById('planner-selected-mode').innerHTML = `
    <h4>Your trip snapshot</h4>
    <div class="meta-block" style="margin-bottom:16px;">
      <div class="k">Travelling by</div>
      <div class="v" style="font-size:16px;margin-top:4px;">${opt.mode} · ${opt.duration}</div>
      <div style="font-size:12.5px;color:var(--text-soft);margin-top:3px;">${opt.cost}</div>
    </div>
    <div class="divider"></div>
    <div class="meta-block">
      <div class="k">Places added to plan</div>
      ${added.size===0
        ? `<div style="font-size:13px;color:var(--text-soft);margin-top:6px;">None yet — tap a nearby place below to add it.</div>`
        : `<ul class="connecting-list" style="margin-top:8px;">${[...added].map(n=>`<li><span class="conn-name">${n}</span></li>`).join('')}</ul>`}
    </div>
    <button class="save-trip-btn" onclick="savePlannerTrip('${d.id}')">Save this itinerary</button>
    <p class="save-trip-note" id="save-trip-note"></p>
  `;
}
async function savePlannerTrip(destId){
  const d = destinations.find(x=>x.id===destId);
  const note = document.getElementById('save-trip-note');
  try {
    await window.rahiApi.saveTrip({destinationId:d.id, destinationName:d.name, travelMode:selectedMode[d.id], places:[...addedPlaces[d.id]]});
    note.textContent = 'Saved to your account.';
  } catch (error) { if (note && window.rahiApi.currentUser()) note.textContent = error.message; }
}

const travelIcons = {
  Flight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5c.8-.8.8-2 0-2.8-.8-.8-2-.8-2.8 0L13.2 8.2 5 6.4 3.4 8l6.1 3.4-3 3-2.4-.4L2.4 15.6l3 1.4 1.4 3 1.6-1.6-.4-2.4 3-3L14.4 20l1.6-1.6z"/></svg>',
  Train:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="13" rx="3"/><path d="M4 11h16M8 19l-2 3M16 19l2 3"/><circle cx="8.5" cy="14.5" r="0.6" fill="currentColor"/><circle cx="15.5" cy="14.5" r="0.6" fill="currentColor"/></svg>',
  Road:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14l-2-11H7L5 17z"/><path d="M9 17v3M15 17v3M12 4v2M12 9v2M12 14v1"/></svg>'
};
function renderTravelOptions(d){
  document.getElementById('travel-options').innerHTML = d.travelOptions.map(o=>`
    <div class="travel-option ${selectedMode[d.id]===o.mode?'selected':''}" data-mode="${o.mode}">
      <div class="to-head">
        <div class="to-icon">${travelIcons[o.mode]}</div>
        <div><div class="to-mode">${o.mode}</div><div class="to-duration">${o.duration}</div></div>
      </div>
      <div class="to-cost">${o.cost}</div>
      <div class="to-desc">${o.desc}</div>
      <div class="to-pick">${selectedMode[d.id]===o.mode
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Selected'
        : 'Choose this option'}</div>
    </div>
  `).join('');
  document.querySelectorAll('#travel-options .travel-option').forEach(card=>{
    card.addEventListener('click', ()=>{
      selectedMode[d.id] = card.dataset.mode;
      renderTravelOptions(d);
      renderSelectedModeCard(d);
    });
  });
}

function renderConnectingGrid(d){
  document.getElementById('conn-grid').innerHTML = d.connecting.map((c,i)=>`
    <div class="conn-card" data-idx="${i}">
      <div class="cc-top">
        <div><div class="cc-name">${c.name}</div><div class="cc-dist">${c.dist} away</div></div>
        <svg class="cc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="cc-body"><div class="cc-body-inner">
        <span class="cc-time">${c.time}</span>
        <p class="cc-desc">${c.desc}</p>
        <button class="cc-add ${addedPlaces[d.id].has(c.name)?'added':''}" data-name="${c.name}">${addedPlaces[d.id].has(c.name)?'✓ Added to plan':'+ Add to plan'}</button>
      </div></div>
    </div>
  `).join('');
  document.querySelectorAll('#conn-grid .conn-card').forEach(card=>{
    card.addEventListener('click', e=>{
      if(e.target.closest('.cc-add')){
        e.stopPropagation();
        const name = e.target.closest('.cc-add').dataset.name;
        if(addedPlaces[d.id].has(name)) addedPlaces[d.id].delete(name); else addedPlaces[d.id].add(name);
        renderConnectingGrid(d);
        renderSelectedModeCard(d);
        return;
      }
      card.classList.toggle('expanded');
    });
  });
}

/* ============ REVIEWS ============ */
async function renderReviews(d){
  if (remoteReviews[d.id] === undefined && window.rahiApi?.configured()) {
    try { remoteReviews[d.id] = await window.rahiApi.getReviews(d.id); }
    catch (error) { remoteReviews[d.id] = []; console.warn('Could not load reviews', error); }
    if (getCurrentDest() === d.id) return renderReviews(d);
  }
  const reviews = [...(remoteReviews[d.id] || []), ...d.reviews];
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length) : 0;
  const counts = [5,4,3,2,1].map(star=> reviews.filter(r=>r.rating===star).length);
  const maxCount = Math.max(1, ...counts);
  if(reviewDraft[d.id]===undefined) reviewDraft[d.id] = 5;

  document.getElementById('reviews-section').innerHTML = `
    <div class="reviews-summary">
      <div class="rs-score">
        <div class="n">${avg.toFixed(1)}</div>
        <div class="rs-stars">${starString(Math.round(avg))}</div>
        <div class="rs-count">${reviews.length} review${reviews.length!==1?'s':''}</div>
      </div>
      <div class="rs-bars">
        ${[5,4,3,2,1].map((star,i)=>`
          <div class="rs-bar-row"><span class="rb-label">${star}★</span>
            <div class="rs-bar-track"><div class="rs-bar-fill" style="width:${(counts[i]/maxCount)*100}%;"></div></div>
            <span>${counts[i]}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="review-list">
      ${reviews.length===0 ? `<p style="font-size:13px;color:var(--text-soft);">No reviews yet — be the first to share your experience.</p>` :
        reviews.map(r=>`
        <div class="review-card">
          <div class="review-top"><span class="review-name">${escapeHtml(r.name)}</span><span class="review-date">${r.date}</span></div>
          <div class="review-stars">${starString(r.rating)}</div>
          <p class="review-text">${escapeHtml(r.text)}</p>
        </div>`).join('')}
    </div>
    <div class="review-form">
      <h4 style="font-size:15px;">Visited ${d.name}? Share your review</h4>
      <div class="star-picker" id="star-picker">
        ${[1,2,3,4,5].map(s=>`<button type="button" data-star="${s}" class="${s<=reviewDraft[d.id]?'active':''}">★</button>`).join('')}
      </div>
      <textarea id="review-text-input" placeholder="What was your experience like?"></textarea>
      <button class="calc-btn" style="margin-top:12px;" onclick="submitReview('${d.id}')">Submit review</button>
      <p class="review-submit-note" id="review-submit-note">Thanks — your review has been added above.</p>
    </div>
  `;
  document.querySelectorAll('#star-picker button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      reviewDraft[d.id] = Number(btn.dataset.star);
      renderReviews(d);
      document.getElementById('review-text-input')?.focus();
    });
  });
}
async function submitReview(destId){
  const d = destinations.find(x=>x.id===destId);
  const textInput = document.getElementById('review-text-input');
  const text = textInput.value.trim();
  if(!text){ textInput.focus(); return; }
  try {
    await window.rahiApi.addReview(destId, reviewDraft[d.id], text);
    remoteReviews[destId] = await window.rahiApi.getReviews(destId);
    reviewDraft[d.id] = 5;
    renderReviews(d);
  } catch (error) {
    if (window.rahiApi.currentUser()) alert('Your review could not be saved. Please try again.');
  }
}
