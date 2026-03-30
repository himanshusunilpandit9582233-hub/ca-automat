# CA Automation Backend System - PRD

## Project Overview
A scalable CA automation platform with multi-role onboarding and 32-bit integer status bitmask tracking system.

## Original Problem Statement
Build a CA Automation Backend System for a multi-role onboarding platform supporting:
- Individual, Sole Proprietor, OPC, Private Limited company types
- 32-bit status bitmask system for onboarding progress tracking
- Dynamic onboarding flows based on entity type
- PAN, GSTIN, CIN verification (mock implementations)
- Consent management for AIS and ITR data

## User Personas
1. **Individual User** - Personal tax filing, minimal verification
2. **Sole Proprietor** - Single-owner business, requires GST
3. **OPC Owner** - One Person Company director, requires CIN
4. **Private Limited** - Multi-director company, full verification suite

## Core Requirements (Static)

### 32-Bit Status Bitmask System
| Bit | Value | Status |
|-----|-------|--------|
| 0 | 1 | PAN Verified |
| 1 | 2 | GST Verified |
| 2 | 4 | CIN Verified |
| 3 | 8 | Consent Given |
| 4 | 16 | AIS Access Approved |
| 5 | 32 | ITR Data Fetched |
| 6 | 64 | Account Created |

### Role-Based Onboarding Flows
- **Individual**: PAN → Consent
- **Sole Proprietor**: PAN → GST → Consent
- **OPC**: PAN → CIN → Consent
- **Private Limited**: CIN → GST → Director PAN → Consent

## What's Been Implemented (2026-03-30)

### Backend (FastAPI)
- [x] JWT-based authentication with bcrypt password hashing
- [x] User registration and login endpoints
- [x] Role selection endpoint
- [x] 32-bit bitmask status tracking system
- [x] PAN verification endpoint
- [x] GSTIN verification endpoint
- [x] CIN verification endpoint
- [x] Consent submission endpoint
- [x] Onboarding status retrieval endpoint
- [x] MongoDB integration with proper indexing

### Frontend (React)
- [x] Landing page with Swiss high-contrast design
- [x] User registration form with validation
- [x] Login form with JWT token management
- [x] Role selection page (4 entity types)
- [x] Multi-step onboarding wizard
- [x] Dashboard with binary status visualization
- [x] Progress tracking with completion percentage
- [x] Protected routes with authentication context

## Prioritized Backlog

### P0 - Critical (Not Implemented)
- None - All core features implemented

### P1 - Important
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Real PAN/GST/CIN API integration
- [ ] Admin panel for user management

### P2 - Nice to Have
- [ ] Redis caching for onboarding steps
- [ ] Webhook support for async verification
- [ ] Audit logging system
- [ ] Rate limiting on verification endpoints
- [ ] Multi-factor authentication

## Technical Stack
- **Backend**: Python FastAPI, MongoDB, JWT, bcrypt
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Database**: MongoDB with Motor async driver

## API Documentation

### Authentication
```
POST /api/auth/register - Create new user
POST /api/auth/login - Authenticate user
POST /api/auth/logout - Clear session
GET /api/auth/me - Get current user
POST /api/auth/refresh - Refresh access token
```

### Onboarding
```
POST /api/onboarding/select-role - Select entity type
GET /api/onboarding/status - Get onboarding progress
POST /api/onboarding/pan-verify - Verify PAN
POST /api/onboarding/gstin-verify - Verify GSTIN
POST /api/onboarding/cin-verify - Verify CIN
POST /api/onboarding/consent - Submit consent
```

## Next Tasks
1. Integrate real verification APIs (PAN, GST, MCA)
2. Add email verification flow
3. Implement password reset
4. Add admin dashboard for user management
5. Set up Redis caching for performance
