/* Logged-in user's saved plans and budget estimates. */
function profileDate(timestamp){
  return timestamp?.toDate ? timestamp.toDate().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'Just saved';
}
function profileCard(title, detail, date){
  return `<article class="profile-item"><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(detail)}</p></div><span>${date}</span></article>`;
}
async function renderProfile(){
  const content = document.getElementById('profile-content');
  if(!content) return;
  const user = window.rahiApi?.currentUser();
  if(!user){
    content.innerHTML = `<div class="card profile-empty"><h3>Sign in to see your profile</h3><p>Your saved plans and budgets are connected to your Rahi account.</p><button class="calc-btn" onclick="document.getElementById('login-btn')?.click()">Log in / Sign up</button></div>`;
    return;
  }
  content.innerHTML = `<div class="profile-welcome"><div><h3>Welcome back</h3><p>${escapeHtml(user.email)}</p></div><button class="account-btn" onclick="navigateTo('planner')">Plan a trip</button></div><div class="card">Loading saved plans…</div>`;
  try {
    const { trips, expenses, chats } = await window.rahiApi.getProfileData();
    content.innerHTML = `
      <div class="profile-welcome"><div><h3>Welcome back</h3><p>${escapeHtml(user.email)}</p></div><button class="account-btn" onclick="navigateTo('planner')">Plan a trip</button></div>
      <div class="profile-grid">
        <section class="card"><h3 class="profile-heading">Saved itineraries</h3>${trips.length ? `<div class="profile-list">${trips.map(t => profileCard(t.destinationName, `${t.travelMode || 'Travel mode not selected'}${t.places?.length ? ` · ${t.places.join(', ')}` : ' · No places added yet'}`, profileDate(t.createdAt))).join('')}</div>` : `<div class="profile-empty-small">No saved itineraries yet.<br><button onclick="navigateTo('planner')">Build your first plan</button></div>`}</section>
        <section class="card"><h3 class="profile-heading">Saved budget estimates</h3>${expenses.length ? `<div class="profile-list">${expenses.map(e => profileCard(e.destinationName, `₹${Number(e.estimatedCost).toLocaleString('en-IN')} estimated · ${e.days} day${e.days !== 1 ? 's' : ''} · ${e.people} traveller${e.people !== 1 ? 's' : ''} · ${e.style} style`, profileDate(e.createdAt))).join('')}</div>` : `<div class="profile-empty-small">No saved budgets yet.<br><button onclick="navigateTo('expense')">Calculate a budget</button></div>`}</section>
        <section class="card profile-chats"><h3 class="profile-heading">Saved assistant conversations</h3>${chats.length ? `<div class="profile-list">${chats.map(c => `<article class="profile-item"><div><h4>${escapeHtml(c.title || 'Travel conversation')}</h4><p>Continue planning with Rahi Smart Assistant</p></div><a class="account-btn" href="chat.html?chat=${encodeURIComponent(c.id)}">Open</a></article>`).join('')}</div>` : `<div class="profile-empty-small">No saved conversations yet.<br><button onclick="navigateTo('chat')">Open Smart Assistant</button></div>`}</section>
      </div>`;
  } catch(error) {
    content.innerHTML = `<div class="card profile-empty"><h3>We could not load your saved items</h3><p>Please refresh the page. If this continues, check that Firestore is enabled and its rules have been published.</p></div>`;
  }
}
document.addEventListener('rahi-auth-change', renderProfile);
