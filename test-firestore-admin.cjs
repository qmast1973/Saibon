const admin = require('firebase-admin');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  projectId: config.projectId,
  databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com`
});

async function run() {
  const db = admin.firestore();
  db.settings({ databaseId: config.firestoreDatabaseId });
  
  const snapshot = await db.collection('collectionGroupRules').get();
  console.log(`Found ${snapshot.size} docs`);
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}
run().catch(console.error);
