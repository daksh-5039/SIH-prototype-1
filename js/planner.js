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
let selectedReviewPlace = 'city';
const selectedInterests = new Set(['all']);
const placeCategories = {
  'Agra Fort':['history','culture'],'Fatehpur Sikri':['history','culture'],'Mehtab Bagh':['nature','culture'],
  'Amber Fort':['history','culture'],'Nahargarh Fort':['history','nature'],'Chokhi Dhani':['culture','food'],
  'Upper Lake (Bhojtal)':['nature','family'],'Van Vihar National Park':['nature','family'],'Sanchi Stupa':['history','culture','spiritual'],
  'Baga Beach':['nature','food'],'Old Goa Churches':['history','culture','spiritual'],'Dudhsagar Falls':['nature'],
  'Alleppey Beach':['nature'],'Kumarakom Sanctuary':['nature'],'Vembanad Lake':['nature','family'],
  'Solang Valley':['nature','family'],'Old Manali':['culture','food'],'Rohtang Pass':['nature'],
  'Dashashwamedh Ghat':['culture','spiritual'],'Sarnath':['history','spiritual'],'Ramnagar Fort':['history','culture']
};
const interestLabels = {all:'All',nature:'🌿 Nature',history:'🏛 History',culture:'🎭 Culture',food:'🍲 Food',family:'👨‍👩‍👧 Family',spiritual:'🛕 Spiritual'};

