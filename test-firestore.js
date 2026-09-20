import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";
import fs from "fs";

const FIREBASE_CONFIG = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);

async function run() {
  const snapshot = await getDocs(collection(db, "collectionGroupRules"));
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}
run().catch(console.error);
