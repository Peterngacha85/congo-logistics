# Authentication & Security System

---

## **Overview**

The app uses **JWT (JSON Web Token)** for stateless authentication with refresh token rotation.

```
User Login
  ↓
Credentials verified against database
  ↓
Access Token generated (24 hours)
  ↓
Refresh Token generated (7 days)
  ↓
Both sent to client
  ↓
Client stores in HTTP-only cookies
  ↓
Every API request includes access token
  ↓
If access token expires, refresh token renews it
  ↓
If refresh token expires, user must re-login
```

---

## **JWT Token Structure**

### **Access Token** (expires 24 hours)

```javascript
// Payload
{
  iat: 1642000000,           // Issued at (Unix timestamp)
  exp: 1642086400,           // Expires at (24 hours later)
  userId: "60d5ec49f1234567890abcde",
  email: "john@company.com",
  firstName: "John",
  lastName: "Doe",
  role: "BRANCH_MANAGER",    // SUPER_ADMIN or BRANCH_MANAGER
  branchId: "60d5ec49f1234567890abcde",
  permissions: [
    "trip:create:own_branch",
    "trip:read:own_branch",
    "trip:update:own_branch",
    "trip:delete:own_branch",
    "trip:approve:own_branch"
  ]
}

// Header
{
  alg: "HS256",
  typ: "JWT"
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  SECRET_KEY
)
```

### **Refresh Token** (expires 7 days)

```javascript
{
  iat: 1642000000,
  exp: 1642604800,           // 7 days later
  userId: "60d5ec49f1234567890abcde",
  type: "refresh",           // Distinguish from access token
  tokenVersion: 1            // Increment to invalidate old tokens
}
```

---

## **Authentication Flow**

### **1. Login Endpoint**

