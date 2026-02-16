/**
 * P2P Firebase Configuration
 * Replace with your actual Firebase project credentials
 */
const firebaseConfig = {
  apiKey: "AIzaSyAVz3ftIz1MrhxeVtavNAog9A3TCy0nMF0",
  authDomain: "p2p-db-da0c4.firebaseapp.com",
  projectId: "p2p-db-da0c4",
  storageBucket: "p2p-db-da0c4.firebasestorage.app",
  messagingSenderId: "383483597789",
  appId: "1:383483597789:web:db60f4664424f69baa5c34",
  measurementId: "G-9LJGCEGLL6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// App configuration
const APP_CONFIG = {
  // Set your institution's email domain here
  // e.g., 'university.edu' — only emails ending with this domain can register
  institutionDomain: 'ritchennai.edu.in',
  appName: 'P2P',
  version: '1.0.0',
  maxImageSize: 5 * 1024 * 1024, // 5MB
  postsPerPage: 20,
  batches: ['22-26', '23-27', '24-28', '25-29']
};
