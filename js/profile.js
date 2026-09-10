/* Logged-in user's saved plans and budget estimates. */
function profileDate(timestamp){
  return timestamp?.toDate ? timestamp.toDate().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'Just saved';
}
function profileCard(title, detail, date){
  return `<article class="profile-item"><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(detail)}</p></div><span>${date}</span></article>`;
}
function crowdSummary(d, snapshot){
  const hourly = d?.hourly || [];
  const crowd = snapshot || (hourly.length ? { expectedAtSave:hourly[new Date().getHours()], average:Math.round(hourly.reduce((sum,value)=>sum+value,0)/hourly.length), quietHour:hourly.indexOf(Math.min(...hourly)), quiet:Math.min(...hourly), peakHour:hourly.indexOf(Math.max(...hourly)), peak:Math.max(...hourly) } : null);
  if(!crowd) return null;
  return { ...crowd, level:crowd.expectedAtSave >= 70 ? 'high' : crowd.expectedAtSave >= 40 ? 'medium' : 'low' };
}
function destinationOverview(destinationId, source){
  const d = destinations.find(destination => destination.id === destinationId);
  if(!d) return '';
  const weather = source.weatherSnapshot || d.weather;
  const crowd = crowdSummary(d, source.crowdSnapshot);
  return `<article class="saved-destination-card">
    <div class="saved-destination-head"><div><h4>${escapeHtml(d.name)}</h4><span>${escapeHtml(d.region)}</span></div><button class="account-btn" onclick="setCurrentDest('${d.id}');navigateTo('planner')">Open plan</button></div>
    <div class="saved-detail-grid">
      <div><span class="saved-k">Weather saved</span><strong>${weather.temp}°C · ${escapeHtml(weather.cond)}</strong><small>${weather.rain}% rain chance</small></div>
      <div><span class="saved-k">Expected crowd</span><strong class="saved-crowd ${crowd.level}">${crowd.expectedAtSave}% typical capacity</strong><small>All-day average: ${crowd.average}%</small></div>
      <div><span class="saved-k">Best crowd window</span><strong>${String(crowd.quietHour).padStart(2,'0')}:00 · ${crowd.quiet}%</strong><small>Typical peak: ${String(crowd.peakHour).padStart(2,'0')}:00 · ${crowd.peak}%</small></div>
    </div>
    <p class="saved-detail-note">Weather and crowd values are the planning snapshot saved with this item. Crowd is a historical-footfall forecast, not a live sensor count.</p>
  </article>`;
}
async function renderProfile(){
  const content = document.getElementById('profile-content');
  if(!content) return;
  const user = window.rahiApi?.currentUser();
  if(!user){
    content.innerHTML = `<div class="card profile-empty"><h3>Sign in to see your profile</h3><p>Your saved plans and budgets are connected to your TouriSense account.</p><button class="calc-btn" onclick="document.getElementById('login-btn')?.click()">Log in / Sign up</button></div>`;
    return;
  }
  content.innerHTML = `<div class="profile-welcome"><div><h3>Welcome back</h3><p>${escapeHtml(user.email)}</p></div><button class="account-btn" onclick="navigateTo('planner')">Plan a trip</button></div><div class="card">Loading saved plans…</div>`;
  try {
    const { trips, expenses, chats } = await window.rahiApi.getProfileData();
    const savedSources = [...trips, ...expenses];
    const uniqueDestinations = [...new Map(savedSources.map(item => [item.destinationId, item])).values()];
    content.innerHTML = `
      <div class="profile-welcome"><div><h3>Welcome back</h3><p>${escapeHtml(user.email)}</p></div><button class="account-btn" onclick="navigateTo('planner')">Plan a trip</button></div>
      <section class="card profile-overview"><h3 class="profile-heading">Saved travel overviews</h3><p class="profile-section-note">Weather and crowd details for every destination you have saved in a plan or budget.</p>${uniqueDestinations.length ? `<div class="saved-destination-list">${uniqueDestinations.map(item => destinationOverview(item.destinationId, item)).join('')}</div>` : `<div class="profile-empty-small">Save an itinerary or budget to keep a destination’s weather and crowd overview here.</div>`}</section>
      <div class="profile-grid">
        <section class="card"><h3 class="profile-heading">Saved itineraries</h3>${trips.length ? `<div class="profile-list">${trips.map(t => profileCard(t.destinationName, `${t.travelMode || 'Travel mode not selected'}${t.places?.length ? ` · ${t.places.join(', ')}` : ' · No places added yet'}`, profileDate(t.createdAt))).join('')}</div>` : `<div class="profile-empty-small">No saved itineraries yet.<br><button onclick="navigateTo('planner')">Build your first plan</button></div>`}</section>
        <section class="card"><h3 class="profile-heading">Saved budget estimates</h3>${expenses.length ? `<div class="profile-list">${expenses.map(e => profileCard(e.destinationName, `₹${Number(e.estimatedCost).toLocaleString('en-IN')} estimated · ${e.days} day${e.days !== 1 ? 's' : ''} · ${e.people} traveller${e.people !== 1 ? 's' : ''} · ${e.style} style`, profileDate(e.createdAt))).join('')}</div>` : `<div class="profile-empty-small">No saved budgets yet.<br><button onclick="navigateTo('expense')">Calculate a budget</button></div>`}</section>
        <section class="card profile-chats"><h3 class="profile-heading">Saved assistant conversations</h3>${chats.length ? `<div class="profile-list">${chats.map(c => `<article class="profile-item"><div><h4>${escapeHtml(c.title || 'Travel conversation')}</h4><p>Continue planning with TouriSense Smart Assistant</p></div><a class="account-btn" href="chat.html?chat=${encodeURIComponent(c.id)}">Open</a></article>`).join('')}</div>` : `<div class="profile-empty-small">No saved conversations yet.<br><button onclick="navigateTo('chat')">Open Smart Assistant</button></div>`}</section>
      </div>`;
  } catch(error) {
    content.innerHTML = `<div class="card profile-empty"><h3>We could not load your saved items</h3><p>Please refresh the page. If this continues, check that Firestore is enabled and its rules have been published.</p></div>`;
  }
}
document.addEventListener('rahi-auth-change', renderProfile);