```javascript
// POST /auth/login
// Request
{
  email: "john@company.com",
  password: "securePassword123",
  rememberMe: false
}

// Validation Steps:
1. Check if user exists by email
2. If not exists → return 404 "User not found"
3. If exists but status = "SUSPENDED" → return 403 "Account suspended"
4. If exists but status = "INACTIVE" → return 403 "Account inactive"
5. Compare provided password with hashed password
   - Using bcrypt.compare(password, user.password)
   - If doesn't match → increment loginAttempts
   - If loginAttempts >= 5 → set lockedUntil = now + 30 mins
6. If 5 failed attempts → return 401 "Account locked. Try again in 30 mins"
7. If password matches:
   - Reset loginAttempts to 0
   - Generate access token (24 hours)
   - Generate refresh token (7 days)
   - If rememberMe: generate extended refresh token (30 days)
   - Store refresh token in database
   - Return tokens to client

// Response
{
  success: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    _id: "60d5ec49f1234567890abcde",
    firstName: "John",
    email: "john@company.com",
    role: "BRANCH_MANAGER",
    branchId: "60d5ec49f1234567890abcde"
  }
}

// Set HTTP-only Cookies (Frontend receives but cannot read)
Set-Cookie: auth_token=<access_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
Set-Cookie: refresh_token=<refresh_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### **2. Refresh Token Endpoint**

Called when access token expires.

```javascript
// POST /auth/refresh
// Request
{
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Validation Steps:
1. Verify refresh token signature
2. If invalid → return 401 "Invalid token"
3. If expired → return 401 "Token expired, please login again"
4. Extract userId from token
5. Check if token version matches (invalidate if user changed password)
6. If matches:
   - Generate new access token
   - Rotate refresh token (generate new one)
   - Store new refresh token in database
   - Optionally invalidate old refresh token

// Response
{
  success: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **3. Logout Endpoint**

```javascript
// POST /auth/logout
// Request
{
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Actions:
1. Extract userId from token
2. Find user
3. Remove this refresh token from user.refreshTokens array
4. Clear HTTP-only cookies
5. Return success

// Response
{
  success: true,
  message: "Logged out successfully"
}
```

---

## **Password Management**

### **Password Hashing (On Registration/Change)**

```javascript
import bcrypt from 'bcrypt'

async function hashPassword(plainPassword) {
  const saltRounds = 10  // Higher = more secure but slower
  return await bcrypt.hash(plainPassword, saltRounds)
}

// Store in database
user.password = await hashPassword(plainPassword)
user.passwordLastChanged = new Date()
```

### **Password Verification (On Login)**

```javascript
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword)
}

// In login endpoint
const isCorrect = await verifyPassword(
  req.body.password,
  user.password
)
```

### **Password Change**

```javascript
// PUT /auth/change-password
// Request
{
  currentPassword: "oldPassword123",
  newPassword: "newPassword456",
  confirmPassword: "newPassword456"
}

// Validation:
1. User must be authenticated
2. Verify currentPassword against user.password
3. Validate newPassword meets requirements
4. Check newPassword !== currentPassword
5. Check newPassword === confirmPassword
6. Hash newPassword
7. Update user.password
8. Increment user.tokenVersion (invalidates all existing refresh tokens)
9. Clear all refresh tokens (force re-login on all devices)
10. Return success message

// Response
{
  success: true,
  message: "Password changed successfully. Please login again."
}
```

### **Password Reset (By Super Admin)**

```javascript
// POST /auth/reset-password (Super Admin only)
// Request
{
  userId: "60d5ec49f1234567890abcde",
  newPassword: "tempPassword123"
}

// Actions:
1. Super admin only check
2. Find user by userId
3. Hash newPassword
4. Update user.password
5. Increment user.tokenVersion
6. Clear all refresh tokens
7. Optionally send email with temp password
8. Mark user.passwordLastChanged

// Response
{
  success: true,
  message: "Password reset. User must login with new password."
}
```

---

## **Token Storage (Client-Side)**

### **Secure Approach (Recommended)**

```javascript
// Backend sets HTTP-only cookies
// Frontend does NOT have direct access to tokens

// Automatic inclusion in requests via cookies
axios.defaults.withCredentials = true

// Tokens are never exposed to JavaScript
// Protection against XSS attacks
```

### **Frontend Token Handling**

```javascript
// DO NOT STORE TOKENS IN LOCALSTORAGE
// localStorage is vulnerable to XSS attacks

// Instead, rely on HTTP-only cookies

// Check authentication status via protected API call
useEffect(() => {
  api.get('/auth/me')
    .then(res => setUser(res.data.user))
    .catch(err => setIsAuthenticated(false))
}, [])
```

---

## **API Request Authentication**

### **Request with Access Token**

```javascript
// Automatic via HTTP-only cookie
GET /api/trips
Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// OR manual if using Authorization header
GET /api/trips
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Server-Side Token Verification**

```javascript
// Middleware: requireAuth
async function requireAuth(req, res, next) {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.auth_token || 
                  req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'No authentication token provided' }
      })
    }
    
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      branchId: decoded.branchId
    }
    
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expired' }
      })
    }
    
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    })
  }
}

