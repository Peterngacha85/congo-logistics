# Deployment & Infrastructure

---

## **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                  Client (React)                             │
│  ├─ Hosted on: CDN (CloudFront/Vercel/Netlify)            │
│  └─ Domain: app.congologistics.com                         │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTPS
                    ↓
┌─────────────────────────────────────────────────────────────┐
│               Load Balancer (SSL/TLS)                       │
│  └─ Terminates HTTPS, routes to backend servers           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────┐
│             Backend (Node.js + Express)                     │
│  ├─ Server 1: app1.congologistics.com:3000                │
│  ├─ Server 2: app2.congologistics.com:3000                │
│  └─ Server 3: app3.congologistics.com:3000                │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
┌─────────────┐ ┌───────────────────┐ ┌──────────────────┐
│   Database  │ │  File Storage     │ │  Redis Cache     │
│  MongoDB    │ │  (AWS S3/Azure)   │ │  (For sessions)  │
│             │ │  (PDF invoices)   │ │                  │
└─────────────┘ └───────────────────┘ └──────────────────┘
```

---

## **Hosting Options**

### **Option 1: AWS (Recommended for Production)**

**Pros:**
- Highly scalable
- Global availability
- Multiple deployment options (EC2, ECS, Lambda)
- Reliable and mature

**Services:**
- **EC2** or **ECS**: Backend containers
- **RDS MongoDB**: Database (or DocumentDB for AWS-managed)
- **S3**: File storage for PDFs
- **CloudFront**: CDN for frontend
- **Route 53**: DNS
- **CloudWatch**: Monitoring & logs
- **Backup**: Automated daily backups

**Cost:** ~$500-2000/month (depending on scale)

---

### **Option 2: DigitalOcean (Good for MVP)**

**Pros:**
- Cheaper than AWS
- Simple deployment
- Good for small to medium apps

**Services:**
- **Droplets**: Backend servers
- **Managed MongoDB**: Database (or self-hosted)
- **Spaces**: S3-compatible file storage
- **App Platform**: Automatic deployments

**Cost:** ~$100-300/month

---

### **Option 3: Azure (Alternative to AWS)**

**Services:**
- **App Service**: Backend
- **Cosmos DB**: Database
- **Blob Storage**: File storage
- **CDN**: Frontend distribution

---

## **Environment Configuration**

### **Environment Variables (.env)**

```bash
# Database
MONGODB_URI=mongodb://user:pass@host:27017/congo_logistics_db
MONGODB_REPLICA_SET=rs0  # For backup/recovery

# JWT
JWT_SECRET=long-random-string-at-least-32-characters
JWT_EXPIRE_TIME=86400  # 24 hours in seconds
JWT_REFRESH_EXPIRE_TIME=604800  # 7 days

# API
API_PORT=3000
API_URL=https://api.congologistics.com
FRONTEND_URL=https://app.congologistics.com

# AWS/File Storage
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=eu-west-1  # Closest to Congo
AWS_S3_BUCKET=congo-logistics-invoices

# Email (Optional, Phase 2)
SENDGRID_API_KEY=xxxxx
MAIL_FROM=noreply@congologistics.com

# Redis (Session store)
REDIS_URL=redis://user:pass@host:6379

# Logging
LOG_LEVEL=info
SENTRY_DSN=xxxxx  # Error tracking

# Environment
NODE_ENV=production
```

---

## **Database Setup**

### **MongoDB Deployment**

**Option 1: AWS DocumentDB (Managed)**
```
- Fully managed MongoDB-compatible service
- Automatic backups
- Multi-AZ for high availability
- Good for production

Cost: ~$300/month
```

**Option 2: MongoDB Atlas (Managed)**
```
- MongoDB's own cloud service
- Global distribution
- Free tier available for development
- Charges based on data transferred

Cost: ~$57/month (M10 cluster)
```

**Option 3: Self-Hosted on EC2**
```
- Full control
- Lower cost
- Requires manual backup & maintenance

Cost: ~$50/month (EC2 instance)
```

### **Database Initialization**

```bash
# Connect to MongoDB
mongo mongodb://user:pass@host:27017/congo_logistics_db

