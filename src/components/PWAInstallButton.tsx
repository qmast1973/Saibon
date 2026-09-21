import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle2, AlertCircle, Share, ExternalLink } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'success' | 'dismissed'>('idle');

  // iframe(미리보기) 환경 감지
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleInstallClick = async () => {
    // 1. 브라우저 네이티브 설치 프롬프트가 지원되는 경우 즉시 설치 창 띄우기
    if (isInstallable) {
      try {
        const success = await install();
        if (success) {
          setInstallStatus('success');
          setTimeout(() => setInstallStatus('idle'), 4000);
          return;
        } else {
          setInstallStatus('dismissed');
          setTimeout(() => setInstallStatus('idle'), 3000);
          return;
        }
      } catch (err) {
        console.warn('Install prompt failed:', err);
      }
    }

    // 2. iOS 기기인 경우 Safari 홈 화면 추가 안내
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // 3. 네이티브 프롬프트가 아직 안 떴거나 iframe 등인 경우 가이드 팝업
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition cursor-pointer"
        title="스마트폰/PC에 바로가기 앱 설치"
      >
        {installStatus === 'success' ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>설치 완료!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">앱 설치</span>
            <span className="sm:hidden">앱 설치</span>
          </>
        )}
      </button>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Share className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-gray-100">iPhone / iPad 앱 설치</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg cursor-pointer ml-auto"
              >
                [닫기]
              </button>
            </div>

            <div className="mt-4 text-xs sm:text-sm text-gray-300 leading-relaxed bg-gray-800/80 p-3.5 rounded-xl border border-gray-700/60 space-y-2">
              <p className="font-semibold text-indigo-300">
                아이폰(iOS)은 브라우저 정책상 아래 순서로 홈 화면에 추가됩니다:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-gray-200">
                <li>
                  현재 화면이 <strong>Safari(사파리)</strong> 브라우저인지 확인합니다.
                  <span className="block text-[11px] text-amber-400 mt-0.5">
                    (카카오톡 등인 경우 우측 하단 ⋮ 누르고 'Safari로 열기')
                  </span>
                </li>
                <li>
                  화면 하단 중앙의 <strong>공유 아이콘 (네모 위로 화살표)</strong>을 누릅니다.
                </li>
                <li>
                  메뉴를 아래로 내려 <strong>'홈 화면에 추가'</strong>를 누르면 바탕화면에 바로가기 앱이 생성됩니다.
                </li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}

      {/* General Guide Modal (Android / PC / In-App Browser) */}
      {showGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-gray-100">홈 화면 앱 설치 안내</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg cursor-pointer ml-auto"
              >
                [닫기]
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm text-gray-300">
              {isInIframe && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>미리보기(개발) 화면 안내:</strong><br />
                    보안 정책상 미리보기 창 내부에서는 자동 설치 창이 차단됩니다. 실제 주소로 브라우저(Chrome)를 직접 띄우시면 자동 설치 팝업이 작동합니다.
                  </div>
                </div>
              )}

              <div className="bg-gray-800/80 p-3.5 rounded-xl border border-gray-700/60 space-y-2 text-xs">
                <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                  📱 안드로이드 스마트폰 (Galaxy 등)
                </p>
                <p className="text-gray-300 leading-relaxed">
                  1. 브라우저 우측 상단 <strong>메뉴 (점 3개 ⋮)</strong>를 터치합니다.<br />
                  2. <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 누르면 스마트폰 앱 목록에 자동 설치됩니다.
                </p>
                <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  ※ 카카오톡 채팅방 내 웹뷰에서는 설치가 지원되지 않습니다. '다른 브라우저로 열기(Chrome)'를 먼저 선택해 주세요.
                </div>
              </div>

              <div className="bg-gray-800/80 p-3.5 rounded-xl border border-gray-700/60 space-y-2 text-xs">
                <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                  💻 PC (Chrome / Edge)
                </p>
                <p className="text-gray-300 leading-relaxed">
                  브라우저 주소창 맨 오른쪽의 <strong>'설치' 아이콘(모니터 모양)</strong>을 클릭하시면 PC 전용 독립 앱으로 즉시 설치됩니다.
                </p>
              </div>

              {isInstalled && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>현재 기기에 이미 앱이 설치되어 있습니다.</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </>
  );
};

