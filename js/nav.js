/* ============================================================
   nav.js
   Header + mobile drawer navigation.
   Each menu item now opens its OWN web page (instead of just
   swapping a section on one page), so a click navigates the
   browser to that page's .html file.
   Load AFTER data.js.
   ============================================================ */

/* Maps each nav item's data-view value to its own HTML page */
const RAHI_PAGES = {
  home:    'index.html',
  planner: 'index.html#planner',
  crowd:   'index.html#crowd',
  expense: 'expense.html',
  weather: 'weather.html',
  local:   'index.html#market',
  profile: 'profile.html',
  chat:    'index.html#chat',
  explore: 'index.html#explore',
  trip:    'index.html#trip',
  hotel:   'index.html#hotel',
  safety:  'index.html#safety',
  hotelPartner: 'index.html#hotel'
};

/* Navigates the browser to the page for the given menu item */
function navigateTo(view){
  const target = RAHI_PAGES[view];
  if(target) window.location.href = target;
}

/* Call once per page, passing which page this is (e.g. 'home') */
function initNav(currentPage){
  ensureDarkSurfaces();
  buildAdaptiveHeader(currentPage);
  bindNav(document.getElementById('navlinks'), currentPage);
  bindNav(document.getElementById('drawerNav'), currentPage);

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  hamburgerBtn?.addEventListener('click', ()=>{mobileDrawer?.classList.add('open');drawerOverlay?.classList.add('open');});
  document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
  drawerOverlay?.addEventListener('click', closeDrawer);
}

// Loaded by every standalone page. This guarantees that the adaptive shell
// cannot inherit an old light-card rule from a cached stylesheet.
function ensureDarkSurfaces(){
  if(document.getElementById('tourisense-dark-surfaces')) return;
  const style = document.createElement('style');
  style.id = 'tourisense-dark-surfaces';
  style.textContent = `
    .local-listing-card{background:#0d1b2d!important;color:#edf5ff!important;border-color:#233a58!important;box-shadow:0 20px 60px rgba(0,0,0,.24)!important}
    .local-listing-card h3,.local-listing-card h4,.local-listing-card strong{color:#edf5ff!important}
    .local-listing-card>p,.local-listing-card .local-listing-info,.local-listing-card .local-listing-foot,.local-listing-card .local-listing-top>span:last-child{color:#9eb1ca!important}
    .local-listing-card .local-listing-foot a{background:#10233c!important;color:#67e8f9!important;border-color:#67e8f9!important}
    .local-listing-card .local-type.event{background:rgba(251,113,133,.18)!important;color:#fecdd3!important}.local-listing-card .local-type.shop{background:rgba(251,191,36,.18)!important;color:#fde68a!important}.local-listing-card .local-type.experience{background:rgba(94,234,212,.16)!important;color:#99f6e4!important}
    footer{background:#07111f!important;border-top:1px solid #233a58!important}footer .footer-inner p{color:#9eb1ca!important}
    .card,.chart-card,.quick-panel,.travel-option,.conn-card,.hotel-finder,.partner-form-card,.partner-metrics article,.partner-action-grid article,.saved-itinerary-card,.saved-destination-card,.profile-item,.profile-welcome{background:#0d1b2d!important;color:#edf5ff!important;border-color:#233a58!important}
    .local-listing-form,.trip-tools,.partner-login{background:#0d1b2d!important;color:#edf5ff!important;border-color:#233a58!important}
    .local-listing-form input,.local-listing-form select,.local-listing-form textarea,.partner-form-card input,.partner-form-card select,.chat-form textarea,.field input,.field select{background:#081526!important;color:#edf5ff!important;border-color:#233a58!important}
    .dest-chip,.interest-chip,.place-scope-chip,.hotel-scope-chip,.weather-choice button,.crowd-report-actions button,.view-more-itineraries{background:#091729!important;color:#9eb1ca!important;border-color:#233a58!important}
    .dest-chip.active,.interest-chip.active,.place-scope-chip.active,.hotel-scope-chip.active{background:linear-gradient(135deg,rgba(94,234,212,.28),rgba(96,165,250,.23))!important;color:#edf5ff!important;border-color:#67e8f9!important}
    .local-host-btn,.partner-hero-link{background:linear-gradient(135deg,#67e8f9,#60a5fa)!important;color:#06101c!important}
    .adaptive-header .account-btn,.header-quick-links button{background:#10233c!important;color:#edf5ff!important;border-color:#233a58!important}
  `;
  document.head.appendChild(style);
}

function buildAdaptiveHeader(currentPage){
  const header = document.querySelector('.site-header');
  const inner = document.querySelector('.header-inner');
  const nav = document.getElementById('navlinks');
  const drawer = document.getElementById('drawerNav');
  if(!header || !inner || !nav) return;

  header.classList.add('adaptive-header');
  const brand = inner.querySelector('.brand');
  if(brand) brand.innerHTML = '<div class="adaptive-logo">TS</div><div class="adaptive-brand-copy"><strong>TouriSense</strong><small>Adaptive Travel</small></div>';
  nav.classList.add('adaptive-navlinks');
  nav.innerHTML = adaptiveNavButtons();
  if(drawer) drawer.innerHTML = adaptiveNavButtons(true);

  inner.querySelector('.header-cta')?.remove();
  if(!document.getElementById('header-quick-links')){
    const quick = document.createElement('div');
    quick.id = 'header-quick-links'; quick.className = 'header-quick-links';
    quick.innerHTML = '<button type="button" data-view="reviews">▶ Reviews</button>';
    quick.addEventListener('click', event => {
      if(event.target.closest('[data-view="reviews"]')) window.location.href = 'planner.html#reviews';
    });
    inner.appendChild(quick);
  }
  const activeView = currentPage === 'hotelPartner' ? 'hotel' : currentPage;
  nav.querySelectorAll('[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === activeView));
}

function adaptiveNavButtons(forDrawer = false){
  const items = [
    ['home', '🏠', 'Home'], ['chat', '🤖', 'AI Guide'], ['planner', '✨', 'Plan Trip'],
    ['explore', '📍', 'Explore'], ['crowd', '👥', 'Crowd'], ['trip', '🧳', 'My Trip'],
    ['local', '💚', 'Local'], ['hotel', '🏨', 'Hotels'], ['safety', '🚨', 'Safety']
  ];
  return items.map(([view, icon, label]) => `<button data-view="${view}">${forDrawer ? '' : `<span aria-hidden="true">${icon}</span> `}${label}</button>`).join('');
}

function bindNav(container, currentPage){
  if(!container) return;
  // Mark the button for the current page as active on load
  container.querySelectorAll('button[data-view]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.view === currentPage);
  });
  // Clicking any menu item opens that item's own page
  container.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-view]');
    if(!btn) return;
    closeDrawer();
    if(btn.dataset.view === 'reviews') { window.location.href = 'planner.html#reviews'; return; }
    navigateTo(btn.dataset.view);
  });
}

function closeDrawer(){
  document.getElementById('mobileDrawer')?.classList.remove('open');
  document.getElementById('drawerOverlay')?.classList.remove('open');
}
