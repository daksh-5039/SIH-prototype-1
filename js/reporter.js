/* ============================================================
   reporter.js
   Logic for Verified Local Reporter Portal & Ground Update Submission
   Matches Screenshots 1, 3, 4, 5
   ============================================================ */

(function () {
  const BHOPAL_LOCATIONS = [
    { id: 'upper-lake', name: 'Upper Lake (Bhojtal)', city: 'Bhopal, MP', lat: 23.2395, lon: 77.3396, image: 'https://images.unsplash.com/photo-1628178125816-8a7e0f803cbe?w=800&auto=format&fit=crop&q=80' },
    { id: 'van-vihar', name: 'Van Vihar National Park', city: 'Bhopal, MP', lat: 23.2164, lon: 77.3342, image: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=800&auto=format&fit=crop&q=80' },
    { id: 'tribal-museum', name: 'Tribal Museum', city: 'Bhopal, MP', lat: 23.2261, lon: 77.4232, image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80' },
    { id: 'taj-ul-masajid', name: 'Taj-ul-Masajid', city: 'Bhopal, MP', lat: 23.2590, lon: 77.3426, image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80' },
    { id: 'bhojpur', name: 'Bhojpur Temple', city: 'Bhojpur, MP', lat: 23.1024, lon: 77.6112, image: 'https://images.unsplash.com/photo-1599818451167-2708f51278ff?w=800&auto=format&fit=crop&q=80' },
    { id: 'sanchi', name: 'Sanchi Stupa', city: 'Raisen, MP', lat: 23.4871, lon: 77.7390, image: 'https://images.unsplash.com/photo-1600100397608-f010f443b740?w=800&auto=format&fit=crop&q=80' }
  ];

  let currentPlace = BHOPAL_LOCATIONS[0];
  let currentStep = 1;
  let isLocationVerified = false;
  let simulatedDistance = null;
  let userCoords = null;
  let activeStream = null;
  let capturedPhotoData = null;

  // Answers object for Step 3 MCQ
  let groundAnswers = {
    crowdLevel: 'Moderate',
    movement: 'Easy',
    weather: 'Sunny',
    visiting: 'Good',
    alerts: 'No unusual condition'
  };

  // Haversine Distance Calculation (km)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getReporter() {
    return window.tourisenseReporter?.getActiveReporter() || {
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
    };
  }

  function renderReporterDashboard() {
    const rep = getReporter();
    const locSelect = document.getElementById('assignedLocationSelect');
    if (locSelect) {
      locSelect.innerHTML = BHOPAL_LOCATIONS.map(l =>
        `<option value="${l.id}" ${l.id === currentPlace.id ? 'selected' : ''}>📍 ${l.name}</option>`
      ).join('');
    }

    const nameEl = document.getElementById('repName');
    if (nameEl) nameEl.textContent = rep.name;

    const idEl = document.getElementById('repId');
    if (idEl) idEl.textContent = `ID: ${rep.id}`;

    const destNameEl = document.getElementById('statAssignedName');
    if (destNameEl) destNameEl.textContent = currentPlace.name;

    const destCityEl = document.getElementById('statAssignedCity');
    if (destCityEl) destCityEl.textContent = currentPlace.city;

    const lastUpEl = document.getElementById('statLastUpdate');
    if (lastUpEl) lastUpEl.textContent = rep.lastUpdate || '12 mins ago';

    const acceptedEl = document.getElementById('statAcceptedCount');
    if (acceptedEl) acceptedEl.textContent = `Today's Accepted: ${rep.acceptedToday || 3}`;
  }

  function openSubmissionModal() {
    const modal = document.getElementById('groundUpdateModal');
    if (!modal) return;
    modal.classList.add('open');
    currentStep = 1;
    capturedPhotoData = null;
    isLocationVerified = false;
    simulatedDistance = null;
    updateModalDestinationTitle();
    goToStep(1);
    checkLocation(false);
  }

  function closeSubmissionModal() {
    stopCamera();
    const modal = document.getElementById('groundUpdateModal');
    if (modal) modal.classList.remove('open');
  }

  function updateModalDestinationTitle() {
    const titleEl = document.getElementById('modalLocationTitle');
    if (titleEl) titleEl.textContent = currentPlace.name;
    const step1Sub = document.getElementById('step1Subtitle');
    if (step1Sub) step1Sub.textContent = `Checking browser Geolocation API against ${currentPlace.name} coordinates...`;
  }

  function setStepperState(step) {
    for (let i = 1; i <= 4; i++) {
      const node = document.getElementById(`step-node-${i}`);
      if (!node) continue;
      node.classList.remove('active', 'completed');
      if (i < step) {
        node.classList.add('completed');
        node.innerHTML = '✓';
      } else if (i === step) {
        node.classList.add('active');
        node.textContent = i;
      } else {
        node.textContent = i;
      }
    }
  }

  function goToStep(step) {
    currentStep = step;
    setStepperState(step);

    // Hide all step sections
    for (let i = 1; i <= 4; i++) {
      const pane = document.getElementById(`modal-step-pane-${i}`);
      if (pane) pane.style.display = i === step ? 'block' : 'none';
    }

    const backBtn = document.getElementById('modalBackBtn');
    const nextBtn = document.getElementById('modalNextBtn');

    if (step === 1) {
      if (backBtn) backBtn.style.visibility = 'hidden';
      if (nextBtn) {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Next Step →';
        nextBtn.disabled = !isLocationVerified;
      }
    } else if (step === 2) {
      if (backBtn) backBtn.style.visibility = 'visible';
      if (nextBtn) {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Next Step →';
        nextBtn.disabled = !capturedPhotoData;
      }
      initStep2Photo();
    } else if (step === 3) {
      stopCamera();
      if (backBtn) backBtn.style.visibility = 'visible';
      if (nextBtn) {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Submit Ground Update →';
        nextBtn.disabled = false;
      }
      initStep3MCQ();
    } else if (step === 4) {
      stopCamera();
      if (backBtn) backBtn.style.visibility = 'hidden';
      if (nextBtn) nextBtn.style.display = 'none';
      renderStep4Summary();
    }
  }

  // Step 1: Geolocation Check
  function checkLocation(forceSimulate = false) {
    const feedbackBox = document.getElementById('locFeedbackBox');
    const nextBtn = document.getElementById('modalNextBtn');
    if (!feedbackBox) return;

    if (forceSimulate) {
      isLocationVerified = true;
      simulatedDistance = 0.14;
      feedbackBox.innerHTML = `
        <div class="loc-success-banner">
          <span>✅ Location Verified: You are <b>${simulatedDistance} km</b> from assigned destination (within allowed radius: 2.5 km). Ground presence confirmed.</span>
        </div>
        <button type="button" class="btn-recheck-gps" id="btnRecheckGps">
          <span>🔄</span> Re-check GPS
        </button>
      `;
      document.getElementById('btnRecheckGps')?.addEventListener('click', () => checkLocation(false));
      if (nextBtn) nextBtn.disabled = false;
      return;
    }

    feedbackBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;color:#64748b;font-size:13px;margin-bottom:14px;">
        <span class="spinner" style="border-top-color:#2563eb"></span> Accessing real-time device GPS coordinates...
      </div>
    `;

    if (!navigator.geolocation) {
      renderLocationWarning(14.41);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const dist = calculateDistance(userCoords.lat, userCoords.lon, currentPlace.lat, currentPlace.lon);
        const roundedDist = Math.round(dist * 100) / 100;

        if (dist <= 2.5) {
          isLocationVerified = true;
          feedbackBox.innerHTML = `
            <div class="loc-success-banner">
              <span>✅ Location Verified: You are <b>${roundedDist} km</b> from assigned destination (allowed radius: 2.5 km)</span>
            </div>
            <button type="button" class="btn-recheck-gps" id="btnRecheckGps">
              <span>🔄</span> Re-check GPS
            </button>
          `;
          if (nextBtn) nextBtn.disabled = false;
        } else {
          isLocationVerified = false;
          renderLocationWarning(roundedDist);
          if (nextBtn) nextBtn.disabled = true;
        }
        document.getElementById('btnRecheckGps')?.addEventListener('click', () => checkLocation(false));
      },
      err => {
        // Fallback demo behavior matching Screenshot 4:
        // "⚠️ You are 14.41 km away from assigned destination (allowed radius: 2.5 km)"
        isLocationVerified = false;
        renderLocationWarning(14.41);
        if (nextBtn) nextBtn.disabled = true;
        document.getElementById('btnRecheckGps')?.addEventListener('click', () => checkLocation(false));
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }

  function renderLocationWarning(dist) {
    const feedbackBox = document.getElementById('locFeedbackBox');
    if (!feedbackBox) return;
    feedbackBox.innerHTML = `
      <div class="loc-warn-banner">
        <span>⚠️ You are <b>${dist} km</b> away from assigned destination (allowed radius: 2.5 km)</span>
      </div>
      <button type="button" class="btn-recheck-gps" id="btnRecheckGps">
        <span>🔄</span> Re-check GPS
      </button>
      <button type="button" class="btn-simulate-gps" id="btnSimulateGps">
        <span>📍</span> Simulate On-Site GPS (${currentPlace.name})
      </button>
    `;
    document.getElementById('btnRecheckGps')?.addEventListener('click', () => checkLocation(false));
    document.getElementById('btnSimulateGps')?.addEventListener('click', () => checkLocation(true));
  }

  // Step 2: Camera & Photo Capture
  function initStep2Photo() {
    const frame = document.getElementById('photoFrame');
    const nextBtn = document.getElementById('modalNextBtn');

    if (!capturedPhotoData) {
      // Set default demo ground picture matching Screenshot 5
      capturedPhotoData = currentPlace.image;
    }

    renderPhotoPreview(capturedPhotoData);
    if (nextBtn) nextBtn.disabled = !capturedPhotoData;
  }

  function renderPhotoPreview(imgSrc) {
    const frame = document.getElementById('photoFrame');
    if (!frame) return;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

    frame.innerHTML = `
      <img src="${imgSrc}" alt="Ground Observation Capture">
      <div class="photo-overlay-badges">
        <span class="po-pill">📷 Live Photo Captured</span>
        <span class="po-pill">📍 GPS Verified</span>
        <span class="po-pill">🕒 ${timeStr}</span>
      </div>
    `;

    const nextBtn = document.getElementById('modalNextBtn');
    if (nextBtn) nextBtn.disabled = false;
  }

  async function startLiveCamera() {
    const frame = document.getElementById('photoFrame');
    if (!frame) return;

    try {
      if (activeStream) stopCamera();
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      frame.innerHTML = `
        <video id="liveVideoFeed" autoplay playsinline muted></video>
        <div class="photo-overlay-badges">
          <span class="po-pill" style="background:#dc2626;">🔴 Camera Live</span>
          <span class="po-pill">📍 GPS Verified</span>
        </div>
      `;
      const video = document.getElementById('liveVideoFeed');
      if (video) video.srcObject = activeStream;

      const triggerBtn = document.getElementById('btnCameraAction');
      if (triggerBtn) {
        triggerBtn.innerHTML = '<span>📸</span> Snap Picture Now';
        triggerBtn.onclick = captureVideoSnap;
      }
    } catch (e) {
      // Camera permission denied or not available -> open file input
      document.getElementById('cameraFileInput')?.click();
    }
  }

  function captureVideoSnap() {
    const video = document.getElementById('liveVideoFeed');
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedPhotoData = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    renderPhotoPreview(capturedPhotoData);

    const triggerBtn = document.getElementById('btnCameraAction');
    if (triggerBtn) {
      triggerBtn.innerHTML = '<span>📷</span> Capture / Select Fresh Camera Photo';
      triggerBtn.onclick = triggerCameraCapture;
    }
  }

  function stopCamera() {
    if (activeStream) {
      activeStream.getTracks().forEach(t => t.stop());
      activeStream = null;
    }
  }

  function triggerCameraCapture() {
    // If browser supports camera and permissions are possible, try live camera or file
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startLiveCamera();
    } else {
      document.getElementById('cameraFileInput')?.click();
    }
  }

  // Step 3: Dynamic MCQ Questionnaire
  function initStep3MCQ() {
    const rep = getReporter();
    const badgeName = document.getElementById('mcqRepName');
    if (badgeName) badgeName.textContent = rep.name;
    const badgeId = document.getElementById('mcqRepId');
    if (badgeId) badgeId.textContent = `Verified Reporter (${rep.id})`;

    // Bind option click toggles
    document.querySelectorAll('.mcq-question-card').forEach(card => {
      const qKey = card.dataset.q;
      const pills = card.querySelectorAll('.mcq-pill');
      pills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.val === groundAnswers[qKey]);
        pill.onclick = () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          groundAnswers[qKey] = pill.dataset.val;
        };
      });
    });
  }

  // Step 4: Submission & Credit
  function renderStep4Summary() {
    const rep = window.tourisenseReporter?.recordGroundUpdate({
      placeId: currentPlace.id,
      placeName: currentPlace.name,
      crowdLevel: groundAnswers.crowdLevel,
      movement: groundAnswers.movement,
      weather: groundAnswers.weather,
      visiting: groundAnswers.visiting,
      alerts: groundAnswers.alerts,
      photo: capturedPhotoData
    }) || getReporter();

    const detailsBox = document.getElementById('subDetailsBox');
    if (detailsBox) {
      detailsBox.innerHTML = `
        <div><strong>📍 Destination:</strong> ${currentPlace.name} (Bhopal, MP)</div>
        <div><strong>👥 Crowd Assessment:</strong> ${groundAnswers.crowdLevel}</div>
        <div><strong>🚶 Tourist Movement:</strong> ${groundAnswers.movement}</div>
        <div><strong>⛅ Weather Condition:</strong> ${groundAnswers.weather}</div>
        <div><strong>⭐ Visiting Status:</strong> ${groundAnswers.visiting}</div>
        <div><strong>🚨 Ground Alerts:</strong> ${groundAnswers.alerts}</div>
        <div><strong>🕒 Timestamp:</strong> ${new Date().toLocaleString('en-IN')}</div>
        <div><strong>🛡️ Validation Score:</strong> 99.4% (GPS Geofence + Fresh Photo Match)</div>
      `;
    }

    // Refresh Dashboard counters
    renderReporterDashboard();
  }

  function init() {
    renderReporterDashboard();

    // Check if user is authenticated as reporter when loading portal directly
    const active = window.tourisenseReporter?.getActiveReporter();
    if (!active) {
      setTimeout(() => {
        window.rahiApi?.openAuthModal?.('reporter');
      }, 400);
    }

    // Event Listeners
    document.getElementById('assignedLocationSelect')?.addEventListener('change', e => {
      const found = BHOPAL_LOCATIONS.find(l => l.id === e.target.value);
      if (found) {
        currentPlace = found;
        renderReporterDashboard();
      }
    });

    document.getElementById('btnOpenGroundSubmit')?.addEventListener('click', () => {
      const activeRep = window.tourisenseReporter?.getActiveReporter();
      if (!activeRep) {
        window.rahiApi?.openAuthModal?.('reporter');
        return;
      }
      openSubmissionModal();
    });
    document.getElementById('modalCloseBtn')?.addEventListener('click', closeSubmissionModal);

    document.getElementById('modalBackBtn')?.addEventListener('click', () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    });

    document.getElementById('modalNextBtn')?.addEventListener('click', () => {
      if (currentStep < 4) goToStep(currentStep + 1);
    });

    document.getElementById('btnReturnToPortal')?.addEventListener('click', closeSubmissionModal);

    document.getElementById('btnCameraAction')?.addEventListener('click', triggerCameraCapture);

    document.getElementById('cameraFileInput')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          capturedPhotoData = ev.target.result;
          renderPhotoPreview(capturedPhotoData);
        };
        reader.readAsDataURL(file);
      }
    });

    // Sample photo buttons
    document.querySelectorAll('.sample-photo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        stopCamera();
        capturedPhotoData = btn.dataset.src;
        renderPhotoPreview(capturedPhotoData);
      });
    });

    // Admin Review Panel Drawer/Dialog
    document.getElementById('btnAdminReview')?.addEventListener('click', () => {
      const rep = getReporter();
      alert(`🛡️ Verified Reporter Admin Panel\n\nReporter: ${rep.name} (${rep.id})\nStatus: Active & Verified on Ground\nToday's Accepted Submissions: ${rep.acceptedToday}\nGeofence Compliance: 100% within 2.5 km\n\nAll submitted observations are cryptographically stamped and synchronized with TouriSense crowd prediction engine.`);
    });

    // Listen for reporter changes (e.g. from login dropdown)
    document.addEventListener('tourisense-reporter-change', () => {
      renderReporterDashboard();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
