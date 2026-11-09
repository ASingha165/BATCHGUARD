import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_BATCHES, DEMO_SUPPLIERS } from '../../services/mockData';
import { authService, UserSession } from '../../services/auth';
import { checkBackendConnection, BackendConnectionStatus, getCachedConnectionStatus } from '../../services/api';

interface HeaderProps {
  currentSection?: string;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentSection = 'Operations', onToggleSidebar }) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(authService.getSession());
  const [connStatus, setConnStatus] = useState<BackendConnectionStatus>(getCachedConnectionStatus());

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState<{
    session: string;
    username: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    const unsubscribeAuth = authService.onAuthChange((newSession) => {
      setSession(newSession);
    });

    const unsubscribeExpired = authService.onSessionExpired(() => {
      setIsLoginModalOpen(true);
    });

    checkBackendConnection().then(setConnStatus);

    return () => {
      unsubscribeAuth();
      unsubscribeExpired();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const result = await authService.login(loginEmail, loginPassword);
      if (result.mfaRequired && result.challengeSession) {
        setMfaChallenge({
          session: result.challengeSession,
          username: result.username || loginEmail,
        });
        return;
      }
      setIsLoginModalOpen(false);
      setLoginEmail('');
      setLoginPassword('');
      setMfaChallenge(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      await authService.respondToMfaChallenge(
        mfaChallenge.username,
        mfaChallenge.session,
        mfaCode.trim()
      );
      setIsLoginModalOpen(false);
      setLoginEmail('');
      setLoginPassword('');
      setMfaCode('');
      setMfaChallenge(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'MFA verification failed';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDevLogin = () => {
    authService.loginDev();
    setIsLoginModalOpen(false);
    setMfaChallenge(null);
  };

  const handleLogout = () => {
    authService.logout();
    setIsProfileOpen(false);
  };

  // Filter items for quick Cmd+K search
  const filteredBatches = searchQuery
    ? DEMO_BATCHES.filter(
        (b) =>
          b.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.gtin.includes(searchQuery)
      )
    : DEMO_BATCHES.slice(0, 3);

  const filteredSuppliers = searchQuery
    ? DEMO_SUPPLIERS.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : DEMO_SUPPLIERS.slice(0, 2);

  const handleSelectResult = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  const userInitials = session?.username
    ? session.username.slice(0, 2).toUpperCase()
    : 'BG';

  return (
    <>
      <header className="fixed top-0 left-0 md:left-[260px] right-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-surface-container/80 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
        <div className="h-16 w-full px-space-md md:px-space-lg flex items-center justify-between gap-space-md">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-space-sm md:gap-space-md">
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container md:hidden"
              type="button"
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
              <span className="text-outline font-medium">BatchGuard</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-on-surface font-semibold truncate max-w-[140px] sm:max-w-none">
                {currentSection}
              </span>
            </div>
          </div>

          {/* Center: Global Search Bar Trigger */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-space-sm px-space-sm py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-on-surface-variant hover:border-primary/50 transition-colors text-left"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">search</span>
              <span className="font-body-sm text-body-sm text-outline flex-1 truncate">
                Search batch ID, GTIN, supplier, or recall event...
              </span>
              <span className="font-data-mono-sm text-data-mono-sm px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-surface-container">
                ⌘K
              </span>
            </button>
          </div>

          {/* Right: Operational Status, Notifications & Profile */}
          <div className="flex items-center gap-space-xs sm:gap-space-md">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg text-outline hover:text-on-surface sm:hidden"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            <div
              className="flex items-center gap-space-xs px-2 sm:px-space-sm py-1 rounded-full bg-surface-container border border-surface-container-high"
              title={
                connStatus === 'AUTHENTICATED_LIVE'
                  ? 'Connected to live AWS API Gateway with authenticated session'
                  : connStatus === 'AWS_CONNECTED'
                  ? 'Connected to live AWS minimal serverless backend (API Gateway + DynamoDB + Step Functions)'
                  : connStatus === 'CONFIGURED_UNREACHABLE'
                  ? 'Remote API URL is configured but unreachable'
                  : connStatus === 'BACKEND_UNAVAILABLE'
                  ? 'Remote server returned 5xx error'
                  : 'Operating in demonstration mode with simulated data'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connStatus === 'AUTHENTICATED_LIVE' || connStatus === 'AWS_CONNECTED'
                    ? 'bg-secondary animate-pulse'
                    : connStatus === 'CONFIGURED_UNREACHABLE' || connStatus === 'BACKEND_UNAVAILABLE'
                    ? 'bg-error'
                    : 'bg-warning'
                }`}
              />
              <span className="font-data-mono-sm text-xs sm:text-data-mono-sm text-on-surface font-semibold tracking-wider">
                {connStatus === 'AUTHENTICATED_LIVE'
                  ? 'US-EAST PROD (LIVE)'
                  : connStatus === 'AWS_CONNECTED'
                  ? 'AWS CONNECTED (MVP)'
                  : connStatus === 'CONFIGURED_UNREACHABLE'
                  ? 'API UNREACHABLE'
                  : connStatus === 'BACKEND_UNAVAILABLE'
                  ? 'BACKEND 5XX'
                  : 'DEMO MODE'}
              </span>
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                aria-label="Notifications"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-space-xs text-on-surface-variant hover:text-on-surface transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-on-error font-label-sm text-label-sm flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container p-3 flex flex-col gap-2 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="font-semibold text-xs uppercase tracking-wider text-outline">Active Alerts</span>
                    <span className="text-xs text-secondary font-semibold">Mark read</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/recalls');
                      }}
                      className="p-2 rounded-lg bg-error-container/30 hover:bg-error-container/50 cursor-pointer flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-error">Class I Recall Active</span>
                        <span className="text-[10px] text-outline">12m ago</span>
                      </div>
                      <span className="text-xs text-on-surface">Listeria detected in Lot BG-2024-8891-ORG</span>
                    </div>
                    <div
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/batches/BG-2024-8891-ORG');
                      }}
                      className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary">BLE Telemetry Synced</span>
                        <span className="text-[10px] text-outline">28m ago</span>
                      </div>
                      <span className="text-xs text-outline">ColdRoute Carrier #204 reported optimal 3.2°C</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu Popover */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-space-xs pl-space-xs focus:outline-none"
                type="button"
                aria-label="User profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-semibold flex items-center justify-center text-xs shadow-xs">
                  {userInitials}
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant hidden sm:inline">
                  expand_more
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-12 w-72 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container p-4 flex flex-col gap-3 z-50">
                  {session ? (
                    <>
                      <div className="flex flex-col gap-0.5 border-b border-surface-container pb-3">
                        <span className="font-semibold text-sm text-on-surface">
                          {session.username}
                        </span>
                        <span className="text-xs text-outline font-mono truncate">
                          {session.email}
                        </span>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            {session.roles[0] || 'COMPLIANCE_OFFICER'}
                          </span>
                          <span className="text-[11px] text-outline truncate font-mono">
                            {session.orgId}
                          </span>
                        </div>
                        {session.isDevMode && (
                          <span className="text-[10px] text-amber-600 font-medium mt-1">
                            • Local Development Session
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px] text-error">logout</span>
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-outline">Not authenticated.</span>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsLoginModalOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold transition-colors"
                        type="button"
                      >
                        Sign In
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Quick-Search Modal (Cmd+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden flex flex-col">
            <div className="p-3 border-b border-surface-container flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-[20px]">search</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batches, GTINs, suppliers, or recalls..."
                className="flex-1 bg-transparent border-none outline-none font-body-md text-on-surface placeholder:text-outline"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-outline hover:text-on-surface p-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
              <span className="px-2 py-1 text-[11px] font-semibold text-outline uppercase tracking-wider">
                Batches &amp; Products
              </span>
              {filteredBatches.map((b) => (
                <div
                  key={b.batchId}
                  onClick={() => handleSelectResult(`/batches/${b.batchId}`)}
                  className="px-3 py-2 rounded-lg hover:bg-surface-container cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-on-surface">{b.productName}</span>
                    <span className="font-data-mono-sm text-xs text-primary">{b.batchId} • GTIN: {b.gtin}</span>
                  </div>
                  <span className="text-xs text-outline font-medium">{b.status}</span>
                </div>
              ))}

              <span className="px-2 pt-2 pb-1 text-[11px] font-semibold text-outline uppercase tracking-wider">
                Suppliers
              </span>
              {filteredSuppliers.map((s) => (
                <div
                  key={s.supplierId}
                  onClick={() => handleSelectResult('/suppliers')}
                  className="px-3 py-2 rounded-lg hover:bg-surface-container cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-on-surface">{s.name}</span>
                    <span className="text-xs text-outline">GLN: {s.facilityCode}</span>
                  </div>
                  <span className="text-xs text-secondary font-bold">{s.auditScore}% Audit</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cognito Authentication Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                <span className="font-bold text-base text-on-surface">BatchGuard Enterprise Sign-In</span>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-outline hover:text-on-surface p-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {mfaChallenge ? (
              <form onSubmit={handleMfaVerify} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">security</span>
                    Two-Factor Authentication Required
                  </span>
                  <span className="text-xs text-outline">
                    Enter the 6-digit verification code from your authenticator app (TOTP) for user{' '}
                    <strong className="text-on-surface">{mfaChallenge.username}</strong>.
                  </span>
                </div>

                {loginError && (
                  <div className="p-2.5 rounded-lg bg-error-container/30 border border-error/30 text-error text-xs">
                    {loginError}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">6-Digit MFA Code</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container text-base text-center font-mono tracking-widest text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaChallenge(null);
                      setMfaCode('');
                      setLoginError(null);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoggingIn || mfaCode.length !== 6}
                    className="flex-2 py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {isLoggingIn ? 'Verifying Code...' : 'Verify & Sign In'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                {loginError && (
                  <div className="p-2.5 rounded-lg bg-error-container/30 border border-error/30 text-error text-xs">
                    {loginError}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Email or Username</label>
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="compliance.officer@batchguard.internal"
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="mt-2 w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isLoggingIn ? 'Authenticating with Cognito...' : 'Sign In'}
                </button>
              </form>
            )}

            {!authService.isCognitoConfigured() && (
              <div className="pt-2 border-t border-surface-container flex flex-col gap-2">
                <span className="text-[11px] text-outline text-center">
                  Development Environment Active
                </span>
                <button
                  onClick={handleDevLogin}
                  type="button"
                  className="w-full py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
                >
                  Sign In as Sarah Chen (Compliance Officer)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
