const KOR_TO_ENG_MAP = {
  cho: ['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g'],
  jung: ['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l'],
  jong: ['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'],
  singleJa: {'ㄱ':'r','ㄲ':'R','ㄳ':'rt','ㄴ':'s','ㄵ':'sw','ㄶ':'sg','ㄷ':'e','ㄸ':'E','ㄹ':'f','ㄺ':'fr','ㄻ':'fa','ㄼ':'fq','ㄽ':'ft','ㄾ':'fx','ㄿ':'fv','ㅀ':'fg','ㅁ':'a','ㅂ':'q','ㅃ':'Q','ㅄ':'qt','ㅅ':'t','ㅆ':'T','ㅇ':'d','ㅈ':'w','ㅉ':'W','ㅊ':'c','ㅋ':'z','ㅌ':'x','ㅍ':'v','ㅎ':'g'},
  singleMo: {'ㅏ':'k','ㅐ':'o','ㅑ':'i','ㅒ':'O','ㅓ':'j','ㅔ':'p','ㅕ':'u','ㅖ':'P','ㅗ':'h','ㅘ':'hk','ㅙ':'ho','ㅚ':'hl','ㅛ':'y','ㅜ':'n','ㅝ':'nj','ㅞ':'np','ㅟ':'nl','ㅠ':'b','ㅡ':'m','ㅢ':'ml','ㅣ':'l'}
};

export function convertKoreanToEnglish(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    if (code >= 0xAC00 && code <= 0xD7A3) { // Complete Hangul
      const index = code - 0xAC00;
      const cho = Math.floor(index / 588);
      const jung = Math.floor((index - (cho * 588)) / 28);
      const jong = index % 28;
      result += KOR_TO_ENG_MAP.cho[cho] + KOR_TO_ENG_MAP.jung[jung] + KOR_TO_ENG_MAP.jong[jong];
    } else if (code >= 0x3131 && code <= 0x314E) { // Single Consonant
      result += (KOR_TO_ENG_MAP.singleJa as any)[char] || char;
    } else if (code >= 0x314F && code <= 0x3163) { // Single Vowel
      result += (KOR_TO_ENG_MAP.singleMo as any)[char] || char;
    } else {
      result += char;
    }
  }
  return result.replace(/[^a-zA-Z0-9]/g, '');
}
