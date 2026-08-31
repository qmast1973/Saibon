import React, { useState } from 'react';
import { X, Bell, Edit3, Save, MessageSquare } from 'lucide-react';
import { User } from '../types';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: string;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, announcement }) => {
  if (!isOpen || !announcement.trim()) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 bg-indigo-600">
          <div className="flex items-center gap-2 text-white">
            <Bell className="w-5 h-5" />
            <h3 className="text-lg font-bold">공지사항</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
            {announcement}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-sm"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};

interface AnnouncementBannerProps {
  announcement: string;
  currentUser: User | null;
  onSave: (text: string) => Promise<void>;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcement, currentUser, onSave }) => {
  const [editText, setEditText] = useState(announcement);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // React to external announcement changes if admin hasn't typed anything new yet
  React.useEffect(() => {
    setEditText(announcement);
  }, [announcement]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editText);
      alert('공지사항이 성공적으로 저장되었습니다.');
    } catch (e) {
      alert('저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  if (!announcement.trim() && !isAdmin) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-indigo-800 font-bold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          사입ON 업데이트 / 공지사항
        </h3>
      </div>

      {announcement.trim() ? (
        <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed bg-white/50 p-3 rounded-xl border border-indigo-100/50 mb-3">
          {announcement}
        </div>
      ) : (
        <div className="text-sm text-indigo-400 italic py-2 mb-3">
          현재 등록된 공지사항이 없습니다.
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-indigo-100/50">
          <label className="block text-xs font-bold text-indigo-700 mb-1">
            공지사항 작성란 (관리자 전용)
          </label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full border border-indigo-200 rounded-xl p-3 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[80px]"
            placeholder="공지사항 내용을 입력하세요..."
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '공지사항 저장/수정'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
