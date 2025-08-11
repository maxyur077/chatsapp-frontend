# 🚀 ChatsApp Frontend

A modern, real-time chat application built with Angular 20, featuring WhatsApp-like functionality with Socket.IO integration for instant messaging.

![Angular](https://img.shields.io/badge/Angular-20.1.3-red?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue?style=flat-square&logo=typescript)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Client-black?style=flat-square&logo=socket.io)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Latest-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

### 🔥 Real-time Messaging
- **Instant messaging** with Socket.IO integration
- **Message delivery confirmations** (sent, delivered, read)
- **Optimistic UI** for immediate message display
- **Fallback to API** when socket connection is unavailable

### 👥 User Management
- **Real-time online/offline status** tracking
- **WhatsApp-like user sorting** (unread messages first, then online users)
- **User search and filtering**
- **Avatar generation** with custom colors

### 💬 Chat Features
- **Message highlighting** for new unread messages
- **Smart notification system** (no highlights when actively chatting)
- **Message timestamps** with relative time display
- **Mobile-responsive design** with touch-friendly interface

### 🔐 Authentication & Security
- **JWT-based authentication**
- **Protected routes** with auth guards
- **Automatic token refresh**
- **Secure API communication**

## 🛠️ Tech Stack

- **Frontend**: Angular 20.1.3 with Standalone Components
- **Real-time**: Socket.IO Client
- **Styling**: TailwindCSS
- **State Management**: Angular Signals
- **HTTP Client**: Angular HttpClient with Interceptors
- **Routing**: Angular Router with Guards

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Angular CLI 20.1.3+

### Installation

1. **Clone the repository**
git clone <your-repo-url>
cd ChatsAppFrontend


2. **Install dependencies**
npm install


3. **Configure environment**

//src/environments/environment.ts
export const environment = {
production: false,
apiUrl: 'http://localhost:3000/api',
socketUrl: 'http://localhost:3000'
};


4. **Start development server**
ng serve


5. **Open your browser**
Navigate to `http://localhost:4200/`

