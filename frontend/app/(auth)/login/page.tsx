'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/LanguageContext';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { GoldButton } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { User, Lock, AlertCircle } from 'lucide-react';
import type { StaffRole } from '@/types';

const ROLE_LANDING: Record<StaffRole, string> = {
  Admin: '/dashboard',
  Reception: '/reservations',
  Cashier: '/folio/search',
  RoomService: '/room-status',
  Restaurant: '/charge',
};

// Higher priority wins when a staff has multiple roles.
const ROLE_PRIORITY: StaffRole[] = [
  'Admin', 'Reception', 'Cashier', 'RoomService', 'Restaurant',
];

function defaultRoute(roles: StaffRole[]): string {
  const top = ROLE_PRIORITY.find(r => roles.includes(r));
  return top ? ROLE_LANDING[top] : '/login';
}

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      login(res.token, res.fullName, res.roles, res.staffId);
      router.push(defaultRoute(res.roles));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Invalid credentials.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left panel — brand showcase */}
      <div className="login-brand">
        <div className="login-brand-pattern" />
        <div className="login-brand-content">
          <div style={{ marginBottom: 28 }}>
            <Logo size={88} />
          </div>
          <p className="login-brand-sub" style={{ marginBottom: 8 }}>
            {t('Fleet Club')}
          </p>
          <h1 className="login-brand-title">{t('Mahrousa Hotel')}</h1>
          <div className="login-brand-divider" />
          <p className="login-brand-tagline">
            {t('“Best memories start here.” A refined hospitality management suite for reservations, rooms, billing, and daily operations.')}
          </p>
        </div>
        <p className="login-brand-footer">
          © {new Date().getFullYear()} · {t('Fleet Club Mahrousa')}
        </p>
      </div>

      {/* Right panel — sign in form */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
            <LanguageToggle variant="light" />
          </div>
          <div className="login-form-header">
            <h2>{t('Welcome back')}</h2>
            <p>{t('Sign in to access the staff dashboard')}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <Input
              label={t('Username')}
              type="text"
              placeholder={t('e.g. reception1')}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              icon={<User size={15} />}
              autoComplete="username"
              autoFocus
              required
            />
            <Input
              label={t('Password')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              icon={<Lock size={15} />}
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="login-error">
                <AlertCircle size={14} />
                <p>{error}</p>
              </div>
            )}

            <GoldButton
              type="submit"
              loading={loading}
              className="w-full mt-1 py-2.5"
            >
              {t('Sign in')}
            </GoldButton>

            {process.env.NODE_ENV === 'development' && (
              <div className="login-devtools">
                <p className="login-devtools-label">{t('Quick fill (dev only)')}</p>
                <div className="login-devtools-btns">
                  {[
                    { u: 'admin', p: 'admin123', label: 'Admin' },
                    { u: 'reception1', p: 'reception123', label: 'Reception' },
                    { u: 'cashier1', p: 'cashier123', label: 'Cashier' },
                    { u: 'roomsvc1', p: 'roomsvc123', label: 'Room svc' },
                    { u: 'restaurant1', p: 'rest123', label: 'Restaurant' },
                  ].map((acc) => (
                    <button
                      key={acc.u}
                      type="button"
                      onClick={() => {
                        setUsername(acc.u);
                        setPassword(acc.p);
                      }}
                    className="login-devtools-btn"
                  >
                    {t(acc.label)}
                  </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
