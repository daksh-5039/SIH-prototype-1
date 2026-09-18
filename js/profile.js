/* Logged-in user's saved plans and budget estimates. */
function profileDate(timestamp){
  return timestamp?.toDate ? timestamp.toDate().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'Just saved';
}
function profileCard(title, detail, date){
  return `<article class="profile-item"><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(detail)}</p></div><span>${date}</span></article>`;
}
function itineraryCard(trip, index){
  const impact = trip.travelPreferenceImpact || {};
  const outlook = trip.tripDateOutlook || {};
  const weather = outlook.weather || trip.weatherSnapshot;
  const crowd = outlook.crowd || trip.crowdSnapshot;
  const places = trip.places?.length ? trip.places.join(', ') : 'No places added yet';
  const interests = trip.interests?.length ? trip.interests.join(', ') : 'All interests';
  const date = trip.tripDate ? new Date(`${trip.tripDate}T12:00:00`).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : 'Not saved with this older itinerary';
  const style = trip.travelStyle ? `${trip.travelStyle} style` : 'Not saved with this older itinerary';
  const consideration = trip.constraints || 'None added';
  const impactText = impact.estimatedDailyPerPerson ? `₹${Number(impact.estimatedDailyPerPerson).toLocaleString('en-IN')} per traveller/day` : (trip.estimatedDailyPerPerson ? `₹${Number(trip.estimatedDailyPerPerson).toLocaleString('en-IN')} per traveller/day` : 'Available for newly saved itineraries');
  const weatherText = weather ? `${weather.temp}°C · ${weather.cond} · ${weather.rain}% rain` : 'Available for newly saved plans';
  const crowdText = crowd ? `${crowd.expectedAtSave}% expected · average ${crowd.average ?? '—'}%${crowd.quietHour !== undefined ? ` · quieter at ${String(crowd.quietHour).padStart(2, '0')}:00` : ''}` : 'Available for newly saved plans';
  return `<article class="saved-itinerary-card${index >= 4 ? ' saved-itinerary-extra' : ''}"><div class="saved-itinerary-head"><div><h4>${escapeHtml(trip.destinationName || 'Saved itinerary')}</h4><p>${escapeHtml(trip.travelMode || 'Travel mode not selected')} · ${escapeHtml(places)}</p></div><div class="saved-itinerary-actions"><span>${profileDate(trip.createdAt)}</span><button type="button" class="delete-itinerary-btn" data-trip-id="${escapeHtml(trip.id)}">Delete</button></div></div><div class="itinerary-preferences"><div><span>Trip date</span><strong>${escapeHtml(date)}</strong></div><div><span>Travel preference</span><strong>${escapeHtml(style)}</strong></div><div><span>Anything to consider?</span><strong>${escapeHtml(consideration)}</strong></div><div><span>Interests</span><strong>${escapeHtml(interests)}</strong></div></div><div class="itinerary-saved-outlook"><div><span>Weather saved</span><strong>${escapeHtml(weatherText)}</strong></div><div><span>Crowd & peak hours</span><strong>${escapeHtml(crowdText)}</strong></div><div><span>Travel preference impact</span><strong>${escapeHtml(impactText)}</strong></div></div></article>`;
}
async function deleteSavedItinerary(button){
  const tripId = button.dataset.tripId;
  if(!window.confirm('Delete this saved itinerary? This cannot be undone.')) return;
  button.disabled = true; button.textContent = 'Deleting…';
  try {
    await window.rahiApi.deleteTrip(tripId);
    await renderProfile();
  } catch(error) {
    button.disabled = false; button.textContent = 'Delete';
    window.alert(`Could not delete this itinerary: ${error.message}`);
  }
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
    content.innerHTML = `
      <div class="profile-welcome"><div><h3>Welcome back</h3><p>${escapeHtml(user.email)}</p></div><button class="account-btn" onclick="navigateTo('planner')">Plan a trip</button></div>
      <section class="card profile-merged-plans"><h3 class="profile-heading">Saved travel plans</h3><p class="profile-section-note">Each saved plan keeps its itinerary, personalisation, weather, crowd and peak-hour overview together.</p>${trips.length ? `<div class="saved-itinerary-list">${trips.map(itineraryCard).join('')}</div>${trips.length > 4 ? `<button type="button" class="view-more-itineraries" data-hidden-count="${trips.length - 4}">View more (${trips.length - 4})</button>` : ''}` : `<div class="profile-empty-small">No saved travel plans yet.<br><button onclick="navigateTo('planner')">Build and save your first plan</button></div>`}</section>
      <div class="profile-grid">
        <section class="card"><h3 class="profile-heading">Saved budget estimates</h3>${expenses.length ? `<div class="profile-list">${expenses.map(e => profileCard(e.destinationName, `₹${Number(e.estimatedCost).toLocaleString('en-IN')} estimated · ${e.days} day${e.days !== 1 ? 's' : ''} · ${e.people} traveller${e.people !== 1 ? 's' : ''} · ${e.style} style`, profileDate(e.createdAt))).join('')}</div>` : `<div class="profile-empty-small">No saved budgets yet.<br><button onclick="navigateTo('expense')">Calculate a budget</button></div>`}</section>
        <section class="card profile-chats"><h3 class="profile-heading">Saved assistant conversations</h3>${chats.length ? `<div class="profile-list">${chats.map(c => `<article class="profile-item"><div><h4>${escapeHtml(c.title || 'Travel conversation')}</h4><p>Continue planning with TouriSense Smart Assistant</p></div><a class="account-btn" href="chat.html?chat=${encodeURIComponent(c.id)}">Open</a></article>`).join('')}</div>` : `<div class="profile-empty-small">No saved conversations yet.<br><button onclick="navigateTo('chat')">Open Smart Assistant</button></div>`}</section>
      </div>`;
    content.querySelectorAll('.delete-itinerary-btn').forEach(button => button.addEventListener('click', () => deleteSavedItinerary(button)));
    const viewMoreButton = content.querySelector('.view-more-itineraries');
    viewMoreButton?.addEventListener('click', () => {
      const list = content.querySelector('.saved-itinerary-list');
      const expanded = list.classList.toggle('show-all-itineraries');
      viewMoreButton.textContent = expanded ? 'Show less' : `View more (${viewMoreButton.dataset.hiddenCount})`;
    });
  } catch(error) {
    content.innerHTML = `<div class="card profile-empty"><h3>We could not load your saved items</h3><p>Please refresh the page. If this continues, check that Firestore is enabled and its rules have been published.</p></div>`;
  }
}
document.addEventListener('rahi-auth-change', renderProfile);
