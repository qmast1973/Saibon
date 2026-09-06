import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
      >
        <Download className="w-3.5 h-3.5" />
        앱 설치하기
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition bg-white"
        >
          <Download className="w-3.5 h-3.5" />
          앱 설치하기
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
              <h3 className="text-lg font-bold text-slate-800">iPhone / iPad 앱 설치안내</h3>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed text-left bg-slate-50 p-4 rounded-xl">
                1. 하단 메뉴에서 <strong>공유(Share)</strong> 아이콘을 누릅니다.<br />
                2. 메뉴를 아래로 스크롤하여 <strong>'홈 화면에 추가'</strong>를 선택합니다.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-800 hover:bg-slate-200 transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
