/* ============================================================
   weather.js
   Logic for weather.html (Weather Advisory page) only.
   Load AFTER data.js, nav.js and common.js.
   ============================================================ */

/* ============ WEATHER VIEW ============ */
function renderWeather(){
  renderChips('weather-chips', renderWeatherDetail);
  renderWeatherDetail();
}
function renderWeatherDetail(){
  document.querySelectorAll('#weather-chips .dest-chip').forEach(c=>c.classList.toggle('active', c.dataset.id===getCurrentDest()));
  const d = destinations.find(x=>x.id===getCurrentDest());
  const warn = d.weather.advice === 'warn';
  document.getElementById('weather-main').innerHTML = `
    <h4>Conditions at ${d.name}</h4>
    <div style="margin-top:8px;"><div class="weather-temp">${d.weather.temp}°C</div><div class="weather-cond">${d.weather.cond} · ${d.weather.rain}% rain chance</div></div>
    <div class="weather-advice ${warn?'warn':''}">
      <strong>${warn ? 'Conditions may affect your trip' : 'Good conditions for travel'}</strong>
      ${warn ? `${d.weather.cond} expected with a ${d.weather.rain}% chance of rain. Outdoor plans and transfers could be disrupted.`
              : `${d.weather.cond} with low rain risk — a clear window for sightseeing and outdoor activities.`}
    </div>
    ${warn ? `<div class="weather-choice">
        <button data-choice="continue" onclick="selectWeatherChoice(this,'continue')">Continue as planned</button>
        <button data-choice="change" onclick="selectWeatherChoice(this,'change')">Change destination</button>
      </div><p id="weather-choice-note" style="font-size:12.5px;color:var(--text-soft);margin-top:10px;"></p>` : ''}
  `;
  const alts = destinations.filter(x=>x.id!==d.id && x.weather.advice==='good').slice(0,3);
  document.getElementById('weather-alt').innerHTML = `
    <h4>Clearer skies right now</h4>
    <ul class="connecting-list">${alts.map(a=>`<li><span class="conn-name">${a.name}</span><span class="conn-dist">${a.weather.temp}°C, ${a.weather.cond}</span></li>`).join('')}</ul>
  `;
  loadLiveWeather(d);
}
async function loadLiveWeather(d){
  if(!d.coords) return;
  const main = document.getElementById('weather-main');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${d.coords.lat}&longitude=${d.coords.lon}&current=temperature_2m,weather_code&timezone=auto`;
    const response = await fetch(url);
    if(!response.ok) throw new Error('Weather request failed');
    const current = (await response.json()).current;
    if(getCurrentDest() !== d.id) return;
    const conditions = {0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',51:'Light drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',80:'Rain showers',95:'Thunderstorm'};
    const title = main.querySelector('h4');
    const temp = main.querySelector('.weather-temp');
    const cond = main.querySelector('.weather-cond');
    if(title) title.textContent = `Live conditions at ${d.name}`;
    if(temp) temp.textContent = `${Math.round(current.temperature_2m)}°C`;
    if(cond) cond.textContent = `${conditions[current.weather_code] || 'Current conditions'} · updated from Open-Meteo`;
  } catch(error) {
    console.info('Live weather unavailable; showing local demo fallback.');
  }
}
function selectWeatherChoice(btn, choice){
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('weather-choice-note').textContent = choice==='continue'
    ? 'Noted — we\'ll keep monitoring conditions and flag any major changes before your travel date.'
    : 'Check the quieter, clearer alternatives on the right, or head to the Trip Planner to rebuild your route.';
}
