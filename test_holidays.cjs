const Holidays = require('date-holidays');
const hd = new Holidays('KR', { languages: ['ko'] });
const h = hd.getHolidays(2026);
console.log(h.slice(0,3));
