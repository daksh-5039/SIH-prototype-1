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
  planner: 'planner.html',
  crowd:   'crowd.html',
  expense: 'expense.html',
  weather: 'weather.html',
  profile: 'profile.html',
  chat:    'chat.html'
};

/* Navigates the browser to the page for the given menu item */
function navigateTo(view){
  const target = RAHI_PAGES[view];
  if(target) window.location.href = target;
}

/* Call once per page, passing which page this is (e.g. 'home') */
function initNav(currentPage){
  bindNav(document.getElementById('navlinks'), currentPage);
  bindNav(document.getElementById('drawerNav'), currentPage);

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  hamburgerBtn.addEventListener('click', ()=>{mobileDrawer.classList.add('open');drawerOverlay.classList.add('open');});
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
}

function bindNav(container, currentPage){
  // Mark the button for the current page as active on load
  container.querySelectorAll('button[data-view]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.view === currentPage);
  });
  // Clicking any menu item opens that item's own page
  container.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-view]');
    if(!btn) return;
    closeDrawer();
    navigateTo(btn.dataset.view);
  });
}

function closeDrawer(){
  document.getElementById('mobileDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}
