const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const script = `
    <script>
      window.deferredPWAInstallPrompt = null;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPWAInstallPrompt = e;
      });
    </script>
`;
if (!html.includes('window.deferredPWAInstallPrompt')) {
  html = html.replace('</head>', script + '</head>');
  fs.writeFileSync('index.html', html);
}
