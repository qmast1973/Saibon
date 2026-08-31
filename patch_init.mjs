import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// replace the init() function entirely
const initRegex = /async function init\(\) \{[\s\S]*?setIsInitializing\(false\);\n      \}/;
const newInit = `async function init() {
      // Background fetch announcement without blocking
      getAnnouncement().then(initialAnnouncement => {
        if (initialAnnouncement) setAnnouncement(initialAnnouncement);
      }).catch(() => {});
      
      try {
        const docRef = doc(firestore, 'settings', 'announcement');
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setAnnouncement(snap.data().text || '');
          }
        }, (err) => {
          console.warn('onSnapshot error (likely offline):', err.message);
        });
      } catch (e) {}

      try {
        const [cachedUser, localUsers, cachedTxs, cachedCollections] = await Promise.all([
          getSessionUser(),
          getLocalUsers(),
          loadTransactionsFromIndexedDB(),
          Promise.resolve(loadCollections())
        ]);

        if (cachedUser) {
          setCurrentUser(cachedUser);
          if (cachedUser.role === 'buyer') {
            setShowBuyerWorkdayScreen(true);
          } else if (cachedUser.role === 'merchant') {
            setShowOrderModal(true);
          }
        }

        if (localUsers.length > 0) {
          // Ensure seed users are also available in local list
          const merged = [...localUsers];
          SEED_USERS.forEach(su => {
            if (!merged.some(u => u.username === su.username)) {
              merged.push(su);
              saveLocalUser(su).catch(() => {});
            }
          });
          setUsers(merged);
        } else {
          setUsers(SEED_USERS);
          for (const su of SEED_USERS) {
            saveLocalUser(su).catch(() => {});
          }
        }

        if (cachedTxs.length > 0) {
          setCleanTransactions(cachedTxs);
        } else {
          setTransactions([]);
        }

        if (cachedCollections.length > 0) {
          setCollections(cachedCollections);
        }
      } catch (e) {
        console.warn('Init error:', e);
      }
      setIsInitializing(false);
    }`;

code = code.replace(initRegex, newInit);
fs.writeFileSync('src/App.tsx', code);
