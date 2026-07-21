# Nextise Full-Stack Senior Developer Assessment

Thank you for participating in our full-stack coding assessment. This challenge is designed to evaluate your ability to architect, design, and implement a production-ready seminar management system with intelligent features.

**Time Allocation:** This assessment should take approximately **3-4 hours** to complete thoroughly. We value quality over speed, so take the time to demonstrate your best work.

## Assessment Overview

You will be building a comprehensive seminar management platform that handles course scheduling, trainer assignment, conflict detection, and intelligent matching. The system must be production-ready with proper architecture, error handling, security, and scalability considerations.

## Grading Criteria

Your submission will be evaluated on:

- **Architecture & Design**: Clean, scalable architecture with proper separation of concerns
- **Code Quality**: Maintainable, readable, well-structured code following best practices
- **Problem Solving**: How you approach complex problems (conflict detection, AI matching)
- **Security**: Input validation, authentication, SQL injection prevention, XSS protection
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing**: Docker Compose setup, environment configuration
- **Git Practices**: Clean commit history with meaningful messages
- **Documentation**: Code comments, API documentation, setup instructions
- **Performance**: Efficient algorithms, database queries, and state management
- **Agentic Engineering**: Quality of your agent pipeline design — role clarity, context efficiency, failure handling, and termination logic (see Section 5)

## Prerequisites

**Technologies Required:**
- **Next.js** (LTS): Pages Router or App Router (your choice)
- **Node.js**: LTS version (^18.x or ^20.x)
- **Database**: MongoDB or MySQL/PostgreSQL (your choice)
- **Docker & Docker Compose**: For containerization
- **Mailhog**: For email testing
- **AI API Service**: OpenAI, Anthropic Claude, Google Gemini, or similar (you choose)
- **TypeScript**: Strongly recommended

## Core Requirements

### 1. Data Models

**Course Model:**
- Course Name (required, string)
- Course Date (required, date)
- Course Subject (required, array of strings, e.g., ["React.js", "Next.js"])
- Course Location (required, string)
- Course Participants (required, integer, min: 1)
- Course Notes (optional, text)
- Course Price (required, decimal, min: 0)
- Course Trainer Price (required, decimal, min: 0)
- Assigned Trainer (optional, reference to Trainer)
- Status (enum: draft, scheduled, completed, cancelled)
- Created/Updated timestamps

**Trainer Model:**
- Trainer Name (required, string)
- Trainer Training Subjects (required, array of strings)
- Trainer Location (required, string)
- Trainer Email (required, valid email format)
- Availability Calendar (optional, array of date ranges or blackout dates)
- Hourly Rate (optional, decimal)
- Rating/Experience Level (optional, integer 1-5)
- Created/Updated timestamps

### 2. Functional Requirements

#### Authentication & Authorization
- Implement a secure login system (hardcoded credentials acceptable for assessment)
- Session management with proper security
- Protected routes - users must be authenticated to access dashboard
- Logout functionality

#### Course Management
- **Dashboard**: Display overview with statistics (total courses, trainers, upcoming courses, revenue metrics)
- **Course List**: View all courses with filtering and sorting capabilities
- **Create Course**: Form with validation for all required fields
- **Edit Course**: Update existing courses (with conflict checking)
- **Delete Course**: Soft delete or hard delete (your choice, document it)
- **Course Details**: Detailed view of individual courses

#### Trainer Management
- **Trainer List**: View all trainers with their expertise and availability
- **Create Trainer**: Form with validation
- **Edit Trainer**: Update trainer information
- **Delete Trainer**: Handle cascading (what happens to assigned courses?)
- **Trainer Profile**: View trainer details, assigned courses, history

#### Trainer Assignment
- **Manual Assignment**: Assign a trainer to a course manually
- **Intelligent Suggestions**: AI-powered trainer matching system (see Advanced Features)
- **Conflict Prevention**: Prevent double-booking of trainers
- **Assignment History**: Track when trainers were assigned/removed

