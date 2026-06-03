import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAXTecT6ngm5njThbIzu4bivqq_zQiacAI",
  authDomain: "tab-maa-prod.firebaseapp.com",
  databaseURL: "https://tab-maa-prod.firebaseio.com",
  projectId: "tab-maa-prod",
  storageBucket: "tab-maa-prod.appspot.com",
  messagingSenderId: "426734759783",
  appId: "1:426734759783:web:xxxxxxxxxxxxxx"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
