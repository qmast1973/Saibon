import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  firebaseSignIn,
  firebaseSignUp,
  firebaseSendPasswordReset
} from '../lib/firebase';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  MapPin,
  Truck,
  Check,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowLeft,
  KeyRound,
  Send,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface AuthScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  onOpenAdminAdd: () => void;
  availableRegions: string[];
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  users,
  onLoginSuccess,
  onOpenAdminAdd,
  availableRegions
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('merchant');
  const [regStoreName, setRegStoreName] = useState('');
  const [regName, setRegName] = useState('');
  const [regRegion, setRegRegion] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regMessage, setRegMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Reset password form state
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage({ text: '로그인 인증 확인 중...', isError: false });
    setIsLoggingIn(true);

    try {
      const identifier = loginIdentifier.trim();
      if (!identifier || !loginPassword) {
        setLoginMessage({ text: '아이디와 비밀번호를 입력해주세요.', isError: true });
        setIsLoggingIn(false);
        return;
      }

      const { user } = await firebaseSignIn(identifier, loginPassword, users);

      // Check approval status (admins are always approved)
      if (user.role !== 'admin' && user.approved === false) {
        setLoginMessage({
          text: '가입 승인 대기 중인 계정입니다. 관리자의 승인 후 이용하실 수 있습니다.',
          isError: true
        });
        setIsLoggingIn(false);
        return;
      }

      setLoginMessage({ text: '로그인 성공!', isError: false });
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('로그인 오류:', err);
      let errorMsg = '아이디 또는 비밀번호가 올바르지 않습니다.';
      const code = err?.code || '';
      const rawMsg = err?.message || '';

      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || rawMsg.includes('auth/invalid-credential') || rawMsg.includes('auth/user-not-found')) {
        errorMsg = '아이디 또는 비밀번호가 올바르지 않습니다.';
      } else if (code === 'auth/too-many-requests' || rawMsg.includes('auth/too-many-requests')) {
        errorMsg = '연속된 로그인 실패로 일시 차단되었습니다. 잠시 후 다시 시도하거나 비밀번호를 재설정하세요.';
      } else if (code === 'auth/invalid-email' || rawMsg.includes('auth/invalid-email')) {
        errorMsg = '아이디 형식이 올바르지 않습니다.';
      } else if (code === 'auth/operation-not-allowed' || rawMsg.includes('auth/operation-not-allowed')) {
        errorMsg = '아이디 또는 비밀번호가 올바르지 않습니다.';
      } else if (rawMsg && !rawMsg.includes('Firebase: Error')) {
        errorMsg = rawMsg;
      }
      setLoginMessage({ text: errorMsg, isError: true });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage(null);
    setIsRegistering(true);

    const email = regEmail.trim().toLowerCase();
    const username = regUsername.trim().toLowerCase() || email.split('@')[0];
    const name = regName.trim();
    const phone = regPhone.trim();
    const storeName = regRole === 'merchant' ? regStoreName.trim() : '';
    const address = regRole === 'merchant' ? regAddress.trim() : '';
    const assignedRegion = regRole === 'local' ? regRegion.trim() : '';

    if (!email || !email.includes('@')) {
      setRegMessage({ text: '유효한 이메일 주소를 입력해주세요.', isError: true });
      setIsRegistering(false);
      return;
    }
    if (!name) {
      setRegMessage({ text: '이름을 입력해주세요.', isError: true });
      setIsRegistering(false);
      return;
    }
    if (regRole === 'merchant' && !storeName) {
      setRegMessage({ text: '상호를 입력해주세요.', isError: true });
      setIsRegistering(false);
      return;
    }
    if (regRole === 'merchant' && !address) {
      setRegMessage({ text: '가게 주소를 반드시 입력해주세요.', isError: true });
      setIsRegistering(false);
      return;
    }
    if (regRole === 'local' && !assignedRegion) {
      setRegMessage({ text: '지방 삼촌은 담당 지역을 반드시 선택해주세요.', isError: true });
      setIsRegistering(false);
      return;
    }
    if (regPassword.length < 6) {
      setRegMessage({ text: '비밀번호는 6자 이상이어야 합니다.', isError: true });
      setIsRegistering(false);
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setRegMessage({ text: '비밀번호가 일치하지 않습니다.', isError: true });
      setIsRegistering(false);
      return;
    }
    if (!phone) {
      setRegMessage({ text: '연락받을 전화번호를 입력해주세요.', isError: true });
      setIsRegistering(false);
      return;
    }

    if (users.some(u => String(u.username || '').toLowerCase() === username)) {
      setRegMessage({ text: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.', isError: true });
      setIsRegistering(false);
      return;
    }

    try {
      await firebaseSignUp({
        email,
        password: regPassword,
        username,
        name,
        phone,
        role: regRole,
        storeName,
        address,
        assignedRegion
      });

      setRegMessage({
        text: '회원가입이 완료되었습니다! 관리자 승인 후 로그인하실 수 있습니다.',
        isError: false
      });

      // Reset form and switch to login with pre-filled email
      setRegStoreName('');
      setRegName('');
      setRegAddress('');
      setRegUsername('');
      setRegPassword('');
      setRegPasswordConfirm('');
      setRegPhone('');
      setLoginIdentifier(email);
      setLoginPassword('');
      setMode('login');
      setLoginMessage({
        text: '회원가입이 완료되었습니다. 관리자 승인 후 로그인해주세요.',
        isError: false
      });
    } catch (err: any) {
      console.error('Firebase 회원가입 오류:', err);
      let errMsg = err?.message || '회원가입 처리에 실패했습니다.';
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        errMsg = '이미 가입된 이메일 주소입니다. 로그인을 시도하거나 비밀번호를 재설정하세요.';
      } else if (code === 'auth/weak-password') {
        errMsg = '비밀번호 보안 강도가 약합니다. 영문/숫자를 조합해 6자 이상 입력해주세요.';
      } else if (code === 'auth/invalid-email') {
        errMsg = '올바르지 않은 이메일 형식입니다. 정확한 이메일을 입력해주세요.';
      } else if (code === 'auth/network-request-failed') {
        errMsg = '네트워크 연결이 불안정합니다. 인터넷 연결을 확인해주세요.';
      }
      setRegMessage({ text: errMsg, isError: true });
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    setResetSentSuccess(false);
    setIsSendingReset(true);

    const email = resetEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setResetMessage({ text: '가입 시 사용한 이메일 주소를 입력해주세요.', isError: true });
      setIsSendingReset(false);
      return;
    }

    try {
      await firebaseSendPasswordReset(email);
      setResetSentSuccess(true);
      setResetMessage({
        text: `${email} 주소로 비밀번호 재설정 이메일이 발송되었습니다. 수신함(또는 스팸함)의 링크를 확인해주세요.`,
        isError: false
      });
    } catch (err: any) {
      console.error('비밀번호 재설정 오류:', err);
      let errMsg = '비밀번호 재설정 이메일을 발송하지 못했습니다.';
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        errMsg = '해당 이메일로 등록된 계정을 찾을 수 없습니다.';
      } else if (code === 'auth/invalid-email') {
        errMsg = '유효하지 않은 이메일 주소입니다.';
      } else if (code === 'auth/too-many-requests') {
        errMsg = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      }
      setResetMessage({ text: errMsg, isError: true });
    } finally {
      setIsSendingReset(false);
    }
  };

  const isPasswordMatch = regPassword.length >= 6 && regPassword === regPasswordConfirm;

  return (
    <div id="authScreen" className="fixed inset-0 w-screen h-screen min-h-0 bg-slate-100 z-[200] flex items-start sm:items-center justify-center overflow-y-auto p-2 sm:p-4">
      <div className="w-full max-w-md my-auto flex flex-col">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
          
          {/* Header */}
          <div className="bg-indigo-900 text-white px-4 py-5 sm:px-6 shrink-0 text-center relative overflow-hidden flex flex-col items-center">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/ildang-505711.firebasestorage.app/o/%EC%82%AC%EC%9E%85ON.png?alt=media&token=9aec0177-3023-4390-b1cb-b7d44a42aa97" 
              alt="사입ON 로고" 
              className="w-auto h-40 sm:h-56 object-contain"
              onError={(e) => {
                // 이미지가 없을 경우를 대비한 폴백 처리
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-700/80 text-indigo-200 mb-2 shadow-inner mx-auto">
                <Store className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">사입ON</h1>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="p-4 sm:p-6 overflow-y-auto">
            {mode !== 'reset' ? (
              <div className="flex bg-slate-100 rounded-xl p-1 mb-5 border border-slate-200">
                <button
                  type="button"
                  id="authLoginTab"
                  onClick={() => { setMode('login'); setLoginMessage(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    mode === 'login'
                      ? 'bg-white shadow-sm text-indigo-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  로그인
                </button>
                <button
                  type="button"
                  id="authRegisterTab"
                  onClick={() => { setMode('register'); setRegMessage(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    mode === 'register'
                      ? 'bg-white shadow-sm text-indigo-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  회원가입
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setResetMessage(null); }}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  로그인으로 돌아가기
                </button>
                <span className="text-xs font-bold text-slate-700">비밀번호 찾기</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form id="loginForm" onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">아이디</label>
                  <div className="relative">
                    <input
                      id="loginUsername"
                      type="text"
                      required
                      autoComplete="username email"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      placeholder="아이디를 입력하세요"
                      className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">비밀번호</label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(loginIdentifier.includes('@') ? loginIdentifier : '');
                        setMode('reset');
                        setResetMessage(null);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                    >
                      비밀번호 재설정
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="loginPassword"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ''))}
                      placeholder="비밀번호를 입력하세요"
                      className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label="비밀번호 보기"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      로그인 중...
                    </>
                  ) : (
                    '로그인'
                  )}
                </button>



                {loginMessage && (
                  <div
                    id="loginMessage"
                    className={`p-3 rounded-xl text-xs text-center border ${
                      loginMessage.isError
                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                    }`}
                  >
                    {loginMessage.text}
                  </div>
                )}

                <p className="text-[10px] text-center text-slate-400 mt-1">
                  회원가입 후 관리자 승인이 완료된 계정으로 로그인해주세요.
                </p>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form id="registerForm" onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">이메일 *</label>
                  <div className="relative">
                    <input
                      id="regEmail"
                      type="email"
                      required
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full border border-slate-300 rounded-xl p-2.5 pr-9 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    로그인 및 비밀번호 재설정 메일 수신용으로 사용됩니다.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">회원 유형 *</label>
                  <select
                    id="regRole"
                    required
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                  >
                    <option value="merchant">🏪 상인 (소매점)</option>
                    <option value="local">🚚 지방 삼촌 (지역 배송/수금)</option>
                    <option value="buyer">🧑‍💼 서울 사입삼촌 (시장 사입)</option>
                  </select>
                </div>

                {regRole === 'merchant' && (
                  <div id="regStoreNameWrap">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">상호명 *</label>
                    <input
                      id="regStoreName"
                      type="text"
                      required
                      value={regStoreName}
                      onChange={(e) => setRegStoreName(e.target.value)}
                      placeholder="예: 초록밀크, 리썸"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">이름 / 대표자명 *</label>
                  <input
                    id="regName"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {regRole === 'local' && (
                  <div id="regRegionWrap">
                    <label className="block text-xs font-semibold text-violet-700 mb-1">담당 지역 *</label>
                    <select
                      id="regRegion"
                      required
                      value={regRegion}
                      onChange={(e) => setRegRegion(e.target.value)}
                      className="w-full border border-violet-300 rounded-xl p-2.5 text-xs bg-violet-50 outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">담당 지역을 선택하세요</option>
                      {availableRegions.length > 0 ? (
                        availableRegions.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))
                      ) : (
                        <option value="합성동">합성동</option>
                      )}
                    </select>
                  </div>
                )}

                {regRole === 'merchant' && (
                  <div id="regAddressWrap">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">가게 주소 *</label>
                    <input
                      id="regAddress"
                      type="text"
                      required
                      autoComplete="street-address"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="배달받을 매장의 상세 주소를 입력하세요"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">사용자 아이디 (영문/숫자)</label>
                  <input
                    id="regUsername"
                    type="text"
                    autoComplete="username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="미입력 시 이메일 아이디 사용"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">비밀번호 *</label>
                  <div className="relative">
                    <input
                      id="regPassword"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ''))}
                      placeholder="6자 이상"
                      className="w-full border border-slate-300 rounded-xl p-2.5 pr-10 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">비밀번호 확인 *</label>
                  <div className="relative">
                    <input
                      id="regPasswordConfirm"
                      type={showRegPasswordConfirm ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ''))}
                      placeholder="비밀번호를 다시 한 번 입력하세요"
                      className="w-full border border-slate-300 rounded-xl p-2.5 pr-10 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPasswordConfirm(!showRegPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showRegPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {regPasswordConfirm && (
                    <p className={`text-[10px] mt-1 ${isPasswordMatch ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'text-rose-600 font-semibold'}`}>
                      {isPasswordMatch ? <><Check className="w-3 h-3" /> 비밀번호가 일치합니다.</> : '비밀번호가 일치하지 않습니다.'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">전화번호 *</label>
                  <input
                    id="regPhone"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
                >
                  {isRegistering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      회원가입 처리 중...
                    </>
                  ) : (
                    '회원가입 신청'
                  )}
                </button>

                {regMessage && (
                  <div
                    id="registerMessage"
                    className={`p-3 rounded-xl text-xs text-center border ${
                      regMessage.isError
                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                    }`}
                  >
                    {regMessage.text}
                  </div>
                )}
              </form>
            )}

            {/* Password Reset Form */}
            {mode === 'reset' && (
              <form id="resetPasswordForm" onSubmit={handlePasswordReset} className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
                  <KeyRound className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">비밀번호 재설정 안내</p>
                    <p className="text-[11px] text-indigo-700 mt-1 leading-relaxed">
                      가입 시 등록한 이메일 주소를 입력하시면 안전한 비밀번호 재설정 링크를 보내드립니다.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    가입된 이메일 주소 *
                  </label>
                  <div className="relative">
                    <input
                      id="resetEmailInput"
                      type="email"
                      required
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSendingReset ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      재설정 메일 발송 중...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      비밀번호 재설정 메일 발송
                    </>
                  )}
                </button>

                {resetMessage && (
                  <div
                    className={`p-3.5 rounded-xl text-xs border leading-relaxed ${
                      resetMessage.isError
                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {resetMessage.text}
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setLoginIdentifier(resetEmail); }}
                    className="text-xs text-slate-500 hover:text-indigo-600 font-semibold underline"
                  >
                    로그인 화면으로 이동
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
