// Registration panel behaviour: create an account with email + mobile number
// (verified by SMS OTP), then fill the 7-step application. Drafts are saved to
// the account through /api/application. Any element with [data-register]
// opens the panel.

const DRAFT_KEY = 'gsc-application-draft-v2';

let initialised = false;

async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin',
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ...data, http: res.status, ok: res.ok && data.ok !== false };
}

export function initRegistration() {
  if (initialised) return;
  initialised = true;

  const $ = (id) => document.getElementById(id);
  const registration = $('registration');
  const registrationForm = $('registration-form');
  const registrationStatus = $('registration-status');
  if (!registration || !registrationForm) return;

  const setStatus = (text) => { if (registrationStatus) registrationStatus.textContent = text; };
  const lockScroll = (on) => {
    document.documentElement.classList.toggle('is-locked', on);
    window.dispatchEvent(new CustomEvent('gsc:lock', { detail: on }));
  };

  // -- panel open / close --
  function showPanel() {
    registration.classList.add('open');
    registration.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  }
  function hidePanel() {
    registration.classList.remove('open');
    registration.setAttribute('aria-hidden', 'true');
    lockScroll(false);
  }
  function openRegistration() {
    try { history.pushState({}, '', '#register'); } catch (_) { location.hash = '#register'; }
    showPanel();
    refreshAccount();
  }
  function closeRegistrationPanel() {
    hidePanel();
    if (location.hash === '#register') {
      try { history.pushState({}, '', '#top'); } catch (_) { location.hash = '#top'; }
    }
  }

  $('close-registration').addEventListener('click', closeRegistrationPanel);
  registration.addEventListener('click', (e) => { if (e.target === registration) closeRegistrationPanel(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && registration.classList.contains('open')) closeRegistrationPanel(); });
  window.addEventListener('popstate', () => {
    if (location.hash === '#register') { showPanel(); refreshAccount(); }
    else if (registration.classList.contains('open')) hidePanel();
  });
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest && e.target.closest('[data-register]');
    if (!trigger) return;
    e.preventDefault();
    openRegistration();
  });

  // -- multi-step application wizard --
  const sections = Array.from(registrationForm.querySelectorAll('.application-section'));
  const submitBlock = $('application-submit');
  const wizardNav = $('wizard-nav');
  const backBtn = $('wizard-back');
  const nextBtn = $('wizard-next');
  const saveExitBtn = $('wizard-save-exit');
  const stepsWrap = $('wizard-progress-steps');
  const fill = $('wizard-progress-fill');
  const stepLabel = $('wizard-step-label');
  const pctLabel = $('wizard-progress-pct');
  const submitBtn = registrationForm.querySelector('button[type="submit"]');
  const total = sections.length;
  let current = 0;
  let maxReached = 0;
  let account = null;
  let submitted = false;

  const stepButtons = sections.map((section, i) => {
    const title = section.querySelector('h3');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${i + 1}. ${title ? title.textContent : 'Step ' + (i + 1)}`;
    btn.addEventListener('click', () => { if (i <= maxReached) goToStep(i); });
    stepsWrap.appendChild(btn);
    return btn;
  });

  const allFields = () => Array.from(registrationForm.querySelectorAll('input,select,textarea')).filter((f) => f.name);
  const fieldsIn = (section) => Array.from(section.querySelectorAll('input,select,textarea'));
  const isFilled = (f) => (f.type === 'checkbox' ? f.checked : String(f.value || '').trim() !== '');

  function serializeForm() {
    const data = {};
    allFields().forEach((f) => { data[f.name] = f.type === 'checkbox' ? f.checked : f.value; });
    return data;
  }

  function fillForm(data) {
    allFields().forEach((f) => {
      const v = data ? data[f.name] : undefined;
      if (f.type === 'checkbox') f.checked = v === true || v === 'true';
      else f.value = v === undefined || v === null ? '' : String(v);
    });
  }

  const draftKey = () => (account ? `${DRAFT_KEY}:${account.phone}` : null);
  function readLocalDraft() {
    const key = draftKey();
    if (!key) return null;
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }
  function writeLocalDraft() {
    const key = draftKey();
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify({ ...serializeForm(), __step: current })); } catch (_) {}
  }
  function clearLocalDraft() {
    const key = draftKey();
    if (key) try { localStorage.removeItem(key); } catch (_) {}
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
    pctLabel.textContent = submitted ? 'Submitted' : `${Math.min(pct, 100)}% complete`;
    fill.style.width = submitted ? '100%' : `${Math.min((current / (total - 1)) * 100, 100)}%`;
  }

  // Resume at the first section that still has an unanswered question.
  function resumePosition(step) {
    let firstIncomplete = total - 1;
    for (let i = 0; i < total; i++) {
      if (!fieldsIn(sections[i]).every(isFilled)) { firstIncomplete = i; break; }
    }
    current = typeof step === 'number' ? Math.min(Math.max(step, 0), total - 1) : firstIncomplete;
    maxReached = Math.max(current, firstIncomplete);
    render();
  }

  let saveTimer = 0;
  async function saveDraft() {
    writeLocalDraft();
    if (!account || submitted) return;
    const r = await api('/api/application', { method: 'PUT', body: { data: serializeForm() } });
    if (r.http === 401) signedOut('Your session has ended. Verify your number again to continue.');
    else if (!r.ok) setStatus(r.error || 'Could not save your draft. Your answers are kept on this device.');
  }
  registrationForm.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 1200);
  });

  function goToStep(i) {
    saveDraft();
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
    setStatus('Draft saved. You can close this and continue later.');
  });
  saveExitBtn.addEventListener('click', async () => {
    await saveDraft();
    setStatus('Draft saved.');
    closeRegistrationPanel();
  });

  function setSubmitted(on) {
    submitted = on;
    allFields().forEach((f) => { f.disabled = on; });
    if (submitBtn) submitBtn.disabled = on;
    if (on) {
      current = total - 1;
      maxReached = total - 1;
      setStatus('Your application has been submitted. We will be in touch by email.');
    }
    render();
  }

  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitted) return;
    const invalid = registrationForm.querySelector(':invalid');
    if (invalid) {
      const idx = sections.findIndex((s) => s.contains(invalid));
      if (idx >= 0 && idx !== current) goToStep(idx);
      invalid.reportValidity();
      return;
    }
    submitBtn.disabled = true;
    setStatus('Submitting…');
    const r = await api('/api/application/submit', { method: 'POST', body: { data: serializeForm() } });
    if (r.ok) { clearLocalDraft(); setSubmitted(true); return; }
    submitBtn.disabled = false;
    if (r.http === 401) signedOut('Your session has ended. Verify your number again, then submit.');
    else setStatus(r.error || 'Could not submit. Please try again.');
  });

  // -- account: email + mobile, verified by SMS OTP --
  const authGate = $('auth-gate');
  const appContent = $('app-content');
  const detailsStep = $('auth-step-details');
  const codeStep = $('auth-step-code');
  const emailInput = $('auth-email');
  const phoneInput = $('auth-phone');
  const codeInput = $('auth-code');
  const sendBtn = $('auth-send-code');
  const verifyBtn = $('auth-verify-code');
  const resendBtn = $('auth-resend');
  const changeBtn = $('auth-change-details');
  const sentToEl = $('auth-sent-to');
  const devEl = $('auth-dev');
  const detailsErr = $('auth-details-error');
  const codeErr = $('auth-code-error');
  const accountLabel = $('account-label');
  const emailField = registrationForm.querySelector('input[name="email"]');

  let resendTimer = 0;
  function startResendCountdown(seconds) {
    clearInterval(resendTimer);
    let left = seconds;
    const tick = () => {
      resendBtn.disabled = left > 0;
      resendBtn.textContent = left > 0 ? `Resend OTP in ${left}s` : 'Resend OTP';
      left -= 1;
      if (left < -1) clearInterval(resendTimer);
    };
    tick();
    resendTimer = setInterval(tick, 1000);
  }

  function showDetailsStep() {
    detailsStep.style.display = 'grid';
    codeStep.style.display = 'none';
    codeInput.value = '';
    codeErr.textContent = '';
    devEl.hidden = true;
  }
  function showGate() { authGate.style.display = 'grid'; appContent.style.display = 'none'; }

  async function signedIn(user, created) {
    account = user;
    accountLabel.textContent = `Signed in as ${user.email} · ${user.phone}`;
    authGate.style.display = 'none';
    appContent.style.display = '';
    const r = await api('/api/application');
    const local = readLocalDraft();
    if (r.ok) {
      const remote = r.data || {};
      const hasRemote = Object.keys(remote).length > 0;
      fillForm(hasRemote ? remote : local);
      if (emailField && !emailField.value) emailField.value = user.email;
      if (r.status === 'submitted') setSubmitted(true);
      else { setSubmitted(false); resumePosition(hasRemote ? undefined : local && local.__step); }
    } else {
      fillForm(local);
      resumePosition(local && local.__step);
    }
    setStatus(created ? 'Account created. You can start your application.' : '');
  }

  function signedOut(message) {
    account = null;
    submitted = false;
    fillForm(null);
    allFields().forEach((f) => { f.disabled = false; });
    current = 0; maxReached = 0; render();
    showDetailsStep();
    showGate();
    detailsErr.textContent = message || '';
  }

  let checked = false;
  async function refreshAccount() {
    if (checked && account) return;
    checked = true;
    const r = await api('/api/auth/me');
    if (r.ok && r.user) await signedIn(r.user, false);
    else signedOut();
  }

  async function sendCode() {
    detailsErr.textContent = '';
    codeErr.textContent = '';
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    if (!email || !emailInput.checkValidity()) { detailsErr.textContent = 'Enter a valid email address.'; emailInput.focus(); return; }
    if (!/^(\+?91|0)?[\s-]*[6-9](?:[\s-]*\d){9}$/.test(phone)) { detailsErr.textContent = 'Enter a valid 10-digit Indian mobile number.'; phoneInput.focus(); return; }
    sendBtn.disabled = true; resendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    try {
      const r = await api('/api/auth/send-otp', { method: 'POST', body: { email, phone } });
      if (!r.ok) {
        const target = codeStep.style.display === 'none' ? detailsErr : codeErr;
        target.textContent = r.error || 'Could not send the code.';
        if (codeStep.style.display !== 'none') resendBtn.disabled = false;
        return;
      }
      sentToEl.textContent = `We sent a 6-digit OTP to ${r.phone}. It is valid for ${Math.round(r.expiresInSeconds / 60)} minutes.`;
      devEl.hidden = !r.devCode;
      devEl.textContent = r.devCode ? `Test mode: SMS is not connected yet. Your OTP is ${r.devCode}.` : '';
      detailsStep.style.display = 'none';
      codeStep.style.display = 'grid';
      codeInput.value = '';
      codeInput.focus();
      startResendCountdown(r.resendInSeconds || 30);
    } catch (_) {
      detailsErr.textContent = 'Network error — please try again.';
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send OTP';
    }
  }

  detailsStep.addEventListener('submit', (e) => { e.preventDefault(); sendCode(); });
  resendBtn.addEventListener('click', sendCode);
  changeBtn.addEventListener('click', () => { clearInterval(resendTimer); showDetailsStep(); emailInput.focus(); });
  codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6); });

  codeStep.addEventListener('submit', async (e) => {
    e.preventDefault();
    codeErr.textContent = '';
    const code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) { codeErr.textContent = 'Enter the 6-digit OTP.'; return; }
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying…';
    try {
      const r = await api('/api/auth/verify-otp', { method: 'POST', body: { phone: phoneInput.value.trim(), code } });
      if (!r.ok) { codeErr.textContent = r.error || 'Incorrect OTP.'; return; }
      clearInterval(resendTimer);
      await signedIn(r.user, r.created);
    } catch (_) {
      codeErr.textContent = 'Network error — please try again.';
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify and create account';
    }
  });

  $('auth-switch-account').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    emailInput.value = '';
    phoneInput.value = '';
    signedOut();
  });

  render();
  if (location.hash === '#register') { showPanel(); refreshAccount(); }
}
