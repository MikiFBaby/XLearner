# XLearner - Personal Learning OS

Transform your Twitter/X bookmarks into personalized learning courses with AI-generated content, podcasts, and quizzes.

## Features

- **Bookmark Sync**: Connect your X account and import all your saved bookmarks
- **AI Analysis**: Automatically categorize and extract key insights from bookmarked content
- **Course Generation**: Create structured learning courses from your bookmarks using AI
- **Audio Podcasts**: Convert lessons to audio format for on-the-go learning
- **Progress Tracking**: Track your learning journey with detailed progress metrics
- **Quizzes**: Test your knowledge with AI-generated quizzes

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Twitter OAuth
- **Background Jobs**: Inngest
- **AI**: Anthropic Claude API (for analysis and generation)
- **Audio**: ElevenLabs (for podcast generation)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (we recommend [Neon](https://neon.tech) for serverless)
- Twitter/X Developer Account (for OAuth)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/xlearner.git
cd xlearner
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Database URL
   - NextAuth secret
   - Twitter OAuth credentials
   - Anthropic API key (optional for AI features)
   - ElevenLabs API key (optional for audio)

5. Initialize the database:
```bash
npm run db:push
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API endpoints
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # Base UI components
│   └── providers/        # Context providers
├── lib/                   # Utility functions and configurations
│   ├── inngest/          # Background job functions
│   └── ...
├── types/                 # TypeScript type definitions
└── ...
```

## API Routes

- `POST /api/auth/signin` - Initiate Twitter OAuth
- `GET /api/bookmarks` - List user's bookmarks
- `POST /api/bookmarks/sync` - Trigger bookmark sync
- `GET /api/courses` - List user's courses
- `POST /api/courses` - Create a new course
- `POST /api/ai/generate-course` - Generate course from bookmarks

## Development

### Database Migrations

```bash
npm run db:migrate    # Create and run migrations
npm run db:push       # Push schema changes
npm run db:studio     # Open Prisma Studio
```

### Linting

```bash
npm run lint
```

### Build

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