#### Email Notifications
- Send email to trainer when assigned to a course
- Email should include all course details (name, date, location, participants, notes, pricing)
- Professional email template
- Error handling for failed email sends
- Use Mailhog for local testing

### 3. Advanced Features (Required)

#### Intelligent Conflict Detection
Implement a sophisticated conflict detection system that identifies:
- **Location Conflicts**: Multiple courses at the same location with overlapping time slots
- **Trainer Conflicts**: Trainer assigned to multiple courses on the same day/time
- **Resource Conflicts**: If you extend the system (optional)
- **Time Overlap Detection**: Handle courses with different durations

The system should:
- Check conflicts before creating/updating courses
- Provide detailed conflict information (which courses conflict, why)
- Allow override with warnings (your design decision)
- Display conflicts in the UI clearly

#### AI-Powered Trainer Matching with External AI API Integration

You must integrate with an external AI API service (OpenAI, Anthropic Claude, Google Gemini, or similar) to provide intelligent trainer matching suggestions. This is a critical requirement that demonstrates real-world AI integration skills.

**AI Integration Requirements:**

1. **External AI API Integration**
   - Integrate with a production AI service (OpenAI GPT, Anthropic Claude, etc.)
   - Use the AI API to analyze and rank trainer matches
   - Structure prompts with proper context about courses, trainers, and matching criteria
   - Handle API authentication, rate limiting, and error cases

2. **Prompt Engineering**
   - Design effective prompts that provide the AI with:
     - Course details (subject, location, date, participants, requirements)
     - Available trainers with their profiles (expertise, location, availability, experience)
     - Matching criteria and priorities
   - Structure prompts to get structured, parseable responses (JSON format recommended)
   - Include context about business rules (e.g., "prefer trainers in the same city", "expertise match is most important")

3. **Matching Factors to Consider:**
   - **Subject Expertise Match**: How well trainer's subjects align with course requirements
   - **Location Proximity**: Geographic considerations (same city preferred, travel costs)
   - **Availability**: Trainer's schedule and existing commitments
   - **Experience Level**: Trainer's rating, years of experience, past performance
   - **Course Requirements**: Special needs, participant count, course complexity

4. **Response Processing:**
   - Parse AI responses into structured data
   - Extract ranked trainer suggestions with confidence scores
   - Extract reasoning/explanations for each match
   - Handle malformed or unexpected AI responses gracefully

5. **Requirements:**
   - Return top 3-5 trainer suggestions ranked by AI-determined match quality
   - Display confidence scores (0-100%) for each suggestion
   - Show AI-generated reasoning for each suggestion (why this trainer matches)
   - Allow manual override (select any trainer, not just AI suggestions)
   - Handle edge cases (no available trainers, AI API failures, rate limits)
   - Implement fallback behavior if AI API is unavailable

6. **Error Handling & Resilience:**
   - Handle API failures gracefully (network errors, timeouts, rate limits)
   - Implement retry logic with exponential backoff
   - Provide fallback matching algorithm if AI is unavailable
   - Cache AI responses when appropriate (consider course/trainer data staleness)
   - Log AI API usage for monitoring and debugging

7. **Security & Configuration:**
   - Store AI API keys securely in environment variables
   - Never expose API keys in client-side code
   - Implement proper API key rotation strategy
   - Consider cost optimization (token usage, caching)

**Implementation Notes:**
- You may use any AI service provider (OpenAI, Anthropic, Google, etc.)
- Consider using structured outputs (JSON mode) for consistent parsing
- Think about prompt versioning and optimization
- Consider the cost implications of API calls
- Document your prompt design and reasoning in your code
- The AI integration should feel natural and provide real value, not just be a checkbox feature

### 4. Technical Requirements

