import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Calendar, 
  Building2, 
  Calculator, 
  Layers, 
  HardHat, 
  Database, 
  Smartphone, 
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

export interface HelpCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface HelpItem {
  id: string;
  categoryId: string;
  title: string;
  badge?: string;
  badgeColor?: string;
  summary: string;
  keywords: string[];
  steps?: string[];
  tips?: string[];
  notes?: string[];
  examples?: string[];
}

const CATEGORIES: HelpCategory[] = [
  { id: 'all', name: '전체 보기', icon: BookOpen, color: 'text-indigo-400' },
  { id: 'order', name: '주문 등록·관리', icon: Calendar, color: 'text-blue-400' },
  { id: 'market', name: '동대문 상가 매핑', icon: Building2, color: 'text-amber-400' },
  { id: 'settlement', name: '정산 및 수금', icon: Calculator, color: 'text-emerald-400' },
  { id: 'group', name: '대표거래처 관리', icon: Layers, color: 'text-purple-400' },
  { id: 'buyer', name: '사입삼촌 작업대', icon: HardHat, color: 'text-cyan-400' },
  { id: 'data', name: '데이터·백업·정리', icon: Database, color: 'text-rose-400' },
  { id: 'mobile', name: '앱 설치·모바일', icon: Smartphone, color: 'text-teal-400' },
];

const QUICK_TAGS = [
  '중복 주문',
  '디/디오트 구분',
  '사입비 포함',
  '카톡 AI등록',
  '엑셀 업로드',
  '대표거래처',
  '영수증 인쇄',
  'DB 백업',
  '공휴일 표시'
];

