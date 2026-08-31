import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const firestore = getFirestore(app, config.firestoreDatabaseId);
getDocs(collection(firestore, 'users')).then(snap => {
  console.log("Users:", snap.size);
  process.exit(0);
}).catch(err => {
  console.error("Firestore error", err);
  process.exit(1);
});
