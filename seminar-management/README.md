# Seminar Management System - Starter Project

This is the starter project for the Nextise Full-Stack Senior Developer Assessment. It provides a basic Next.js setup with some initial UI components to get you started.

## Project Structure

```
seminar-management/
├── components/          # React components
├── pages/              # Next.js pages and API routes
├── styles/             # Global styles
├── lib/                # Utilities and shared code (you'll create this)
└── public/             # Static assets
```

## Getting Started

### Prerequisites

- Node.js (LTS version 18.x or 20.x)
- Docker and Docker Compose
- Yarn or npm

### Installation

```bash
# Install dependencies
yarn install
# or
npm install
```

### Development

```bash
# Run development server
yarn dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
yarn build
yarn start
```

## Current State

This starter includes:
- Basic Next.js setup with TypeScript
- Tailwind CSS for styling
- Sample pages: Login, Dashboard, Courses, Trainers
- Basic Header component
- Modern UI design (enhanced for assessment)

## What You Need to Build

**Everything else.** This is intentionally minimal. You need to:

1. **Design the architecture** - Create the folder structure that makes sense
2. **Implement the database layer** - Choose MongoDB or MySQL/PostgreSQL
3. **Build the API routes** - All backend logic
4. **Implement authentication** - Login, session management, protected routes
5. **Create forms and functionality** - Course creation, trainer management, assignment
6. **Build the conflict detection system** - Sophisticated algorithm
7. **Implement AI matching with external API** - Integrate with AI service (OpenAI, Anthropic, etc.) for intelligent trainer suggestions
8. **Set up email notifications** - Using Mailhog for testing
9. **Configure Docker Compose** - All services containerized
10. **Add error handling, validation, security** - Production-ready code

## Key Files to Review

- `pages/index.tsx` - Dashboard (needs real data)
- `pages/login.tsx` - Login page (needs authentication)
- `pages/courses.tsx` - Courses list (needs CRUD operations)
- `pages/trainers.tsx` - Trainers list (needs CRUD operations)
- `components/Header.tsx` - Header component (enhanced UI)

## Design Decisions

You'll need to make architectural decisions about:
- State management approach
- API structure and routing
- Database schema design
- Error handling strategy
- Validation approach
- Component organization
- Hook patterns
- Service layer structure

## Notes

- The UI has been enhanced with modern design patterns, but functionality is not implemented
- Sample data is hardcoded - replace with real database queries
- Forms are not functional - you need to implement all form handling
- No validation exists - you need to add comprehensive validation
- No error handling - implement proper error boundaries and handling
- Authentication is not implemented - build the full auth system

## Environment Variables

You'll need to create a `.env.local` file with:
- Database connection strings
- SMTP/Mailhog configuration
- **AI API configuration** (API key, endpoint, model - e.g., OpenAI, Anthropic)
- Any other configuration your system needs

**Note:** You'll need to sign up for an AI API service (many offer free tiers for testing). Document which service you chose and why in your implementation.

## Docker Setup

You need to create:
- `Dockerfile` for the Next.js app
- `docker-compose.yml` with all services
- Proper networking and volume configuration

## Assessment Focus

Remember, this assessment evaluates:
- **Architecture & Design** - How you structure the application
- **Problem Solving** - Your approach to complex features (conflict detection, AI matching)
- **Code Quality** - Clean, maintainable, production-ready code
- **Security** - Proper validation, sanitization, protection
- **Best Practices** - Following industry standards

Don't just make it work - make it work well, securely, and scalably.

Good luck!
