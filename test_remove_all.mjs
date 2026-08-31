import { initializeApp } from "firebase/app";
import { getDatabase, ref, remove } from "firebase/database";

const app = initializeApp({
  apiKey: "AIzaSyCKUn8yVyL9V5NP9rpHWbtcDddiwW1MWSQ",
  authDomain: "ildang-505711.firebaseapp.com",
  databaseURL: "https://purchaseon-351f4-default-rtdb.firebaseio.com",
  projectId: "ildang-505711"
});
const rtdb = getDatabase(app);

try {
  await remove(ref(rtdb, 'orders'));
  console.log('Successfully removed ALL');
} catch (e) {
  console.error('Failed to remove ALL', e.message);
}
process.exit(0);