const HELP_ITEMS: HelpItem[] = [
  {
    id: 'duplicate-detection',
    categoryId: 'order',
    title: '중복 주문 실시간 감지 및 자동 분기',
    badge: '필독',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    summary: '동일한 날짜, 상호, 건물, 층, 호수로 이미 등록된 주문이 있을 때 경고창을 띄워 중복 등록을 원천 방지합니다.',
    keywords: ['중복', '중복주문', '알림', '신규건', '필터링', '제외', '수동등록', '카톡등록', '엑셀'],
    steps: [
      '수동 주문 등록 또는 카톡 AI 주문 등록 시 동일한 매장의 주문이 감지되면 자동으로 [중복 주문 알림] 창이 열립니다.',
      '[중복 제외하고 신규 건만 등록]: 이미 들어간 주문은 건너뛰고 새로 추가된 주문만 안전하게 저장합니다.',
      '[중복 포함 전체 등록]: 필요에 의해 동일 매장에 추가 주문을 넣어야 할 경우 전체를 저장합니다.',
      '[취소하고 다시 확인]: 입력 폼으로 돌아가 내용을 재점검합니다.'
    ],
    tips: [
      '호수 표기(예: 101, 101호)나 상호의 띄어쓰기가 달라도 스마트 정규화 엔진이 동일 매장으로 정확히 감지합니다.',
      '이미 중복이 많이 쌓여 있다면 [환경설정] > [데이터 관리]의 [중복 내역 1건으로 정리하기] 버튼을 통해 한 번에 통합할 수 있습니다.'
    ],
    notes: [
      '입금 내역(미수금/입금)은 일반 도매 주문과 구분되어 금액과 입금 정보 기준으로 별도 관리됩니다.'
    ]
  },
  {
    id: 'ai-order-import',
    categoryId: 'order',
    title: '카카오톡 / 텍스트 AI 스마트 주문 등록',
    badge: '인기 기능',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    summary: '소매 거래처에서 카톡으로 보낸 주문 텍스트를 그대로 붙여넣으면 상호, 건물명, 층, 호수, 수량을 자동 추출합니다.',
    keywords: ['카톡', '카카오톡', 'AI', '스마트분석', '자동분석', '붙여넣기', '텍스트', '파싱'],
    steps: [
      '상단 메뉴에서 [AI / 카톡 주문등록] 버튼을 클릭합니다.',
      '거래처에서 받은 카톡 주문 메시지 전체를 텍스트 상자에 붙여넣기합니다.',
      '실시간으로 분석된 목록(상호, 건물, 층, 호수, 수량, 비고)을 확인합니다.',
      '수정이 필요한 행은 연필(수정) 아이콘으로 편집하고 [등록하기]를 누르면 저장됩니다.'
    ],
    tips: [
      '공지사항 머릿글, 계좌번호, 안내 문구 등 불필요한 메시지는 시스템이 알아서 무시하고 실제 주문만 쏙 골라냅니다.',
      '상호명이 본문에 명시되지 않은 경우, 상단 [선택 소매 거래처] 드롭다운에서 일괄 지정할 수 있습니다.'
    ],
    examples: [
      '예시 텍스트: "상호명A / 디오트 2층 F10호 / 블랙 2장, 화이트 1장 / 미송"'
    ]
  },
  {
    id: 'manual-order-entry',
    categoryId: 'order',
    title: '수동 주문 등록 및 다건 행 추가',
    badge: '기본 기능',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    summary: '거래처별로 여러 건물과 매장의 주문을 한 화면에서 빠르게 행을 추가해가며 등록할 수 있습니다.',
    keywords: ['수동등록', '주문등록', '행추가', '단축입력', '소매상호'],
    steps: [
      '달력에서 원하는 날짜를 클릭하거나 [주문 등록] 버튼을 엽니다.',
      '소매 거래처 상호를 입력합니다 (기존 등록 상호 자동완성 지원).',
      '도매 건물명, 층, 호수, 품목/비고를 입력합니다.',
      '하단의 [+ 행 추가] 버튼을 눌러 동일 소매상의 추가 주문을 연속으로 입력한 뒤 저장합니다.'
    ],
    tips: [
      '자주 가는 도매 건물은 초성이나 약어로 입력해도 자동 완성 목록에서 빠르게 선택할 수 있습니다.'
    ]
  },
  {
    id: 'market-d-rule',
    categoryId: 'market',
    title: "'디' / 'd' 자동 분류 공식 (디오트 vs 디자이너)",
    badge: '동대문 필수',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    summary: "건물명을 '디'나 'd'로 축약 입력했을 때 호수의 영문/한글 유무를 분석하여 디오트 또는 디자이너클럽으로 자동 분류합니다.",
    keywords: ['디', 'd', '디오트', '디자이너', '디자이너클럽', '호수', '자동분류', '약어'],
    steps: [
      '호수에 영문(a~f, A~F)이나 한글이 포함된 경우 ➡️ "디오트"로 자동 매핑',
      '호수가 순수 숫자(또는 숫자+하이픈)로만 구성된 경우 ➡️ "디자이너(디자이너클럽)"로 자동 매핑'
    ],
    tips: [
      '예: "디 2층 F10호" ➡️ "디오트"로 자동 변환',
      '예: "디 1층 15호", "디 2층 1-10" ➡️ "디자이너클럽"으로 자동 변환',
      '실무에서 매번 건물을 길게 타이핑할 필요 없이 "디" 한 글자만으로 정확한 상가를 매핑합니다.'
    ]
  },
  {
    id: 'market-slang-mapping',
    categoryId: 'market',
    title: '동대문 시장 은어 및 축약어 자동 변환',
    badge: '도메인 특화',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    summary: '상인과 삼촌들이 흔히 쓰는 시장 은어를 시스템 표준 명칭으로 완벽하게 호환합니다.',
    keywords: ['은어', '약어', '축약어', 'APM', '럭스', '청평', '제평', '벨포스트', 'DDP', '동평', '남평', '신평'],
    steps: [
      '럭스 ➡️ APM LUXE (에이피엠 럭스)',
      '청평 ➡️ 청평화시장',
      '제평 ➡️ 제일평화시장',
      '벨포, 벨포스트 ➡️ 벨포스트',
      '동평, 남평, 신평 ➡️ 동평화, 남평화, 신평화시장',
      '두타, 밀리오레, DDP, 혜양, 엘리시움 등 주요 상가 일괄 정규화'
    ],
    tips: [
      '소매상이 보낸 카톡에 축약어가 섞여 있어도 별도 수정 없이 시스템이 알아서 정식 건물명으로 분류합니다.'
    ]
  },
  {
    id: 'settlement-fee-toggle',
    categoryId: 'settlement',
    title: '사입비(수수료) 포함 처리 On/Off 옵션',
    badge: '정산 설정',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    summary: '수금 화면에서 사입비(건당 수수료 또는 월 사입비)를 계산에 포함할지 여부를 원클릭으로 전환합니다.',
    keywords: ['사입비', '수수료', '사입비포함', '수금', '정산', '토글', '설정', '대납금'],
    steps: [
      '상단 우측 [설정] 버튼을 클릭하여 환경설정 모달을 엽니다.',
      '[사입비 포함 처리] 스위치를 켜거나 끕니다.',
      '스위치 ON (체크됨): 수금 화면에서 물건 대납금에 사입비(수수료)가 합산되어 정산 금액이 산출됩니다.',
      '스위치 OFF (체크해제): 사입비 없이 순수 대납금과 미수금만 계산에 반영됩니다.'
    ],
    tips: [
      '월 고정 사입비를 내는 매장은 회원 정보에서 [월 고정 사입] 금액을 미리 등록해두면 자동으로 적용됩니다.'
    ]
  },
  {
    id: 'settlement-receipt-print',
    categoryId: 'settlement',
    title: '거래처별 영수증 및 간이 정산서 출력',
    badge: '실무 편의',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    summary: '일자별 매장 거래 내역, 대납 합계, 사입비, 미수금을 깔끔한 영수증 양식으로 인쇄하거나 이미지로 공유합니다.',
    keywords: ['영수증', '정산서', '출력', '인쇄', '미수금', '합계', '간이영수증'],
    steps: [
      '상단 메뉴 [수금관리] 또는 달력 하단 정산 뷰로 이동합니다.',
      '출력하려는 거래처의 [영수증] 아이콘을 누릅니다.',
      '도매 상가별 내역과 총 대납금, 입금액, 잔여 미수금을 확인하고 [인쇄] 버튼을 누릅니다.'
    ],
    tips: [
      '모바일에서도 화면 캡처 또는 PDF 저장을 통해 거래처에 카톡으로 정산 내역을 즉시 전송할 수 있습니다.'
    ]
  },
  {
    id: 'group-rules-management',
    categoryId: 'group',
    title: '대표거래처 관리 및 상호 묶기 (별칭 매핑)',
    badge: '데이터 정리',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    summary: '본점/지점, 오타, 띄어쓰기로 나뉜 동일 거래처들을 하나의 대표거래처로 묶어 정산과 통계를 통합합니다.',
    keywords: ['대표거래처', '상호묶기', '별칭', '그룹', '그룹룰', '지점', '직영점'],
    steps: [
      '상단 [설정] > [대표거래처 관리] 메뉴를 엽니다.',
      '[새 대표거래처 추가]를 눌러 기준이 될 대표 상호명을 등록합니다.',
      '해당 대표상호에 매핑될 별칭들(예: 상호명A 1호점, 상호명A 직영점 등)을 추가합니다.',
      '이후 해당 별칭으로 들어온 모든 주문은 대표상호 하나의 계정으로 자동 합산됩니다.'
    ],
    tips: [
      '거래처마다 사입 단가나 담당 삼촌이 다른 경우에도 대표거래처 속성에서 세부 설정이 가능합니다.'
    ]
  },
  {
    id: 'buyer-workday',
    categoryId: 'buyer',
    title: '사입삼촌 현장 작업대 및 최적 동선 정렬',
    badge: '현장용',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    summary: '밤 시장 현장에서 삼촌들이 동선 낭비 없이 빠르게 픽업할 수 있도록 건물 및 층별로 정렬합니다.',
    keywords: ['사입삼촌', '작업대', '동선', '층별정렬', '건물정렬', '픽업', '미송', '반품', '완료'],
    steps: [
      '상단 [주문처리] 버튼을 클릭하여 사입삼촌 전용 작업대로 들어갑니다.',
      '본인이 담당할 건물(예: 디오트, APM 등)을 선택하면 층/호수 순서대로 주문이 자동 정렬됩니다.',
      '물건을 픽업할 때마다 상태(완료, 미송, 반품, 교환, 찾기 등)를 터치하여 체크합니다.',
      '대납 금액이 발생하면 금액을 입력하여 즉시 실시간 동기화합니다.'
    ],
    tips: [
      '작업 완료율과 미처리 건수가 상단 통계 바에 실시간으로 표시되어 누락 없는 픽업을 돕습니다.'
    ]
  },
  {
    id: 'data-cleanup-duplicates',
    categoryId: 'data',
    title: '중복 내역 1건으로 일괄 정리하기',
    badge: '강력 추천',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    summary: '과거 실수로 여러 번 등록되었거나 엑셀 재업로드로 쌓인 중복 데이터를 단 한 번의 클릭으로 완벽히 통합합니다.',
    keywords: ['중복정리', '일괄정리', '중복삭제', '데이터정리', '데이터관리', '클라우드정리'],
    steps: [
      '상단 [설정] > [데이터 관리]를 클릭합니다.',
      '[중복 내역 1건으로 정리하기] 버튼을 누릅니다.',
      '확인 창에서 [확인]을 누르면 Firebase 클라우드 DB와 로컬 캐시를 전수 스캔하여 동일 내역 중 정보가 온전한 1건만 남기고 중복 건을 원자적(Batch)으로 삭제합니다.',
      '정리 완료 후 화면과 데이터베이스가 즉시 최신 상태로 갱신됩니다.'
    ],
    tips: [
      '비고나 금액 정보가 있는 주문을 우선 보존하므로 데이터 유실 걱정 없이 안전하게 실행할 수 있습니다.'
    ]
  },
  {
    id: 'data-backup-restore',
    categoryId: 'data',
    title: '데이터베이스 백업, 복원 및 엑셀 연동',
    badge: '안전 관리',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    summary: '전체 거래 내역을 JSON 파일로 백업/복원하거나, 엑셀 파일(.xlsx)로 대량 업로드 및 다운로드합니다.',
    keywords: ['백업', '복원', '엑셀', '다운로드', '업로드', 'JSON', '데이터보호'],
    steps: [
      'DB 백업: [설정] > [데이터 관리] > [DB 백업 다운로드]를 누르면 암호화/규격화된 백업 파일이 다운로드됩니다.',
      'DB 복원: 문제 발생 시 [DB 복원하기]로 백업 파일을 선택하여 과거 시점으로 되돌립니다.',
      '엑셀 대량 업로드: [엑셀 데이터 가져오기]를 통해 기존 장부나 타 시스템의 주문 엑셀을 한 번에 가져옵니다.'
    ],
    tips: [
      '엑셀을 가져올 때도 시스템에 이미 존재하는 동일 주문은 자동으로 중복 감지되어 건너뜁니다.'
    ]
  },
  {
    id: 'mobile-pwa-install',
    categoryId: 'mobile',
    title: '모바일 홈 화면 앱 설치 (PWA) 및 공휴일 안내',
    badge: '편의 기능',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    summary: '스마트폰 홈 화면에 아이콘을 추가하여 앱스토어 다운로드 없이 네이티브 앱처럼 전체 화면으로 사용할 수 있습니다.',
    keywords: ['PWA', '앱설치', '홈화면', '아이폰', '안드로이드', '모바일', '공휴일', '연휴'],
    steps: [
      '상단 헤더의 [앱 설치] 버튼을 누르면 홈 화면 추가가 바로 진행됩니다.',
      '아이폰(Safari): 하단 공유 버튼(네모+화살표) ➡️ [홈 화면에 추가] 선택.',
      '안드로이드(Chrome): 상단 메뉴(점 3개) ➡️ [앱 설치] 또는 [홈 화면에 추가] 선택.'
    ],
    tips: [
      '달력에는 대한민국 법정 공휴일 및 다일 명절 연휴(예: 설날 (~12일))가 끝나는 날짜까지 명확하게 표시됩니다.',
      '실무 현장 조작성을 위해 달력 좌우 스와이프 오작동은 비활성화되어 있어 한 손으로 안전하게 터치할 수 있습니다.'
    ]
  }
];

