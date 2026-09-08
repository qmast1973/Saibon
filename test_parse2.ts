import { parseSmartOrderText } from './src/lib/orderParser.ts';

const text = `● 소매 : 비바글램
1. APM / 2층 18 / 바이보미 / 대납
2. CPH(청평화) / 1층 라26 / 파스텔 / 대납
3. CPH(청평화) / 4층 B41 / stunning스터닝 / 대납
4. CPH(청평화) / 5층 나31 / 유돈노미 / 대납
5. NPH(남평화) / 지하1층 구관118 / 꿀딴지 (꿀단지) / 대납
6. 누죤 / 1층 623 / 미애 / 대납
7. 디오트 / 1층 J04 / thehagi 더하기 / 대납
8. 디오트 / 4층 B18 / 주식회사  에스더블유샵 / 대납
9. 디오트 / 지하2층 C07 / 제이머랭(J meringue) / 대납
10. 디오트 / 지하2층 E22 / 블렌딩 blending / 대납
11. 디오트 / 지하2층 i-26 / 노리타 / 대납
12. 퀸즈스퀘어(광희) / 4층 454 / 솜 / 대납
13. 테크노 / 1층 108 / 자루 / 대납
상세 주문서 확인 : https://notice.sinsang`;

const orders = parseSmartOrderText(text);
console.log(JSON.stringify(orders, null, 2));
