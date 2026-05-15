# InterviewAce Release Notes

## Version 1.0.0 — Final Academic Release
**Release Date:** May 2026

---

# Overview

InterviewAce is an AI-powered interview preparation platform designed to help students and early-career candidates practice technical and behavioral interviews through role-based question delivery, AI-assisted scoring, deterministic rubric feedback, and progress tracking.

This release represents the final stable academic submission for the CS 4800 Software Engineering project. The platform integrates a React + TypeScript frontend with a FastAPI backend, PostgreSQL persistence, sentence-transformers scoring, Ollama AI coaching, Docker-based development workflows, and GitHub Actions CI.

The final release consolidates all frontend, backend, AI/ML, QA, testing, architecture, and deployment improvements completed throughout Sprint 1, Sprint 2, and Sprint 3.

---

# Release Highlights

## Major Features Included

### Frontend Features
- Responsive React + TypeScript interview practice interface
- Role-based interview tracks:
  - Software Engineering (SWE)
  - Data Science / ML
  - Product Management (PM)
  - Behavioral
- Candidate level support:
  - Intern
  - New Grad
- Dynamic question navigation and filtering
- AI Coach mini-chat interface
- Horizontal score visualization charts
- Progress history and score trend tracking
- Light/dark mode support
- Speech-to-text answer input
- Mobile responsiveness for 375 px, tablet, and desktop layouts

### Backend Features
- FastAPI REST API architecture
- JWT authentication and protected routes
- bcrypt password hashing
- Password reset workflow using Brevo SMTP
- Role and level question retrieval
- Deterministic scoring pipeline
- Answer history retrieval
- PostgreSQL persistence through SQLAlchemy ORM
- Alembic database migrations
- Service Layer architecture refactor

### AI / ML Features
- sentence-transformers scoring engine
- all-MiniLM-L6-v2 embedding model
- Cosine similarity scoring
- Deterministic rubric-gap feedback
- STAR-style behavioral evaluation improvements
- AI Coach integration through Ollama llama3.2
- Missing-concept coaching guidance
- Ollama fallback handling and caching improvements

### DevOps / Infrastructure
- Dockerized local development environment
- GitHub Actions CI integration
- Frontend CI support
- Environment configuration cleanup
- Improved deployment structure and deliverable organization

---

# Sprint-Based Development Summary

## Sprint 1 — Requirements, Environment Setup, and Core Backend
**Approximate Timeline:** Weeks 4–6

### Completed Work
- Created backend project structure
- Added PostgreSQL integration
- Initialized Alembic migrations
- Implemented authentication system
- Added register/login endpoints
- Created core database schema
- Added answer submission endpoint
- Implemented scoring engine foundation
- Added history endpoints
- Added functional and non-functional requirements
- Added business plan and use case diagrams
- Established frontend API integration structure

### Major Technical Deliverables
- Initial FastAPI backend
- SQLAlchemy models
- JWT utilities
- Initial frontend application structure
- Requirements specification
- Use case documentation

---

## Sprint 2 — Architecture, AI Features, Frontend Expansion, and System Refactoring
**Approximate Timeline:** Weeks 7–10

### Completed Work
- Added level filtering support (Intern/New Grad)
- Added AI Coach feedback panel
- Added Ollama integration
- Added sentence-transformer feedback generation
- Refactored backend into service-layer architecture
- Enhanced frontend navigation and responsiveness
- Added history filtering and question filtering
- Added PM and Behavioral question support
- Added role/topic filtering improvements
- Added duplicate-question rejection logic
- Added responsive landing page redesign
- Improved authentication flow and protected navigation
- Added mini-chatbot style AI Coach
- Enhanced AI scoring behavior
- Added scoring fallback handling
- Added company/logo UI enhancements
- Added Playwright support for testing
- Added comprehensive feedback and scoring tests

### Major Technical Deliverables
- AI Coach workflows
- Service Layer pattern implementation
- Role/level-based question management
- Enhanced scoring engine
- Improved frontend responsiveness
- Expanded seeded question bank

---

