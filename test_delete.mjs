import { initializeApp } from "firebase/app";
import { getDatabase, ref, remove } from "firebase/database";
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const rtdb = getDatabase(app);
remove(ref(rtdb, 'users/test_user_that_does_not_exist')).then(() => {
  console.log("Delete success");
  process.exit(0);
}).catch(err => {
  console.error("Delete failed", err);
  process.exit(1);
});
