# Database Setup Guide

## Recommended: PostgreSQL

PostgreSQL is the recommended database for production use. It's:
- **Production-ready**: Robust, reliable, and battle-tested
- **Open-source**: Free and actively maintained
- **Feature-rich**: Supports advanced SQL features, JSON, full-text search
- **Well-integrated**: Excellent Spring Boot support
- **Scalable**: Handles high traffic and large datasets

## Installation

### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download and install from: https://www.postgresql.org/download/windows/

### Docker (Recommended for Development)
```bash
docker run --name crispy-barnacle-db \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=crispybarnacle \
  -p 5432:5432 \
  -d postgres:15
```

## Database Setup

1. **Create the database:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE crispybarnacle;

# Create a dedicated user (optional but recommended)
CREATE USER crispyuser WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE crispybarnacle TO crispyuser;
\q
```

2. **Update application.properties:**
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/crispybarnacle
spring.datasource.username=crispyuser
spring.datasource.password=your-secure-password
```

3. **Run the application:**
```bash
./gradlew bootRun
```

The application will automatically create tables on first run (due to `spring.jpa.hibernate.ddl-auto=update`).

## Alternative Database Options

### MySQL / MariaDB

**Pros:**
- Very popular and widely used
- Good performance
- Easy to find hosting

**Cons:**
- Some SQL standard compliance issues
- Less advanced features than PostgreSQL

**Setup:**
1. Add to `build.gradle`:
```gradle
runtimeOnly 'com.mysql:mysql-connector-j'
```

2. Update `application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/crispybarnacle?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your-password
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
```

### SQLite (File-based)

**Pros:**
- Zero configuration
- Single file database
- Good for small applications

**Cons:**
- Not suitable for high concurrency
- Limited features
- Not ideal for production

**Setup:**
1. Add to `build.gradle`:
```gradle
runtimeOnly 'org.xerial:sqlite-jdbc'
```

2. Update `application.properties`:
```properties
spring.datasource.url=jdbc:sqlite:./data/crispybarnacle.db
spring.jpa.database-platform=org.hibernate.dialect.SQLiteDialect
```

### MongoDB (NoSQL)

**Pros:**
- Flexible schema
- Good for document storage
- Horizontal scaling

**Cons:**
- Requires code changes (different ORM)
- No SQL/JPQL queries
- Different data modeling approach

**Note:** Switching to MongoDB would require significant code changes as it uses a different Spring Data module (Spring Data MongoDB instead of JPA).

## Production Recommendations

1. **Use Environment Variables** for sensitive data:
```properties
spring.datasource.url=${DATABASE_URL:jdbc:postgresql://localhost:5432/crispybarnacle}
spring.datasource.username=${DATABASE_USERNAME:postgres}
spring.datasource.password=${DATABASE_PASSWORD}
```

2. **Use Connection Pooling** (already configured with HikariCP)

3. **Use Database Migrations** (consider Flyway or Liquibase instead of `ddl-auto=update`)

4. **Backup Strategy**: Set up regular database backups

5. **Monitoring**: Use tools like pgAdmin, DBeaver, or cloud monitoring

## Development vs Production

- **Development**: Use H2 in-memory or PostgreSQL in Docker
- **Production**: Always use PostgreSQL (or MySQL) with proper credentials and connection pooling

## Switching Between Databases

You can use Spring profiles to switch between databases:

```bash
# Use H2 for development
./gradlew bootRun --args='--spring.profiles.active=dev'

# Use PostgreSQL for production
./gradlew bootRun --args='--spring.profiles.active=prod'
```

Then create `application-prod.properties` with PostgreSQL settings.

