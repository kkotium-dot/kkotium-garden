'use client';
// /settings/supplier-login
// Manage login sessions for domemae and domeggook
// Credentials are used for authenticated crawling (price/stock checks)

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, LogIn, LogOut, RefreshCw, Lock, Eye, EyeOff, AlertTriangle, KeyRound } from 'lucide-react';

interface SessionStatus {
  platformCode: string;
  platformName: string;
  isValid: boolean;
  loginId: string | null;
  loggedInAt: string | null;
}

const PLATFORM_META: Record<string, { color: string; bg: string; border: string; url: string }> = {
  DMM: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', url: 'https://www.domemedb.com' },
  DMK: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', url: 'https://www.domeggook.com' },
};

const inp = 'w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white transition';

export default function SupplierLoginPage() {
  const [sessions, setSessions]   = useState<SessionStatus[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loginForms, setLoginForms] = useState<Record<string, { id: string; pw: string; showPw: boolean; saving: boolean; error: string | null }>>({
    DMM: { id: '', pw: '', showPw: false, saving: false, error: null },
    DMK: { id: '', pw: '', showPw: false, saving: false, error: null },
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supplier-session');
      const data = await res.json();
      if (data.success) setSessions(data.sessions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateForm = (code: string, field: string, val: any) => {
    setLoginForms(prev => ({ ...prev, [code]: { ...prev[code], [field]: val } }));
  };

  const handleLogin = async (code: string) => {
    const form = loginForms[code];
    if (!form.id.trim() || !form.pw.trim()) {
      updateForm(code, 'error', 'ID와 비밀번호를 입력해주세요');
      return;
    }
    updateForm(code, 'saving', true);
    updateForm(code, 'error', null);
    try {
      const res = await fetch('/api/supplier-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformCode: code, loginId: form.id, loginPw: form.pw }),
      });
      const data = await res.json();
      if (data.isValid) {
        updateForm(code, 'pw', '');
        await load();
      } else {
        updateForm(code, 'error', data.message || '로그인 실패. ID/PW를 확인해주세요.');
      }
    } finally {
      updateForm(code, 'saving', false);
    }
  };

  const handleLogout = async (code: string) => {
    await fetch(`/api/supplier-session?platformCode=${code}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: 24 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r = deg * Math.PI / 180; const cx = 26 + Math.cos(r) * 11.4; const cy = 26 + Math.sin(r) * 11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                <circle cx="26" cy="26" r="14.6" fill="#e62310" />
              </svg>
              <KeyRound size={20} color="#fff" style={{ position: "relative", zIndex: 1 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>공급사 열쇠방</h1>
          </div>
          {/* Single 2.5px pink line */}
          <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>도매매/도매꾹에 로그인하면 재고 확인 및 가격 모니터링이 더 정확해집니다.</p>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">보안 안내</p>
            <p>비밀번호는 서버 DB에 저장되지 않으며, 로그인 후 발급된 쿠키(세션 토큰)만 저장됩니다. 쿠키는 12시간 후 자동 만료됩니다. 공용 서버나 타인과 공유하는 환경에서는 사용을 권장하지 않습니다.</p>
          </div>
        </div>

        {/* Session cards */}
        {loading ? (
          <div className="text-center text-gray-400 py-8 text-sm">불러오는 중...</div>
        ) : (
          ['DMM', 'DMK'].map(code => {
            const session = sessions.find(s => s.platformCode === code);
            const meta    = PLATFORM_META[code];
            const form    = loginForms[code];
            const isValid = session?.isValid ?? false;

            return (
              <div key={code} className={`border rounded-2xl overflow-hidden ${meta.border}`}>
                {/* Platform header */}
                <div className={`px-5 py-3.5 flex items-center justify-between ${meta.bg}`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className={`font-bold text-base ${meta.color}`}>
                        {session?.platformName ?? code}
                        <span className="text-xs font-normal text-gray-400 ml-1">({code})</span>
                      </p>
                      <a href={meta.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:underline">
                        {meta.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={14} className="text-green-500" />
                          <span className="text-xs text-green-700 font-semibold">로그인됨</span>
                        </div>
                        {session?.loginId && <span className="text-xs text-gray-400">({session.loginId})</span>}
                        <button
                          onClick={() => handleLogout(code)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-300 px-2.5 py-1 rounded-lg transition"
                        >
                          <LogOut size={11} />
                          로그아웃
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle size={14} className="text-gray-300" />
                        <span className="text-xs text-gray-400">미로그인</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Login form — show if not logged in */}
                {!isValid && (
                  <div className="px-5 py-4 space-y-3 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">아이디</label>
                        <input className={inp} value={form.id}
                          onChange={e => updateForm(code, 'id', e.target.value)}
                          placeholder={`${session?.platformName ?? code} 아이디`}
                          autoComplete="username" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">비밀번호</label>
                        <div className="relative">
                          <input
                            className={inp + ' pr-10'}
                            type={form.showPw ? 'text' : 'password'}
                            value={form.pw}
                            onChange={e => updateForm(code, 'pw', e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin(code)}
                            placeholder="비밀번호"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => updateForm(code, 'showPw', !form.showPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {form.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {form.error && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        <AlertTriangle size={12} />
                        {form.error}
                      </div>
                    )}

                    <button
                      onClick={() => handleLogin(code)}
                      disabled={form.saving}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                    >
                      {form.saving ? (
                        <><RefreshCw size={13} className="animate-spin" /> 로그인 중...</>
                      ) : (
                        <><LogIn size={13} /> {session?.platformName ?? code} 로그인</>
                      )}
                    </button>
                  </div>
                )}

                {/* Logged in: session info */}
                {isValid && session?.loggedInAt && (
                  <div className="px-5 py-3 bg-white border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      로그인 시각: {new Date(session.loggedInAt).toLocaleString('ko-KR')}
                      <span className="ml-2 text-gray-300">· 12시간 후 만료</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Usage guide */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">로그인 후 사용 가능한 기능</p>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-green-500 shrink-0 mt-0.5" />대체상품 URL 입력 시 실제 공급가/재고 자동 크롤링</li>
            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-green-500 shrink-0 mt-0.5" />6시간마다 실행되는 재고 모니터링에서 로그인 필요 가격 정보 수집</li>
            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-green-500 shrink-0 mt-0.5" />가격 변동 감지 정확도 향상 (로그인 전용 공급가 접근)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