#### Backend Architecture
- RESTful API design with proper HTTP methods
- Input validation on all endpoints
- Error handling with appropriate HTTP status codes
- Database connection pooling
- Transaction support for critical operations
- API documentation (comments or OpenAPI/Swagger)

#### Frontend Architecture
- Component-based architecture
- State management (Context API, Zustand, or Redux - your choice)
- Custom hooks for reusable logic
- Form validation and error handling
- Loading states and user feedback
- Responsive design (mobile-friendly)

#### Security
- Input sanitization and validation
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF protection (if applicable)
- Secure password handling (even for hardcoded credentials)
- Environment variable management

#### Error Handling
- User-friendly error messages
- Logging for debugging
- Graceful degradation
- Network error handling
- Database error handling

### 5. Agentic AI Engineering Challenge (Required)

This section tests your ability to **design and orchestrate AI agents** — not just use an AI API. Anyone can call `openai.chat.completions.create`. What we're evaluating here is whether you can think in systems: defining agent roles, designing context handoffs, and building a self-executing pipeline that doesn't require a human in the loop.

#### What You Must Build

Create a Claude Code skill file at `.claude/skills/build-trainer-matching.md`.

When a developer invokes `/build-trainer-matching` from the project root, this skill must autonomously orchestrate a sequence of AI agents that collectively implement the full trainer matching module — from database query to UI rendering — without further human input.

#### Skill File Requirements

Your skill file must define a pipeline of **at least 4 distinct agents**, each with a clearly scoped role. The following agents are required (you may add more):

| Agent | Responsibility |
|---|---|
| **Planner Agent** | Reads the current codebase structure and outputs a step-by-step implementation plan for the trainer matching feature |
| **API Agent** | Implements the backend `/api/trainers/suggest` endpoint based on the plan |
| **UI Agent** | Implements the frontend component that calls the API and displays ranked suggestions |
| **Reviewer Agent** | Reviews the output of both the API and UI agents, identifies issues, and outputs a structured critique |
| **Reconciler Agent** (if Reviewer flags issues) | Receives the critique and revises the flagged agent's output until the Reviewer approves or a max iteration count is reached |

#### Skill File Design Rules

Your `.claude/skills/build-trainer-matching.md` must:

1. **Define agent roles explicitly** — each agent must have a named role, a specific input it receives, and a specific output it produces
2. **Specify context passing** — document exactly what information each agent hands to the next (what is included, what is excluded, and why)
3. **Handle rejection loops** — if the Reviewer Agent rejects the output, the skill must route back to the responsible agent with the critique as input, not restart from scratch
4. **Set termination conditions** — the pipeline must define when it is "done" (Reviewer approves, or max N revision cycles reached) so it does not loop infinitely
5. **Be self-contained** — invoking `/build-trainer-matching` should require zero additional human prompts to complete

#### Evaluation Criteria for the Skill File

You will be evaluated on:

- **Role clarity**: Are agent boundaries clean? Does each agent do exactly one thing?
- **Context efficiency**: Are you passing only what each agent needs, or dumping everything into every prompt?
- **Failure design**: What happens when an agent produces bad output? Is it handled, or does the pipeline silently fail?
- **Termination logic**: Can the pipeline get stuck in an infinite loop? How did you prevent it?
- **Prompt precision**: Are the instructions inside each agent definition unambiguous? Could a different model follow them correctly?
- **Does it actually work**: Invoke the skill and include the terminal output log in your submission

#### Submission Requirement

Include in your repository:
- `.claude/skills/build-trainer-matching.md` — the skill file
- `agent-run.log` or a screenshot — proof that the skill was invoked and completed
- Your answers to the Agentic Engineering section in `FOLLOW-UP.md`

> **Note:** We are not looking for perfect generated code from the agents. We are looking for a well-architected pipeline. A skill file that orchestrates agents thoughtfully and handles failure gracefully scores higher than one that produces clean code but has no error handling and loops forever on bad output.

### 6. Docker Setup