## Sprint 3 — QA, Testing, Documentation, and Final Stabilization
**Approximate Timeline:** Weeks 11–14

### Completed Work
- Added frontend and backend traceability matrices
- Added frontend and backend test case specifications
- Added Test Strategy / Approach document
- Added Test Plan document
- Added Test Results Summary document
- Added sequence diagrams
- Added deployment/context diagrams
- Added domain object model diagrams
- Added class hierarchy and relationship diagrams
- Added activity diagrams
- Refined software architecture documentation
- Improved deliverables structure
- Fixed whitespace-only answer validation bug
- Fixed timestamp issues in history page
- Improved deterministic scoring behavior
- Refined Coach Chat design and overflow handling
- Enhanced PM and Behavioral scoring logic
- Refined responsive UI behavior
- Added QA-based validation fixes

### Major Technical Deliverables
- Complete QA documentation package
- UML and architecture documentation
- Finalized frontend/backend specifications
- Stability and validation improvements
- Final deployment and integration cleanup

---

# Key Improvements and Fixes

## Frontend Improvements
- Improved mobile responsiveness
- Fixed overflow and spacing issues
- Enhanced chart readability
- Refined AI Coach chat layout
- Improved question filtering UX
- Fixed navigation inconsistencies
- Increased accessibility and text sizing
- Added loading-state handling improvements
- Added state persistence validation

## Backend Improvements
- Refactored routers into dedicated services
- Improved JWT validation handling
- Added deterministic scoring safeguards
- Improved database persistence behavior
- Added Ollama model resolution and caching
- Added graceful AI fallback handling
- Fixed whitespace-only answer submission bug
- Improved question generation and filtering prioritization

## QA and Testing Improvements
- Added Playwright support
- Added deterministic scoring tests
- Added persistence-after-restart validation
- Added responsive viewport testing
- Added AI Coach UI interaction tests
- Added JWT protection tests
- Added feedback validation tests

---

# Quality Assurance Summary

InterviewAce was validated using a hybrid QA approach consisting of:

- Frontend integration testing
- Backend API testing
- Database persistence validation
- Security testing
- Responsive UI testing
- Deterministic scoring validation
- AI Coach integration testing
- Regression testing through CI

## Validated Areas
- Authentication workflows
- Password reset workflows
- Role and level question delivery
- Answer submission validation
- Four-axis scoring output
- Feedback generation
- AI Coach interaction
- PostgreSQL persistence
- JWT protection
- Responsive layouts
- CI smoke testing

---

# Known Limitations

- Ollama responses may vary slightly because generative AI output is nondeterministic.
- The scoring engine is optimized for interview-style textual responses and not arbitrary conversation.
- Full production-scale load testing was not performed.
- CI environments mock Brevo and Ollama integrations for stability.
- Administrative question-management APIs are not exposed publicly.

---

# Final Repository State

## Repository Includes
- Frontend application
- Backend API
- Database migrations
- Seeded interview questions
- AI scoring engine
- AI Coach integration
- Docker configuration
- CI workflows
- UML diagrams
- QA documentation
- Architecture documentation
- Deployment/context diagrams
- Sequence diagrams
- Domain models
- Test plans and traceability matrices

---

# Final Release Assessment

InterviewAce v1.0.0 represents the completed academic release of the project and successfully demonstrates:

- Full-stack software engineering practices
- AI-assisted scoring workflows
- Service-oriented backend architecture
- Responsive frontend engineering
- Database persistence and migration management
- CI-integrated QA validation
- UML and software architecture documentation
- Deterministic testing and validation practices

The project is considered feature-complete and ready for final academic demonstration and submission.

---

# Contributors

## Youcheng Taing (Youcheng9)
- Backend development
- FastAPI architecture
- Database design
- AI scoring pipeline
- PostgreSQL integration
- Persistence and API workflows

## Freeman Yiu (Coolguy4123)
- Frontend architecture and UI/UX
- AI Coach integration
- Responsive design
- QA documentation
- UML and architecture diagrams
- Integration testing and validation

---

# Repository

**GitHub Repository:**  
https://github.com/Youcheng9/Job-Interview-Prep-Tool
