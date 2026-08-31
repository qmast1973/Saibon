import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, remove, child } from "firebase/database";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  databaseURL: `https://${config.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
});
const rtdb = getDatabase(app);

try {
  console.log('Connecting to RTDB to clear...');
  const ordersRef = ref(rtdb, 'orders');
  const snap = await get(ordersRef);
  if (snap.exists()) {
    console.log('Found orders, deleting individually...');
    const promises = [];
    snap.forEach(day => {
      promises.push(remove(child(ordersRef, day.key)));
    });
    await Promise.all(promises);
    console.log('Cleared all orders.');
  } else {
    console.log('No orders found to clear.');
  }
} catch (e) {
  console.error('Error clearing:', e);
}
process.exit(0);
