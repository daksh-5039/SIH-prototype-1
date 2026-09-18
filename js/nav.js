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
  hotelPartner: 'index.html#hotel',
  reporter: 'reporter.html',
  localReporter: 'reporter.html'
};

/* Navigates the browser to the page for the given menu item */
function navigateTo(view){
  if (view === 'reporter' || view === 'localReporter') {
    const isReporter = (window.rahiApi?.currentReporter?.() || localStorage.getItem('tourisense_user_role') === 'reporter');
    if (!isReporter) {
      if (window.rahiApi?.openAuthModal) {
        window.rahiApi.openAuthModal('reporter');
      } else {
        window.location.href = 'index.html';
      }
      return;
    }
  }
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
    .adaptive-header .account-btn{background:#10233c!important;color:#edf5ff!important;border-color:#233a58!important}
    .header-quick-links button,.zip-account-tools button{background:transparent!important;color:#9eb1ca!important;border:none!important;border-color:transparent!important;box-shadow:none!important;padding:8px 9px;font-size:12px;font-weight:600;}
    .header-quick-links button[data-view="reporter"]{color:#10b981!important;}
    .header-quick-links button:hover,.zip-account-tools button:hover{color:#edf5ff!important;background:rgba(255,255,255,.07)!important;border-radius:8px;}
    .zip-account-tools ~ .auth-area .ghost-logout-btn,.nav:has(.zip-account-tools) .ghost-logout-btn,header:has(.zip-account-tools) .ghost-logout-btn{display:none!important;}
    .saved-itinerary-list{display:grid;gap:16px;margin-top:14px;}
    .saved-itinerary-card{background:#0d1b2d!important;border:1px solid #233a58!important;border-radius:18px!important;padding:20px!important;color:#edf5ff!important;box-shadow:0 10px 30px rgba(0,0,0,.25)!important;}
    .saved-itinerary-head{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;gap:12px!important;margin-bottom:16px!important;padding-bottom:12px!important;border-bottom:1px solid #1a2d45!important;}
    .saved-itinerary-head h4{margin:0 0 4px!important;font-size:18px!important;font-weight:800!important;color:#edf5ff!important;}
    .saved-itinerary-head p{margin:0!important;font-size:13px!important;color:#9eb1ca!important;}
    .saved-itinerary-actions{display:flex!important;align-items:center!important;gap:12px!important;flex-shrink:0!important;}
    .saved-itinerary-actions span{font-size:12px!important;color:#9eb1ca!important;}
    .delete-itinerary-btn{background:rgba(239,68,68,.12)!important;color:#fca5a5!important;border:1px solid rgba(239,68,68,.3)!important;padding:5px 12px!important;border-radius:8px!important;font-size:12px!important;font-weight:800!important;cursor:pointer!important;transition:all .15s ease!important;}
    .delete-itinerary-btn:hover{background:#ef4444!important;color:#ffffff!important;}
    .itinerary-preferences,.itinerary-saved-outlook{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))!important;gap:10px!important;margin-bottom:10px!important;}
    .itinerary-preferences>div,.itinerary-saved-outlook>div{background:#071220!important;border:1px solid #1b2e46!important;border-radius:12px!important;padding:12px 14px!important;display:flex!important;flex-direction:column!important;gap:4px!important;}
    .itinerary-preferences>div span,.itinerary-saved-outlook>div span{font-size:11px!important;font-weight:700!important;color:#94a3b8!important;text-transform:uppercase!important;letter-spacing:0.5px!important;}
    .itinerary-preferences>div strong,.itinerary-saved-outlook>div strong{font-size:13.5px!important;font-weight:700!important;color:#edf5ff!important;}
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
    quick.innerHTML = '<button type="button" data-view="reviews">▶ Reviews</button><button type="button" data-view="reporter" style="color:#10b981;font-weight:700;">🟢 Reporter</button>';
    quick.addEventListener('click', event => {
      if(event.target.closest('[data-view="reviews"]')) window.location.href = 'planner.html#reviews';
      if(event.target.closest('[data-view="reporter"]')) navigateTo('reporter');
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
  if(forDrawer) items.push(['reporter', '🟢', 'Reporter Portal']);
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
