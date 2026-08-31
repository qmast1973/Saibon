import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const rtdb = getDatabase(app);
get(ref(rtdb, 'users')).then(snap => {
  const users = snap.val() || {};
  console.log(Object.values(users).map(u => `${u.username} (${u.role})`).join('\n'));
  process.exit(0);
});
