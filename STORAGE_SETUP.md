
# 📁 Persistent File Storage Setup Guide

This guide explains how to configure persistent file storage for the ScripTrack application to prevent file loss during redeployments.

## 🚨 The Problem

By default, uploaded files (script files, cover images, etc.) are stored in the local `uploads` directory. **This directory is ephemeral and gets wiped during every redeployment**, causing all user-uploaded files to be permanently lost.

## ✅ The Solution

Configure AWS S3 cloud storage to provide persistent file storage that survives redeployments.

## 🛠️ Setup Instructions

### Step 1: Create AWS S3 Bucket

1. Log in to your AWS Console
2. Navigate to S3 service
3. Create a new bucket with these settings:
   - **Bucket name**: Choose a unique name (e.g., `scriptrack-files-prod`)
   - **Region**: Choose your preferred region (default: `us-east-1`)
   - **Public access**: Block all public access (we'll configure specific permissions)
   - **Versioning**: Enable (recommended for file recovery)

### Step 2: Configure Bucket Permissions

Set up bucket policy for public read access to uploaded files:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

### Step 3: Create IAM User

1. Navigate to IAM service in AWS Console
2. Create a new user with these settings:
   - **User name**: `scriptrack-storage`
   - **Access type**: Programmatic access
3. Attach this inline policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

4. Save the **Access Key ID** and **Secret Access Key**

### Step 4: Update Environment Variables

Add these configuration values to your `.env` file:

```env
# AWS S3 Configuration for Persistent File Storage
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET="your-bucket-name"
AWS_REGION="us-east-1"
CDN_BASE_URL=""  # Optional: CloudFront distribution URL
```

### Step 5: (Optional) Setup CloudFront CDN

For better performance and caching:

1. Create a CloudFront distribution
2. Set S3 bucket as origin
3. Configure caching behaviors
4. Add the CloudFront URL to `CDN_BASE_URL` in `.env`

## 🔄 Migration from Local Storage

If you have existing files in local storage, migrate them to persistent storage:

### Check Current Status
```bash
yarn tsx scripts/storage-status.ts
```

### Run Migration
```bash
yarn tsx scripts/migrate-to-persistent-storage.ts
```

### Clean Up (Optional)
After successful migration and verification:
```bash
rm -rf uploads/
```

## ✅ Verification

1. Upload a test file through the application
2. Check that it appears in your S3 bucket
3. Verify the file can be downloaded/viewed
4. Simulate a deployment and confirm files persist

## 🚨 Critical Notes

- **Without S3 configuration**: Files are stored locally and **WILL BE LOST** on redeployment
- **With S3 configuration**: Files are stored persistently and survive all redeployments
- **Existing files**: Must be migrated using the migration script
- **Cost**: S3 storage incurs costs based on storage and data transfer (typically very low for most applications)

## 🔧 Troubleshooting

### Files not uploading to S3
- Check AWS credentials in `.env`
- Verify bucket permissions
- Check IAM user policies
- Review application logs for S3 errors

### Files returning 404
- Verify bucket policy allows public read access
- Check file URLs in database
- Ensure bucket name matches configuration

### Migration fails
- Verify local files exist in `uploads/` directory
- Check S3 credentials and permissions
- Review migration script output for specific errors

## 📊 Monitoring

Use the storage status script to monitor your storage configuration:

```bash
yarn tsx scripts/storage-status.ts
```

This shows:
- Configuration status
- File distribution (local vs cloud)
- Total storage usage
- Setup recommendations

## 🎯 Production Deployment Checklist

- [ ] S3 bucket created and configured
- [ ] IAM user created with proper permissions
- [ ] Environment variables configured
- [ ] CloudFront CDN setup (optional but recommended)
- [ ] Existing files migrated to persistent storage
- [ ] File upload/download tested
- [ ] Local uploads directory cleaned up
- [ ] Deployment verified to preserve files

---

**⚠️ IMPORTANT**: Configure persistent storage BEFORE deploying to production to prevent data loss!
