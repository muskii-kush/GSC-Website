"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { requestOtp, verifyPhoneOtp } from "@/lib/otp-auth";

/**
 * Checks the code on the server (functions/api/auth/verify.js), which signs the founder in and
 * says whether this number has already applied. `next dev` has no Pages Functions, so local
 * previews fall back to checking the code in the browser.
 */
async function verifyOnServer(phone: string, otp: string): Promise<{ submittedAt?: string } | undefined> {
  const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, otp }) });
  if (res.status === 404 && process.env.NODE_ENV !== "production") { await verifyPhoneOtp(phone, otp); return undefined; }
  const out = await res.json().catch(() => null);
  if (!out?.ok) throw new Error(out?.message || "Could not verify the code. Please try again.");
  return out.submitted ? { submittedAt: out.submittedAt } : undefined;
}

const otpLength = 4;
const retrySeconds = 30;

type AuthError = Error & { errorMessage?: string };

function message(error: unknown) {
  const value = error as AuthError;
  return value?.errorMessage || value?.message || "Something went wrong. Please try again.";
}

export default function RegistrationAuth({ onVerified }: { onVerified: (phone: string, done?: { submittedAt?: string }) => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sentPhone, setSentPhone] = useState("");
  const inFlight = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!retryAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  useEffect(() => {
    if (!busy) (step === "otp" ? codeInput : phoneInput).current?.focus();
  }, [step, busy]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (inFlight.current) return;
    const digits = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await requestOtp(digits);
      setSentPhone(digits);
      setRetryAt(Date.now() + retrySeconds * 1000);
      setSecondsLeft(retrySeconds);
      setOtp("");
      setStep("otp");
    } catch (cause) {
      setError(message(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || !sentPhone) return;
    if (otp.length !== otpLength) {
      setError(`Enter the ${otpLength}-digit code sent to your phone.`);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      onVerified(sentPhone, await verifyOnServer(sentPhone, otp));
    } catch (cause) {
      setError(message(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    if (inFlight.current || Date.now() < retryAt || !sentPhone) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await requestOtp(sentPhone);
      setOtp("");
      setRetryAt(Date.now() + retrySeconds * 1000);
      setSecondsLeft(retrySeconds);
      codeInput.current?.focus();
    } catch (cause) {
      setError(message(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="register-auth">
      <div className="register-auth-progress"><span>01 / VERIFY YOUR NUMBER</span><span>BEFORE YOU APPLY</span></div>
      <div className="register-auth-icon" aria-hidden="true">✳</div>
      <h2>{step === "phone" ? "let’s get you in" : "check your phone"}</h2>
      <p className="registration-lede">
        {step === "phone"
          ? "Enter your mobile number to start your application. We’ll text you a one-time code to keep your details secure."
          : <>We sent a {otpLength}-digit code to <strong>+91 {sentPhone.slice(0, 5)} {sentPhone.slice(5)}</strong>.</>}
      </p>

      {step === "phone" ? (
        <form className="register-auth-form" onSubmit={send} noValidate>
          <label htmlFor="register-phone">Mobile number <span className="app-req">*</span></label>
          <span className="app-help">Your Indian mobile number. We use it to verify this application.</span>
          <div className="register-auth-phone">
            <span className="register-auth-prefix">+91</span>
            <input ref={phoneInput} id="register-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210"
              value={phone} maxLength={14} disabled={busy} aria-invalid={!!error} aria-describedby="register-auth-error" onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s]/g, "")); setError(""); }} required />
          </div>
          <button className="button primary" type="submit" disabled={busy}>{busy ? "Sending code…" : "Send OTP →"}</button>
        </form>
      ) : (
        <form className="register-auth-form" onSubmit={verify} noValidate>
          <label htmlFor="register-otp">One-time code <span className="app-req">*</span></label>
          <span className="app-help">Enter the code from your SMS to continue.</span>
          <input ref={codeInput} className="register-auth-code" id="register-otp" type="text" inputMode="numeric" autoComplete="one-time-code"
            placeholder={"•".repeat(otpLength)} maxLength={otpLength} value={otp} disabled={busy} aria-invalid={!!error} aria-describedby="register-auth-error"
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, otpLength)); setError(""); }} required />
          <button className="button primary" type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify & continue →"}</button>
          <div className="register-auth-actions">
            <button type="button" onClick={resend} disabled={busy || secondsLeft > 0}>Retry{secondsLeft ? ` in ${secondsLeft}s` : ""}</button>
            <button type="button" disabled={busy} onClick={() => { setSentPhone(""); setStep("phone"); setOtp(""); setError(""); }}>Change number</button>
          </div>
        </form>
      )}
      <p id="register-auth-error" className="register-auth-error" role="alert" aria-live="polite">{error}</p>
      <p className="register-auth-note">One application per mobile number. If you have already applied, you will see your application status after verifying.</p>
    </div>
  );
}