function renderPlanner(){
  renderChips('planner-chips', renderPlannerAll);
  initTripTools();
  renderPlannerAll();
}
function initTripTools(){
  const date = document.getElementById('trip-date');
  if(!date.value) date.value = new Date().toISOString().slice(0,10);
  document.getElementById('interest-filters').innerHTML = Object.entries(interestLabels).map(([id,label]) => `<button type="button" class="interest-chip ${id==='all'?'active':''}" data-interest="${id}">${label}</button>`).join('');
  document.getElementById('interest-filters').addEventListener('click', event => {
    const button = event.target.closest('button[data-interest]'); if(!button) return;
    const interest = button.dataset.interest;
    if(interest === 'all'){ selectedInterests.clear(); selectedInterests.add('all'); }
    else { selectedInterests.delete('all'); selectedInterests.has(interest) ? selectedInterests.delete(interest) : selectedInterests.add(interest); if(!selectedInterests.size) selectedInterests.add('all'); }
    document.querySelectorAll('.interest-chip').forEach(chip => chip.classList.toggle('active', selectedInterests.has(chip.dataset.interest)));
    renderConnectingGrid(destinations.find(x=>x.id===getCurrentDest()));
  });
  document.getElementById('planner-location-btn').addEventListener('click', () => {
    const note = document.getElementById('planner-location-note');
    if(!navigator.geolocation){ note.textContent = 'Location is not available in this browser.'; return; }
    note.textContent = 'Requesting your location…';
    navigator.geolocation.getCurrentPosition(() => { note.textContent = 'Location enabled. Open a place card and select “Show distance from me”.'; }, () => { note.textContent = 'Location permission was not granted. Destination-centre distances are still shown.'; }, {enableHighAccuracy:false,timeout:10000});
  });
  ['trip-date','trip-style','trip-constraint'].forEach(id => document.getElementById(id).addEventListener('input', () => {
    renderSelectedModeCard(destinations.find(x=>x.id===getCurrentDest()));
  }));
}
function renderPlannerAll(){
  const d = destinations.find(x=>x.id===getCurrentDest());
  if(!selectedMode[d.id]) selectedMode[d.id] = d.travelOptions[0].mode;
  if(!addedPlaces[d.id]) addedPlaces[d.id] = new Set();
  renderPlannerDetail(d);
  renderSelectedModeCard(d);
  renderTravelOptions(d);
  renderConnectingGrid(d);
  if(selectedReviewPlace !== 'city' && !d.connecting.some(place => place.name === selectedReviewPlace)) selectedReviewPlace = 'city';
  renderReviewScopes(d);
  renderReviews(d, selectedReviewPlace);
}
function renderPlannerDetail(d){
  document.querySelectorAll('#planner-chips .dest-chip').forEach(c=>c.classList.toggle('active', c.dataset.id===getCurrentDest()));
  document.getElementById('planner-detail').innerHTML = `
    <h3>${d.name}</h3>
    <div class="dest-region-tag">${d.region}</div>
    <p style="color:var(--text-soft);font-size:14px;">${d.travelNote}</p>
    <div class="dest-meta-grid">
      <div class="meta-block"><div class="k">Best time to visit</div><div class="v">${d.bestTime}</div></div>
      <div class="meta-block"><div class="k">Typical crowd level</div><div style="margin-top:2px;"><span class="crowd-badge crowd-${d.crowd}"><span class="crowd-dot"></span>${d.crowd.charAt(0).toUpperCase()+d.crowd.slice(1)}</span></div></div>
    </div>
  `;
}
function renderSelectedModeCard(d){
  const opt = d.travelOptions.find(o=>o.mode===selectedMode[d.id]);
  const added = addedPlaces[d.id];
  const selectedPlaces = d.connecting.filter(place => added.has(place.name));
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
        : `<ul class="connecting-list" style="margin-top:8px;">${[...added].map(n=>`<li><span class="conn-name">${n}</span></li>`).join('')}</ul><a class="route-plan-btn" href="${googleMapsDirectionsUrl(selectedPlaces)}" target="_blank" rel="noopener noreferrer">Open selected route in Google Maps ↗</a>`}
    </div>
    <div class="trip-settings-summary"><span>${document.getElementById('trip-date')?.value || 'Date not set'}</span><span>${document.getElementById('trip-style')?.value || 'balanced'} trip</span>${document.getElementById('trip-constraint')?.value ? `<span>${escapeHtml(document.getElementById('trip-constraint').value)}</span>` : ''}</div>
    <button class="save-trip-btn" onclick="savePlannerTrip('${d.id}')">Save this itinerary</button>
    <p class="save-trip-note" id="save-trip-note"></p>
  `;
}
async function savePlannerTrip(destId){
  const d = destinations.find(x=>x.id===destId);
  const note = document.getElementById('save-trip-note');
  try {
    await window.rahiApi.saveTrip({destinationId:d.id, destinationName:d.name, travelMode:selectedMode[d.id], places:[...addedPlaces[d.id]], tripDate:document.getElementById('trip-date')?.value || null, travelStyle:document.getElementById('trip-style')?.value || 'balanced', constraints:document.getElementById('trip-constraint')?.value.trim() || '', interests:[...selectedInterests].filter(x=>x!=='all'), weatherSnapshot:{...d.weather}, crowdSnapshot:createCrowdSnapshot(d)});
    note.textContent = 'Saved to your account.';
  } catch (error) { if (note && window.rahiApi.currentUser()) note.textContent = error.message; }
}
function createCrowdSnapshot(d){
  const hourly = d.hourly;
  const average = Math.round(hourly.reduce((sum,value)=>sum+value,0)/hourly.length);
  const quiet = Math.min(...hourly), peak = Math.max(...hourly);
  return { expectedAtSave:hourly[new Date().getHours()], average, quietHour:hourly.indexOf(quiet), quiet, peakHour:hourly.indexOf(peak), peak };
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
  const visiblePlaces = d.connecting.filter(c => selectedInterests.has('all') || placeCategories[c.name]?.some(category => selectedInterests.has(category)));
  document.getElementById('conn-grid').innerHTML = visiblePlaces.length ? visiblePlaces.map(c=>{
    const i = d.connecting.indexOf(c); const tags = (placeCategories[c.name] || []).map(tag => `<span>${interestLabels[tag].replace(/^.+?\s/,'')}</span>`).join('');
    return `
    <div class="conn-card" data-idx="${i}">
      <div class="place-photo-wrap conn-photo-wrap"><img class="place-photo conn-photo" data-place-photo="${c.name}" alt="${c.name}"></div>
      <div class="cc-top">
        <div><div class="cc-name">${c.name}</div><div class="cc-dist">${c.dist} away</div></div>
        <svg class="cc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="conn-card-hint">View map, distance &amp; visit details</div>
      <div class="place-tags">${tags}</div>
      <div class="cc-body"><div class="cc-body-inner">
        <span class="cc-time">${c.time}</span>
        <p class="cc-desc">${c.desc}</p>
        <div class="place-map"><a href="${googleMapsUrl(c)}" target="_blank" rel="noopener noreferrer" title="Open ${c.name} in Google Maps"><iframe src="${mapEmbedUrl(c.coords)}" loading="lazy" tabindex="-1" title="Map showing ${c.name}"></iframe><span>Open in Google Maps ↗</span></a></div>
        <div class="place-distance"><button type="button" class="distance-btn" data-idx="${i}">Show distance from me</button><p class="distance-result">Destination-centre distance: ${c.dist}</p></div>
        <button class="cc-add ${addedPlaces[d.id].has(c.name)?'added':''}" data-name="${c.name}">${addedPlaces[d.id].has(c.name)?'✓ Added to plan':'+ Add to plan'}</button>
      </div></div>
    </div>
  `}).join('') : `<div class="no-place-match">No attractions match these interests yet. Select “All” to see every place.</div>`;
  loadPlacePhotos(document.getElementById('conn-grid'));
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
      const willOpen = !card.classList.contains('expanded');
      document.querySelectorAll('#conn-grid .conn-card.expanded').forEach(openCard => openCard.classList.remove('expanded'));
      if(willOpen) card.classList.add('expanded');
    });
  });
  document.querySelectorAll('#conn-grid .distance-btn').forEach(button=>{
    button.addEventListener('click', event=>{
      event.stopPropagation();
      showDistanceFromUser(button, d.connecting[Number(button.dataset.idx)]);
    });
  });
}

/* ============ REVIEWS ============ */
function reviewScopeId(d, placeName){
  return placeName === 'city' ? d.id : `${d.id}__${d.connecting.findIndex(place => place.name === placeName)}`;
}
function renderReviewScopes(d){
  const scope = document.getElementById('review-place-scopes');
  scope.innerHTML = `<span class="scope-label">Reviews for</span><button type="button" class="place-scope-chip ${selectedReviewPlace==='city'?'active':''}" data-review-place="city">${d.name} city</button>${d.connecting.map(place => `<button type="button" class="place-scope-chip ${selectedReviewPlace===place.name?'active':''}" data-review-place="${escapeHtml(place.name)}">${escapeHtml(place.name)}</button>`).join('')}`;
  scope.querySelectorAll('[data-review-place]').forEach(button => button.addEventListener('click', () => { selectedReviewPlace = button.dataset.reviewPlace; renderReviewScopes(d); renderReviews(d, selectedReviewPlace); }));
}
async function renderReviews(d, placeName='city'){
  const scopeId = reviewScopeId(d, placeName);
  const subjectName = placeName === 'city' ? d.name : placeName;
  if (remoteReviews[scopeId] === undefined && window.rahiApi?.configured()) {
    try { remoteReviews[scopeId] = await window.rahiApi.getReviews(scopeId); }
    catch (error) { remoteReviews[scopeId] = []; console.warn('Could not load reviews', error); }
    if (getCurrentDest() === d.id && selectedReviewPlace === placeName) return renderReviews(d, placeName);
  }
  const reviews = [...(remoteReviews[scopeId] || [])];
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length) : 0;
  const counts = [5,4,3,2,1].map(star=> reviews.filter(r=>r.rating===star).length);
  const maxCount = Math.max(1, ...counts);
  if(reviewDraft[scopeId]===undefined) reviewDraft[scopeId] = 5;

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
      <h4 style="font-size:15px;">Visited ${subjectName}? Share your review</h4>
      <div class="star-picker" id="star-picker">
        ${[1,2,3,4,5].map(s=>`<button type="button" data-star="${s}" class="${s<=reviewDraft[scopeId]?'active':''}">★</button>`).join('')}
      </div>
      <textarea id="review-text-input" placeholder="What was your experience like?"></textarea>
      <button class="calc-btn" style="margin-top:12px;" onclick="submitReview('${d.id}', '${encodeURIComponent(placeName)}')">Submit review</button>
      <p class="review-submit-note" id="review-submit-note">Thanks — your review has been added above.</p>
    </div>
  `;
  document.querySelectorAll('#star-picker button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      reviewDraft[scopeId] = Number(btn.dataset.star);
      renderReviews(d, placeName);
      document.getElementById('review-text-input')?.focus();
    });
  });
}
async function submitReview(destId, encodedPlaceName='city'){
  const d = destinations.find(x=>x.id===destId);
  const placeName = decodeURIComponent(encodedPlaceName);
  const scopeId = reviewScopeId(d, placeName);
  const textInput = document.getElementById('review-text-input');
  const text = textInput.value.trim();
  if(!text){ textInput.focus(); return; }
  try {
    await window.rahiApi.addReview(scopeId, reviewDraft[scopeId], text);
    remoteReviews[scopeId] = await window.rahiApi.getReviews(scopeId);
    reviewDraft[scopeId] = 5;
    renderReviews(d, placeName);
  } catch (error) {
    if (window.rahiApi.currentUser()) alert('Your review could not be saved. Please try again.');
  }
}
