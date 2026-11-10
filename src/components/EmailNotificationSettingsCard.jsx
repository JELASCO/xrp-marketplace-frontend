'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

function formatCountdown(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function EmailNotificationSettingsCard({ style = {} }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    email: null,
    maskedEmail: null,
    emailVerified: false,
    pendingVerification: false,
    expiresAt: null,
    notifyOnSale: true,
    notifyOnPurchase: true,
  });

  const [emailInput, setEmailInput] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(false);
  const [savingPrefKey, setSavingPrefKey] = useState(null);

  const [expirySecondsLeft, setExpirySecondsLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning'|'info', message, attemptsRemaining, lockedOut }
  const [prefSavedMsg, setPrefSavedMsg] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.notifications
      .settings()
      .then((data) => {
        if (!active || !data) return;
        setSettings({
          email: data.email || null,
          maskedEmail: data.maskedEmail || null,
          emailVerified: Boolean(data.emailVerified),
          pendingVerification: Boolean(data.pendingVerification),
          expiresAt: data.expiresAt || null,
          notifyOnSale: data.notifyOnSale !== undefined ? Boolean(data.notifyOnSale) : true,
          notifyOnPurchase: data.notifyOnPurchase !== undefined ? Boolean(data.notifyOnPurchase) : true,
        });
        if (data.email) {
          setEmailInput(data.email);
        }
      })
      .catch(() => {
        // Fail gracefully if unauthenticated or offline
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Live countdown timer for OTP expiry (15m window)
  useEffect(() => {
    if (!settings.expiresAt || settings.emailVerified) {
      setExpirySecondsLeft(0);
      return;
    }
    const updateExpiry = () => {
      const diffSec = Math.max(0, Math.floor((new Date(settings.expiresAt).getTime() - Date.now()) / 1000));
      setExpirySecondsLeft(diffSec);
    };
    updateExpiry();
    const timer = setInterval(updateExpiry, 1000);
    return () => clearInterval(timer);
  }, [settings.expiresAt, settings.emailVerified]);

  // Live countdown timer for Resend Code cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const hasEmail = Boolean(settings.email || settings.maskedEmail);
  const isVerified = Boolean(settings.emailVerified && hasEmail);
  const isPending = Boolean(hasEmail && !settings.emailVerified);
  const showOtpPanel = Boolean((settings.pendingVerification || isPending) && !isVerified);
  const showEmailForm = !hasEmail || isEditingEmail;

  async function handleSendVerificationCode(e, targetEmailOverride) {
    if (e && e.preventDefault) e.preventDefault();
    const candidate = (targetEmailOverride !== undefined ? targetEmailOverride : emailInput).trim();
    if (!candidate) {
      setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    setSendingCode(true);
    setFeedback(null);
    try {
      const res = await api.notifications.saveEmail(candidate);
      const nextExpiresAt = res?.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();
      setSettings((prev) => ({
        ...prev,
        email: res?.email || candidate,
        maskedEmail: res?.maskedEmail || candidate,
        emailVerified: Boolean(res?.emailVerified),
        pendingVerification: res?.pendingVerification !== undefined ? Boolean(res.pendingVerification) : true,
        expiresAt: nextExpiresAt,
        notifyOnSale: res?.notifyOnSale !== undefined ? Boolean(res.notifyOnSale) : prev.notifyOnSale,
        notifyOnPurchase: res?.notifyOnPurchase !== undefined ? Boolean(res.notifyOnPurchase) : prev.notifyOnPurchase,
      }));
      setEmailInput(res?.email || candidate);
      setIsEditingEmail(false);
      setOtpCode('');
      setResendCooldown(30);
      setFeedback({
        type: 'info',
        message: `Verification code sent to ${res?.email || candidate}. Enter the 6-digit code below (valid for 15 minutes).`,
      });
    } catch (err) {
      const retrySec = err?.data?.retryAfterSeconds;
      if (typeof retrySec === 'number' && retrySec > 0) {
        setResendCooldown(retrySec);
      }
      setFeedback({
        type: err?.status === 429 ? 'warning' : 'error',
        message: err?.message || 'Failed to send verification code. Please try again.',
      });
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const clean = otpCode.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setFeedback({ type: 'error', message: 'Please enter the full 6-digit verification code.' });
      return;
    }
    setVerifyingCode(true);
    setFeedback(null);
    try {
      const res = await api.notifications.verifyEmail(clean);
      setSettings((prev) => ({
        ...prev,
        email: res?.email || prev.email,
        maskedEmail: res?.maskedEmail || prev.maskedEmail,
        emailVerified: true,
        pendingVerification: false,
        expiresAt: null,
        notifyOnSale: res?.notifyOnSale !== undefined ? Boolean(res.notifyOnSale) : prev.notifyOnSale,
        notifyOnPurchase: res?.notifyOnPurchase !== undefined ? Boolean(res.notifyOnPurchase) : prev.notifyOnPurchase,
      }));
      setOtpCode('');
      setIsEditingEmail(false);
      setFeedback({
        type: 'success',
        message: '✓ Email verified! You will now receive real-time XRPL order notifications.',
      });
    } catch (err) {
      const attemptsRemaining = err?.data?.attemptsRemaining;
      const lockedOut = Boolean(err?.data?.lockedOut);
      if (lockedOut) {
        setOtpCode('');
        setSettings((prev) => ({ ...prev, expiresAt: null }));
      }
      setFeedback({
        type: lockedOut || err?.status === 429 ? 'warning' : 'error',
        message: err?.message || 'Invalid verification code.',
        attemptsRemaining: typeof attemptsRemaining === 'number' ? attemptsRemaining : undefined,
        lockedOut,
      });
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleRemoveEmail() {
    setRemovingEmail(true);
    setFeedback(null);
    try {
      await api.notifications.removeEmail();
      setSettings({
        email: null,
        maskedEmail: null,
        emailVerified: false,
        pendingVerification: false,
        expiresAt: null,
        notifyOnSale: false,
        notifyOnPurchase: false,
      });
      setEmailInput('');
      setOtpCode('');
      setIsEditingEmail(false);
      setResendCooldown(0);
      setFeedback({
        type: 'info',
        message: 'Notification email removed and email alerts disabled.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Could not remove email. Please try again.',
      });
    } finally {
      setRemovingEmail(false);
    }
  }

  async function handleTogglePreference(key) {
    const nextValue = !settings[key];
    const previousValue = settings[key];
    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: nextValue }));
    setSavingPrefKey(key);
    setPrefSavedMsg('');
    try {
      const res = await api.notifications.updatePreferences({
        notifyOnSale: key === 'notifyOnSale' ? nextValue : settings.notifyOnSale,
        notifyOnPurchase: key === 'notifyOnPurchase' ? nextValue : settings.notifyOnPurchase,
      });
      setSettings((prev) => ({
        ...prev,
        notifyOnSale: res?.notifyOnSale !== undefined ? Boolean(res.notifyOnSale) : prev.notifyOnSale,
        notifyOnPurchase: res?.notifyOnPurchase !== undefined ? Boolean(res.notifyOnPurchase) : prev.notifyOnPurchase,
      }));
      setPrefSavedMsg('✓ Preferences saved');
      setTimeout(() => setPrefSavedMsg(''), 2500);
    } catch (err) {
      // Revert on failure
      setSettings((prev) => ({ ...prev, [key]: previousValue }));
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to update notification preferences.',
      });
    } finally {
      setSavingPrefKey(null);
    }
  }

  // Status badge configuration
  const statusBadge = isVerified
    ? {
        label: '✓ Verified',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.13)',
        border: '1px solid rgba(16,185,129,0.35)',
      }
    : isPending
      ? {
          label: '⏳ Pending Verification',
          color: '#f59e0b',
          bg: 'rgba(245,158,11,0.14)',
          border: '1px solid rgba(245,158,11,0.38)',
        }
      : {
          label: 'Not Configured',
          color: 'var(--text2)',
          bg: 'var(--bg)',
          border: '1px solid var(--border)',
        };

  return (
    <div
      style={{
        background: 'var(--surface)',
        boxShadow: '0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 16,
        ...style,
      }}
    >
      {/* Header Row with Status Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              ✉️ Order Email Notifications
            </h2>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999,
                color: statusBadge.color,
                background: statusBadge.bg,
                border: statusBadge.border,
                fontFamily: 'DM Mono, monospace',
                whiteSpace: 'nowrap',
              }}
            >
              {statusBadge.label}
            </span>
            {prefSavedMsg && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#10b981',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {prefSavedMsg}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text2)', margin: '4px 0 0' }}>
            Receive instant email alerts when your listings sell, escrows lock or settle on XRPL, and digital vault files are ready.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: '10px 13px',
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            background:
              feedback.type === 'success'
                ? 'rgba(16,185,129,0.12)'
                : feedback.type === 'warning'
                  ? 'rgba(245,158,11,0.13)'
                  : feedback.type === 'info'
                    ? 'rgba(32,128,245,0.10)'
                    : 'rgba(239,68,68,0.11)',
            border:
              feedback.type === 'success'
                ? '1px solid rgba(16,185,129,0.35)'
                : feedback.type === 'warning'
                  ? '1px solid rgba(245,158,11,0.4)'
                  : feedback.type === 'info'
                    ? '1px solid rgba(32,128,245,0.3)'
                    : '1px solid rgba(239,68,68,0.35)',
            color:
              feedback.type === 'success'
                ? '#10b981'
                : feedback.type === 'warning'
                  ? '#f59e0b'
                  : feedback.type === 'info'
                    ? '#2080F5'
                    : '#ef4444',
          }}
        >
          <div>{feedback.message}</div>
          {typeof feedback.attemptsRemaining === 'number' && !feedback.lockedOut && (
            <div style={{ fontSize: 11.5, fontFamily: 'DM Mono, monospace', color: '#f59e0b' }}>
              ⚠️ {feedback.attemptsRemaining} verification attempt{feedback.attemptsRemaining === 1 ? '' : 's'} remaining before code lockout.
            </div>
          )}
          {feedback.lockedOut && (
            <div style={{ fontSize: 11.5, fontFamily: 'DM Mono, monospace', color: '#f59e0b' }}>
              🔒 Code invalidated after 5 failed attempts. Click &ldquo;Resend Verification Code&rdquo; below to generate a fresh 6-digit code.
            </div>
          )}
        </div>
      )}

      {/* Email Display / Input Section */}
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 14,
        }}
      >
        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--text3)', padding: '4px 0' }}>
            Loading notification settings…
          </div>
        ) : showEmailForm ? (
          <form onSubmit={(e) => handleSendVerificationCode(e)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
              Notification Email Address
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="creator@domain.com"
                required
                style={{
                  flex: '1 1 220px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  padding: '9px 12px',
                  color: 'var(--text)',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={sendingCode}
                style={{
                  padding: '9px 16px',
                  borderRadius: 9,
                  border: 'none',
                  background: '#2080F5',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: sendingCode ? 'wait' : 'pointer',
                  opacity: sendingCode ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {sendingCode ? 'Sending Code…' : 'Send Verification Code'}
              </button>
              {hasEmail && isEditingEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingEmail(false);
                    setEmailInput(settings.email || '');
                    setFeedback(null);
                  }}
                  style={{
                    padding: '9px 13px',
                    borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text2)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>
                Configured Notification Email
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontFamily: 'DM Mono, monospace',
                  wordBreak: 'break-all',
                }}
              >
                {settings.email || settings.maskedEmail}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setEmailInput(settings.email || '');
                  setIsEditingEmail(true);
                  setFeedback(null);
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={handleRemoveEmail}
                disabled={removingEmail}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: removingEmail ? 'wait' : 'pointer',
                  opacity: removingEmail ? 0.65 : 1,
                }}
              >
                {removingEmail ? 'Removing…' : 'Remove Email'}
              </button>
            </div>
          </div>
        )}

        {/* Inline 6-Digit OTP Verification Step */}
        {!loading && showOtpPanel && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                🔐 Enter 6-Digit Verification Code
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontFamily: 'DM Mono, monospace',
                  color: expirySecondsLeft > 0 ? '#f59e0b' : 'var(--text2)',
                  fontWeight: 600,
                }}
              >
                {expirySecondsLeft > 0
                  ? `Code expires in ${formatCountdown(expirySecondsLeft)}`
                  : settings.expiresAt
                    ? 'Code expired — request a new code'
                    : '15m verification window'}
              </span>
            </div>

            <form
              onSubmit={handleVerifyOtp}
              style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                aria-label="6-digit verification code"
                style={{
                  width: 150,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  padding: '9px 12px',
                  color: 'var(--text)',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: 'DM Mono, monospace',
                  letterSpacing: '0.28em',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={verifyingCode || otpCode.length !== 6}
                style={{
                  padding: '9px 16px',
                  borderRadius: 9,
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: verifyingCode || otpCode.length !== 6 ? 'not-allowed' : 'pointer',
                  opacity: verifyingCode || otpCode.length !== 6 ? 0.65 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {verifyingCode ? 'Verifying…' : 'Verify Email'}
              </button>

              <button
                type="button"
                disabled={sendingCode || resendCooldown > 0}
                onClick={(e) => handleSendVerificationCode(e, settings.email || emailInput)}
                style={{
                  padding: '9px 13px',
                  borderRadius: 9,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: resendCooldown > 0 ? 'var(--text3)' : '#2080F5',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'DM Mono, monospace',
                  cursor: sendingCode || resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {sendingCode
                  ? 'Sending…'
                  : resendCooldown > 0
                    ? `Resend Code (${resendCooldown}s)`
                    : 'Resend Verification Code'}
              </button>

              {!isEditingEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput(settings.email || '');
                    setIsEditingEmail(true);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Change Email
                </button>
              )}

              <button
                type="button"
                onClick={handleRemoveEmail}
                disabled={removingEmail}
                style={{
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'transparent',
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: removingEmail ? 'wait' : 'pointer',
                }}
              >
                Remove Email
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Notification Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {[
          {
            key: 'notifyOnSale',
            title: 'Incoming & Sold Orders',
            subtitle: 'Notify me when someone buys my listing or funds/completes an order',
          },
          {
            key: 'notifyOnPurchase',
            title: 'Purchased Orders',
            subtitle: 'Send me order receipts and download-ready alerts',
          },
        ].map((item) => {
          const checked = Boolean(settings[item.key]);
          const isSavingThis = savingPrefKey === item.key;
          return (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 11,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{item.subtitle}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={item.title}
                disabled={loading || isSavingThis}
                onClick={() => handleTogglePreference(item.key)}
                style={{
                  position: 'relative',
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  border: 'none',
                  background: checked ? '#2080F5' : 'var(--border)',
                  cursor: loading || isSavingThis ? 'wait' : 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'background 0.18s ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: checked ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    transition: 'left 0.18s ease',
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Privacy Microcopy Footer */}
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--text2)',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 12px',
          lineHeight: 1.45,
        }}
      >
        🔒 <strong>Zero-PII Privacy Guarantee:</strong> Your email is strictly used for on-chain verified XRPL order alerts and is never shared with buyers, sellers, public profiles, or third parties.
      </div>
    </div>
  );
}
