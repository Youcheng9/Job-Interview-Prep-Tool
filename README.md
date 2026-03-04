# InterviewPrep – AI-Powered Interview Preparation Platform

InterviewPrep is a full-stack AI-powered interview practice platform that helps users prepare for technical and behavioral interviews through structured questions, intelligent scoring, and personalized feedback.

It combines:

- React (Frontend)
- FastAPI (Backend)
- PostgreSQL
- Sentence-Transformers (AI Scoring)
- Dockerized Deployment

## Features
**Authentication:**
- Secure JWT-based login & registration
- Protected API routes

**Role-Based Interview Practice:**
- SWE
- Data Science
- Product Management
- Behavioral

**AI-Powered Scoring:**\
Each answer is evaluated using:
- Semantic similarity (embeddings)
- Keyword/concept coverage
- Structured rubric evaluation

Users receive:
- Overall score (0–100)
- 4-dimensional breakdown:
    - Technical Depth
    - Clarity
    - Completeness
    - Structure

- Strengths & weaknesses
- Missing keywords/concepts

**History Tracking:**
- View past answer
- See score improvements
- Track growth over time