import { firestore } from './src/lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

async function run() {
  try {
    const d = await getDocFromServer(doc(firestore, 'test/connection'));
    console.log('Success:', d.exists());
    process.exit(0);
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
