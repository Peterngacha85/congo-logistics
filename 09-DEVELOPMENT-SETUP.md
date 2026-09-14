# Development Setup & Workflow

---

## **Prerequisites**

### **Required Software**

```bash
# Node.js (v18+)
# Download: https://nodejs.org/
node --version  # v18.x.x or higher

# npm or yarn
npm --version  # v9.x.x

# Git
git --version  # v2.x.x

# MongoDB (local or MongoDB Atlas)
# Download: https://www.mongodb.com/try/download/community
# Or use MongoDB Atlas cloud: https://www.mongodb.com/cloud/atlas

# Visual Studio Code (recommended)
# Download: https://code.visualstudio.com/

# Postman or Insomnia (API testing)
# Download: https://www.insomnia.rest/
```

---

## **Project Setup**

### **1. Clone Repository**

```bash
git clone https://github.com/your-org/congo-logistics.git
cd congo-logistics
```

### **2. Environment Setup**

```bash
# Create .env file in root
cp .env.example .env

# Create .env file in client
cp client/.env.example client/.env

# Create .env file in server
cp server/.env.example server/.env
```

### **3. Backend Setup**

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start MongoDB locally (if using local MongoDB)
# macOS with Homebrew:
brew services start mongodb-community

# Windows:
# Open MongoDB Service in Services app

# Verify MongoDB is running:
mongosh  # Opens MongoDB shell, type: exit

# Start backend server
npm run dev

# Expected output:
# ✅ Server running on http://localhost:5000
# ✅ Connected to MongoDB: congo_logistics_db
# ✅ JWT Secret configured
```

### **4. Frontend Setup**

```bash
# Open new terminal
cd client

# Install dependencies
npm install

# Start React dev server
npm start

# Expected output:
# ✅ Compiled successfully!
# ✅ Local: http://localhost:3000
```

### **5. Verify Setup**

```bash
# Test backend API
curl http://localhost:5000/api/v1/health

# Response should be:
{
  "status": "ok",
  "database": "connected"
}

# Open frontend in browser
# http://localhost:3000
# Should see login page
```

---

## **Environment Variables**

### **Server (.env)**

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/congo_logistics_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE_TIME=86400
JWT_REFRESH_EXPIRE_TIME=604800

# Server
NODE_ENV=development
API_PORT=5000
API_URL=http://localhost:5000

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# File Upload (optional, for invoices)
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_S3_BUCKET=congo-logistics-dev

# Email (optional, phase 2)
SENDGRID_API_KEY=your_key_here

# Logging
LOG_LEVEL=debug
```

### **Client (.env)**

```bash
REACT_APP_API_URL=http://localhost:5000/api/v1
```

---

## **Project Structure**

### **Backend Directory Tree**

```
server/
├── src/
│   ├── models/
│   │   ├── Trip.js
│   │   ├── User.js
│   │   ├── Invoice.js
│   │   ├── AuditLog.js
│   │   └── ...
│   ├── routes/
│   │   ├── trips.js
│   │   ├── auth.js
│   │   ├── invoices.js
│   │   └── ...
│   ├── controllers/
│   │   ├── tripController.js
│   │   ├── authController.js
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── ...
│   ├── services/
│   │   ├── invoiceService.js
│   │   ├── emailService.js
│   │   └── ...
│   ├── config/
│   │   ├── database.js
│   │   └── constants.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

### **Frontend Directory Tree**

```
client/
├── src/
│   ├── components/
│   │   ├── Common/
│   │   ├── Auth/
│   │   ├── Trips/
│   │   ├── Invoices/
│   │   └── ...
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── ...
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── TripsContext.jsx
│   │   └── ...
│   ├── services/
│   │   ├── api.js
│   │   ├── tripService.js
│   │   └── ...
│   ├── utils/
│   ├── styles/
│   ├── App.jsx
│   └── index.js
├── public/
├── .env
├── package.json
└── README.md
```

---

## **Running the Application**

### **Terminal 1: Backend**

```bash
cd server
npm run dev

# Output:
# Server running on port 5000
# Connected to MongoDB
```

### **Terminal 2: Frontend**

```bash
cd client
npm start

# Automatically opens http://localhost:3000
```

### **Terminal 3: MongoDB (if local)**

```bash
mongosh

# Keep this open to monitor database
```

---

## **Database Initialization**

### **Create Seed Data**

```bash
# Navigate to server
cd server

# Run seed script (create test data)
npm run seed

# Creates:
# - 1 Super Admin user
# - 2 Branch Manager users
# - 3 Sample branches
# - 10 Sample trips
# - Sample invoice data
```

### **Seed Script (server/scripts/seed.js)**

```javascript
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../src/models/User')
const Branch = require('../src/models/Branch')
const Trip = require('../src/models/Trip')

