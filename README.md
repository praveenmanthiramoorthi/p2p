# P2P — Peer-to-Peer Campus Platform

> A verified campus-only digital platform connecting students and staff through structured community features.

## 🎯 Features

- **Q&A Forum** — Ask questions, get answers, mark helpful responses
- **Marketplace** — Buy, sell, or request items within campus
- **Lost & Found** — Report and find missing items with images
- **TeamUp** — Find project partners, hackathon teams, and freelance skills
- **Real-time Chat** — Private in-app messaging (no phone/email exposure)
- **Moderation** — Report posts, admin controls

## 📁 Project Structure

```
p2p/
├── index.html              # Main SPA entry point
├── package.json            # Dev server config
├── vercel.json             # Vercel deployment config
├── firestore.rules         # Firestore security rules
├── storage.rules           # Storage security rules
├── css/
│   ├── variables.css       # Design tokens & custom properties
│   ├── base.css            # Reset & foundation styles
│   ├── components.css      # Reusable UI components
│   ├── layout.css          # App layout & navigation
│   ├── pages.css           # Page-specific styles
│   ├── chat.css            # Chat panel styles
│   └── animations.css      # Keyframe animations
└── js/
    ├── config.js           # Firebase config & app settings
    ├── utils.js            # Utility functions
    ├── auth.js             # Authentication module
    ├── posts.js            # Posts CRUD & Q&A logic
    ├── chat.js             # Real-time messaging
    └── app.js              # Main app controller
```

## 🚀 Quick Start

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → Sign-in methods:
   - Email/Password
   - Google
4. Create **Firestore Database** (start in test mode, then apply rules)
5. Enable **Storage**
6. Get your config from Project Settings → General → Your Apps → Web App

### 2. Configure the App

Open `js/config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

To restrict to your institution's email domain:
```javascript
institutionDomain: 'youruniversity.edu',
```

### 3. Apply Security Rules

Copy the contents of `firestore.rules` and `storage.rules` to their respective sections in Firebase Console.

### 4. Run Locally

```bash
cd p2p
npx serve . -l 3000
```

Open http://localhost:3000

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

## 🗃 Database Schema

### `users` collection
| Field | Type | Description |
|-------|------|-------------|
| uid | string | Firebase Auth UID |
| email | string | Institutional email |
| fullName | string | Display name |
| registerNumber | string | Student ID |
| batch | string | e.g. "22-26" |
| contactNumber | string | **PRIVATE** — never exposed |
| profileCompleted | boolean | Whether profile is complete |
| role | string | "user" or "admin" |
| createdAt | timestamp | Account creation time |

### `posts` collection
| Field | Type | Description |
|-------|------|-------------|
| category | string | qa/sell/buy/need/lost/found/teamup |
| title | string | Post title (max 120 chars) |
| description | string | Post body (max 2000 chars) |
| authorId | string | Creator's UID |
| authorName | string | Creator's display name |
| imageURL | string | Optional image URL |
| status | string | "active" or "resolved" |
| helpfulAnswerId | string | For Q&A — marked answer ID |
| answerCount | number | Number of answers |
| createdAt | timestamp | Creation time |

### `posts/{id}/answers` subcollection
| Field | Type |
|-------|------|
| text | string |
| authorId | string |
| authorName | string |
| createdAt | timestamp |

### `conversations` collection
| Field | Type |
|-------|------|
| participants | array[string] |
| participantNames | map |
| lastMessage | string |
| lastMessageTime | timestamp |

### `conversations/{id}/messages` subcollection
| Field | Type |
|-------|------|
| text | string |
| senderId | string |
| senderName | string |
| createdAt | timestamp |

### `reports` collection
| Field | Type |
|-------|------|
| postId | string |
| reason | string |
| details | string |
| reporterId | string |
| createdAt | timestamp |

## 🔐 Privacy & Security

- Contact numbers are **never** displayed publicly
- All routes require authentication
- Firestore rules enforce ownership and role-based access
- Reports are only visible to admins
- Storage uploads limited to 5MB images

## 📈 Future Scalability Ready

The architecture supports future expansion:
- **Multi-institution**: Add `institutionId` field to users/posts
- **Reputation system**: Add score fields to user profiles
- **Notifications**: Firebase Cloud Messaging integration points
- **Mobile app**: Same Firestore backend, native frontend

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary Light | #F0F8FF |
| Primary Dark | #240046 |
| Accent | #7B2FF6 |
| Font | Inter (Google Fonts) |
| Border Radius | 8–20px |
| Shadows | Layered depth system |

---

Built with ❤️ for campus communities.
