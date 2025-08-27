# French Learning App - Admin Dashboard

A comprehensive admin dashboard for managing the French language learning application. Built with Next.js, TypeScript, Firebase, and TailwindCSS.

## Features

- 🔐 **Secure Authentication** - Firebase Authentication with admin-only access
- 👥 **Student Management** - View, activate/deactivate, and manage student accounts
- 📚 **Course Management** - Create, edit, and publish French learning courses
- 🧩 **Quiz System** - Build quizzes and track student progress
- 📱 **Notifications** - Send push notifications to mobile app users
- 📊 **Analytics** - Track student progress and app usage
- 🌓 **Dark Mode** - Built-in theme switching
- 📱 **Responsive Design** - Mobile-friendly interface

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **File Storage**: Cloudinary
- **UI Components**: Headless UI + Heroicons
- **Forms**: React Hook Form + Yup validation

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project created
- Cloudinary account set up

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Update .env.local with your Firebase and Cloudinary credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Update `.env.local` with your credentials:

```env
# Firebase Configuration (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Firebase Admin SDK (Server)
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_CLIENT_EMAIL=your_service_account_email_here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
