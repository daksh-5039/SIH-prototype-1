/* Firebase-powered account, review, and Local Reporter auth helpers. */
(function () {
  const config = window.RAHI_FIREBASE_CONFIG || {};
  const configured = config.apiKey && !config.apiKey.startsWith('PASTE_');
  let auth = null;
  let db = null;

  // Local Reporter demo presets
  const DEMO_REPORTERS = {
    ramesh: {
      name: 'ramesh guide',
      id: 'GV102',
      email: 'ramesh.guide@tourisense.in',
      role: 'Local Reporter',
      assignedLocation: 'upper-lake',
      assignedName: 'Upper Lake (Bhojtal)',
      acceptedToday: 3,
      estimatedEarnings: 30,
      ratePerUpdate: 10,
      lastUpdate: '12 mins ago'
    },
    priya: {
      name: 'priya sharma',
      id: 'GV105',
      email: 'priya.reporter@tourisense.in',
      role: 'Local Reporter',
      assignedLocation: 'van-vihar',
      assignedName: 'Van Vihar National Park',
      acceptedToday: 5,
      estimatedEarnings: 50,
      ratePerUpdate: 10,
      lastUpdate: '25 mins ago'
    },
    amit: {
      name: 'amit verma',
      id: 'GV108',
      email: 'amit.reporter@tourisense.in',
      role: 'Local Reporter',
      assignedLocation: 'tribal-museum',
      assignedName: 'Tribal Museum',
      acceptedToday: 2,
      estimatedEarnings: 20,
      ratePerUpdate: 10,
      lastUpdate: '1 hour ago'
    }
  };

  // Reporter Session Management
  function getActiveReporter() {
    try {
      const saved = localStorage.getItem('tourisense_active_reporter');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  function setActiveReporter(rep) {
    if (rep) {
      localStorage.setItem('tourisense_active_reporter', JSON.stringify(rep));
      localStorage.setItem('tourisense_user_role', 'reporter');
    } else {
      localStorage.removeItem('tourisense_active_reporter');
      if (localStorage.getItem('tourisense_user_role') === 'reporter') {
        localStorage.removeItem('tourisense_user_role');
      }
    }
    renderUser(auth?.currentUser || null);
    document.dispatchEvent(new CustomEvent('tourisense-reporter-change', { detail: { reporter: rep } }));
  }

  function recordGroundUpdate(updateData) {
    let rep = getActiveReporter() || DEMO_REPORTERS.ramesh;
    rep.acceptedToday = (Number(rep.acceptedToday) || 0) + 1;
    rep.lastUpdate = 'Just now';
    setActiveReporter(rep);

    // Save into community crowd reports for immediate live reflect
    try {
      const arr = JSON.parse(localStorage.getItem('TouriSense-reports') || '[]');
      arr.push({
        place: updateData.placeId || rep.assignedLocation,
        placeName: updateData.placeName || rep.assignedName,
        level: updateData.crowdLevel ? (updateData.crowdLevel.toLowerCase().includes('high') ? 'high' : updateData.crowdLevel.toLowerCase().includes('low') ? 'low' : 'medium') : 'medium',
        note: `[Ground Reporter ${rep.id}] Movement: ${updateData.movement || 'Normal'}. Weather: ${updateData.weather || 'Normal'}. Visiting: ${updateData.visiting || 'Good'}`,
        photo: updateData.photo || null,
        at: Date.now(),
        verified: true,
        reporterId: rep.id
      });
      localStorage.setItem('TouriSense-reports', JSON.stringify(arr.slice(-100)));
    } catch (e) {}

    // Also persist to Firestore if available
    if (db && rep.assignedLocation) {
      db.collection('crowdReports').doc(rep.assignedLocation).collection('reports').add({
        level: updateData.crowdLevel || 'medium',
        reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
        reporterId: rep.id,
        reporterName: rep.name,
        verified: true,
        answers: updateData
      }).catch(err => console.warn('Could not sync report to Firestore:', err));
    }
    return rep;
  }

  window.tourisenseReporter = {
    getActiveReporter,
    setActiveReporter,
    recordGroundUpdate,
    DEMO_REPORTERS
  };

  let activeTabRole = 'reporter'; // default to reporter on load as per screenshot
  let isSignUpMode = false;
  let sysTimeTimer = null;

  function safeText(value) {
    return String(value || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function showMessage(text, isError) {
    const el = document.getElementById('auth-message');
    if (el) {
      el.textContent = text;
      el.className = `auth-message ${isError ? 'error' : 'success'}`;
    }
  }

  function openAuth(preferredRole) {
    if (preferredRole) setRoleTab(preferredRole);
    const demoMenu = document.getElementById('quick-demo-popover');
    if (demoMenu) {
      demoMenu.classList.remove('open', 'show');
      demoMenu.hidden = true;
    }
    document.getElementById('auth-modal')?.classList.add('open');
    startSysTimeClock();
  }

  function closeAuth() {
    document.getElementById('auth-modal')?.classList.remove('open');
    if (sysTimeTimer) clearInterval(sysTimeTimer);
  }

  function startSysTimeClock() {
    const el = document.getElementById('auth-sys-time');
    if (!el) return;
    const update = () => { el.textContent = new Date().toISOString(); };
    update();
    if (sysTimeTimer) clearInterval(sysTimeTimer);
    sysTimeTimer = setInterval(update, 1000);
  }

  function setRoleTab(role) {
    activeTabRole = role;
    document.querySelectorAll('.auth-role-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.role === role);
    });

    const callout = document.getElementById('auth-guide-callout');
    const roleTitle = document.getElementById('auth-role-title');
    const emailLabel = document.getElementById('auth-email-label');
    const emailInput = document.getElementById('auth-email');
    const submitBtn = document.getElementById('auth-main-submit');

    if (role === 'reporter') {
      if (callout) callout.style.display = 'block';
      if (roleTitle) roleTitle.textContent = isSignUpMode ? 'Register as Local Reporter' : 'Verified Local Reporter Sign In';
      if (emailLabel) emailLabel.textContent = 'Local Reporter Email / Corporate Email';
      if (emailInput && (!emailInput.value || emailInput.value.includes('@tourisense.in') || emailInput.value.includes('tourist') || emailInput.value.includes('partner'))) {
        emailInput.value = 'ramesh.guide@tourisense.in';
      }
    } else if (role === 'hotel') {
      if (callout) callout.style.display = 'none';
      if (roleTitle) roleTitle.textContent = isSignUpMode ? 'Register Hotel / Stay' : 'Accommodation Partner Sign In';
      if (emailLabel) emailLabel.textContent = 'Hotel Owner Email';
      if (emailInput && (!emailInput.value || emailInput.value.includes('@tourisense.in') || emailInput.value.includes('guide'))) {
        emailInput.value = 'partner@lakeviewbhopal.in';
      }
    } else { // tourist
      if (callout) callout.style.display = 'none';
      if (roleTitle) roleTitle.textContent = isSignUpMode ? 'Create Tourist Account' : 'Tourist Sign In';
      if (emailLabel) emailLabel.textContent = 'Email address';
      if (emailInput && (!emailInput.value || emailInput.value.includes('@tourisense.in') || emailInput.value.includes('guide'))) {
        emailInput.value = 'tourist@tourisense.in';
      }
    }
  }

  function renderUser(user) {
    const areas = [
      document.getElementById('auth-area'),
      document.querySelector('.header-inner .auth-area'),
      document.querySelector('header .nav .auth-area'),
      document.querySelector('.nav .auth-area')
    ].filter(Boolean);

    const reporter = getActiveReporter();

    areas.forEach(area => {
      if (reporter) {
        const hasExternalTools = !!(document.getElementById('zip-account-tools') || document.querySelector('.zip-account-tools'));
        area.innerHTML = `
          <div class="reporter-user-badge" id="reporter-user-badge" title="Verified Local Reporter Portal" onclick="window.location.href='reporter.html'">
            <div class="rub-text">
              <span class="rub-name">${safeText(reporter.name)}</span>
              <span class="rub-title">Verified Reporter (${safeText(reporter.id)})</span>
            </div>
            <div class="rub-avatar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
          </div>
          <button class="ghost-logout-btn" id="logout-btn" title="Log out of Reporter Portal" style="${hasExternalTools ? 'display:none!important;' : ''}">Log out</button>
        `;
      } else if (user) {
        area.innerHTML = ``;
      } else {
        area.innerHTML = `<button class="account-btn" id="login-btn" style="display:none!important;">Log in / Sign up</button>`;
      }

      area.querySelector('#login-btn')?.addEventListener('click', () => openAuth());
      area.querySelector('#profile-btn')?.addEventListener('click', () => window.location.href = 'profile.html');
      area.querySelector('#logout-btn')?.addEventListener('click', () => {
        setActiveReporter(null);
        localStorage.removeItem('tourisense_user_role');
        if (auth?.currentUser) auth.signOut();
        renderUser(null);
        if (window.location.pathname.endsWith('reporter.html')) {
          window.location.href = 'index.html';
        }
      });
    });

    document.dispatchEvent(new CustomEvent('rahi-auth-change', { detail: { user, reporter } }));
  }

  async function submitAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email) return showMessage('Please enter an email address.', true);
    if (!password || password.length < 4) return showMessage('Enter a valid password (at least 4 characters).', true);

    if (activeTabRole === 'reporter') {
      let rep = Object.values(DEMO_REPORTERS).find(r => r.email.toLowerCase() === email.toLowerCase()) || {
        ...DEMO_REPORTERS.ramesh,
        email: email,
        name: email.split('@')[0].replace('.', ' ')
      };
      setActiveReporter(rep);
      closeAuth();
      if (!window.location.pathname.endsWith('reporter.html')) {
        window.location.href = 'reporter.html';
      }
      return;
    }

    if (activeTabRole === 'hotel') {
      localStorage.setItem('tourisense_user_role', 'hotel');
      closeAuth();
      if (!window.location.pathname.endsWith('hotel-partner.html')) {
        window.location.href = 'hotel-partner.html';
      }
      return;
    }

    // Tourist flow with Firebase if configured, or seamless demo fallback
    if (configured && auth) {
      try {
        if (isSignUpMode) {
          const result = await auth.createUserWithEmailAndPassword(email, password);
          await db.collection('users').doc(result.user.uid).set({
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else {
          await auth.signInWithEmailAndPassword(email, password);
        }
        localStorage.setItem('tourisense_user_role', 'tourist');
        closeAuth();
      } catch (error) {
        showMessage(error.message.replace('Firebase: ', ''), true);
      }
    } else {
      localStorage.setItem('tourisense_user_role', 'tourist');
      closeAuth();
      renderUser({ email, uid: 'demo-tourist' });
    }
  }

  function injectUI() {
    if (!document.querySelector('link[href*="reporter.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/reporter.css';
      document.head.appendChild(link);
    }

    // Find headers across different page layouts
    let header = document.querySelector('.header-inner') || document.querySelector('header .nav') || document.querySelector('header');
    if (header && !document.getElementById('auth-area')) {
      const authDiv = document.createElement('div');
      authDiv.id = 'auth-area';
      authDiv.className = 'auth-area';
      header.appendChild(authDiv);
    }

    if (document.getElementById('auth-modal')) return;

    // Inject Modern Dark Auth Modal exactly matching Screenshot 2
    document.body.insertAdjacentHTML('beforeend', `
      <div class="auth-modal" id="auth-modal" aria-hidden="true">
        <div class="auth-dialog tourisense-login-card" role="dialog" aria-modal="true" aria-label="Login / Sign Up">
          
          <!-- Shield Header Branding -->
          <div class="auth-brand-top">
            <div class="auth-shield-wrap">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h2 class="auth-brand-title">Touri<span>Sense</span></h2>
          </div>

          <!-- Dialog Head -->
          <div class="auth-head-bar">
            <button class="auth-back-circle" id="auth-back-btn" aria-label="Go Back">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h3 class="auth-main-heading">Login / Sign Up</h3>
            <button class="auth-close-x" id="auth-close-btn" aria-label="Close">✕</button>
          </div>

          <!-- Role Selector Tabs -->
          <div class="auth-role-tabs">
            <button type="button" class="auth-role-tab" data-role="tourist">
              <span class="tab-icon">👤</span> Tourist
            </button>
            <button type="button" class="auth-role-tab" data-role="hotel">
              <span class="tab-icon">🏨</span> Hotel Owner
            </button>
            <button type="button" class="auth-role-tab active" data-role="reporter">
              <span class="role-green-dot"></span> Local Reporter
            </button>
          </div>

          <!-- Reporter Red Callout Warning (Screenshot 2) -->
          <div class="auth-guide-callout" id="auth-guide-callout">
            <div class="callout-tag">GV102 REQUIRED</div>
            <p class="callout-text">Accidentally clicked Local Reporter or don't have a Reporter ID?</p>
            <button type="button" class="callout-back-btn" id="auth-back-tourist">
              ← Back to Tourist Sign In
            </button>
          </div>

          <!-- Form Sub-header -->
          <div class="auth-form-title-row">
            <h4 id="auth-role-title">Verified Local Reporter Sign In</h4>
            <a href="javascript:void(0)" id="auth-mode-toggle" class="auth-switch-link">Create Account</a>
          </div>

          <!-- Form Fields -->
          <div class="auth-field-group">
            <label class="auth-field-label" id="auth-email-label">Local Reporter Email / Corporate Email</label>
            <div class="auth-input-container">
              <span class="auth-field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <input id="auth-email" type="email" value="ramesh.guide@tourisense.in" placeholder="ramesh.guide@tourisense.in" autocomplete="email">
            </div>
          </div>

          <div class="auth-field-group">
            <label class="auth-field-label">Password</label>
            <div class="auth-input-container">
              <span class="auth-field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input id="auth-password" type="password" value="secret123" placeholder="Password" autocomplete="current-password">
              <button type="button" class="auth-eye-toggle" id="auth-eye-btn" aria-label="Toggle password view">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <div id="auth-message" class="auth-message"></div>

          <!-- Main Submit Button -->
          <button type="button" class="auth-action-submit" id="auth-main-submit">
            Login <span class="submit-arrow">›</span>
          </button>

          <!-- Quick Demo Logins Dropdown (Screenshot 2) -->
          <div class="quick-demo-container">
            <button type="button" class="quick-demo-trigger" id="quick-demo-toggle">
              <span>⚡ Quick Demo Logins (Select Account)</span>
              <span class="quick-demo-caret">▼</span>
            </button>
            <div class="quick-demo-popover" id="quick-demo-popover" hidden>
              <button type="button" class="demo-acc-item" data-demo="ramesh">
                <span class="demo-dot green"></span>
                <strong>Ramesh Reporter</strong> (GV102 · Upper Lake)
              </button>
              <button type="button" class="demo-acc-item" data-demo="priya">
                <span class="demo-dot green"></span>
                <strong>Priya Reporter</strong> (GV105 · Van Vihar)
              </button>
              <button type="button" class="demo-acc-item" data-demo="amit">
                <span class="demo-dot green"></span>
                <strong>Amit Reporter</strong> (GV108 · Tribal Museum)
              </button>
              <div class="demo-divider"></div>
              <button type="button" class="demo-acc-item" data-demo="hotel">
                <span class="demo-dot orange"></span>
                <strong>Lakeview Homestay</strong> (Hotel Partner)
              </button>
              <button type="button" class="demo-acc-item" data-demo="tourist">
                <span class="demo-dot blue"></span>
                <strong>Demo Tourist Account</strong>
              </button>
            </div>
          </div>

          <!-- System Integrity Verified Footer (Screenshot 2) -->
          <div class="auth-dialog-footer">
            <div class="sys-verified-badge">
              <span class="sys-blink-dot"></span>
              <span>SYSTEM INTEGRITY VERIFIED</span>
            </div>
            <span class="sys-live-clock" id="auth-sys-time">2026-09-18T15:34:07.396Z</span>
          </div>

        </div>
      </div>
    `);

    // Event Listeners
    document.getElementById('auth-close-btn')?.addEventListener('click', closeAuth);
    document.getElementById('auth-back-btn')?.addEventListener('click', closeAuth);
    document.getElementById('auth-modal')?.addEventListener('click', e => {
      if (e.target.id === 'auth-modal') closeAuth();
    });

    document.querySelectorAll('.auth-role-tab').forEach(tab => {
      tab.addEventListener('click', () => setRoleTab(tab.dataset.role));
    });

    document.getElementById('auth-back-tourist')?.addEventListener('click', () => setRoleTab('tourist'));

    document.getElementById('auth-mode-toggle')?.addEventListener('click', () => {
      isSignUpMode = !isSignUpMode;
      document.getElementById('auth-mode-toggle').textContent = isSignUpMode ? 'Sign In Instead' : 'Create Account';
      document.getElementById('auth-main-submit').innerHTML = isSignUpMode ? 'Create Account <span class="submit-arrow">›</span>' : 'Login <span class="submit-arrow">›</span>';
      setRoleTab(activeTabRole);
    });

    document.getElementById('auth-eye-btn')?.addEventListener('click', () => {
      const pwd = document.getElementById('auth-password');
      if (pwd) pwd.type = pwd.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('auth-main-submit')?.addEventListener('click', submitAuth);

    // Quick demo dropdown toggle & selection
    const demoBtn = document.getElementById('quick-demo-toggle');
    const demoMenu = document.getElementById('quick-demo-popover');
    demoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!demoMenu) return;
      const isOpen = demoMenu.classList.contains('open');
      if (isOpen) {
        demoMenu.classList.remove('open', 'show');
        demoMenu.hidden = true;
      } else {
        demoMenu.classList.add('open');
        demoMenu.hidden = false;
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.quick-demo-container')) {
        if (demoMenu) {
          demoMenu.classList.remove('open', 'show');
          demoMenu.hidden = true;
        }
      }
    });

    document.querySelectorAll('.demo-acc-item').forEach(item => {
      item.addEventListener('click', () => {
        if (demoMenu) {
          demoMenu.classList.remove('open', 'show');
          demoMenu.hidden = true;
        }
        const type = item.dataset.demo;
        if (DEMO_REPORTERS[type]) {
          setRoleTab('reporter');
          document.getElementById('auth-email').value = DEMO_REPORTERS[type].email;
          document.getElementById('auth-password').value = 'secret123';
          setActiveReporter(DEMO_REPORTERS[type]);
          closeAuth();
          if (!window.location.pathname.endsWith('reporter.html')) {
            window.location.href = 'reporter.html';
          }
        } else if (type === 'hotel') {
          setRoleTab('hotel');
          document.getElementById('auth-email').value = 'partner@lakeviewbhopal.in';
          document.getElementById('auth-password').value = 'secret123';
          localStorage.setItem('tourisense_user_role', 'hotel');
          closeAuth();
          window.location.href = 'hotel-partner.html';
        } else if (type === 'tourist') {
          setRoleTab('tourist');
          document.getElementById('auth-email').value = 'tourist@tourisense.in';
          document.getElementById('auth-password').value = 'secret123';
          submitAuth();
        }
      });
    });
  }

  // Window API extensions
  window.rahiApi = {
    configured: () => configured,
    currentUser: () => auth?.currentUser || null,
    currentReporter: () => getActiveReporter(),
    requireUser: () => {
      if (!auth?.currentUser && !getActiveReporter()) {
        openAuth();
        return false;
      }
      return true;
    },
    openAuthModal: (role) => openAuth(role),
    closeAuthModal: () => closeAuth(),
    async getReviews(destinationId) {
      if (!db) return [];
      const snapshot = await db.collection('reviews').where('destinationId', '==', destinationId).limit(30).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().createdAt?.toDate?.().toLocaleDateString('en-IN') || 'Just now' })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    },
    async addReview(destinationId, rating, text, video = null) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      const user = auth?.currentUser || { uid: 'demo-user', displayName: 'Traveller', email: 'guest@tourisense.in' };
      if (db) {
        await db.collection('reviews').add({ destinationId, rating, text, userId: user.uid, name: user.displayName || user.email.split('@')[0], videoUrl: video?.url || null, videoDuration: video?.duration || null, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
    },
    async getLocalListings(destinationId) {
      if (!db) return [];
      const snapshot = await db.collection('localListings').where('destinationId', '==', destinationId).limit(50).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().createdAt?.toDate?.().toLocaleDateString('en-IN') || 'Recently added' })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    },
    async addLocalListing(listing) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      const user = auth?.currentUser || { uid: 'demo-user', displayName: 'Local Host', email: 'host@tourisense.in' };
      if (db) {
        await db.collection('localListings').add({ ...listing, userId: user.uid, hostName: user.displayName || user.email.split('@')[0], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
    },
    async getHotelPartnerProfile() {
      if (!auth?.currentUser || !db) return null;
      const snapshot = await db.collection('users').doc(auth.currentUser.uid).collection('hotelPartner').doc('profile').get();
      return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },
    async saveHotelPartnerProfile(profile) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      if (db && auth?.currentUser) {
        await db.collection('users').doc(auth.currentUser.uid).collection('hotelPartner').doc('profile').set({ ...profile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    },
    async saveTrip(trip) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      if (db && auth?.currentUser) {
        await db.collection('users').doc(auth.currentUser.uid).collection('trips').add({ ...trip, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
    },
    async deleteTrip(tripId) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      if (!tripId) throw new Error('The saved itinerary could not be identified.');
      if (db && auth?.currentUser) {
        await db.collection('users').doc(auth.currentUser.uid).collection('trips').doc(tripId).delete();
      }
    },
    async saveExpense(expense) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      if (db && auth?.currentUser) {
        await db.collection('users').doc(auth.currentUser.uid).collection('expenses').add({ ...expense, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
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
      if (db && auth?.currentUser) {
        const ref = await db.collection('users').doc(auth.currentUser.uid).collection('chats').add({ title, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        return ref.id;
      }
      return 'demo-chat';
    },
    async getChatMessages(chatId) {
      if (!auth?.currentUser || !db || !chatId) return [];
      const snapshot = await db.collection('users').doc(auth.currentUser.uid).collection('chats').doc(chatId).collection('messages').orderBy('createdAt').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async saveChatMessage(chatId, role, text) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      if (db && auth?.currentUser) {
        const chat = db.collection('users').doc(auth.currentUser.uid).collection('chats').doc(chatId);
        await chat.collection('messages').add({ role, text, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await chat.set({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    },
    async askTravelAi(message, history) {
      if (!window.rahiApi.requireUser()) throw new Error('Please sign in first.');
      const profile = await window.rahiApi.getProfileData();
      return window.rahiSmartAssistant ? window.rahiSmartAssistant.reply(message, profile, history) : 'TouriSense is ready to assist you.';
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
      if (db && auth?.currentUser) {
        await db.collection('crowdReports').doc(destinationId).collection('reports').doc(auth.currentUser.uid).set({
          level, reportedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  };

  if (configured && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.onAuthStateChanged(renderUser);
    } catch (e) {
      console.warn('Firebase init warning:', e);
    }
  }

  function setup() {
    injectUI();
    renderUser(auth?.currentUser || null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
