import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, remove, child } from "firebase/database";

const app = initializeApp({
  apiKey: "AIzaSyCKUn8yVyL9V5NP9rpHWbtcDddiwW1MWSQ",
  authDomain: "ildang-505711.firebaseapp.com",
  databaseURL: "https://purchaseon-351f4-default-rtdb.firebaseio.com",
  projectId: "ildang-505711"
});
const rtdb = getDatabase(app);

try {
  const ordersRef = ref(rtdb, 'orders');
  const snap = await get(ordersRef);
  if (snap.exists()) {
    console.log('Orders found:', Object.keys(snap.val()).length, 'days');
    // Try to remove one
    const firstKey = Object.keys(snap.val())[0];
    try {
      await remove(child(ordersRef, firstKey));
      console.log('Successfully removed', firstKey);
    } catch (e) {
      console.error('Failed to remove', firstKey, e.message);
    }
  } else {
    console.log('No orders found');
  }
} catch (e) {
  console.error('Failed to get orders', e.message);
}
process.exit(0);
