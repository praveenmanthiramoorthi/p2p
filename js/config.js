/**
 * P2P Firebase Configuration
 * Replace with your actual Firebase project credentials
 */
const firebaseConfig = {
  apiKey: "AIzaSyCv0kQUgvHl5hmjKglp0CZPm3AoCBUbT8Q",
  authDomain: "p2p-db-1bc8f.firebaseapp.com",
  projectId: "p2p-db-1bc8f",
  storageBucket: "p2p-db-1bc8f.firebasestorage.app",
  messagingSenderId: "863065570935",
  appId: "1:863065570935:web:0687ec6b6eb24cb0c15072",
  measurementId: "G-NV0FRMJFF5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// App configuration
const APP_CONFIG = {
  institutionDomain: 'ritchennai.edu.in',
  appName: 'P2P',
  version: '1.0.0',
  maxImageSize: 5 * 1024 * 1024,
  postsPerPage: 20,
  batches: ['22-26', '23-27', '24-28', '25-29'],
  adminEmails: [
    'praveenmanthiramoorthi@gmail.com',
    'p2pcareteam@gmail.com',
    'ravivarman.rit@gmail.com'
  ],
  portals: {
    qa: true,
    marketplace: true,
    lostfound: true,
    teamup: true
  }
};
