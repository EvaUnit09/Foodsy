# Foodsy
A real-time social dining coordination app that solves the "where should we eat?" problem for groups. Create a session, invite friends with a join code, and vote on nearby restaurants together — no more endless back-and-forth.

## Tech Stack
- Frontend: React, Next.js, deployed on Vercel
- Backend: Spring Boot, PostgreSQL (AWS RDS), deployed on AWS EC2
- Auth: Google OAuth2, JWT
- Real-Time: STOMP WebSockets
- APIs: Google Places and Foursquare

## Features
- Create group voting sessions with a shareable join code
- Multi-round voting system to narrow down and finalize a restaurant
- Real-time vote updates across all participants
- Restaurant data aggregated from multiple APIs
- Personalized homepage recommendations based on taste profile
- Google OAuth2 login