async function seed() {
  try {
    // Clear existing data
    await User.deleteMany({})
    await Branch.deleteMany({})
    await Trip.deleteMany({})
    
    // Create branches
    const branches = await Branch.insertMany([
      {
        branchCode: 'KIN-001',
        branchName: 'Kinshasa Hub',
        location: 'Kinshasa',
        address: 'Avenue Kasavubu',
        isActive: true
      },
      {
        branchCode: 'LUB-001',
        branchName: 'Lubumbashi Terminal',
        location: 'Lubumbashi',
        address: 'Rue Bakaike',
        isActive: true
      }
    ])
    
    // Create super admin
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: adminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    })
    
    // Create branch managers
    const managerPassword = await bcrypt.hash('manager123', 10)
    const managers = await User.insertMany([
      {
        firstName: 'John',
        lastName: 'Manager',
        email: 'john@test.com',
        password: managerPassword,
        role: 'BRANCH_MANAGER',
        branchId: branches[0]._id,
        status: 'ACTIVE'
      },
      {
        firstName: 'Jane',
        lastName: 'Manager',
        email: 'jane@test.com',
        password: managerPassword,
        role: 'BRANCH_MANAGER',
        branchId: branches[1]._id,
        status: 'ACTIVE'
      }
    ])
    
    // Create sample trips
    await Trip.insertMany([
      {
        tripNumber: 'TRIP-2024-001-KIN',
        truckNumber: '1093AX05',
        transporterName: 'Ahmed Hassan',
        loadingPoint: 'Kinshasa Port',
        offloadingPoint: 'Lubumbashi Warehouse',
        dateLoaded: new Date('2024-01-10'),
        dateOffloaded: new Date('2024-01-12'),
        transportationRate: 1000000,
        dieselPerTrip: 500000,
        mileageCash: 200000,
        serviceFee: 85000,
        totalAmount: 1785000,
        status: 'PENDING',
        branchId: branches[0]._id,
        createdBy: managers[0]._id
      }
    ])
    
    console.log('✅ Database seeded successfully!')
    console.log('\nTest Credentials:')
    console.log('Super Admin - Email: admin@test.com, Password: admin123')
    console.log('Manager 1 - Email: john@test.com, Password: manager123')
    console.log('Manager 2 - Email: jane@test.com, Password: manager123')
  } catch (error) {
    console.error('❌ Seed error:', error)
  } finally {
    await mongoose.connection.close()
  }
}

seed()
```

### **Run Seed**

```bash
node scripts/seed.js

# Output:
# ✅ Database seeded successfully!
# 
# Test Credentials:
# Super Admin - Email: admin@test.com, Password: admin123
# Manager 1 - Email: john@test.com, Password: manager123
# Manager 2 - Email: jane@test.com, Password: manager123
```

---

## **Testing**

### **Backend Tests**

```bash
cd server

# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.js

# Run with coverage
npm test -- --coverage
```

### **Test Example (Jest)**

```javascript
// server/tests/auth.test.js
const request = require('supertest')
const app = require('../src/server')

describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john@test.com',
        password: 'manager123'
      })
    
    expect(response.status).toBe(200)
    expect(response.body.token).toBeDefined()
    expect(response.body.user.email).toBe('john@test.com')
  })
  
  it('should fail with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john@test.com',
        password: 'wrongpassword'
      })
    
    expect(response.status).toBe(401)
    expect(response.body.error).toBeDefined()
  })
})
```

### **Frontend Tests**

```bash
cd client

# Run tests
npm test

# Run specific test
npm test -- TripForm.test.jsx
```

---

## **API Testing with Postman**

### **Setup Postman Collection**

1. Download Postman: https://www.postman.com/
2. Import collection: `postman-collection.json` (included in repo)
3. Set environment variables:
   ```
   base_url: http://localhost:5000/api/v1
   token: (auto-populated after login)
   ```

### **Test Endpoints**

```
1. POST /auth/login
   Body: {
     "email": "john@test.com",
     "password": "manager123"
   }

2. GET /trips
   Headers: Authorization: Bearer <token>

3. POST /trips
   Body: {
     "truckNumber": "1093AX05",
     "transportationRate": 1000000,
     ...
   }
```

---

## **Common Development Commands**

### **Backend**

```bash
cd server

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format

# Seed database
npm run seed

# Clear database
npm run db:reset

# View MongoDB with MongoDB Compass
# Connection: mongodb://localhost:27017
```

### **Frontend**

```bash
cd client

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Run linter
npm run lint

