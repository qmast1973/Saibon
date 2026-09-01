import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { saveUserToFirebase, sha256, normalizeMarketName } from '../lib/firebase';
import { UserPen, X, Check, Eye, EyeOff } from 'lucide-react';

interface ProfileModalProps {
  username: string;
  users: User[];
  currentUser: User | null;
  allMarkets: string[];
  availableRegions: string[];
  onClose: () => void;
  onUserSaved: (updatedUser: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  username,
  users,
  currentUser,
  allMarkets,
  availableRegions,
  onClose,
  onUserSaved
}) => {
  const user = users.find(u => u.username === username);
  const isAdmin = currentUser?.role === 'admin';
  const isEditingOther = isAdmin && user?.username !== currentUser?.username;

  const [role, setRole] = useState<UserRole>(user?.role || 'merchant');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [region, setRegion] = useState(user?.assignedRegion || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [approved, setApproved] = useState(user?.approved ?? false);
  const [isBuyerAdmin, setIsBuyerAdmin] = useState(user?.isBuyerAdmin ?? false);
  const [allowedMarkets, setAllowedMarkets] = useState<string[]>((user?.allowedMarkets || []).map(normalizeMarketName));
  const [assignedMerchants, setAssignedMerchants] = useState<string[]>(user?.assignedMerchants || []);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setName(user.name || '');
      setEmail(user.email || '');
      setStoreName(user.storeName || '');
      setAddress(user.address || '');
      setRegion(user.assignedRegion || '');
      setPhone(user.phone || '');
      setApproved(user.approved ?? false);
      setIsBuyerAdmin(user.isBuyerAdmin ?? false);
      setAllowedMarkets((user.allowedMarkets || []).map(normalizeMarketName));
      setAssignedMerchants(user.assignedMerchants || []);
    }
  }, [user]);

  if (!user) return null;

  // Occupied market map for buyer assignments
  const occupiedMarkets = new Map<string, string[]>();
  users.filter(u => u.role === 'buyer' && u.username !== user.username).forEach(u => {
    (u.allowedMarkets || []).map(normalizeMarketName).filter(Boolean).forEach(m => {
      if (!occupiedMarkets.has(m)) occupiedMarkets.set(m, []);
      occupiedMarkets.get(m)!.push(u.name || u.username);
    });
  });

  // Occupied merchant map for local assignments
  const occupiedMerchants = new Map<string, string[]>();
  users.filter(u => u.role === 'local' && u.username !== user.username).forEach(u => {
    (u.assignedMerchants || []).filter(Boolean).forEach(mId => {
      if (!occupiedMerchants.has(mId)) occupiedMerchants.set(mId, []);
      occupiedMerchants.get(mId)!.push(u.name || u.username);
    });
  });

  const merchants = users.filter(u => u.role === 'merchant');

  const toggleMarket = (marketName: string) => {
    if (!isAdmin) return;
    const normalized = normalizeMarketName(marketName);
    if (allowedMarkets.includes(normalized)) {
      setAllowedMarkets(allowedMarkets.filter(m => m !== normalized));
    } else {
      setAllowedMarkets([...allowedMarkets, normalized]);
    }
  };

  const toggleMerchant = (merchantUsername: string) => {
    if (!isAdmin) return;
    if (assignedMerchants.includes(merchantUsername)) {
      setAssignedMerchants(assignedMerchants.filter(u => u !== merchantUsername));
    } else {
      setAssignedMerchants([...assignedMerchants, merchantUsername]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    if (!name.trim()) {
      setMessage({ text: '이름을 입력해주세요.', isError: true });
      setIsSaving(false);
      return;
    }

    if (role === 'merchant' && !storeName.trim()) {
      setMessage({ text: '상호를 입력해주세요.', isError: true });
      setIsSaving(false);
      return;
    }

    if (role === 'local' && !region.trim()) {
      setMessage({ text: '지방 삼촌은 담당 지역을 반드시 선택해주세요.', isError: true });
      setIsSaving(false);
      return;
    }

    try {
      let passwordHash = user.passwordHash;
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          setMessage({ text: '새 비밀번호는 6자 이상이어야 합니다.', isError: true });
          setIsSaving(false);
          return;
        }
        passwordHash = await sha256(newPassword.trim());
      }

      const updatedUser: User = {
        ...user,
        role: isEditingOther ? role : user.role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        storeName: role === 'merchant' ? storeName.trim() : '',
        address: role === 'merchant' ? address.trim() : '',
        assignedRegion: role === 'local' ? region.trim() : '',
        allowedMarkets: role === 'buyer' ? allowedMarkets : [],
        assignedMerchants: role === 'local' ? assignedMerchants : [],
        isBuyerAdmin: role === 'buyer' ? isBuyerAdmin : false,
        phone: phone.trim(),
        approved: isAdmin ? approved : user.approved,
        passwordHash
      };

      await saveUserToFirebase(updatedUser);
      onUserSaved(updatedUser);
      setMessage({ text: '회원정보가 Firebase에 안전하게 저장되었습니다.', isError: false });
      setTimeout(onClose, 600);
    } catch (err: any) {
      console.error('회원정보 저장 오류:', err);
      setMessage({ text: '회원정보를 저장하지 못했습니다.', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="profileModal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[280] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <UserPen className="w-5 h-5 text-indigo-300" />
              {isEditingOther ? '회원정보 열람 및 수정' : '내 회원정보 수정'}
            </h3>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              {isEditingOther ? '관리자 권한으로 회원 정보를 수정합니다.' : '회원가입 정보 및 비밀번호를 수정할 수 있습니다.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">아이디</label>
            <input
              type="text"
              disabled
              value={user.username}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-100 text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">회원 유형</label>
            <select
              disabled={!isEditingOther}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={`w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 outline-none ${!isEditingOther ? 'bg-slate-100 cursor-not-allowed text-slate-600' : 'focus:ring-2 focus:ring-indigo-500'}`}
            >
              <option value="merchant">🏪 상인 (소매점)</option>
              <option value="local">🚚 지방 삼촌</option>
              <option value="buyer">🧑‍💼 서울 사입삼촌</option>
              <option value="admin">🛡️ 관리자</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">이름 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">이메일 (Firebase Auth 연동)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none focus:bg-white"
            />
          </div>

          {role === 'merchant' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">상호명 *</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">가게 주소</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="매장 상세 주소"
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none focus:bg-white"
                />
              </div>
            </>
          )}

          {role === 'local' && (
            <div>
              <label className="block font-semibold text-violet-700 mb-1">담당 지역 *</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full border border-violet-300 rounded-xl p-2.5 bg-violet-50 focus:ring-2 focus:ring-violet-500 outline-none font-semibold text-violet-900"
              >
                <option value="">담당 지역 선택</option>
                {availableRegions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {role === 'buyer' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBuyerAdmin}
                      onChange={(e) => setIsBuyerAdmin(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <div>
                      <span className="block text-sm font-bold text-amber-800">사입삼촌 관리자 권한</span>
                      <span className="block text-[11px] text-amber-600/80 mt-0.5">선택 시 해당 직원은 건물 배정 및 대납금(지출) 입력을 할 수 있습니다.</span>
                    </div>
                  </label>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">담당 건물 지정 (서울 사입삼촌)</label>
                  <span className="text-[10px] text-indigo-600 font-bold">{allowedMarkets.length}개 선택</span>
                </div>
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50 max-h-40 overflow-y-auto space-y-1">
                {allMarkets.map(m => {
                  if (m === '===== 남대문 =====') {
                    return (
                      <div key={m} className="px-2 py-2 my-1 text-center font-bold text-slate-500 bg-slate-200/50 rounded-lg text-[11px]">
                        {m}
                      </div>
                    );
                  }
                  
                  const normalized = normalizeMarketName(m);
                  const isChecked = allowedMarkets.includes(normalized);
                  const otherOwners = occupiedMarkets.get(normalized) || [];
                  const isOccupiedByOther = otherOwners.length > 0 && !isChecked;

                  return (
                    <label
                      key={m}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition ${
                        isOccupiedByOther
                          ? 'bg-slate-100 opacity-60'
                          : isChecked
                          ? 'bg-indigo-100 text-indigo-900 font-bold'
                          : 'hover:bg-slate-200/60 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isAdmin}
                        onChange={() => toggleMarket(m)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded"
                      />
                      <span>{m}</span>
                      {isOccupiedByOther && (
                        <span className="text-[10px] text-slate-400 ml-auto font-normal">
                          {otherOwners.join(', ')} 담당
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              </div>
            </div>
          )}

          {role === 'local' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">담당 상인 거래처 지정</label>
                <span className="text-[10px] text-emerald-600 font-bold">{assignedMerchants.length}곳 선택</span>
              </div>
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50 max-h-40 overflow-y-auto space-y-1">
                {merchants.length > 0 ? (
                  merchants.map(m => {
                    const isChecked = assignedMerchants.includes(m.username);
                    const otherOwners = occupiedMerchants.get(m.username) || [];
                    const isOccupiedByOther = otherOwners.length > 0 && !isChecked;

                    return (
                    <label
                      key={m.username}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition ${
                        isOccupiedByOther
                          ? 'bg-slate-100 opacity-60'
                          : isChecked
                          ? 'bg-emerald-100 text-emerald-900 font-bold'
                          : 'hover:bg-slate-200/60 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isAdmin || isOccupiedByOther}
                        onChange={() => toggleMerchant(m.username)}
                        className="w-3.5 h-3.5 text-emerald-600 rounded"
                      />
                      <span>{m.storeName || m.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({m.username})</span>
                      {isOccupiedByOther && (
                        <span className="text-[10px] text-slate-400 ml-auto font-normal">
                          {otherOwners.join(', ')} 담당
                        </span>
                      )}
                    </label>
                  )})
                ) : (
                  <div className="text-center py-4 text-slate-400 text-[11px]">등록된 상인이 없습니다.</div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none focus:bg-white"
            />
          </div>

          {isAdmin && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">승인 상태</label>
              <select
                value={approved ? 'true' : 'false'}
                onChange={(e) => setApproved(e.target.value === 'true')}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 font-bold text-slate-800"
              >
                <option value="true">✅ 승인됨 (로그인 가능)</option>
                <option value="false">⏳ 승인대기 (로그인 불가)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              새 비밀번호 <span className="font-normal text-slate-400">(변경할 때만 입력)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                autoComplete="new-password"
                placeholder="변경하지 않으면 비워두세요 (6자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ''))}
                className="w-full border border-slate-300 rounded-xl p-2.5 pr-10 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {message && (
            <p
              className={`text-xs text-center min-h-4 ${
                message.isError ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-md disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
