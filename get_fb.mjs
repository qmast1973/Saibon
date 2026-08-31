import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp({
  ...config,
  databaseURL: `https://${config.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
});
const rtdb = getDatabase(app);

try {
  const snap = await get(ref(rtdb, 'orders'));
  const data = snap.val();
  let count = 0;
  if (data) {
    Object.values(data).forEach(day => {
      if (day) count += Object.keys(day).length;
    });
  }
  console.log('Orders in Firebase (asia-southeast1):', count);
} catch (e) {
  console.error(e);
}
process.exit(0);