# Create indexes (performance critical)
db.trips.createIndex({ branchId: 1 })
db.trips.createIndex({ status: 1 })
db.trips.createIndex({ dateLoaded: 1 })
db.trips.createIndex({ truckNumber: 1 })
db.trips.createIndex({ transporterName: 1 })
db.trips.createIndex({ branchId: 1, status: 1 })

db.users.createIndex({ email: 1 }, { unique: true })

db.invoices.createIndex({ invoiceNumber: 1 }, { unique: true })

db.auditlogs.createIndex({ entityId: 1, timestamp: -1 })
db.auditlogs.createIndex({ userId: 1, timestamp: -1 })

# Create initial super admin user (script)
db.users.insertOne({
  firstName: "Admin",
  lastName: "User",
  email: "admin@congologistics.com",
  password: "$2b$10$...",  // bcrypt hash
  role: "SUPER_ADMIN",
  status: "ACTIVE",
  createdAt: new Date()
})
```

### **Backup Strategy**

```
Daily automated backups:
- Time: 02:00 UTC (off-peak)
- Retention: 30 days
- Storage: AWS S3 (different region for disaster recovery)

Weekly full backup:
- Stored indefinitely
- Tested monthly for restore capability

Manual backup before major changes
```

---

## **Frontend Deployment**

### **Option 1: Vercel (Recommended)**

**Setup:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Environment variables set in Vercel dashboard
REACT_APP_API_URL=https://api.congologistics.com
```

**Features:**
- Automatic deployments from GitHub
- Preview deployments for PRs
- Built-in HTTPS
- Analytics included
- ~$20/month (for production deployment)

### **Option 2: Netlify**

```bash
npm install -g netlify-cli

netlify deploy --prod --dir=build
```

**Cost:** ~$20/month

### **Option 3: Self-hosted on AWS CloudFront + S3**

```bash
# Build React app
npm run build

# Upload to S3
aws s3 sync build/ s3://congo-logistics-frontend/

# CloudFront distribution serves it globally
# Cost: ~$50/month
```

---

## **Backend Deployment**

### **Option 1: AWS ECS (Container Deployment)**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```bash
# Build image
docker build -t congo-logistics-api .

# Push to AWS ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin xxxxx.dkr.ecr.eu-west-1.amazonaws.com

docker tag congo-logistics-api:latest xxxxx.dkr.ecr.eu-west-1.amazonaws.com/congo-logistics-api:latest
docker push xxxxx.dkr.ecr.eu-west-1.amazonaws.com/congo-logistics-api:latest

# Deploy via ECS task
# AWS handles auto-scaling, load balancing, health checks
```

**Cost:** ~$150-300/month (3 instances)

### **Option 2: DigitalOcean App Platform**

```yaml
# app.yaml
name: congo-logistics-api
services:
  - name: api
    github:
      branch: main
      repo: username/congo-logistics
    build_command: npm ci
    run_command: npm start
    envs:
      - key: MONGODB_URI
        value: ${db.connection_string}
      - key: JWT_SECRET
        value: ${jwt_secret}
    source_dir: server
    health_check:
      http_path: /health
    http_port: 3000

databases:
  - name: mongo
    engine: MONGODB
```

**Cost:** ~$100-200/month

---

## **SSL/TLS Certificate**

```
All traffic must be HTTPS

Option 1: AWS ACM (Recommended)
- Free
- Auto-renewal
- Automatic provisioning via CloudFront

Option 2: Let's Encrypt
- Free
- Auto-renewal via certbot
- Good for self-hosted

Domains to secure:
- api.congologistics.com
- app.congologistics.com
- *.congologistics.com
```

---

## **CI/CD Pipeline**

### **GitHub Actions (Recommended)**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to AWS
        run: |
          aws ecr get-login-password --region eu-west-1 | \
            docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.eu-west-1.amazonaws.com
          
          docker build -t congo-logistics-api:${{ github.sha }} .
          docker tag congo-logistics-api:${{ github.sha }} ${{ secrets.ECR_REGISTRY }}/congo-logistics-api:latest
          docker push ${{ secrets.ECR_REGISTRY }}/congo-logistics-api:latest
          
          # Update ECS service
          aws ecs update-service --cluster congo-prod --service api --force-new-deployment
      
      - name: Deploy Frontend
        run: |
          npm run build:frontend
          aws s3 sync client/build s3://congo-logistics-frontend/
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"

  notify:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"✅ Production deployment successful!"}'
```

