import { parseSmartOrderText } from './src/lib/orderParser';

const text = `주문~디오트5층F13호
디오트4층H17호
디오트4층E10호
디오트4층i~06호
디오트3층G10호
디오트3층A04호
디오트3층F17호
디오트지하2층B19호

에스갤러리`;

const result = parseSmartOrderText(text, '');
console.log(JSON.stringify(result, null, 2));
