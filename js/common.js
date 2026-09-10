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

/* ============ PLACE PHOTOS ============
   Wikimedia provides a free real-world thumbnail for each attraction. The
   cache avoids refetching a photo when the same place appears in two views. */
const placePhotoCache = new Map();
const placeWikiTitles = {
  'Old Goa Churches':'Old Goa', 'Kumarakom Sanctuary':'Kumarakom Bird Sanctuary',
  'Vembanad Lake':'Vembanad', 'Alleppey Beach':'Alappuzha Beach',
  'Upper Lake (Bhojtal)':'Upper Lake (Bhopal)', 'Van Vihar National Park':'Van Vihar National Park',
  'Sanchi Stupa':'Sanchi', 'Dashashwamedh Ghat':'Dashashwamedh Ghat',
  'Ramnagar Fort':'Ramnagar Fort', 'Mehtab Bagh':'Mehtab Bagh', 'Baga Beach':'Baga Beach',
  'Old Manali':'Manali', 'Rohtang Pass':'Rohtang Pass'
};
function loadPlacePhotos(container){
  if(!container) return;
  container.querySelectorAll('img[data-place-photo]').forEach(img => {
    const placeName = img.dataset.placePhoto;
    const pageTitle = placeWikiTitles[placeName] || placeName;
    if(!placePhotoCache.has(pageTitle)) {
      placePhotoCache.set(pageTitle, fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`)
        .then(response => response.ok ? response.json() : null)
        .then(data => data?.thumbnail?.source || data?.originalimage?.source || null)
        .catch(() => null));
    }
    placePhotoCache.get(pageTitle).then(url => {
      if(url) { img.src = url; img.classList.add('loaded'); }
      else img.parentElement?.classList.add('photo-unavailable');
    });
  });
}

function mapEmbedUrl(coords){
  const delta = 0.012;
  const bbox = [coords.lon-delta, coords.lat-delta, coords.lon+delta, coords.lat+delta].map(value => value.toFixed(5)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`;
}
function googleMapsUrl(place){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.coords.lat}, ${place.coords.lon}`)}`;
}
function googleMapsDirectionsUrl(places){
  const valid = places.filter(place => place?.coords);
  if(!valid.length) return 'https://www.google.com/maps';
  const destination = `${valid[valid.length-1].coords.lat},${valid[valid.length-1].coords.lon}`;
  const waypoints = valid.slice(0,-1).map(place => `${place.coords.lat},${place.coords.lon}`).join('|');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`;
}
function distanceInKm(from, to){
  const radians = degrees => degrees * Math.PI / 180;
  const earthRadius = 6371;
  const latDiff = radians(to.lat-from.lat), lonDiff = radians(to.lon-from.lon);
  const a = Math.sin(latDiff/2)**2 + Math.cos(radians(from.lat))*Math.cos(radians(to.lat))*Math.sin(lonDiff/2)**2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function showDistanceFromUser(button, place){
  const output = button.parentElement.querySelector('.distance-result');
  if(!navigator.geolocation){ output.textContent = 'Location is not supported by this browser.'; return; }
  button.disabled = true; button.textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(position => {
    const km = distanceInKm({lat:position.coords.latitude, lon:position.coords.longitude}, place.coords);
    output.textContent = `Your straight-line distance: ${km < 1 ? `${Math.round(km*1000)} m` : `${km.toFixed(1)} km`}. Open Google Maps for a road route.`;
    button.textContent = 'Refresh my distance'; button.disabled = false;
  }, () => {
    output.textContent = `Location permission was not granted. The attraction is ${place.dist} from the destination centre.`;
    button.textContent = 'Show distance from me'; button.disabled = false;
  }, {enableHighAccuracy:false, timeout:10000, maximumAge:300000});
}
