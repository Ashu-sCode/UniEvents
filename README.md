# UniEvent (UniPass)

A production-ready university event management system for managing events like Freshers, Farewell, Orientations, and Department Workshops.

## Features

- **Event Management**: Create and manage university events with seat limits
- **Digital Tickets**: QR-coded tickets with PDF download
- **Entry Verification**: Scan QR codes for instant verification
- **Attendance Tracking**: Automatic attendance marking
- **Certificate Generation**: Digital certificates for workshop attendees
- **Role-Based Access**: Separate interfaces for Students and Organizers

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query
- Axios

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- QRCode & PDFKit

## Project Structure

```
unievent/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities (QR, PDF)
│   │   ├── app.js          # Express app
│   │   └── server.js       # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React components
│   │   ├── context/        # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities & API client
│   │   └── types/          # TypeScript types
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/unievent
   JWT_SECRET=your-secret-key
   ```

5. Start the server:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (Organizer)
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event (Organizer)
- `DELETE /api/events/:id` - Delete event (Organizer)
- `GET /api/events/:id/registrations` - View registrations (Organizer)

### Tickets
- `POST /api/tickets/register/:eventId` - Register for event
- `GET /api/tickets/my-tickets` - Get user's tickets
- `GET /api/tickets/:ticketId` - Get ticket details
- `GET /api/tickets/:ticketId/download` - Download ticket PDF
- `POST /api/tickets/verify` - Verify ticket (Organizer)

### Attendance
- `GET /api/attendance/my-attendance` - Get user's attendance
- `GET /api/attendance/event/:eventId` - Get event attendance (Organizer)
- `GET /api/attendance/event/:eventId/stats` - Get attendance stats (Organizer)

### Certificates
- `GET /api/certificates/my-certificates` - Get user's certificates
- `POST /api/certificates/generate/:eventId` - Generate certificates (Organizer)
- `GET /api/certificates/:certificateId/download` - Download certificate PDF

## User Roles

### Student
- Browse and register for events
- View and download tickets
- View attendance history
- Download certificates

### Organizer
- Create and manage events
- View registrations
- Verify tickets at entry
- Generate certificates

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- QR codes contain only ticket ID (no personal data)
- Single-use ticket validation

## License

MIT
