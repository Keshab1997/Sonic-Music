# Profile Image Upload Setup Guide

## ✅ Features Implemented

### 📸 **Image Upload Functionality**
- ✅ Take photo with camera
- ✅ Choose from photo library
- ✅ Image cropping (1:1 aspect ratio)
- ✅ Upload to Supabase Storage
- ✅ Update user metadata
- ✅ Display uploaded image
- ✅ Loading indicator during upload
- ✅ Permission handling
- ✅ Error handling

### 🎨 **UI Features**
- ✅ Camera button overlay on avatar
- ✅ Gradient avatar with initial letter
- ✅ Uploaded image display
- ✅ Upload progress indicator
- ✅ Alert dialogs for options
- ✅ Premium design

---

## 🔧 Supabase Setup

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **New Bucket**
4. Name: `profiles`
5. Check **Public bucket** ✅
6. Click **Create bucket**

### Step 2: Run SQL Script

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy the content from `supabase-storage-setup.sql`
3. Paste and run the script
4. This will create storage policies for:
   - Users can upload their own profile pictures
   - Profile pictures are publicly accessible
   - Users can update their own pictures
   - Users can delete their own pictures

### Step 3: Verify Setup

1. Go to **Storage** → **profiles** bucket
2. Check if bucket is created
3. Go to **Policies** tab
4. Verify 4 policies are created

---

## 📱 App Configuration

### Permissions Required

The app will automatically request these permissions:

**iOS (app.json):**
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Allow Sonic Bloom to access your photos to upload a profile picture.",
        "NSCameraUsageDescription": "Allow Sonic Bloom to use your camera to take a profile picture."
      }
    }
  }
}
```

**Android (app.json):**
```json
{
  "expo": {
    "android": {
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## 🚀 How It Works

### 1. **User Taps Avatar**
```
User taps on avatar → Alert shows options:
- Take Photo
- Choose from Library
- Cancel
```

### 2. **Image Selection**
```
User selects option → Permission check → Image picker opens
→ User selects/takes photo → Crop to 1:1 → Returns URI
```

### 3. **Upload Process**
```
1. Convert image URI to blob
2. Generate unique filename: {userId}-{timestamp}.{ext}
3. Upload to Supabase Storage: profiles/avatars/{filename}
4. Get public URL
5. Update user metadata with avatar_url
6. Display new image
```

### 4. **Display Logic**
```
If user has avatar_url:
  → Display uploaded image
Else:
  → Display gradient avatar with initial letter
```

---

## 📂 File Structure

```
src/
├── screens/
│   └── ProfileScreen.tsx          # Profile with image upload
├── context/
│   └── AuthContext.tsx            # Auth state management
└── lib/
    └── supabase.ts                # Supabase client

supabase-storage-setup.sql         # Storage bucket setup
```

---

## 🎯 Usage

### Upload Profile Picture

1. Open app and go to **Profile** tab
2. Tap on the avatar/profile picture
3. Choose **Take Photo** or **Choose from Library**
4. Grant permissions if prompted
5. Select/take photo
6. Crop to square (1:1)
7. Wait for upload (loading indicator shows)
8. Success! Image is now displayed

### Change Profile Picture

1. Tap on current profile picture
2. Select new image
3. New image replaces old one
4. Old image is overwritten in storage

---

## 🔐 Security

### Storage Policies

- ✅ Users can only upload to their own folder
- ✅ Filename must start with user ID
- ✅ Public read access for all images
- ✅ Only owner can update/delete their images

### File Naming

```
Format: {userId}-{timestamp}.{extension}
Example: 550e8400-e29b-41d4-a716-446655440000-1704067200000.jpg
```

This ensures:
- Unique filenames
- User ownership verification
- No conflicts

---

## 🐛 Troubleshooting

### Image Not Uploading

1. Check Supabase Storage bucket exists
2. Verify storage policies are created
3. Check user is authenticated
4. Verify internet connection
5. Check console for errors

### Permission Denied

1. Go to device Settings
2. Find Sonic Bloom app
3. Enable Camera and Photos permissions
4. Restart app

### Image Not Displaying

1. Check if avatar_url is in user metadata
2. Verify image URL is accessible
3. Check network connection
4. Try re-uploading image

---

## 📊 Storage Limits

**Supabase Free Tier:**
- Storage: 1 GB
- Bandwidth: 2 GB/month

**Recommendations:**
- Compress images before upload (quality: 0.8)
- Use 1:1 aspect ratio (reduces file size)
- Limit image size to 1 MB max

---

## ✨ Future Enhancements

- [ ] Image compression before upload
- [ ] Multiple image sizes (thumbnail, full)
- [ ] Delete old images when uploading new
- [ ] Image filters/effects
- [ ] Drag & drop upload (web)
- [ ] Progress bar for upload
- [ ] Image validation (size, format)

---

**Created by Keshab Sarkar**  
**Sonic Bloom Music Player**
