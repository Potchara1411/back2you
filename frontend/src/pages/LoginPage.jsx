import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LoginPage() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-otp', { email });
      setDevOtp(data.devOtp || '');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      login(data.token, data.user);
      navigate(data.user?.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 sm:flex sm:items-center sm:justify-center sm:p-8">
      <div className="relative mx-auto min-h-screen max-w-md bg-white sm:h-[860px] sm:min-h-0 sm:w-[430px] sm:overflow-hidden sm:rounded-[3.25rem] sm:border-[14px] sm:border-slate-950 sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
        <div className="pointer-events-none absolute left-1/2 top-4 z-40 hidden h-7 w-32 -translate-x-1/2 rounded-full bg-slate-950 sm:block" />

        <div className="flex min-h-screen flex-col items-center justify-center px-8 sm:min-h-0 sm:h-full sm:pt-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
                <svg className="h-9 w-9 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-950">Back2You</h1>
              <p className="mt-1 text-sm text-slate-500">KAIST Lost & Found</p>
            </div>

            {step === 'email' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">KAIST Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@kaist.ac.kr"
                    required
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-center text-sm text-slate-500">
                  Code sent to <span className="font-semibold text-slate-800">{email}</span>
                </p>
                {devOtp && (
                  <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-center text-sm font-medium text-blue-700">
                    Dev OTP: {devOtp}
                  </p>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">One-Time Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-center text-lg font-bold tracking-[0.5em] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Log In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  className="w-full text-sm text-slate-400 hover:text-slate-600"
                >
                  Use a different email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
