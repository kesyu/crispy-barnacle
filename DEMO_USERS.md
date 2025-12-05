# Demo Users

The application automatically creates demo users on startup for testing purposes.

## Verified User (Can Book Spaces)

- **Email**: `verified@example.com`
- **Password**: `password123`
- **Name**: Alice Verified
- **Status**: VERIFIED ✅
- **Can**: Login and book spaces

### Test Login:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"verified@example.com","password":"password123"}'
```

## Pending User (Registration Request)

- **Email**: `pending@example.com`
- **Password**: `password123`
- **Name**: Bob Pending
- **Status**: PENDING ⏳
- **Cannot**: Login (not yet converted to User entity)
- **Note**: This is a RegistrationRequest waiting for admin approval

## Usage

1. **Verified User**: Can login immediately and book spaces
2. **Pending User**: Represents a registration request that needs admin verification before becoming a User

## Notes

- Demo users are only created if they don't already exist
- Passwords are hashed using BCrypt
- The verified user can immediately test the booking functionality
- The pending user demonstrates the registration workflow