interface HelpGuideModalProps {
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Filter items based on search query and category
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return HELP_ITEMS.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      if (!matchCategory) return false;

      if (!q) return true;

      const titleMatch = item.title.toLowerCase().includes(q);
      const summaryMatch = item.summary.toLowerCase().includes(q);
      const keywordMatch = item.keywords.some(k => k.toLowerCase().includes(q));
      const stepsMatch = item.steps?.some(s => s.toLowerCase().includes(q));
      const tipsMatch = item.tips?.some(t => t.toLowerCase().includes(q));

      return titleMatch || summaryMatch || keywordMatch || stepsMatch || tipsMatch;
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setSelectedCategory('all');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[10000] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="help-guide-modal-container"
        className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header - Close Button strictly on Top Right per AGENTS.md */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0 bg-gray-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-100 flex items-center gap-2">
                도움말 (앱 기능설명)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium hidden sm:inline-block">
                  색인 및 검색
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                사입ON의 핵심 기능과 실무 팁을 빠르게 찾아보실 수 있습니다.
              </p>
            </div>
          </div>
          
          {/* Top-Right Isolated Close Button */}
          <button
            id="help-guide-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0 ml-3"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Quick Tags */}
        <div className="p-4 border-b border-gray-800/80 bg-gray-900/70 shrink-0 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="help-guide-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="찾고 싶은 기능이나 키워드를 검색하세요 (예: 중복, 엑셀, 디오트, 사입비 등)"
              className="w-full bg-gray-800/90 border border-gray-700/80 rounded-xl pl-10 pr-9 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs px-1.5 py-0.5 rounded bg-gray-700"
              >
                지우기
              </button>
            )}
          </div>

          {/* Quick Keyword Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] text-gray-500 shrink-0 flex items-center gap-1 mr-0.5">
              <Sparkles className="w-3 h-3 text-amber-400" /> 추천 색인:
            </span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleQuickTagClick(tag)}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition text-[11px] font-medium border ${
                  searchQuery === tag
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border-gray-700/60'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Category Index Navigation Pills */}
        <div className="px-4 py-2.5 border-b border-gray-800 bg-gray-950/40 shrink-0 overflow-x-auto scrollbar-none flex items-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-gray-800/60 hover:bg-gray-800 text-gray-300 border-gray-700/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : cat.color}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
          {/* Search Result Count */}
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>
              검색 결과 <span className="text-emerald-400 font-bold">{filteredItems.length}</span>건
              {searchQuery && (
                <span> ('{searchQuery}' 검색어 적용 중)</span>
              )}
            </span>
            {filteredItems.length > 0 && (
              <button
                type="button"
                onClick={() => setExpandedId(expandedId ? null : filteredItems[0]?.id)}
                className="text-gray-400 hover:text-gray-200 transition text-[11px]"
              >
                {expandedId ? '모두 접기' : '첫 항목 펼치기'}
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-gray-500 space-y-3">
              <HelpCircle className="w-10 h-10 mx-auto text-gray-600 opacity-60" />
              <p className="text-sm font-medium">검색 조건과 일치하는 도움말이 없습니다.</p>
              <p className="text-xs text-gray-500">다른 검색어를 입력하시거나 상단 추천 색인을 선택해보세요.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl font-bold transition"
              >
                전체 목록 보기
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = expandedId === item.id || (Boolean(searchQuery) && filteredItems.length <= 3);
              const categoryObj = CATEGORIES.find(c => c.id === item.categoryId);

              return (
                <div
                  key={item.id}
                  id={`help-item-${item.id}`}
                  className="bg-gray-800/40 hover:bg-gray-800/60 border border-gray-700/70 rounded-xl overflow-hidden transition-all shadow-sm"
                >
                  {/* Card Header / Summary Clickable */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-3.5 sm:p-4 cursor-pointer flex items-start justify-between gap-3 select-none"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {categoryObj && (
                          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                            {React.createElement(categoryObj.icon, { className: `w-3 h-3 ${categoryObj.color}` })}
                            {categoryObj.name}
                          </span>
                        )}
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${item.badgeColor || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm sm:text-base text-gray-100 flex items-center gap-2">
                        {item.title}
                      </h4>

                      <p className="text-xs text-gray-300 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-white rounded-lg transition shrink-0 mt-1"
                      aria-label={isExpanded ? '접기' : '펼치기'}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3.5 pb-4 pt-1 sm:px-4 border-t border-gray-700/50 bg-gray-900/50 space-y-3.5 text-xs">
                      {/* Step-by-Step Instructions */}
                      {item.steps && item.steps.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          <span className="font-bold text-gray-200 flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 사용 방법
                          </span>
                          <ol className="space-y-1.5 pl-1">
                            {item.steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-300 leading-normal">
                                <span className="w-4 h-4 rounded-full bg-gray-800 text-emerald-400 border border-gray-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Tips Box */}
                      {item.tips && item.tips.length > 0 && (
                        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 space-y-1">
                          <div className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> 실무 꿀팁
                          </div>
                          <ul className="space-y-1 text-amber-200/90 pl-4 list-disc text-xs leading-relaxed">
                            {item.tips.map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Notes / Cautions Box */}
                      {item.notes && item.notes.length > 0 && (
                        <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 space-y-1">
                          <div className="font-bold text-rose-300 flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> 주의사항
                          </div>
                          <ul className="space-y-1 text-rose-200/90 pl-4 list-disc text-xs leading-relaxed">
                            {item.notes.map((note, idx) => (
                              <li key={idx}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Examples Box */}
                      {item.examples && item.examples.length > 0 && (
                        <div className="bg-gray-800/70 rounded-lg p-2.5 text-gray-300 font-mono text-[11px]">
                          {item.examples.map((ex, idx) => (
                            <div key={idx} className="truncate">{ex}</div>
                          ))}
                        </div>
                      )}

                      {/* Keywords / Index Tags */}
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-500">관련 색인:</span>
                        {item.keywords.map((k, idx) => (
                          <span
                            key={idx}
                            onClick={() => setSearchQuery(k)}
                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 px-1.5 py-0.5 rounded cursor-pointer transition border border-gray-700/50"
                          >
                            #{k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Area */}
        <div className="px-5 py-3 border-t border-gray-800 bg-gray-900/90 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>사입ON 시스템 v2.4 도움말 가이드</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl transition cursor-pointer text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
