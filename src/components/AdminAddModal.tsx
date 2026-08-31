import React, { useState } from 'react';
import { User } from '../types';
import { sha256, saveUserToFirebase } from '../lib/firebase';
import { ShieldAlert, ShieldCheck, X, Check, Eye, EyeOff } from 'lucide-react';

interface AdminAddModalProps {
  users: User[];
  currentUser: User | null;
  onClose: () => void;
  onAdminCreated: (newAdmin: User) => void;
}

export const AdminAddModal: React.FC<AdminAddModalProps> = ({
  users,
  currentUser,
  onClose,
  onAdminCreated
}) => {
  const existingAdmins = users.filter(u => u.role === 'admin');
  const hasExistingAdmin = existingAdmins.length > 0;

  // Existing admin auth state (if not already logged in as admin)
  const [authId, setAuthId] = useState('');
  const [authPw, setAuthPw] = useState('');

  // New admin state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newId, setNewId] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  // Password visibility states
  const [showAuthPw, setShowAuthPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showNewPw2, setShowNewPw2] = useState(false);

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const targetAuthId = authId.trim().toLowerCase();
    const username = newId.trim().toLowerCase();
    const email = newEmail.trim().toLowerCase() || `${username}@saipon.app`;
    const name = newName.trim();
    const phone = newPhone.trim();

    if (!name || !username || !newPw || !newPw2) {
      setMessage({ text: '필수 항목을 모두 입력해주세요.', isError: true });
      setIsSubmitting(false);
      return;
    }

    if (!/^[a-z0-9._-]{4,}$/i.test(username)) {
      setMessage({ text: '새 관리자 아이디는 영문/숫자 4자 이상으로 입력해주세요.', isError: true });
      setIsSubmitting(false);
      return;
    }

    if (newPw.length < 6) {
      setMessage({ text: '새 관리자 비밀번호는 6자 이상이어야 합니다.', isError: true });
      setIsSubmitting(false);
      return;
    }

    if (newPw !== newPw2) {
      setMessage({ text: '새 관리자 비밀번호가 일치하지 않습니다.', isError: true });
      setIsSubmitting(false);
      return;
    }

    try {
      // Check existing admin authentication if not currently logged in as admin
      const isAlreadyLoggedInAdmin = currentUser && currentUser.role === 'admin';
      if (hasExistingAdmin && !isAlreadyLoggedInAdmin) {
        if (!targetAuthId || !authPw) {
          setMessage({ text: '기존 관리자 아이디와 비밀번호를 입력해주세요.', isError: true });
          setIsSubmitting(false);
          return;
        }

        const admin = existingAdmins.find(
          u => String(u.username || '').toLowerCase() === targetAuthId
        );

        if (!admin) {
          setMessage({ text: '기존 관리자 아이디를 찾을 수 없습니다.', isError: true });
          setIsSubmitting(false);
          return;
        }

        const inputHash = await sha256(authPw);
        if (admin.passwordHash !== inputHash) {
          setMessage({ text: '기존 관리자 비밀번호가 일치하지 않습니다.', isError: true });
          setIsSubmitting(false);
          return;
        }
      }

      if (users.some(u => String(u.username || '').toLowerCase() === username)) {
        setMessage({ text: '이미 사용 중인 아이디입니다.', isError: true });
        setIsSubmitting(false);
        return;
      }

      const passwordHash = await sha256(newPw);
      const newAdminUser: User = {
        username,
        email,
        name,
        phone,
        passwordHash,
        role: 'admin',
        approved: true, // Admins are approved
        storeName: '',
        address: '',
        allowedMarkets: [],
        assignedMerchants: [],
        createdAt: new Date().toISOString(),
        createdBy: isAlreadyLoggedInAdmin ? currentUser.username : (targetAuthId || 'initial_setup')
      };

      await saveUserToFirebase(newAdminUser);
      onAdminCreated(newAdminUser);

      setMessage({ text: '관리자 계정이 Firebase에 안전하게 생성되었습니다.', isError: false });
      setTimeout(onClose, 800);
    } catch (err: any) {
      console.error('관리자 추가 실패:', err);
      setMessage({ text: '관리자 계정을 저장하지 못했습니다. 네트워크를 확인해주세요.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyLoggedInAdmin = currentUser && currentUser.role === 'admin';

  return (
    <div id="loginAdminAddModal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 border border-slate-200 my-auto">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-800">관리자 추가</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!hasExistingAdmin ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-3 text-xs text-emerald-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b>최초 관리자 생성 모드</b>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                아직 등록된 관리자 계정이 없습니다. 최초 관리자 계정을 생성해 시스템을 시작하세요.
              </div>
            </div>
          </div>
        ) : !isAlreadyLoggedInAdmin ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3 text-xs text-amber-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b>기존 관리자 인증 필요</b>
              <div className="text-[11px] text-amber-700 mt-0.5">
                새 관리자를 추가하려면 기존 관리자 계정의 아이디와 비밀번호를 인증해야 합니다.
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          {hasExistingAdmin && !isAlreadyLoggedInAdmin && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700">기존 관리자 인증</div>
              <input
                type="text"
                required
                autoComplete="username"
                value={authId}
                onChange={(e) => setAuthId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="기존 관리자 아이디"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="relative">
                <input
                  type={showAuthPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={authPw}
                  onChange={(e) => setAuthPw(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ''))}
                  placeholder="기존 관리자 비밀번호"
                  className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPw(!showAuthPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showAuthPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-700">새 관리자 정보</div>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 관리자 이름 (예: 박승진)"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="이메일 주소 (선택: admin@example.com)"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="전화번호 (예: 010-0000-0000)"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <input
              type="text"
              required
              minLength={4}
              autoComplete="new-username"
              value={newId}
              onChange={(e) => setNewId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              placeholder="새 관리자 아이디 (영문/숫자 4자 이상)"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ''))}
                placeholder="새 관리자 비밀번호 (6자 이상)"
                className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="relative">
              <input
                type={showNewPw2 ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={newPw2}
                onChange={(e) => setNewPw2(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ''))}
                placeholder="새 관리자 비밀번호 확인"
                className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPw2(!showNewPw2)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showNewPw2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {message && (
            <p
              id="loginAdminAddMessage"
              className={`text-xs text-center min-h-4 ${
                message.isError ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 rounded-xl py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? '생성 중...' : '관리자 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
