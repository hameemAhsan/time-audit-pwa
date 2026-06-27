// ─── Replace your existing initPwa() function with this ───────────────────

function initPwa() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./service-worker.js').then(registration => {

    // If there's already a waiting SW (new version deployed), activate it now
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // If a new SW installs while the page is open, activate it immediately
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW is ready and waiting — tell it to take over
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

  }).catch(console.error);

  // When the SW changes (after skip waiting), reload the page so the new SW
  // controls it and serves fresh assets — happens once, seamlessly
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // Install prompt
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    const installBtn = $('#installBtn');
    installBtn.hidden = false;
    installBtn.onclick = async () => {
      installBtn.hidden = true;
      const { outcome } = await state.deferredInstallPrompt.prompt();
      if (outcome !== 'accepted') installBtn.hidden = false;
      state.deferredInstallPrompt = null;
    };
  });
}
