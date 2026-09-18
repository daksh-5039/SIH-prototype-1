/* Firebase bridge for the TouriSense adaptive single-page frontend. */
(function () {
  function apiReady() { return window.rahiApi?.configured?.(); }
  function signedIn() { return window.rahiApi?.currentUser?.(); }
  function requireLogin() {
    if (!apiReady()) { toast('Firebase is not configured yet. Add the project configuration first.'); return false; }
    if (signedIn()) return true;
    window.rahiApi.requireUser();
    return false;
  }
  function addAccountTools() {
    const nav = document.querySelector('.nav');
    if (!nav || document.getElementById('zip-account-tools')) return;
    const tools = document.createElement('div');
    tools.id = 'zip-account-tools'; tools.className = 'zip-account-tools';
    tools.innerHTML = '<button class="ghost" id="zip-reviews">▶ Reviews</button><button class="ghost" id="zip-profile">Profile</button><button class="ghost" id="zip-auth">Log in</button>';
    nav.appendChild(tools);
    document.getElementById('zip-reviews').onclick = () => location.href = 'planner.html#reviews';
    document.getElementById('zip-profile').onclick = () => location.href = 'profile.html';
    document.getElementById('zip-auth').onclick = () => {
      if (signedIn()) { firebase.auth().signOut(); return; }
      // Keep the account entry point reliable even if Firebase initialization is
      // still finishing while the page first loads.
      const modal = document.getElementById('auth-modal');
      if (modal) modal.classList.add('open');
      else window.rahiApi.requireUser();
    };
    document.addEventListener('rahi-auth-change', event => {
      const user = event.detail?.user;
      const authButton = document.getElementById('zip-auth');
      if (authButton) authButton.textContent = user ? 'Log out' : 'Log in';
    });
    const style = document.createElement('style');
    style.textContent = '.zip-account-tools{display:flex;flex:0 0 auto;gap:3px;align-items:center;margin-left:0}.zip-account-tools .ghost{white-space:nowrap;padding:8px 8px;font-size:12px}@media(max-width:760px){.zip-account-tools{flex:0 0 auto}.zip-account-tools .ghost{padding:8px 7px;font-size:11px}}';
    document.head.appendChild(style);
    const hotelNote = document.querySelector('.hotel-note');
    if (hotelNote) hotelNote.textContent = '🔒 When signed in, this accommodation profile is stored privately in your TouriSense account. No guest data is collected.';
  }
  const originalCreateTrip = window.createTrip;
  window.createTrip = async function () {
    const result = await originalCreateTrip.apply(this, arguments);
    const saveButton = document.querySelector('[onclick="saveTrip()"]');
    if (saveButton) saveButton.textContent = 'Save to profile';
    return result;
  };
  window.saveTrip = async function () {
    if (!state?.trip) { toast('Create a trip first.'); return; }
    if (!requireLogin()) return;
    const trip = state.trip;
    try {
      await window.rahiApi.saveTrip({
        destinationId: 'bhopal', destinationName: 'Bhopal', travelMode: 'Road route',
        places: trip.selected.map(item => item.p.name), tripDate: document.getElementById('tripDate')?.value || '',
        startTime: trip.startTime || document.getElementById('startTime')?.value || '09:00',
        travelStyle: trip.style, interests: trip.interests, constraints: document.getElementById('constraints')?.value || '',
        estimatedDailyPerPerson: Math.round(trip.total / Math.max(1, trip.selected.length)),
        adaptiveTrip: { budget:trip.budget, hours:trip.hours, total:trip.total, start:trip.start?.name || 'Bhopal', savedFrom:'Adaptive frontend' }
      });
      toast('Trip saved to your TouriSense Profile ✨');
    } catch (error) { toast(`Could not save trip: ${error.message}`); }
  };
  const localCrowdSubmit = window.submitCrowdReport;
  window.submitCrowdReport = async function () {
    localCrowdSubmit.apply(this, arguments);
    if (!signedIn() || !apiReady()) return;
    const level = document.getElementById('reportLevel')?.value;
    try { await window.rahiApi.reportCrowd('bhopal', level); toast('Crowd report saved for TouriSense visitors.'); }
    catch (error) { console.warn('Shared crowd report could not be saved', error); }
  };
  window.becomeLocalHost = function () {
    if (!requireLogin()) return;
    location.href = 'local.html';
  };
  window.connectHotel = async function () {
    const name = document.getElementById('hotelName')?.value.trim();
    const rooms = Number(document.getElementById('hotelRooms')?.value);
    const occupancy = Number(document.getElementById('hotelOccInput')?.value);
    if (!name || !rooms || occupancy < 0 || occupancy > 100) { toast('Add hotel name, rooms and occupancy first.'); return; }
    if (!requireLogin()) return;
    try {
      await window.rahiApi.saveHotelPartnerProfile({ name, type:document.getElementById('hotelType')?.value || 'Small hotel', totalRooms:rooms, availableRooms:Math.round(rooms * (100 - occupancy) / 100), destinationId:'bhopal', source:'Adaptive frontend' });
      document.getElementById('hotelAlert').innerHTML = '✅ <b>Accommodation profile saved.</b> It is private to your signed-in TouriSense account.';
      toast('Hotel profile saved privately.');
    } catch (error) { toast(`Could not save hotel: ${error.message}`); }
  };
  window.shareTrip = function () {
    if (!state?.trip) { toast('Create a trip first.'); return; }
    const text = `My TouriSense Bhopal plan: ${state.trip.selected.map(item => item.p.name).join(', ')}.`;
    if (navigator.share) navigator.share({ title:'My TouriSense trip', text }).catch(() => {});
    else { navigator.clipboard?.writeText(text); toast('Trip summary copied.'); }
  };
  // The adaptive UI already has a quick spend tracker. Mirror each new entry to
  // the signed-in user's profile so it survives a different browser or device.
  const localAddSpend = window.addSpend;
  window.addSpend = function (amount, label) {
    const result = localAddSpend.apply(this, arguments);
    if (!apiReady() || !signedIn() || !state?.trip || !Number(amount)) return result;
    window.rahiApi.saveExpense({
      destinationId: 'bhopal', destinationName: 'Bhopal', amount: Number(amount),
      label: label || 'Trip spend', tripDate: document.getElementById('tripDate')?.value || '',
      savedFrom: 'Adaptive trip spend tracker'
    }).catch(error => console.warn('Profile expense could not be saved', error));
    return result;
  };
  // Preserve a conversation in the user's existing chat history without
  // changing the ZIP interface or making the user manage chat files.
  const localSendChat = window.sendChat;
  window.sendChat = async function () {
    const input = document.getElementById('chatInput');
    const question = input?.value.trim();
    const result = await localSendChat.apply(this, arguments);
    if (!question || !apiReady() || !signedIn()) return result;
    try {
      if (!state.zipChatId) {
        const title = question.length > 58 ? `${question.slice(0, 58)}…` : question;
        state.zipChatId = await window.rahiApi.createChat(title || 'TouriSense AI guide');
      }
      const messages = document.getElementById('messages');
      const reply = messages?.lastElementChild?.textContent?.trim() || 'Travel recommendation generated.';
      await window.rahiApi.saveChatMessage(state.zipChatId, 'user', question);
      await window.rahiApi.saveChatMessage(state.zipChatId, 'assistant', reply);
    } catch (error) { console.warn('Chat history could not be saved', error); }
    return result;
  };
  document.addEventListener('DOMContentLoaded', addAccountTools);
})();