---

## **Monitoring & Logging**

### **Error Tracking (Sentry)**

```javascript
// server.js
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})

app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())
```

**Cost:** ~$29/month (free tier available)

### **Application Monitoring (DataDog)**

```javascript
// Track performance metrics
import StatsD from 'node-statsd'

const client = new StatsD()

// Track API response time
const start = Date.now()
res.on('finish', () => {
  const duration = Date.now() - start
  client.timing('http.request.duration', duration)
})
```

**Cost:** ~$15/month

### **Logs (CloudWatch)**

```
All logs automatically captured by AWS CloudWatch
- Application logs
- Error logs
- API request/response logs
- Database queries
- Retention: 30 days (configurable)
```

---

## **Health Checks & Alerts**

### **Health Check Endpoint**

```javascript
// GET /health
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await mongoose.connection.db.admin().ping()
    
    // Check Redis connection
    const redisPing = await redis.ping()
    
    res.json({
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      database: 'connected',
      cache: 'connected'
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message
    })
  }
})
```

### **Uptime Monitoring**

```
Service: UptimeRobot (free tier available)

Monitor:
- https://app.congologistics.com (frontend)
- https://api.congologistics.com/health (backend)

Alert:
- Email if either is down
- Slack notification
- Page Slack channel: #congo-alerts
```

---

## **Disaster Recovery**

### **Backup & Restore**

```bash
# Daily automated backup to S3
# Tested monthly with restore to staging environment

# Manual restore (if needed)
mongorestore --uri="mongodb://user:pass@host:27017" \
  --archive=backup-2024-01-15.archive

# RTO (Recovery Time Objective): < 4 hours
# RPO (Recovery Point Objective): 24 hours
```

### **Failover Procedure**

```
1. Monitoring detects API down
2. Slack alert sent
3. Auto-recovery: ECS redeploys container
4. If still down, team notified

Failover Time: < 5 minutes
```

---

## **Security in Production**

### **Database Security**

```
- VPC: Database only accessible from backend servers
- Authentication: Username/password required
- Encryption: At-rest encryption enabled
- Backups: Encrypted and stored in separate region
- No public internet access
```

### **API Security**

```
- HTTPS only (no HTTP)
- Rate limiting: 100 requests per 15 minutes
- CORS: Only accept from app.congologistics.com
- Input validation: All inputs validated server-side
- JWT: Tokens signed and verified
```

### **Secrets Management**

```bash
# Use AWS Secrets Manager or similar
# Never commit secrets to GitHub

# Example: Store in AWS Secrets Manager
aws secretsmanager create-secret --name congo-api-jwt-secret \
  --secret-string "long-random-secret-key"

# Retrieve in application
const secret = await aws.secretsManager.getSecretValue({
  SecretId: 'congo-api-jwt-secret'
})
```

---

## **Scaling Plan**

### **Phase 1: MVP (0-50 trucks, 2-3 branches)**
- Single backend server
- Managed MongoDB
- No caching needed
- Cost: ~$200/month

### **Phase 2: Growth (50-200 trucks, 5-10 branches)**
- 3 backend servers with load balancer
- Add Redis for caching
- Implement CDN for frontend
- Cost: ~$500/month

### **Phase 3: Mature (200+ trucks, 20+ branches)**
- 5+ backend servers with auto-scaling
- Database sharding/replication
- Advanced monitoring
- Cost: ~$1500+/month

---

## **Deployment Checklist**

Before going live:

- [ ] Database backups automated and tested
- [ ] SSL certificate provisioned
- [ ] Monitoring & alerting configured
- [ ] Error tracking (Sentry) integrated
- [ ] Performance baseline established
- [ ] Load testing completed (1000+ concurrent users)
- [ ] Security audit passed
- [ ] API documentation up-to-date
- [ ] Runbooks created for common issues
- [ ] On-call rotation established
- [ ] Support contact documented
- [ ] DDoS protection enabled
- [ ] Rate limiting configured
- [ ] Log retention policy set

