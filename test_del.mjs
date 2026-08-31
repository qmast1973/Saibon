import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, remove } from "firebase/database";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const rtdb = getDatabase(app);
const firestore = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const usersSnap = await get(ref(rtdb, 'users'));
  const users = usersSnap.val() || {};
  const admins = Object.values(users).filter(u => u.role === 'admin');
  console.log("Admins:", admins.map(u => u.username));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