Create a comprehensive `docker-compose.yml` that includes:
- Next.js application container
- Database container (MongoDB or MySQL/PostgreSQL)
- Mailhog container for email testing
- Proper networking between services
- Environment variable configuration
- Volume mounts for development
- Health checks (optional but recommended)

### 7. Database Design

- Proper schema design with relationships
- Indexes for performance (on frequently queried fields)
- Data integrity constraints
- Migration strategy (if applicable)

## Project Structure Expectations

We expect you to organize your code professionally. Consider:
- Separation of concerns (services, components, utilities)
- Reusable components and hooks
- Type definitions and interfaces
- Configuration management
- Error handling utilities
- Validation utilities

**Note:** We're not providing a specific structure. You should design the architecture that makes sense for this application. This is part of the assessment.

## Sample Data

Use this as a reference for data structure:

```json
{
  "course": {
    "name": "Advanced React.js & Next.js Workshop",
    "date": "2024-12-15",
    "subject": ["React.js", "Next.js"],
    "location": "Stuttgart, Germany",
    "participants": 25,
    "notes": "Focus on server-side rendering and performance optimization",
    "price": 2500.00,
    "trainer_price": 800.00,
    "status": "scheduled"
  },
  "trainer": {
    "name": "Sarah Johnson",
    "training_subjects": ["React.js", "Next.js", "TypeScript"],
    "location": "Berlin, Germany",
    "email": "sarah.johnson@example.com",
    "hourly_rate": 120.00,
    "rating": 5
  }
}
```

## Running the Project

Your project should include clear instructions for:
- Setting up the development environment
- Installing dependencies
- Configuring environment variables (including AI API keys)
- Setting up AI API access (how to obtain API keys, which service to use)
- Running Docker Compose
- Accessing the application
- Testing email functionality with Mailhog
- Testing AI matching functionality

## Submission Guidelines

1. **Git Repository**: Create your own repository (GitHub, GitLab, or Bitbucket)
2. **Commit History**: 
   - Make meaningful commits with clear messages
   - Show your development process
   - Don't squash everything into one commit
3. **Documentation**: Include a comprehensive README with:
   - Setup instructions
   - Architecture decisions
   - API documentation
   - Known limitations or assumptions
4. **FOLLOW-UP.md**: Answer the questions in the provided template
5. **AI Session Transcript (required)**: Include your Claude Code (or equivalent) session transcript / prompt history as `ai-session.md` (or export). We want to see *how* you drove the tool — where you scoped prompts, overrode the model, and stopped to make a judgment call — not just the final output.
6. **Exclusions**: Don't include `node_modules`, `.next`, or database files

## Bonus Points (Optional)

These are not required but will impress us:
- Unit tests or integration tests
- Performance optimizations
- Advanced UI/UX features
- Real-time updates (WebSockets)
- Export functionality (PDF, CSV)
- Search and advanced filtering
- Pagination for large datasets
- Dark mode
- Accessibility features (ARIA labels, keyboard navigation)
- **Extend your skill file** to also build the conflict detection module, with a separate agent pipeline that reuses the Reviewer/Reconciler pattern
- **Add a Breakdown Agent** as the first step in your pipeline: given only the README requirements, it produces the implementation plan autonomously with no hardcoded assumptions

## Questions to Consider

As you build, think about:
- How would this scale to 10,000+ courses?
- How would you handle concurrent assignments?
- What happens if email sending fails?
- How do you ensure data consistency?
- What's your strategy for handling timezones?
- How would you add multi-language support?

## Evaluation Focus

We're looking for:
- **Senior-level thinking**: Architecture, design patterns, trade-offs
- **Production readiness**: Error handling, security, scalability
- **Code quality**: Clean, maintainable, well-documented
- **Problem-solving**: How you approach complex challenges
- **Best practices**: Following industry standards and conventions

Good luck! We're excited to see what you build.
