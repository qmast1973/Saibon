const fs = require('fs');
let content = fs.readFileSync('src/components/CalendarView.tsx', 'utf8');

const oldHook = `  const krHolidays = useMemo(() => {
    const hd = new Holidays('KR', { languages: ['ko'] });
    const h = hd.getHolidays(year);
    const map: Record<string, string> = {};
    h.forEach(holiday => {
      if (holiday.type === 'public') {
        const dStr = holiday.date.substring(0, 10);
        map[dStr] = holiday.name;
      }
    });
    return map;
  }, [year]);`;

const newHook = `  const krHolidays = useMemo(() => {
    const hd = new Holidays('KR', { languages: ['ko'] });
    const h = hd.getHolidays(year);
    const map: Record<string, string> = {};
    
    h.forEach(holiday => {
      if (holiday.type === 'public') {
        let current = new Date(holiday.start);
        const endDate = new Date(holiday.end);
        
        while (current < endDate) {
          const kstFormatter = new Intl.DateTimeFormat('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric', month: '2-digit', day: '2-digit'
          });
          const parts = kstFormatter.formatToParts(current);
          const y = parts.find(p => p.type === 'year')?.value;
          const m = parts.find(p => p.type === 'month')?.value;
          const d = parts.find(p => p.type === 'day')?.value;
          
          if (y && m && d) {
            map[\`\${y}-\${m}-\${d}\`] = holiday.name;
          }
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return map;
  }, [year]);`;

content = content.replace(oldHook, newHook);
fs.writeFileSync('src/components/CalendarView.tsx', content);
console.log('Fixed CalendarView holiday multi-day and timezone logic');
