# MongoDB Atlas Setup Guide

This guide will help you migrate from local MongoDB to MongoDB Atlas (cloud database).

## Why MongoDB Atlas?

- ✅ **Free tier available** (512MB storage)
- ✅ **Cloud-hosted** - accessible from anywhere
- ✅ **Automatic backups**
- ✅ **Easy scaling**
- ✅ **No server maintenance required**

## Step-by-Step Setup

### 1. Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with your email or Google account
3. Choose the **FREE** tier (M0 Sandbox)
4. Select a cloud provider and region closest to you
5. Click "Create Cluster" (takes 3-5 minutes)

### 2. Create Database User

1. In Atlas dashboard, go to **Database Access** (left sidebar)
2. Click "Add New Database User"
3. Choose **Password** authentication
4. Enter username and password (save these!)
5. Set privileges to **Read and write to any database**
6. Click "Add User"

### 3. Configure Network Access

1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's IP address
5. Click "Confirm"

### 4. Get Connection String

1. Go to **Database** (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select **Driver: Node.js** and **Version: 5.5 or later**
5. Copy the connection string (looks like this):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 5. Update Your Backend

1. Edit `/app/backend/.env`:
   ```env
   MONGO_URL="mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
   DB_NAME="kuber_inventory"
   ```

2. **Important**: Replace:
   - `<username>` with your database username
   - `<password>` with your database password
   - `cluster0.xxxxx` with your actual cluster URL

3. Restart backend:
   ```bash
   sudo supervisorctl restart backend
   ```

### 6. Migrate Existing Data (Optional)

If you want to move your current local data to Atlas:

#### Option A: Using mongodump/mongorestore

```bash
# Export from local MongoDB
mongodump --db=test_database --out=/tmp/backup

# Import to Atlas
mongorestore --uri="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/" --db=kuber_inventory /tmp/backup/test_database
```

#### Option B: Re-run Seed Script

```bash
# This will create fresh data in Atlas
cd /app/backend
python seed.py
```

### 7. Verify Connection

Check backend logs:
```bash
tail -f /var/log/supervisor/backend.err.log
```

You should see:
```
INFO:     Application startup complete.
```

Test the app:
1. Login at http://localhost:3000
2. Check if products are loading
3. Test chatbot

## Troubleshooting

### Error: "Authentication failed"
- Double-check username and password in connection string
- Make sure password doesn't contain special characters (or URL-encode them)

### Error: "IP not whitelisted"
- Go to Network Access in Atlas
- Add 0.0.0.0/0 for testing
- For production, add your server's IP

### Error: "Connection timeout"
- Check your internet connection
- Verify the cluster is running (green status in Atlas)
- Try a different region cluster

### Empty Database After Migration
- Run seed script: `cd /app/backend && python seed.py`
- Or manually add products through the UI

## Connection String Format Examples

### Local MongoDB
```env
MONGO_URL="mongodb://localhost:27017"
```

### MongoDB Atlas
```env
MONGO_URL="mongodb+srv://admin:mypassword123@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority"
```

### MongoDB Atlas with Special Characters in Password
If your password contains special characters like `@`, `#`, `$`, URL-encode them:
```
@ → %40
# → %23
$ → %24
```

Example:
```env
# Password: pass@word#123
MONGO_URL="mongodb+srv://admin:pass%40word%23123@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority"
```

## Production Checklist

- [ ] Create MongoDB Atlas cluster
- [ ] Add database user with strong password
- [ ] Configure network access (specific IPs only)
- [ ] Update MONGO_URL in production environment variables
- [ ] Test all features (auth, products, categories, chatbot)
- [ ] Set up automated backups in Atlas
- [ ] Monitor database usage in Atlas dashboard

## Cost

**Free Tier (M0)**:
- 512 MB storage
- Shared RAM
- Shared CPU
- No credit card required
- Perfect for development and small production apps

**Paid Tiers** (if you need more):
- M2: $9/month (2GB storage)
- M5: $25/month (5GB storage)
- M10+: Starts at $57/month (dedicated cluster)

## Support

- MongoDB Atlas Docs: https://www.mongodb.com/docs/atlas/
- Community Forum: https://www.mongodb.com/community/forums/
- Atlas Status: https://status.cloud.mongodb.com/

---

**Ready to migrate?** Just update your `.env` file with the Atlas connection string and restart the backend!
