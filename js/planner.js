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
const MAX_REVIEW_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_REVIEW_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const ALLOWED_REVIEW_VIDEO_EXTENSION = /\.(mp4|webm|mov)$/i;
const plannerWeatherCache = new Map();
const plannerWeatherRequests = new Map();
const hotelResultsCache = new Map();
const hotelRequests = new Map();
let hotelSearchScope = 'city';
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
    updatePreferenceMatch(destinations.find(x=>x.id===getCurrentDest()), false);
  });
  document.getElementById('apply-preferences-btn').addEventListener('click', () => {
    const d = destinations.find(x=>x.id===getCurrentDest());
    renderConnectingGrid(d);
    renderSelectedModeCard(d);
    updatePreferenceMatch(d, true);
    document.getElementById('conn-grid').scrollIntoView({behavior:'smooth', block:'start'});
  });
  document.getElementById('reset-preferences-btn').addEventListener('click', () => {
    selectedInterests.clear(); selectedInterests.add('all');
    document.getElementById('trip-style').value = 'balanced';
    document.getElementById('trip-constraint').value = '';
    document.querySelectorAll('.interest-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.interest === 'all'));
    const d = destinations.find(x=>x.id===getCurrentDest());
    renderConnectingGrid(d); renderSelectedModeCard(d); updatePreferenceMatch(d, true);
  });
  document.getElementById('planner-location-btn').addEventListener('click', () => {
    const note = document.getElementById('planner-location-note');
    if(!navigator.geolocation){ note.textContent = 'Location is not available in this browser.'; return; }
    note.textContent = 'Requesting your location…';
    navigator.geolocation.getCurrentPosition(() => { note.textContent = 'Location enabled. Open a place card and select “Show distance from me”.'; }, () => { note.textContent = 'Location permission was not granted. Destination-centre distances are still shown.'; }, {enableHighAccuracy:false,timeout:10000});
  });
  ['trip-date','trip-constraint'].forEach(id => document.getElementById(id).addEventListener('input', () => {
    const d = destinations.find(x=>x.id===getCurrentDest());
    renderSelectedModeCard(d); updatePreferenceMatch(d, false);
    if(id === 'trip-date') loadPlannerDateWeather(d);
  }));
  document.getElementById('trip-style').addEventListener('change', () => {
    const d = destinations.find(x=>x.id===getCurrentDest());
    selectedMode[d.id] = recommendedModeForStyle(d, document.getElementById('trip-style').value);
    renderTravelOptions(d); renderSelectedModeCard(d); renderHotelFinder(d); updatePreferenceMatch(d, false);
  });
}
function plannerCostIndex(id){ return ({taj:1.1, jaipur:1, bhopal:.9, goa:1.25, kerala:1.15, manali:1.05, varanasi:.85}[id] || 1); }
function travelStyleInfo(style){
  return {
    budget:{ multiplier:.75, label:'Budget-conscious', summary:'Prioritises value choices and a lower daily estimate.' },
    balanced:{ multiplier:1, label:'Balanced', summary:'Balances cost, comfort and convenience.' },
    comfort:{ multiplier:1.4, label:'Comfort-focused', summary:'Allows more for convenience and higher-comfort stays.' }
  }[style] || { multiplier:1, label:'Balanced', summary:'Balances cost, comfort and convenience.' };
}
function travelOptionStartingCost(option){ return Number((option.cost || '').match(/[0-9,]+/)?.[0]?.replace(/,/g,'')) || Number.MAX_SAFE_INTEGER; }
function recommendedModeForStyle(d, style){
  if(style === 'budget') return [...d.travelOptions].sort((a,b) => travelOptionStartingCost(a) - travelOptionStartingCost(b))[0].mode;
  if(style === 'comfort') return d.travelOptions.find(option => option.mode === 'Flight')?.mode || d.travelOptions[0].mode;
  return d.travelOptions[0].mode;
}
function plannerDailyEstimate(d, style){ return Math.round(3200 * travelStyleInfo(style).multiplier * plannerCostIndex(d.id)); }
function selectedTripDate(){ return document.getElementById('trip-date')?.value || new Date().toISOString().slice(0,10); }
function readableTripDate(dateString){ return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'}); }
function weatherDescription(code){ return ({0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',51:'Light drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',80:'Rain showers',95:'Thunderstorm'})[code] || 'Mixed conditions'; }
function plannerWeatherKey(d){ return `${d.id}:${selectedTripDate()}`; }
function plannerWeatherForDate(d){
  const cached = plannerWeatherCache.get(plannerWeatherKey(d));
  if(cached?.weather) return cached.weather;
  return {...d.weather, source:cached?.loading ? 'Fetching daily forecast…' : 'Seasonal planning estimate'};
}
function selectedDateInForecastWindow(dateString){
  const today = new Date(); today.setHours(0,0,0,0);
  const date = new Date(`${dateString}T00:00:00`);
  return date >= today && Math.round((date - today) / 86400000) <= 16;
}
async function loadPlannerDateWeather(d){
  const date = selectedTripDate();
  const key = plannerWeatherKey(d);
  if(!selectedDateInForecastWindow(date) || plannerWeatherCache.get(key)?.weather || !d.coords) return;
  if(plannerWeatherRequests.has(key)) return plannerWeatherRequests.get(key);
  plannerWeatherCache.set(key, {loading:true});
  renderSelectedModeCard(d);
  const request = (async () => { try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${d.coords.lat}&longitude=${d.coords.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${date}&end_date=${date}`;
    const response = await fetch(url); if(!response.ok) throw new Error('Forecast unavailable');
    const daily = (await response.json()).daily;
    const weather = { temp:Math.round((daily.temperature_2m_max[0] + daily.temperature_2m_min[0]) / 2), high:Math.round(daily.temperature_2m_max[0]), low:Math.round(daily.temperature_2m_min[0]), cond:weatherDescription(daily.weather_code[0]), rain:daily.precipitation_probability_max[0] ?? 0, advice:(daily.precipitation_probability_max[0] ?? 0) >= 45 ? 'warn' : 'good', source:'Open‑Meteo daily forecast' };
    plannerWeatherCache.set(key, {weather});
  } catch(error) { plannerWeatherCache.set(key, {weather:{...d.weather, source:'Seasonal estimate — live forecast unavailable'}}); }
  finally { plannerWeatherRequests.delete(key); }
  if(getCurrentDest() === d.id && selectedTripDate() === date) renderSelectedModeCard(d);
  })();
  plannerWeatherRequests.set(key, request);
  return request;
}
function crowdForTripDate(d){
  const date = new Date(`${selectedTripDate()}T12:00:00`);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const hourly = d.hourly.map(value => Math.min(100, Math.round(value * (weekend ? 1.12 : 1))));
  const quiet = Math.min(...hourly), peak = Math.max(...hourly), hour = new Date().getHours();
  return { expectedAtSave:hourly[hour], average:Math.round(hourly.reduce((sum,value)=>sum+value,0)/hourly.length), quietHour:hourly.indexOf(quiet), quiet, peakHour:hourly.indexOf(peak), peak, date:selectedTripDate(), dayType:weekend ? 'Weekend pattern' : 'Weekday pattern' };
}
function matchingPlaces(d){
  return d.connecting.filter(place => selectedInterests.has('all') || placeCategories[place.name]?.some(category => selectedInterests.has(category)));
}
function updatePreferenceMatch(d, applied){
  const note = document.getElementById('preference-match-note');
  if(!note) return;
  const interests = [...selectedInterests].filter(item => item !== 'all');
  const matchCount = matchingPlaces(d).length;
  const interestText = interests.length ? interests.map(item => interestLabels[item].replace(/^.+?\s/, '')).join(', ') : 'all interests';
  note.textContent = applied ? `Showing ${matchCount} matching place${matchCount===1?'':'s'} for ${interestText}.` : `Ready: ${matchCount} place${matchCount===1?'':'s'} match ${interestText}.`;
}
function renderPlannerAll(){
  const d = destinations.find(x=>x.id===getCurrentDest());
  if(!selectedMode[d.id]) selectedMode[d.id] = recommendedModeForStyle(d, document.getElementById('trip-style')?.value || 'balanced');
  if(!addedPlaces[d.id]) addedPlaces[d.id] = new Set();
  renderPlannerDetail(d);
  renderSelectedModeCard(d);
  renderTravelOptions(d);
  renderConnectingGrid(d);
  renderHotelFinder(d);
  updatePreferenceMatch(d, false);
  loadPlannerDateWeather(d);
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
  const style = document.getElementById('trip-style')?.value || 'balanced';
  const styleInfo = travelStyleInfo(style);
  const tripWeather = plannerWeatherForDate(d);
  const tripCrowd = crowdForTripDate(d);
  const added = addedPlaces[d.id];
  const selectedPlaces = d.connecting.filter(place => added.has(place.name));
  document.getElementById('planner-selected-mode').innerHTML = `
    <h4>Your trip snapshot</h4>
    <div class="meta-block" style="margin-bottom:16px;">
      <div class="k">Travelling by</div>
      <div class="v" style="font-size:16px;margin-top:4px;">${opt.mode} · ${opt.duration}</div>
      <div style="font-size:12.5px;color:var(--text-soft);margin-top:3px;">${opt.cost}</div>
    </div>
    <div class="planner-style-estimate"><span class="saved-k">Travel preference impact</span><strong>${styleInfo.label} · about ₹${plannerDailyEstimate(d, style).toLocaleString('en-IN')} per traveller/day</strong><small>${styleInfo.summary} Selected transport: ${opt.mode}.</small></div>
    <div class="planner-date-outlook"><span class="saved-k">Trip-date outlook · ${readableTripDate(selectedTripDate())}</span><strong>${tripWeather.temp}°C · ${escapeHtml(tripWeather.cond)} · ${tripWeather.rain}% rain chance</strong><small>${tripWeather.high !== undefined ? `High ${tripWeather.high}°C · Low ${tripWeather.low}°C · ` : ''}${escapeHtml(tripWeather.source)}. Crowd: ${tripCrowd.expectedAtSave}% typical capacity at ${String(new Date().getHours()).padStart(2,'0')}:00 (${tripCrowd.dayType.toLowerCase()}).</small></div>
    <div class="divider"></div>
    <div class="meta-block">
      <div class="k">Places added to plan</div>
      ${added.size===0
        ? `<div style="font-size:13px;color:var(--text-soft);margin-top:6px;">None yet — tap a nearby place below to add it.</div>`
        : `<ul class="connecting-list" style="margin-top:8px;">${[...added].map(n=>`<li><span class="conn-name">${n}</span></li>`).join('')}</ul><a class="route-plan-btn" href="${googleMapsDirectionsUrl(selectedPlaces)}" target="_blank" rel="noopener noreferrer">Open selected route in Google Maps ↗</a>`}
    </div>
    <div class="trip-settings-summary"><span>${document.getElementById('trip-date')?.value || 'Date not set'}</span><span>${document.getElementById('trip-style')?.value || 'balanced'} trip</span><span>${[...selectedInterests].filter(item=>item!=='all').length ? [...selectedInterests].filter(item=>item!=='all').map(item=>interestLabels[item].replace(/^.+?\s/,'')).join(', ') : 'all interests'}</span>${document.getElementById('trip-constraint')?.value ? `<span>${escapeHtml(document.getElementById('trip-constraint').value)}</span>` : ''}</div>
    <button class="save-trip-btn" onclick="savePlannerTrip('${d.id}')">Save itinerary &amp; preferences</button>
    <p class="save-trip-note" id="save-trip-note"></p>
  `;
}
async function savePlannerTrip(destId){
  const d = destinations.find(x=>x.id===destId);
  const note = document.getElementById('save-trip-note');
  const button = document.querySelector('.save-trip-btn');
  if(!window.rahiApi?.configured()){
    if(note) note.textContent = 'Saving is not connected yet. Add your Firebase configuration first.';
    return;
  }
  if(!window.rahiApi.currentUser()){
    if(note) note.textContent = 'Please log in or sign up to save this itinerary to your Profile.';
    document.getElementById('login-btn')?.click();
    return;
  }
  try {
    if(button) { button.disabled = true; button.textContent = 'Saving itinerary…'; }
    const travelStyle = document.getElementById('trip-style')?.value || 'balanced';
    await loadPlannerDateWeather(d);
    const weatherSnapshot = plannerWeatherForDate(d);
    const crowdSnapshot = crowdForTripDate(d);
    const preferenceImpact = { style:travelStyle, multiplier:travelStyleInfo(travelStyle).multiplier, estimatedDailyPerPerson:plannerDailyEstimate(d, travelStyle), selectedTransport:{mode:selectedMode[d.id], duration:d.travelOptions.find(option => option.mode === selectedMode[d.id])?.duration || '', cost:d.travelOptions.find(option => option.mode === selectedMode[d.id])?.cost || ''}, summary:travelStyleInfo(travelStyle).summary };
    const tripDateOutlook = { date:selectedTripDate(), weather:weatherSnapshot, crowd:crowdSnapshot };
    await window.rahiApi.saveTrip({destinationId:d.id, destinationName:d.name, travelMode:selectedMode[d.id], places:[...addedPlaces[d.id]], tripDate:selectedTripDate(), travelStyle, estimatedDailyPerPerson:preferenceImpact.estimatedDailyPerPerson, travelPreferenceImpact:preferenceImpact, tripDateOutlook, constraints:document.getElementById('trip-constraint')?.value.trim() || '', interests:[...selectedInterests].filter(x=>x!=='all'), weatherSnapshot, crowdSnapshot});
    note.textContent = 'Saved to your Profile — itinerary, places and preferences are included.';
  } catch (error) { if (note) note.textContent = `Could not save: ${error.message}`; }
  finally { if(button) { button.disabled = false; button.textContent = 'Save itinerary & preferences'; } }
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

/* ============ LIVE NEARBY STAYS (OpenStreetMap) ============ */
function hotelScopeFor(d){
  if(hotelSearchScope === 'city') return { id:'city', name:`${d.name} city centre`, coords:d.coords, radius:6000 };
  const place = d.connecting.find(item => item.name === hotelSearchScope);
  return place ? { id:place.name, name:place.name, coords:place.coords, radius:3000 } : { id:'city', name:`${d.name} city centre`, coords:d.coords, radius:6000 };
}
function hotelTypeLabel(type){ return ({hotel:'Hotel',guest_house:'Guest house',hostel:'Hostel',resort:'Resort'})[type] || 'Stay'; }
function hotelMapsUrl(hotel){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name}, ${hotel.coords.lat}, ${hotel.coords.lon}`)}`; }
function hotelSuggestion(hotel, style){
  const type = hotel.type;
  if(style === 'budget' && ['hostel','guest_house'].includes(type)) return 'Good match for a budget-conscious trip';
  if(style === 'comfort' && ['hotel','resort'].includes(type)) return 'Good match for a comfort-focused trip';
  if(style === 'balanced' && ['hotel','guest_house'].includes(type)) return 'Good match for a balanced trip';
  return '';
}
function hotelPriority(hotel, style){
  const preferred = style === 'budget' ? ['hostel','guest_house','hotel','resort'] : style === 'comfort' ? ['resort','hotel','guest_house','hostel'] : ['hotel','guest_house','resort','hostel'];
  return preferred.indexOf(hotel.type) * 100 + hotel.distance;
}
function renderHotelCards(hotels, scope, style){
  const sorted = [...hotels].sort((a,b) => hotelPriority(a, style) - hotelPriority(b, style));
  return sorted.slice(0, 6).map(hotel => {
    const suggestion = hotelSuggestion(hotel, style);
    const details = [hotel.stars ? `${hotel.stars}★` : '', hotel.phone || '', hotel.website ? 'Website available' : ''].filter(Boolean).join(' · ');
    return `<article class="hotel-card ${suggestion ? 'hotel-suggested' : ''}"><div class="hotel-card-top"><span class="hotel-type">${escapeHtml(hotelTypeLabel(hotel.type))}</span>${suggestion ? '<span class="hotel-match">Suggested</span>' : ''}</div><h3>${escapeHtml(hotel.name)}</h3><p>${hotel.distance.toFixed(1)} km from ${escapeHtml(scope.name)}</p>${details ? `<small>${escapeHtml(details)}</small>` : '<small>Contact details may be available on the map listing.</small>'}${suggestion ? `<strong>${escapeHtml(suggestion)}</strong>` : ''}<a href="${hotelMapsUrl(hotel)}" target="_blank" rel="noopener noreferrer">View on Google Maps ↗</a></article>`;
  }).join('');
}
async function getNearbyHotels(scope){
  const key = `${scope.coords.lat},${scope.coords.lon}:${scope.radius}`;
  if(hotelResultsCache.has(key)) return hotelResultsCache.get(key);
  if(hotelRequests.has(key)) return hotelRequests.get(key);
  const query = `[out:json][timeout:18];nwr["tourism"~"^(hotel|guest_house|hostel|resort)$"](around:${scope.radius},${scope.coords.lat},${scope.coords.lon});out center tags 24;`;
  const request = (async () => {
    let lastError;
    for(const endpoint of ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter']){
      try {
        const response = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body:`data=${encodeURIComponent(query)}`});
        if(!response.ok) throw new Error(`Map data service returned ${response.status}`);
        const data = await response.json();
        const byId = new Map();
        (data.elements || []).forEach(item => {
          const lat = item.lat ?? item.center?.lat, lon = item.lon ?? item.center?.lon;
          if(!lat || !lon || !item.tags?.name) return;
          const hotel = { id:`${item.type}/${item.id}`, name:item.tags.name, type:item.tags.tourism, stars:item.tags.stars, phone:item.tags.phone || item.tags['contact:phone'], website:item.tags.website || item.tags['contact:website'], coords:{lat,lon}, distance:distanceInKm(scope.coords,{lat,lon}) };
          if(!byId.has(hotel.id)) byId.set(hotel.id, hotel);
        });
        const hotels = [...byId.values()];
        hotelResultsCache.set(key, hotels);
        return hotels;
      } catch(error) { lastError = error; }
    }
    throw lastError || new Error('Nearby stay data is unavailable');
  })();
  hotelRequests.set(key, request);
  try { return await request; } finally { hotelRequests.delete(key); }
}
function renderHotelFinder(d){
  const container = document.getElementById('hotel-finder'); if(!container) return;
  const scope = hotelScopeFor(d);
  const style = document.getElementById('trip-style')?.value || 'balanced';
  const scopes = [{id:'city',name:`${d.name} city`}, ...d.connecting.map(place => ({id:place.name,name:place.name}))];
  const cacheKey = `${scope.coords.lat},${scope.coords.lon}:${scope.radius}`;
  const cached = hotelResultsCache.get(cacheKey);
  container.innerHTML = `<div class="hotel-finder-head"><div><h3>Find a stay near your plan</h3><p>Live public listings from OpenStreetMap. Availability, prices and amenities must be confirmed with the property.</p></div><button type="button" class="hotel-refresh-btn" id="hotel-refresh-btn">Refresh</button></div><div class="hotel-scope-row">${scopes.map(item => `<button type="button" class="hotel-scope-chip ${scope.id===item.id?'active':''}" data-hotel-scope="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join('')}</div><div class="hotel-results" id="hotel-results">${cached ? (cached.length ? renderHotelCards(cached, scope, style) : '<div class="hotel-empty">No named stays were found close to this location. Try the city option for a wider search.</div>') : '<div class="hotel-loading">Looking up nearby stays…</div>'}</div>`;
  container.querySelectorAll('[data-hotel-scope]').forEach(button => button.addEventListener('click', () => { hotelSearchScope = button.dataset.hotelScope; renderHotelFinder(d); }));
  container.querySelector('#hotel-refresh-btn').addEventListener('click', () => { hotelResultsCache.delete(cacheKey); renderHotelFinder(d); });
  if(cached) return;
  getNearbyHotels(scope).then(hotels => {
    if(getCurrentDest() === d.id && hotelScopeFor(d).id === scope.id) renderHotelFinder(d);
  }).catch(() => {
    const results = document.getElementById('hotel-results');
    if(results && getCurrentDest() === d.id) results.innerHTML = '<div class="hotel-empty">Nearby stay listings are temporarily unavailable. Please use Refresh in a moment, or try the city option.</div>';
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
  const videoReviews = reviews.filter(review => review.videoUrl);

  document.getElementById('reviews-section').innerHTML = `
    <div class="video-review-showcase">
      <div class="video-review-head"><div><h4>Visitor video reviews</h4><p>Watch short clips shared by travellers before you visit ${escapeHtml(subjectName)}.</p></div><span>${videoReviews.length} video${videoReviews.length===1?'':'s'}</span></div>
      ${renderVideoReviewGrid(videoReviews, subjectName)}
    </div>
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
      <textarea id="review-text-input" placeholder="What was your experience like? (optional with a video)"></textarea>
      <label class="video-upload-field" for="review-video-input"><span>Attach a short video review <em>optional · max 50 MB</em></span><input id="review-video-input" type="file" accept="video/mp4,video/webm,video/quicktime"><span class="video-file-button">Choose video</span><span class="video-file-name" id="review-video-file-name">No video selected</span><small id="review-video-note">Share a short clip to help future visitors.</small></label>
      <button class="calc-btn" style="margin-top:12px;" onclick="submitReview('${d.id}', '${encodeURIComponent(placeName)}')">Submit review</button>
      <p class="review-submit-note" id="review-submit-note">Thanks — your review has been added above.</p>
    </div>
  `;
  wireVideoReviewGrid(videoReviews);
  document.getElementById('review-video-input')?.addEventListener('change', event => {
    const name = event.target.files?.[0]?.name || 'No video selected';
    document.getElementById('review-video-file-name').textContent = name;
  });
  document.querySelectorAll('#star-picker button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      reviewDraft[scopeId] = Number(btn.dataset.star);
      renderReviews(d, placeName);
      document.getElementById('review-text-input')?.focus();
    });
  });
}
function isCloudinaryConfigured(){
  const config = window.TOURISENSE_CLOUDINARY_CONFIG || {};
  return Boolean(config.cloudName && config.uploadPreset && !config.cloudName.startsWith('PASTE_'));
}
function renderVideoReviewGrid(videos, subjectName){
  if(!videos.length) return `<div class="video-review-empty">No visitor videos yet. Be the first logged-in traveller to share a short video of ${escapeHtml(subjectName)}.</div>`;
  const preview = videos.slice(0, 3);
  const remaining = videos.slice(3);
  const tile = review => `<button type="button" class="video-review-tile" data-video-url="${escapeHtml(review.videoUrl)}"><video preload="metadata" src="${escapeHtml(review.videoUrl)}#t=0.1" muted playsinline></video><span class="video-play-icon">▶</span><small>${escapeHtml(review.name || 'Traveller')}</small></button>`;
  const finalTile = remaining.length === 1 ? tile(remaining[0]) : `<button type="button" class="video-review-tile more-videos" data-more-videos="true"><span class="video-more-number">+${remaining.length}</span><small>More traveller videos</small></button>`;
  return `<div class="video-review-grid">${preview.map(tile).join('')}${remaining.length ? finalTile : ''}</div>`;
}
function openVideoReviewModal(videos, startIndex=0){
  const existing = document.getElementById('video-review-modal'); if(existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'video-review-modal'; modal.className = 'video-review-modal';
  modal.innerHTML = `<div class="video-review-dialog" role="dialog" aria-modal="true" aria-label="Visitor video reviews"><button class="video-modal-close" aria-label="Close video reviews">×</button><h3>Visitor video reviews</h3><div class="video-modal-list">${videos.map((review, index) => `<button type="button" class="video-modal-item ${index===startIndex?'active':''}" data-index="${index}">${escapeHtml(review.name || 'Traveller')}’s video</button>`).join('')}</div><video class="video-modal-player" controls playsinline src="${escapeHtml(videos[startIndex].videoUrl)}"></video></div>`;
  document.body.appendChild(modal);
  const player = modal.querySelector('.video-modal-player');
  modal.querySelector('.video-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', event => { if(event.target === modal) modal.remove(); });
  modal.querySelectorAll('[data-index]').forEach(button => button.addEventListener('click', () => { const index=Number(button.dataset.index); player.src=videos[index].videoUrl; player.play(); modal.querySelectorAll('[data-index]').forEach(item => item.classList.toggle('active', item===button)); }));
}
function wireVideoReviewGrid(videos){
  document.querySelectorAll('[data-video-url]').forEach(button => button.addEventListener('click', () => {
    const index = videos.findIndex(review => review.videoUrl === button.dataset.videoUrl); openVideoReviewModal(videos, Math.max(0,index));
  }));
  document.querySelector('[data-more-videos]')?.addEventListener('click', () => openVideoReviewModal(videos, 3));
}
async function submitReview(destId, encodedPlaceName='city'){
  const d = destinations.find(x=>x.id===destId);
  const placeName = decodeURIComponent(encodedPlaceName);
  const scopeId = reviewScopeId(d, placeName);
  const textInput = document.getElementById('review-text-input');
  const text = textInput.value.trim();
  const videoInput = document.getElementById('review-video-input');
  const videoFile = videoInput?.files?.[0] || null;
  if(!text && !videoFile){ textInput.focus(); return; }
  if(videoFile && (!ALLOWED_REVIEW_VIDEO_TYPES.has(videoFile.type) || !ALLOWED_REVIEW_VIDEO_EXTENSION.test(videoFile.name) || videoFile.size > MAX_REVIEW_VIDEO_BYTES)){
    const note = document.getElementById('review-video-note');
    if(note) note.textContent = 'Only MP4, WebM or MOV videos up to 50 MB are allowed.';
    return;
  }
  if(videoFile && !isCloudinaryConfigured()){
    const note = document.getElementById('review-video-note');
    if(note) note.textContent = 'Video uploads need the free Cloudinary setup in js/cloudinary-config.js first.';
    return;
  }
  try {
    const submitButton = document.querySelector('#reviews-section .calc-btn');
    if(submitButton) { submitButton.disabled = true; submitButton.textContent = videoFile ? 'Uploading video…' : 'Saving review…'; }
    const video = videoFile ? await uploadReviewVideo(videoFile) : null;
    await window.rahiApi.addReview(scopeId, reviewDraft[scopeId], text || 'Shared a visitor video review.', video);
    remoteReviews[scopeId] = await window.rahiApi.getReviews(scopeId);
    reviewDraft[scopeId] = 5;
    renderReviews(d, placeName);
  } catch (error) {
    const note = document.getElementById('review-video-note');
    if(note) note.textContent = `Could not upload the video: ${error.message}`;
    else if (window.rahiApi.currentUser()) alert('Your review could not be saved. Please try again.');
  }
}
async function uploadReviewVideo(file){
  const config = window.TOURISENSE_CLOUDINARY_CONFIG;
  const form = new FormData();
  form.append('file', file); form.append('upload_preset', config.uploadPreset); form.append('tags', 'tourisense-review');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/video/upload`, { method:'POST', body:form });
  const result = await response.json();
  if(!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloud upload failed.');
  return { url:result.secure_url, duration:result.duration || null };
}
