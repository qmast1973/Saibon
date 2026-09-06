import React from 'react';
import { User, UserRole } from '../types';
import { saveUserToFirebase, deleteUserFromFirebase, sha256, firebaseSendPasswordReset } from '../lib/firebase';
import { deleteLocalUser } from '../lib/storage';
import { Shield, UserCheck, Store, Truck, PersonStanding, UserPlus, RefreshCw, X, KeyRound, Trash2, Edit3, Mail } from 'lucide-react';

interface AdminUserManagementModalProps {
  users: User[];
  currentUser: User | null;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
  onOpenAdminAdd: () => void;
  onUserDeleted?: (username: string) => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  users,
  currentUser,
  onClose,
  onOpenProfile,
  onOpenAdminAdd,
  onUserDeleted
}) => {
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);
  const [alertMsg, setAlertMsg] = React.useState<string | null>(null);
  const handleToggleBuyerAdmin = async (user: User) => {
    if (currentUser?.role !== 'admin') {
      alert('최고 관리자만 서브관리자 권한을 부여할 수 있습니다.');
      return;
    }
    try {
      const updated: User = { ...user, isBuyerAdmin: !user.isBuyerAdmin };
      await saveUserToFirebase(updated);
    } catch (err) {
      console.error(err);
      alert('권한 변경에 실패했습니다.');
    }
  };

  const handleToggleApproval = async (user: User) => {
    try {
      const updated: User = {
        ...user,
        approved: !user.approved
      };
      await saveUserToFirebase(updated);
    } catch (err) {
      console.error('승인 상태 변경 오류:', err);
      setAlertMsg('승인 상태를 변경하지 못했습니다.');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (user.role === 'admin' && user.username !== currentUser?.username) {
      // Custom UI confirm bypassed here to avoid complexity. Allow admin reset if needed.
    }

    if (user.email && user.email.includes('@')) {
      const useEmailReset = false;
      if (useEmailReset) {
        try {
          await firebaseSendPasswordReset(user.email);
          setAlertMsg(`비밀번호 재설정 이메일이 ${user.email} 주소로 발송되었습니다.`);
          return;
        } catch (e: any) {
          console.error('Firebase 메일 발송 실패:', e);
          setAlertMsg(`메일 발송 실패. 임시 비밀번호 생성을 진행합니다.`);
        }
      }
    }

    const tempPassword = 'PW' + Math.random().toString(36).slice(2, 8).toUpperCase() + '1';
    

    try {
      const passwordHash = await sha256(tempPassword);
      const updated: User = {
        ...user,
        passwordHash
      };
      await saveUserToFirebase(updated);
      setAlertMsg(`초기화 완료! 아이디: ${user.username}, 임시 PW: ${tempPassword}`);
    } catch (err) {
      console.error('비밀번호 초기화 실패:', err);
      setAlertMsg('비밀번호 초기화 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        setAlertMsg('마지막 관리자 계정은 삭제할 수 없습니다.');
        return;
      }
    }
    setUserToDelete(user);
  };
  
  const confirmDelete = async () => {
    if (currentUser?.role !== 'admin') {
      alert('최고 관리자만 회원을 삭제할 수 있습니다.');
      return;
    }
    if (!userToDelete) return;
    const user = userToDelete;
    setUserToDelete(null);

    // 화면에서 즉시 먼저 지우기 (빠른 반응성을 위해)
    if (onUserDeleted) {
      onUserDeleted(user.username);
    }
    try {
      // 서버와 로컬 스토리지는 백그라운드에서 삭제 처리
      deleteLocalUser(user.username).catch(e => console.error(e));
      deleteUserFromFirebase(user.username).catch(e => console.error(e));
    } catch (err) {
      console.error('회원 삭제 오류:', err);
      setAlertMsg('회원 삭제 중 오류가 발생했습니다.');
    }
  };

  const roleCategories: { role: UserRole; title: string; icon: any; color: string; bg: string }[] = [
    { role: 'local', title: '지방 삼촌', icon: Truck, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
    { role: 'buyer', title: '서울 사입삼촌', icon: PersonStanding, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    { role: 'merchant', title: '상인 (소매점)', icon: Store, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { role: 'admin', title: '관리자', icon: Shield, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' }
  ];
  const visibleCategories = currentUser?.role === 'buyer' 
    ? roleCategories.filter(cat => cat.role === 'buyer')
    : roleCategories;

  const visibleUsers = currentUser?.role === 'buyer'
    ? users.filter(u => u.role === 'buyer')
    : users;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Custom Alert/Confirm */}
        {alertMsg && (
          <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center justify-between">
            <span className="text-sm font-bold">{alertMsg}</span>
            <button onClick={() => setAlertMsg(null)} className="p-1 hover:bg-rose-100 rounded-md"><X className="w-4 h-4" /></button>
          </div>
        )}
        {userToDelete && (
          <div className="mx-4 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex flex-col gap-3">
            <div className="text-sm text-rose-800 font-bold">
              {userToDelete.name || userToDelete.username} ({userToDelete.role}) 계정을 정말 삭제하시겠습니까?
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setUserToDelete(null)} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded-md hover:bg-rose-50">
                취소
              </button>
              <button onClick={confirmDelete} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-md hover:bg-rose-700">
                삭제하기
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-300" />
              회원 관리 (Firebase 실시간 연동)
            </h3>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              전체 가입 회원의 승인 여부, 담당 지역/건물 권한, 비밀번호 초기화 및 정보를 관리합니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="text-xs text-slate-600 font-semibold">
            총 등록 회원: <span className="text-indigo-600 font-bold">{visibleUsers.length}명</span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenAdminAdd}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              관리자 추가
            </button>
            )}
          </div>
        </div>

        {/* User list by role category */}
        <div className="p-4 overflow-y-auto space-y-4">
          {visibleCategories.map(cat => {
            const groupUsers = visibleUsers.filter(u => u.role === cat.role);
            if (groupUsers.length === 0) return null;

            const Icon = cat.icon;

            return (
              <div key={cat.role} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className={`px-4 py-2.5 flex items-center justify-between font-bold text-xs ${cat.bg} border-b`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                    <span className={cat.color}>{cat.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">{groupUsers.length}명</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {groupUsers.map(user => (
                    <div key={user.username} className="p-3 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{user.name || '-'}</span>
                          {user.storeName && (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                              {user.storeName}
                            </span>
                          )}
                          <span className="text-slate-400 font-mono text-[11px]">({user.username})</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.approved
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700 animate-pulse'
                            }`}
                          >
                            {user.approved ? '승인됨' : '승인대기'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {user.email && (
                            <span className="text-slate-600 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {user.email}
                            </span>
                          )}
                          <span>전화: {user.phone || '미등록'}</span>
                          {user.businessNumber && <span>사업자: {user.businessNumber}</span>}
                          {user.address && <span>주소: {user.address}</span>}
                          {user.assignedRegion && <span className="text-violet-700 font-semibold">담당지역: {user.assignedRegion}</span>}
                          {user.allowedMarkets && user.allowedMarkets.length > 0 && (
                            <span className="text-indigo-700 font-medium">
                              담당건물: {user.allowedMarkets.join(', ')}
                            </span>
                          )}
                          {user.assignedMerchants && user.assignedMerchants.length > 0 && (
                            <span className="text-emerald-700 font-medium">
                              담당거래처: {user.assignedMerchants.length}곳
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenProfile(user.username)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition flex items-center gap-1 border border-indigo-200"
                        >
                          <Edit3 className="w-3 h-3" />
                          수정
                        </button>

                        {user.role === 'buyer' && currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleBuyerAdmin(user)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              user.isBuyerAdmin
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {user.isBuyerAdmin ? '서브관리자 해제' : '서브관리자 부여'}
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleApproval(user)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              user.approved
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            }`}
                          >
                            <UserCheck className="w-3 h-3" />
                            {user.approved ? '승인취소' : '승인하기'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleResetPassword(user)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition flex items-center gap-1 border border-amber-200"
                          title="비밀번호 초기화"
                        >
                          <KeyRound className="w-3 h-3" />
                          PW초기화
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold transition flex items-center gap-1 border border-rose-200"
                          title="회원 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
