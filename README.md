# ChessHub - Modern Chess Website

A modern, real-time multiplayer chess website built with Next.js 15, React 18, Tailwind CSS, and Supabase.

## Features

- 🎯 **Real-time Multiplayer**: Play chess with friends online with instant move synchronization
- 🔐 **Google OAuth Authentication**: Secure sign-in with Google accounts
- 📊 **Match History & Stats**: Track your games, wins, losses, and performance
- 💬 **In-game Chat**: Communicate with your opponent during games
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 🌙 **Dark Mode**: Toggle between light and dark themes
- ⚡ **Fast & Modern**: Built with the latest web technologies

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Real-time, Auth)
- **Chess Logic**: chess.js, react-chessboard
- **Icons**: Lucide React
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd chess_web
npm install
```

### 2. Set up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to Settings > API
3. Copy your project URL and anon key
4. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set up Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy the contents of `supabase-schema.sql` and run it
3. This will create all necessary tables, functions, and RLS policies

### 4. Configure Google OAuth

1. In Supabase dashboard, go to Authentication > Providers
2. Enable Google provider
3. Go to [Google Cloud Console](https://console.cloud.google.com/)
4. Create a new project or select existing one
5. Enable Google+ API
6. Create OAuth 2.0 credentials
7. Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
8. Copy Client ID and Client Secret to Supabase Google provider settings

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── play/              # Chess game pages
│   └── profile/           # User profile pages
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── chess/            # Chess game components
│   └── layout/           # Layout components
├── contexts/             # React contexts
├── lib/                  # Utility libraries
└── types/               # TypeScript type definitions
```

## Database Schema

The application uses the following main tables:

- **users**: User profiles and statistics
- **games**: Game records and state
- **game_moves**: Detailed move history
- **chat_messages**: In-game chat messages

All tables have Row Level Security (RLS) enabled for data protection.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
