const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const dupStr = `  // Request Notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);`;
if(code.includes(dupStr)) {
  code = code.replace(dupStr, '');
  fs.writeFileSync('src/App.tsx', code, 'utf8');
  console.log('Removed duplicate useEffect');
} else {
  console.log('Duplicate not found');
}