// Usage in routes
router.get('/trips', requireAuth, getTripHandler)
```

---

## **Token Refresh on Expiration**

### **Automatic Refresh Flow**

```javascript
// Response interceptor handles token expiration
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    
    // If 401 and not yet retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Call refresh endpoint
        const response = await api.post('/auth/refresh', {
          refreshToken: getRefreshTokenFromCookie()
        })
        
        // New token will be set as cookie automatically
        // Retry original request with new token
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)
```

---

## **Security Best Practices**

### **Backend**

1. **Always use HTTPS** (never HTTP)
   ```
   process.env.NODE_ENV === 'production' → enforce HTTPS
   ```

2. **Set secure cookie flags**
   ```javascript
   res.cookie('auth_token', token, {
     httpOnly: true,      // Not accessible to JavaScript
     secure: true,        // Only sent over HTTPS
     sameSite: 'Strict',  // CSRF protection
     maxAge: 24 * 60 * 60 * 1000  // 24 hours
   })
   ```

3. **Validate all inputs**
   ```javascript
   // Email format
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   if (!emailRegex.test(email)) throw new Error('Invalid email')
   
   // Password length
   if (password.length < 8) throw new Error('Password too short')
   ```

4. **Rate limiting on login**
   ```javascript
   // Prevent brute force attacks
   app.use('/auth/login', rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     max: 5  // max 5 attempts
   }))
   ```

5. **Rotate refresh tokens**
   ```javascript
   // Old refresh token invalidated after new one issued
   user.refreshTokens = [newRefreshToken]
   ```

6. **Never log passwords**
   ```javascript
   // ❌ DON'T
   console.log(password)
   
   // ✅ DO
   console.log('Login attempt for email:', email)
   ```

### **Frontend**

1. **Never store tokens in localStorage**
   ```javascript
   // ❌ DON'T
   localStorage.setItem('token', jwtToken)
   
   // ✅ DO
   // Rely on HTTP-only cookies
   ```

2. **Clear cookies on logout**
   ```javascript
   // Backend clears cookies
   res.clearCookie('auth_token')
   res.clearCookie('refresh_token')
   ```

3. **Prevent XSS attacks**
   ```javascript
   // Sanitize user input
   import DOMPurify from 'dompurify'
   const cleanText = DOMPurify.sanitize(userInput)
   ```

4. **Prevent CSRF attacks**
   ```javascript
   // Set SameSite cookie flag (backend)
   // Use state parameter in OAuth (if using)
   ```

---

## **Session Management**

### **Session Timeout**

```javascript
// Access token: 24 hours
// User must re-authenticate after 24 hours

// Refresh token: 7 days
// User can extend session within 7 days without re-entering password

// Remember Device: 30 days (if checked on login)
// User doesn't need to re-authenticate for 30 days on this device
```

### **Detect Session Expiration**

```javascript
// Option 1: Check token expiration time
const isTokenExpired = () => {
  const decoded = jwt_decode(token)
  return decoded.exp * 1000 < Date.now()
}

// Option 2: Catch 401 response on any API call
// Interceptor will refresh token automatically

// Option 3: Redirect to login after inactivity
useEffect(() => {
  const timer = setTimeout(() => {
    // Auto-logout after 30 mins inactivity
    logout()
  }, 30 * 60 * 1000)
  
  return () => clearTimeout(timer)
}, [lastActivity])
```

---

## **Multi-Device Sessions (Future Enhancement)**

### **Track Active Sessions**

```javascript
// User.activeSessions
[
  {
    deviceId: "uuid",
    deviceName: "Chrome on MacBook",
    ipAddress: "192.168.1.100",
    lastActive: "2024-01-15T10:30:00Z",
    createdAt: "2024-01-10T08:15:00Z"
  },
  {
    deviceId: "uuid",
    deviceName: "Safari on iPhone",
    ipAddress: "203.45.67.89",
    lastActive: "2024-01-14T15:22:00Z",
    createdAt: "2024-01-12T09:45:00Z"
  }
]
```

### **View & Logout Other Sessions**

```javascript
// GET /auth/sessions
// Returns list of all active sessions

// POST /auth/sessions/:sessionId/logout
// Logout specific session (invalidates that device's refresh tokens)
```

---

## **Error Messages**

| Error | Status | Message |
|-------|--------|---------|
| Invalid email/password | 401 | "Invalid email or password" |
| Account locked | 401 | "Account locked. Try again in 30 minutes" |
| Account inactive | 403 | "Your account is inactive" |
| Account suspended | 403 | "Your account has been suspended" |
| Token expired | 401 | "Session expired. Please log in again" |
| Invalid token | 401 | "Invalid session token" |
| No token provided | 401 | "Authentication required" |
| Insufficient permission | 403 | "You don't have permission for this action" |

