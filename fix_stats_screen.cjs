const fs = require('fs');

let content = fs.readFileSync('src/components/BuyerWorkdayStatsScreen.tsx', 'utf8');

const targetStr = `<div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-blue-400 tracking-tight flex items-center gap-1.5">
                사입ON <span className="text-xs sm:text-sm font-normal px-2 py-0.5 rounded-full bg-pink-900/60 text-pink-300 border border-pink-700">갯수 집계</span>
              </h1>
              <span className="text-xs text-gray-400">({currentUser.name} 사입삼촌)</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              실시간 시장 사입, 대납금 수정, 완료/미송/반품 상태 변경 및 엑셀 결과 다운로드
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap max-w-full overflow-hidden">
            <button
              id="btnTopExportExcelStats"
              type="button"
              onClick={handleExportSelectedDateExcel}
              className="bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              title="선택한 날짜 엑셀 데이터 저장"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀데이터 저장</span>
            </button>
            <button
              type="button"
              onClick={onStartEnteringOrder}
              className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 py-2 px-3 rounded-lg text-xs font-bold border border-gray-700 transition flex items-center gap-1 cursor-pointer"
              title="달력 화면으로 이동"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              장부 달력 보기
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-md h-full min-h-[32px] sm:min-h-[36px]"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>`;

const newStr = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-blue-400 tracking-tight flex items-center gap-1.5">
                사입ON <span className="text-xs sm:text-sm font-normal px-2 py-0.5 rounded-full bg-pink-900/60 text-pink-300 border border-pink-700">갯수 집계</span>
              </h1>
              <span className="text-xs text-gray-400">({currentUser.name} 사입삼촌)</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              실시간 갯수 집계 및 검수 현황, 엑셀 결과 다운로드
            </p>
          </div>

          <div className="flex items-center sm:justify-end gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button
              id="btnTopExportExcelStats"
              type="button"
              onClick={handleExportSelectedDateExcel}
              className="bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              title="선택한 날짜 엑셀 데이터 저장"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">엑셀 저장</span>
              <span className="sm:hidden">엑셀</span>
            </button>
            <button
              type="button"
              onClick={onStartEnteringOrder}
              className="ml-auto sm:ml-0 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 py-1.5 px-2.5 rounded-lg text-[11px] sm:text-xs font-bold border border-gray-700 transition flex items-center gap-1 cursor-pointer shrink-0"
              title="닫기 (메인 화면으로)"
            >
              <X className="w-4 h-4 sm:w-4 sm:h-4 text-gray-400" />
              <span>닫기</span>
            </button>
          </div>
        </div>`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/BuyerWorkdayStatsScreen.tsx', content);
console.log('Fixed Stats Screen');
