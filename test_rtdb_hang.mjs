import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp({ ...config, databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com` });
const rtdb = getDatabase(app);

console.log('Fetching...');
const timeout = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 3000));
const fetchDb = get(ref(rtdb, 'orders')).then(() => 'SUCCESS').catch((e) => 'ERROR: ' + e.message);

const result = await Promise.race([fetchDb, timeout]);
console.log('Result:', result);
process.exit(0);
