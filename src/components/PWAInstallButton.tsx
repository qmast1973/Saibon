import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

  // 안드로이드 일부 브라우저나 인앱 브라우저에서 isInstalled가 오작동하여
  // 버튼이 아예 안보이는 현상을 방지하기 위해, 버튼을 항상 띄웁니다.
  // if (isInstalled) {
  //   return null;
  // }

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
              아이폰은 자체 브라우저 정책상 아래 방법으로만 설치 가능합니다.<br/><br/>
              1. 현재 화면이 <strong>Safari 브라우저</strong>인지 확인해주세요. (카카오톡 등인 경우 Safari로 다시 열어주세요.)<br />
              2. 하단 메뉴에서 <strong>공유(Share)</strong> 아이콘을 누릅니다.<br />
              3. 메뉴를 아래로 스크롤하여 <strong>'홈 화면에 추가'</strong>를 선택합니다.
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
            <h3 className="text-lg font-bold text-slate-800">모바일 / PC 앱 설치 안내</h3>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed text-left bg-slate-50 p-4 rounded-xl">
              <strong className="text-indigo-600">스마트폰 (Android):</strong><br/>
              우측 상단 메뉴(⋮)를 누른 후 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 선택해주세요.<br/>
              <span className="text-rose-500 font-semibold text-xs">※ 카카오톡 등 인앱 브라우저에서는 설치가 불가능합니다. '다른 브라우저로 열기(Chrome)'를 선택하신 후 진행해주세요.</span>
              <br/><br/>
              <strong className="text-indigo-600">PC (Chrome/Edge):</strong><br/>
              브라우저 주소창 우측 끝에 있는 <strong>앱 설치(모니터+화살표) 아이콘</strong>을 클릭해주세요.
            </p>
            <div className="mt-4 text-xs text-rose-500 font-semibold bg-rose-50 p-2 rounded">
              ※ 만약 버튼을 눌러도 반응이 없다면 이미 앱이 설치되어 있을 수 있습니다. 배경화면을 확인해주세요!
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
