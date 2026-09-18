/* Community-submitted local events, shops and experiences. */
let localListingType = 'all';
let cachedListings = [];

function renderLocalDiscoveries(){
  renderChips('local-chips', reloadLocalListings);
  document.getElementById('open-listing-form').addEventListener('click', toggleListingForm);
  document.getElementById('local-filter-row').addEventListener('click', event => {
    const button = event.target.closest('[data-type]'); if(!button) return;
    localListingType = button.dataset.type;
    document.querySelectorAll('#local-filter-row [data-type]').forEach(item => item.classList.toggle('active', item === button));
    renderLocalListings();
  });
  document.addEventListener('rahi-auth-change', () => { if(!document.getElementById('listing-form-wrap').hidden) renderListingForm(); });
  reloadLocalListings();
}
async function reloadLocalListings(){
  const d = destinations.find(item => item.id === getCurrentDest());
  document.querySelectorAll('#local-chips .dest-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.id === d.id));
  document.getElementById('local-destination-name').textContent = d.name;
  const prototypeListings = LOCAL_DISCOVERY_SEEDS.filter(item => item.destinationId === d.id);
  try { cachedListings = [...prototypeListings, ...await window.rahiApi.getLocalListings(d.id)]; }
  catch(error) { cachedListings = prototypeListings; console.warn('Could not load community local listings', error); }
  renderLocalListings();
}
function renderLocalListings(){
  const grid = document.getElementById('local-listing-grid');
  const listings = cachedListings.filter(item => localListingType === 'all' || item.type === localListingType);
  if(!listings.length){ grid.innerHTML = `<div class="local-empty"><strong>No ${localListingType === 'all' ? 'local listings' : localListingType + 's'} yet.</strong><p>Are you a local host? Share an event, shop or small experience for travellers visiting this destination.</p></div>`; return; }
  grid.innerHTML = listings.map(listing => {
    const mapUrl = listing.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.location}, ${destinations.find(item => item.id === listing.destinationId)?.name || ''}`)}`;
    const status = listing.seed ? 'Prototype listing' : 'Community listing';
    return `<article class="local-listing-card"><div class="local-listing-top"><span class="local-type ${escapeHtml(listing.type)}">${listing.type === 'event' ? '📅 Event' : listing.type === 'shop' ? '🛍 Shop' : '✨ Experience'}</span><span>${escapeHtml(status)}</span></div><h3>${escapeHtml(listing.title)}</h3><p>${escapeHtml(listing.details)}</p><div class="local-listing-info"><span>📍 ${escapeHtml(listing.location)}</span>${listing.when ? `<span>🕒 ${escapeHtml(listing.when)}</span>` : ''}<span>👥 Typical city crowd: ${escapeHtml(destinations.find(item => item.id === listing.destinationId)?.crowd || 'varies')}</span></div><div class="local-listing-foot"><span>${listing.seed ? 'Verify details before visiting' : `Shared by ${escapeHtml(listing.hostName || 'a local host')}`}</span><a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a></div></article>`;
  }).join('');
}
function toggleListingForm(){
  const wrap = document.getElementById('listing-form-wrap');
  wrap.hidden = !wrap.hidden;
  if(!wrap.hidden) { renderListingForm(); wrap.scrollIntoView({behavior:'smooth', block:'start'}); }
}
function renderListingForm(){
  const wrap = document.getElementById('listing-form-wrap');
  if(!window.rahiApi.currentUser()){
    wrap.innerHTML = `<h3>Share a local listing</h3><p class="local-form-intro">Please log in first. This helps keep community listings accountable.</p><button class="calc-btn" id="local-login-button">Log in / Sign up</button>`;
    document.getElementById('local-login-button').addEventListener('click', () => document.getElementById('login-btn')?.click()); return;
  }
  wrap.innerHTML = `<div class="local-form-head"><div><h3>Share with travellers</h3><p>Post an event, shop or experience for ${escapeHtml(destinations.find(item => item.id === getCurrentDest()).name)}.</p></div><button type="button" class="local-form-close" id="close-listing-form">×</button></div><form id="local-listing-form"><div class="local-form-grid"><label>Listing type<select name="type"><option value="event">Event</option><option value="shop">Shop</option><option value="experience">Experience</option></select></label><label>When <input name="when" maxlength="70" placeholder="e.g. Sat, 5–8 PM"></label></div><label>Title <input name="title" required minlength="3" maxlength="90" placeholder="e.g. Sunset folk music evening"></label><label>What should visitors know?<textarea name="details" required minlength="10" maxlength="700" placeholder="Describe the event, shop or experience, what is available and any useful details."></textarea></label><label>Venue or address <input name="location" required maxlength="160" placeholder="e.g. Upper Lake promenade, Bhopal"></label><button class="calc-btn" type="submit">Publish local listing</button><p class="local-form-note" id="local-form-note"></p></form>`;
  document.getElementById('close-listing-form').addEventListener('click', toggleListingForm);
  document.getElementById('local-listing-form').addEventListener('submit', submitLocalListing);
}
async function submitLocalListing(event){
  event.preventDefault();
  const form = event.currentTarget; const data = new FormData(form);
  const d = destinations.find(item => item.id === getCurrentDest());
  const location = data.get('location').trim();
  const note = document.getElementById('local-form-note'); const button = form.querySelector('button[type="submit"]');
  const listing = { destinationId:d.id, title:data.get('title').trim(), type:data.get('type'), details:data.get('details').trim(), location, when:data.get('when').trim(), mapUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location}, ${d.name}`)}` };
  try { button.disabled = true; button.textContent = 'Publishing…'; await window.rahiApi.addLocalListing(listing); note.textContent = 'Published. Travellers can now find it in this destination.'; form.reset(); await reloadLocalListings(); }
  catch(error) { note.textContent = error.message || 'Could not publish this listing.'; }
  finally { button.disabled = false; button.textContent = 'Publish local listing'; }
}
