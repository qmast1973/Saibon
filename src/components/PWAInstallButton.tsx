import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

  // 이미 설치된 환경(Standalone)이거나, 브라우저가 PWA를 지원하지 않는 경우 숨김처리할 수도 있지만,
  // 사용자가 명시적으로 기능을 원했으므로 데스크탑 크롬 등에서도 안내를 띄워줍니다.
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowDesktopGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">앱 설치하기</span>
        <span className="sm:hidden">앱 설치</span>
      </button>

      {/* iOS Installation Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <h3 className="text-lg font-bold text-slate-800">iPhone / iPad 앱 설치안내</h3>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed text-left bg-slate-50 p-4 rounded-xl">
              1. 브라우저 하단 메뉴에서 <strong>공유(Share)</strong> 아이콘을 누릅니다.<br />
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

      {/* Desktop/Android PC Installation Guide */}
      {showDesktopGuide && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <h3 className="text-lg font-bold text-slate-800">PC / 모바일 앱 설치 안내</h3>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed text-left bg-slate-50 p-4 rounded-xl">
              <strong>스마트폰 (Android):</strong><br/>
              우측 상단 메뉴(⋮)를 누른 후 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 선택해주세요.
              <br/><br/>
              <strong>PC (Chrome/Edge):</strong><br/>
              브라우저 주소창 우측 끝에 있는 <strong>앱 설치(모니터+화살표) 아이콘</strong>을 클릭해주세요.
            </p>
            <div className="mt-4 text-xs text-rose-500 font-semibold bg-rose-50 p-2 rounded">
              ※ 현재 AI Studio 화면 내에서는 설치가 제한될 수 있습니다. 우측 상단의 '새 탭에서 열기'를 눌러 이동하신 후 시도해주세요.
            </div>
            <button
              onClick={() => setShowDesktopGuide(false)}
              className="mt-6 w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-800 hover:bg-slate-200 transition"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </>
  );
};
