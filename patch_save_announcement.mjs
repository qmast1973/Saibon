import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  /export const saveAnnouncement = async \(text: string\): Promise<void> => \{\n  try \{\n    const docRef = doc\(firestore, 'settings', 'announcement'\);\n    await setDoc\(docRef, \{ text, updatedAt: new Date\(\)\.toISOString\(\) \}, \{ merge: true \}\);\n  \} catch \(err\) \{\n    console\.error\('Failed to save announcement', err\);\n    throw err;\n  \}\n\};/,
  `export const saveAnnouncement = async (text: string): Promise<void> => {
  try {
    const docRef = doc(firestore, 'settings', 'announcement');
    await Promise.race([
      setDoc(docRef, { text, updatedAt: new Date().toISOString() }, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
  } catch (err) {
    console.warn('Failed to save announcement immediately, will sync when online:', err);
  }
};`
);

fs.writeFileSync('src/lib/firebase.ts', code);
