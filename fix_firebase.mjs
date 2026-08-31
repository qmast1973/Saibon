import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// The corrupted part starts after my injected function. Let's find exactly what to replace.
// I will just read the file, locate the two `export async function deleteUserFromFirebase`, and replace the whole block.
const lines = code.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export async function deleteUserFromFirebase')) {
    if (startIdx === -1) startIdx = i;
  }
  if (lines[i].includes('// ----------------- ORDER FIREBASE SYNC -----------------')) {
    endIdx = i;
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  const newLines = lines.slice(0, startIdx);
  newLines.push(`export async function deleteUserFromFirebase(username: string): Promise<void> {
  if (!username) return;
  const key = String(username).trim().toLowerCase();
  try {
    const userRef = ref(rtdb, \`users/\${key}\`);
    // Timeout added to prevent hang if RTDB is disabled
    await Promise.race([
      remove(userRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB timeout')), 2000))
    ]);
  } catch (e) {
    console.warn('RTDB delete error:', e);
  }
  try {
    // Timeout added to prevent hang if Firestore is disabled
    await Promise.race([
      deleteDoc(doc(firestore, 'users', key)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
  } catch (e) {
    console.warn('Firestore delete error:', e);
  }
}`);
  newLines.push(...lines.slice(endIdx));
  fs.writeFileSync('src/lib/firebase.ts', newLines.join('\n'));
  console.log('Fixed firebase.ts successfully.');
} else {
  console.log('Could not find bounds to fix.');
}
