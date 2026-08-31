import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com` // guess
});
const rtdb = getDatabase(app);

const snap = await get(ref(rtdb, 'orders'));
const data = snap.val();
let count = 0;
if (data) {
  Object.values(data).forEach(day => {
    if (day) count += Object.keys(day).length;
  });
}
console.log('Orders in Firebase:', count);
process.exit(0);
