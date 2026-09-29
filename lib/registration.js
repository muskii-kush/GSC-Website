// Registration panel behaviour, ported from Grand-Startup-Challenge-v5.html:
// email OTP gate, 7-step application wizard with local draft, and sync to the
// Google Apps Script backend. Any element with [data-register] opens the panel.

const APPS_SCRIPT_URL = 'https://script.google.com/a/macros/cars24.com/s/AKfycbyNF5RFpm0uJx7BeFuyk-HAwyJvARMY-Qd1tlhcnVdioiAVvzpoJIudyhaJ1FbYvHv-/exec';
const AUTH_KEY = 'gsc-auth-v1';
const STORAGE_KEY = 'gsc-application-draft-v1';

let initialised = false;

export function initRegistration() {
  if (initialised) return;
  initialised = true;

  const registration = document.getElementById('registration');
  const closeRegistration = document.getElementById('close-registration');
  const registrationForm = document.getElementById('registration-form');
  const registrationStatus = document.getElementById('registration-status');
  if (!registration || !registrationForm) return;

  const lockScroll = (on) => {
    document.documentElement.classList.toggle('is-locked', on);
    window.dispatchEvent(new CustomEvent('gsc:lock', { detail: on }));
  };

  function openRegistration() {
    try { history.pushState({}, '', '#register'); } catch (_) { location.hash = '#register'; }
    registration.classList.add('open');
    registration.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  }
  function closeRegistrationPanel() {
    registration.classList.remove('open');
    registration.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (location.hash === '#register') {
      try { history.pushState({}, '', '#top'); } catch (_) { location.hash = '#top'; }
    }
  }

  closeRegistration.addEventListener('click', closeRegistrationPanel);
  registration.addEventListener('click', (e) => { if (e.target === registration) closeRegistrationPanel(); });
  registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (registrationStatus) registrationStatus.textContent = 'Your application is complete in this page. Submission delivery will be connected once the receiving system is confirmed.';
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && registration.classList.contains('open')) closeRegistrationPanel(); });
  function syncRegistrationHash() {
    if (location.hash === '#register') {
      registration.classList.add('open');
      registration.setAttribute('aria-hidden', 'false');
      lockScroll(true);
    }
  }
  window.addEventListener('popstate', () => {
    if (location.hash === '#register') syncRegistrationHash();
    else if (registration.classList.contains('open')) {
      registration.classList.remove('open');
      registration.setAttribute('aria-hidden', 'true');
      lockScroll(false);
    }
  });

  // -- multi-step application wizard --
  const sections = Array.from(registrationForm.querySelectorAll('.application-section'));
  const submitBlock = document.getElementById('application-submit');
  const wizardNav = document.getElementById('wizard-nav');
  const backBtn = document.getElementById('wizard-back');
  const nextBtn = document.getElementById('wizard-next');
  const saveExitBtn = document.getElementById('wizard-save-exit');
  const stepsWrap = document.getElementById('wizard-progress-steps');
  const fill = document.getElementById('wizard-progress-fill');
  const stepLabel = document.getElementById('wizard-step-label');
  const pctLabel = document.getElementById('wizard-progress-pct');
  const total = sections.length;
  let current = 0;
  let maxReached = 0;

  const stepButtons = sections.map((section, i) => {
    const title = section.querySelector('h3');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${i + 1}. ${title ? title.textContent : 'Step ' + (i + 1)}`;
    btn.addEventListener('click', () => { if (i <= maxReached) goToStep(i); });
    stepsWrap.appendChild(btn);
    return btn;
  });

  const fieldsIn = (section) => Array.from(section.querySelectorAll('input,select,textarea'));
  function readDraft() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; } }
  function writeDraft(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {} }

  function saveCurrentSection() {
    const draft = readDraft();
    fieldsIn(sections[current]).forEach((field) => {
      if (!field.name) return;
      if (field.type === 'checkbox' || field.type === 'radio') draft[field.name] = field.checked;
      else draft[field.name] = field.value;
    });
    draft.__step = current;
    draft.__maxReached = Math.max(maxReached, current);
    writeDraft(draft);
  }

  function restoreDraft() {
    const draft = readDraft();
    registrationForm.querySelectorAll('input,select,textarea').forEach((field) => {
      if (!field.name || !(field.name in draft)) return;
      if (field.type === 'checkbox' || field.type === 'radio') field.checked = !!draft[field.name];
      else field.value = draft[field.name];
    });
    if (typeof draft.__maxReached === 'number') maxReached = Math.min(draft.__maxReached, total - 1);
    if (typeof draft.__step === 'number') current = Math.min(Math.max(draft.__step, 0), total - 1);
  }

  function render() {
    sections.forEach((section, i) => section.classList.toggle('step-active', i === current));
    const onLast = current === total - 1;
    submitBlock.classList.toggle('step-active', onLast);
    wizardNav.classList.toggle('step-active', !onLast);
    backBtn.disabled = current === 0;
    stepButtons.forEach((btn, i) => {
      btn.disabled = i > maxReached;
      btn.classList.toggle('is-active', i === current);
      btn.classList.toggle('is-done', i < current);
    });
    stepLabel.textContent = `Step ${current + 1} of ${total}`;
    const pct = Math.round((maxReached + (current === maxReached ? 1 : 0)) / total * 100);
    pctLabel.textContent = `${Math.min(pct, 100)}% complete`;
    fill.style.width = `${Math.min((current / (total - 1)) * 100, 100)}%`;
  }

  function goToStep(i) {
    saveCurrentSection();
    current = Math.min(Math.max(i, 0), total - 1);
    maxReached = Math.max(maxReached, current);
    render();
    registration.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backBtn.addEventListener('click', () => goToStep(current - 1));
  nextBtn.addEventListener('click', () => {
    const invalid = sections[current].querySelector(':invalid');
    if (invalid) { invalid.reportValidity(); return; }
    goToStep(current + 1);
    if (registrationStatus) registrationStatus.textContent = 'Draft saved. You can close this and continue later.';
  });
  saveExitBtn.addEventListener('click', () => {
    saveCurrentSection();
    if (registrationStatus) registrationStatus.textContent = 'Draft saved.';
    closeRegistrationPanel();
  });
  registrationForm.addEventListener('submit', () => { localStorage.removeItem(STORAGE_KEY); });

  restoreDraft();
  render();

  function applyRemoteDraft(data) {
    data = data || {};
    registrationForm.querySelectorAll('input,select,textarea').forEach((field) => {
      if (!field.name || !(field.name in data)) return;
      const v = data[field.name];
      if (field.type === 'checkbox' || field.type === 'radio') field.checked = (v === true || v === 'true' || v === 'TRUE');
      else field.value = (v === undefined || v === null) ? '' : String(v);
    });
    let firstIncomplete = 0;
    let foundIncomplete = false;
    let anyFilled = false;
    sections.forEach((section, i) => {
      const fields = fieldsIn(section);
      const filled = fields.length > 0 && fields.every((f) => f.type === 'checkbox' ? f.checked : String(f.value || '').trim() !== '');
      if (fields.some((f) => f.type === 'checkbox' ? f.checked : String(f.value || '').trim() !== '')) anyFilled = true;
      if (filled) maxReached = Math.max(maxReached, i);
      else if (!foundIncomplete) { firstIncomplete = i; foundIncomplete = true; }
    });
    if (anyFilled) {
      current = Math.min(firstIncomplete, total - 1);
      maxReached = Math.max(maxReached, current);
    }
    render();
  }

  // -- email OTP account gate before the application wizard --
  const authGate = document.getElementById('auth-gate');
  const appContent = document.getElementById('app-content');
  const emailStep = document.getElementById('auth-step-email');
  const codeStep = document.getElementById('auth-step-code');
  const emailInput = document.getElementById('auth-email');
  const codeInput = document.getElementById('auth-code');
  const sendBtn = document.getElementById('auth-send-code');
  const verifyBtn = document.getElementById('auth-verify-code');
  const resendBtn = document.getElementById('auth-resend');
  const changeEmailBtn = document.getElementById('auth-change-email');
  const switchAccountBtn = document.getElementById('auth-switch-account');
  const sentToEl = document.getElementById('auth-sent-to');
  const emailErrorEl = document.getElementById('auth-email-error');
  const codeErrorEl = document.getElementById('auth-code-error');

  function readAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (_) { return null; } }
  function writeAuth(data) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); } catch (_) {} }
  function clearAuth() { try { localStorage.removeItem(AUTH_KEY); } catch (_) {} }

  async function callBackend(payload) {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  function showAuthGate() { authGate.style.display = 'grid'; appContent.style.display = 'none'; }
  function showAppContent() { authGate.style.display = 'none'; appContent.style.display = ''; }
  function resetToEmailStep() {
    emailStep.style.display = 'grid';
    codeStep.style.display = 'none';
    codeInput.value = '';
    codeErrorEl.textContent = '';
  }

  function applyAuthView() {
    const auth = readAuth();
    if (auth && auth.token) {
      showAppContent();
      callBackend({ action: 'load_draft', email: auth.email, token: auth.token }).then((r) => {
        if (r && r.ok) applyRemoteDraft(r.data || {});
        else if (r && !r.ok) { clearAuth(); resetToEmailStep(); showAuthGate(); }
      }).catch(() => {});
    } else {
      resetToEmailStep();
      showAuthGate();
    }
  }

  async function sendCode() {
    const email = emailInput.value.trim();
    emailErrorEl.textContent = '';
    if (!email || !email.includes('@')) { emailErrorEl.textContent = 'Enter a valid email.'; return; }
    sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
    try {
      const r = await callBackend({ action: 'send_otp', email });
      if (!r.ok) { emailErrorEl.textContent = r.error || 'Could not send code.'; return; }
      sentToEl.textContent = `Code sent to ${email}.`;
      emailStep.style.display = 'none';
      codeStep.style.display = 'grid';
      codeInput.focus();
    } catch (err) {
      emailErrorEl.textContent = 'Network error — please try again.';
    } finally {
      sendBtn.disabled = false; sendBtn.textContent = 'Send code';
    }
  }

  sendBtn.addEventListener('click', sendCode);
  resendBtn.addEventListener('click', sendCode);
  changeEmailBtn.addEventListener('click', resetToEmailStep);

  verifyBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    codeErrorEl.textContent = '';
    if (!code) { codeErrorEl.textContent = 'Enter the code from your email.'; return; }
    verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying…';
    try {
      const r = await callBackend({ action: 'verify_otp', email, code });
      if (!r.ok) { codeErrorEl.textContent = r.error || 'Incorrect code.'; return; }
      writeAuth({ email, token: r.token });
      showAppContent();
      try {
        const d = await callBackend({ action: 'load_draft', email, token: r.token });
        if (d && d.ok) applyRemoteDraft(d.data || {});
      } catch (_) {}
    } catch (err) {
      codeErrorEl.textContent = 'Network error — please try again.';
    } finally {
      verifyBtn.disabled = false; verifyBtn.textContent = 'Verify';
    }
  });

  switchAccountBtn.addEventListener('click', () => {
    clearAuth();
    emailInput.value = '';
    applyAuthView();
  });

  function serializeForm() {
    const data = {};
    registrationForm.querySelectorAll('input,select,textarea').forEach((field) => {
      if (!field.name) return;
      if (field.type === 'checkbox' || field.type === 'radio') data[field.name] = field.checked;
      else data[field.name] = field.value;
    });
    return data;
  }

  async function syncToBackend(isSubmit) {
    const auth = readAuth();
    if (!auth) return;
    try {
      await callBackend({ action: isSubmit ? 'submit' : 'save_draft', email: auth.email, token: auth.token, data: serializeForm() });
    } catch (_) {}
  }

  nextBtn.addEventListener('click', () => syncToBackend(false));
  saveExitBtn.addEventListener('click', () => syncToBackend(false));
  registrationForm.addEventListener('submit', () => syncToBackend(true));

  applyAuthView();
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest && e.target.closest('[data-register]');
    if (!trigger) return;
    e.preventDefault();
    openRegistration();
    applyAuthView();
  });
  if (location.hash === '#register') syncRegistrationHash();
}
