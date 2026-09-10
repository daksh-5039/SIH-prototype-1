/* Firebase-powered account, review and itinerary helpers. */
(function () {
  const config = window.RAHI_FIREBASE_CONFIG || {};
  const configured = config.apiKey && !config.apiKey.startsWith('PASTE_');
  let auth = null;
  let db = null;

  function safeText(value) { return String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function showMessage(text, isError) {
    const el = document.getElementById('auth-message');
    if (el) { el.textContent = text; el.className = `auth-message ${isError ? 'error' : 'success'}`; }
  }
  function openAuth() { document.getElementById('auth-modal')?.classList.add('open'); }
  function closeAuth() { document.getElementById('auth-modal')?.classList.remove('open'); }
  function renderUser(user) {
    const area = document.getElementById('auth-area');
    if (!area) return;
    area.innerHTML = user
      ? `<button class="account-btn" id="ai-btn" title="Open Smart Assistant">Smart Assistant</button><button class="account-btn profile-link" id="profile-btn" title="Open your profile">Profile</button><button class="account-btn" id="logout-btn">Log out</button>`
      : `<button class="account-btn" id="login-btn">Log in / Sign up</button>`;
    document.getElementById('login-btn')?.addEventListener('click', openAuth);
    document.getElementById('ai-btn')?.addEventListener('click', () => window.location.href = 'chat.html');
    document.getElementById('profile-btn')?.addEventListener('click', () => window.location.href = 'profile.html');
    document.getElementById('logout-btn')?.addEventListener('click', () => auth.signOut());
    document.dispatchEvent(new CustomEvent('rahi-auth-change', { detail: { user } }));
  }
  async function submitAuth(mode) {
    if (!configured) return showMessage('Add your Firebase web configuration in js/firebase-config.js first.', true);
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!email || password.length < 6) return showMessage('Enter a valid email and a password of at least 6 characters.', true);
    try {
      if (mode === 'signup') {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(result.user.uid).set({ email, createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } else await auth.signInWithEmailAndPassword(email, password);
      closeAuth();
    } catch (error) { showMessage(error.message.replace('Firebase: ', ''), true); }
  }
  function injectUI() {
    const header = document.querySelector('.header-inner');
    if (header && !document.getElementById('auth-area')) header.insertAdjacentHTML('beforeend', '<div id="auth-area" class="auth-area"></div>');
    document.body.insertAdjacentHTML('beforeend', `
      <div class="auth-modal" id="auth-modal" aria-hidden="true"><div class="auth-dialog" role="dialog" aria-modal="true" aria-label="Account">
        <button class="auth-close" id="auth-close" aria-label="Close">×</button><h3>Travel with Rahi</h3>
        <p>Sign in to publish reviews and save your itinerary.</p>
        <input id="auth-email" type="email" placeholder="Email address" autocomplete="email">
        <input id="auth-password" type="password" placeholder="Password (6+ characters)" autocomplete="current-password">
        <div class="auth-actions"><button id="signin-btn">Log in</button><button id="signup-btn">Create account</button></div>
        <div id="auth-message" class="auth-message"></div>
      </div></div>`);
    document.getElementById('auth-close').addEventListener('click', closeAuth);
    document.getElementById('auth-modal').addEventListener('click', e => { if (e.target.id === 'auth-modal') closeAuth(); });
    document.getElementById('signin-btn').addEventListener('click', () => submitAuth('signin'));
    document.getElementById('signup-btn').addEventListener('click', () => submitAuth('signup'));
  }
  window.rahiApi = {
    configured: () => configured,
    currentUser: () => auth?.currentUser || null,
    requireUser: () => { if (!auth?.currentUser) { openAuth(); return false; } return true; },
    async getReviews(destinationId) {
      if (!db) return [];
      const snapshot = await db.collection('reviews').where('destinationId', '==', destinationId).limit(30).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().createdAt?.toDate?.().toLocaleDateString('en-IN') || 'Just now' })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    },
    async addReview(destinationId, rating, text) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      const user = auth.currentUser;
      await db.collection('reviews').add({ destinationId, rating, text, userId: user.uid, name: user.displayName || user.email.split('@')[0], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    },
    async saveTrip(trip) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      await db.collection('users').doc(auth.currentUser.uid).collection('trips').add({ ...trip, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    },
    async saveExpense(expense) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      await db.collection('users').doc(auth.currentUser.uid).collection('expenses').add({ ...expense, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    },
    async getProfileData() {
      if (!auth?.currentUser || !db) return { trips: [], expenses: [], chats: [] };
      const userRef = db.collection('users').doc(auth.currentUser.uid);
      const [trips, expenses, chats] = await Promise.all([userRef.collection('trips').get(), userRef.collection('expenses').get(), userRef.collection('chats').get()]);
      const sortNewest = items => items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      return {
        trips: sortNewest(trips.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
        expenses: sortNewest(expenses.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
        chats: sortNewest(chats.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      };
    },
    async createChat(title) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      const ref = await db.collection('users').doc(auth.currentUser.uid).collection('chats').add({ title, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      return ref.id;
    },
    async getChatMessages(chatId) {
      if (!auth?.currentUser || !db || !chatId) return [];
      const snapshot = await db.collection('users').doc(auth.currentUser.uid).collection('chats').doc(chatId).collection('messages').orderBy('createdAt').get();
      return snapshot.docs.map(doc => ({ id:doc.id, ...doc.data() }));
    },
    async saveChatMessage(chatId, role, text) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      const chat = db.collection('users').doc(auth.currentUser.uid).collection('chats').doc(chatId);
      await chat.collection('messages').add({ role, text, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      await chat.set({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
    },
    async askTravelAi(message, history) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      const profile = await window.rahiApi.getProfileData();
      return window.rahiSmartAssistant.reply(message, profile, history);
    },
    subscribeCrowd(destinationId, callback) {
      if (!db) { callback([]); return () => {}; }
      return db.collection('crowdReports').doc(destinationId).collection('reports').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, error => { console.warn('Could not load live crowd reports', error); callback([]); });
    },
    async reportCrowd(destinationId, level) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      if (!['low', 'medium', 'high'].includes(level)) throw new Error('Invalid crowd level.');
      await db.collection('crowdReports').doc(destinationId).collection('reports').doc(auth.currentUser.uid).set({
        level, reportedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  };
  if (configured && window.firebase) {
    firebase.initializeApp(config); auth = firebase.auth(); db = firebase.firestore();
    auth.onAuthStateChanged(renderUser);
  }
  document.addEventListener('DOMContentLoaded', () => {
    injectUI();
    renderUser(auth?.currentUser || null);
  });
})();