# Format code
npm run format

# Analyze bundle size
npm run analyze
```

---

## **Debugging**

### **Backend Debugging**

```bash
# Run with Node debugger
node --inspect-brk server/src/server.js

# Open browser: chrome://inspect
# Click "inspect" to open DevTools

# Or use VS Code Debugger:
# Install extension: Debugger for Chrome
# Add breakpoints in code
# Run npm run dev and click Debug button
```

### **Frontend Debugging**

```bash
# React DevTools browser extension recommended
# Install: https://react-devtools-tutorial.vercel.app/

# VS Code Debugger for Chrome:
# Press F5 to start debugging
# Set breakpoints in code
```

### **Database Debugging**

```bash
# Connect to MongoDB with MongoDB Compass
# Download: https://www.mongodb.com/products/tools/compass

# GUI to explore collections and run queries
```

---

## **VS Code Extensions (Recommended)**

```
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- MongoDB for VS Code
- Thunder Client (or REST Client)
- Postman
- GitLens
- Better Comments
```

**Install in VS Code:**
```
ext install dsznajder.es7-react-js-snippets
ext install esbenp.prettier-vscode
ext install dbaeumer.vscode-eslint
ext install mongodb.mongodb-vscode
ext install rangav.vscode-thunder-client
```

---

## **Git Workflow**

### **Branch Naming Convention**

```
feature/trip-creation     # New feature
bugfix/invoice-calculation # Bug fix
chore/update-dependencies # Maintenance
docs/api-documentation    # Documentation
```

### **Commit Convention**

```
feat: Add trip creation API
fix: Correct invoice calculation
docs: Update README
chore: Update dependencies
```

### **Workflow**

```bash
# Create feature branch
git checkout -b feature/trip-creation

# Make changes
# Test locally
# Commit changes
git add .
git commit -m "feat: Add trip creation API"

# Push to remote
git push origin feature/trip-creation

# Create Pull Request on GitHub
# Request review from team member
# Address review comments
# Merge to main after approval
```

---

## **Troubleshooting**

### **Problem: "Cannot connect to MongoDB"**

```bash
# Solution 1: Check MongoDB is running
brew services start mongodb-community

# Solution 2: Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/congo_logistics_db

# Solution 3: Use MongoDB Atlas (cloud)
# Create account at https://www.mongodb.com/cloud/atlas
# Get connection string and update .env
```

### **Problem: "Port 3000 already in use"**

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### **Problem: "npm install fails"**

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### **Problem: "CORS errors in browser console"**

```bash
# Check ALLOWED_ORIGINS in server/.env
ALLOWED_ORIGINS=http://localhost:3000

# Restart backend server
```

---

## **Performance Testing**

### **Load Testing with Apache Bench**

```bash
# Install Apache Bench (comes with Apache)
# macOS: brew install httpd

# Test 1000 requests with 10 concurrent
ab -n 1000 -c 10 http://localhost:5000/api/v1/trips

# Results show:
# - Requests per second
# - Time per request
# - Connection times
```

### **Performance Profiling**

```bash
# Generate CPU profile
node --prof server/src/server.js

# After running requests:
node --prof-process isolate-*.log > profile.txt

# View results
cat profile.txt
```

---

## **Documentation**

### **API Documentation (Swagger/OpenAPI)**

```bash
# Install Swagger
npm install swagger-jsdoc swagger-ui-express

# Access at: http://localhost:5000/api-docs
```

### **Code Documentation**

```javascript
/**
 * Create a new trip
 * @param {Object} tripData - Trip information
 * @param {string} tripData.truckNumber - Truck number (e.g., "1093AX05")
 * @param {number} tripData.transportationRate - Rate in CDF
 * @returns {Promise<Object>} Created trip object
 * @throws {Error} If validation fails
 */
async function createTrip(tripData) {
  // Implementation
}
```

---

## **Next Steps After Setup**

1. ✅ Understand the codebase (read README in each folder)
2. ✅ Create first feature branch
3. ✅ Run tests to ensure everything works
4. ✅ Make your first change
5. ✅ Test locally
6. ✅ Create Pull Request
7. ✅ Get code review
8. ✅ Deploy to staging
9. ✅ Deploy to production

---

## **Support Resources**

- **Node.js Docs:** https://nodejs.org/en/docs/
- **Express.js Docs:** https://expressjs.com/
- **React Docs:** https://react.dev/
- **MongoDB Docs:** https://docs.mongodb.com/
- **JWT Docs:** https://jwt.io/
- **Mongoose Docs:** https://mongoosejs.com/

