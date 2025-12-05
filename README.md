# Crispy Barnacle - Group Event Booking System

A Spring Boot web application with Java backend and TypeScript frontend for managing group events with space reservations.

## Features

- **Event Display**: Shows upcoming group events with date, time, and city
- **Space Management**: Each event has up to 6 spaces with unique dog names and colors
- **User Registration**: Registration with visual verification (proof of identity and fitness)
- **User Verification**: Only verified users can book spaces
- **Space Booking**: Real-time space availability and booking system

## Tech Stack

### Backend
- Spring Boot 3.2.0
- Java 17
- Gradle
- Spring Data JPA
- Spring Security with JWT
- PostgreSQL (recommended for production) or H2 (for development)

### Frontend
- TypeScript
- Vite
- Axios for API calls
- Modern CSS with gradients and animations

## Project Structure

```
crispy-barnacle/
├── src/main/java/com/example/crispybarnacle/
│   ├── entity/          # JPA entities (Event, Space, User, RegistrationRequest)
│   ├── repository/      # Spring Data repositories
│   ├── service/         # Business logic services
│   ├── controller/      # REST API controllers
│   ├── dto/             # Data Transfer Objects
│   ├── config/          # Configuration classes
│   └── security/        # Security and JWT components
├── frontend/
│   ├── src/
│   │   ├── api.ts       # API client
│   │   ├── App.ts       # Main application logic
│   │   ├── main.ts      # Entry point
│   │   └── styles.css   # Styling
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── build.gradle
```

## Getting Started

### Prerequisites

- Java 17 or higher
- Node.js 18+ and npm
- Gradle (or use Gradle Wrapper)

### Quick Start (Recommended)

Use the provided start script to launch both servers:

```bash
./start.sh
```

This will:
- Start the backend on `http://localhost:8080`
- Start the frontend on `http://localhost:3000`
- Show real-time logs from both servers
- Display status and useful commands

To stop both servers, press `Ctrl+C` or run:
```bash
./stop.sh
```

### Manual Setup

#### Backend Setup

1. Navigate to the project root directory

2. If you don't have Gradle installed, generate the Gradle wrapper first:
   ```bash
   gradle wrapper
   ```
   (If you have Gradle installed, you can skip this step and use `gradle` instead of `./gradlew`)

3. Build the project:
   ```bash
   ./gradlew build
   ```

4. Run the Spring Boot application:
   ```bash
   ./gradlew bootRun --args='--spring.profiles.active=dev'
   ```

The backend will start on `http://localhost:8080`

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will start on `http://localhost:3000`

## API Endpoints

### Public Endpoints

- `GET /api/events/upcoming` - Get the upcoming event with spaces
- `POST /api/registration/register` - Register a new user (requires verification image)
- `POST /api/auth/login` - Login and get JWT token

### Protected Endpoints (Require JWT Token)

- `POST /api/spaces/events/{eventId}/book` - Book a space for an event
- `DELETE /api/spaces/{spaceId}/cancel` - Cancel a space booking

## Usage

1. **View Events**: The main page displays the upcoming event with all available spaces
2. **Register**: Click "Register" to create an account. You must upload a verification image showing your identity and physical fitness
3. **Login**: After registration, wait for verification, then login
4. **Book Spaces**: Once verified, click on an available space to book it

## Space Colors

Each space has a unique color from the following palette:
- Green
- Yellow
- Orange
- Blue
- Purple
- White

## User Verification

The registration process requires:
- Email and password
- First and last name
- A verification image that shows:
  - Proof of identity (your face)
  - Proof of physical fitness

Registration requests are stored with status `PENDING` until manually verified by an administrator.

## Database

### Development (H2)
By default, the application is configured for **PostgreSQL**. For development with H2 in-memory database:

1. Use the dev profile:
   ```bash
   ./gradlew bootRun --args='--spring.profiles.active=dev'
   ```

2. Access H2 console at: `http://localhost:8080/h2-console`
   - JDBC URL: `jdbc:h2:mem:testdb`
   - Username: `sa`
   - Password: (empty)

### Production (PostgreSQL)
**PostgreSQL is recommended for production.** See [DATABASE_SETUP.md](DATABASE_SETUP.md) for:
- Installation instructions
- Database setup steps
- Alternative database options (MySQL, SQLite)
- Production best practices

## Development Notes

- The application initializes with a sample event on startup
- JWT tokens expire after 24 hours (configurable in `application.properties`)
- File uploads are stored in the `uploads/` directory
- CORS is configured to allow requests from `http://localhost:3000` and `http://localhost:5173`

## Future Enhancements

- Admin panel for verifying registration requests
- Email notifications
- Multiple events management
- Payment integration
- User profile management
