import { supabase } from '../lib/supabase';
import { ChatMessage, ContentPanelData } from '../types/chat';

const SYSTEM_PROMPT = `You are LoveBot, a helpful AI assistant for restaurant partners using the MenuLove platform.

Your role is to help partners with:
- Adding and managing menu items (photos, videos, descriptions, prices)
- Understanding analytics (views, saves, likes, directions clicks, QR scans)
- Managing subscriptions and billing
- Using QR codes and share links
- Downloading reports
- Troubleshooting issues
- Best practices for menu presentation

Key information about MenuLove:
- Partners can upload videos and photos for menu items
- Analytics shows: Profile Views, Item Views, Video Plays, Directions, QR Scans
- Two types of links: QR code link (/r/slug) for printed QR codes, and public share link (/slug) for social media
- Partners can download analytics reports in CSV, Excel, or PDF format
- Subscription plans include 30-day free trial
- Menu items are organized by categories (Breakfast, Lunch, Dinner, Drinks, Desserts, etc.)

When answering:
- Be friendly, concise, and helpful
- Use step-by-step instructions when explaining how to do something
- Suggest opening detailed tutorials when appropriate
- Ask clarifying questions if needed
- Use emojis sparingly for a professional tone

If a partner asks how to do something specific (like upload a video), offer to show them a detailed tutorial by responding with:
[SHOW_TUTORIAL:topic_name]

Available tutorials:
- upload_video: How to upload and manage videos
- add_menu_item: How to add new menu items
- analytics_guide: Understanding your analytics
- qr_code_setup: How to use QR codes
- download_reports: How to download analytics reports
- manage_subscription: Managing your subscription

Always be supportive and encouraging. Partners are learning to use the platform.`;

export const sendChatMessage = async (
  messages: ChatMessage[],
  newMessage: string
): Promise<{ response: string; contentPanel?: ContentPanelData }> => {
  try {
    // Use pattern matching for common questions (fallback while API is being fixed)
    const lowerMessage = newMessage.toLowerCase();
    
    // Check for common patterns
    if (lowerMessage.includes('video') || lowerMessage.includes('upload')) {
      return {
        response: "To upload videos to your menu:\n\n1. Go to the **Menu** tab\n2. Click **Add Item** or edit an existing item\n3. Click **Upload Video** in the video section\n4. Choose your video file (MP4, MOV, or WebM)\n5. Add details (name, description, price, category)\n6. Click **Save**\n\nTips:\n• Keep videos 15-30 seconds\n• Use vertical format (1080x1920)\n• Show the dish being prepared or served\n• Use good lighting",
        contentPanel: getTutorialContent('upload_video')
      };
    }
    
    if (lowerMessage.includes('analytic') || lowerMessage.includes('stats') || lowerMessage.includes('view')) {
      return {
        response: "Your Analytics dashboard shows:\n\n**Key Metrics:**\n• Profile Views - How many times your restaurant was viewed\n• Item Views - Individual menu item views\n• Video Plays - How many times videos were played\n• Directions - Customers who got directions\n• QR Scans - QR code scans from printed materials\n\n**Time Periods:**\n• Today, Last 7 Days, Last 30 Days\n\n**Download Reports:**\nYou can export your data in CSV, Excel, or PDF format.\n\nWould you like a detailed guide?",
        contentPanel: getTutorialContent('analytics_guide')
      };
    }
    
    if (lowerMessage.includes('qr') || lowerMessage.includes('code')) {
      return {
        response: "Your QR code gives customers instant access to your video menu!\n\n**How to use:**\n1. Go to Dashboard tab\n2. Find the QR code section\n3. Click **Download QR Code**\n4. Print and display it (table tents, menu covers, window displays)\n\n**Two types of links:**\n• QR Code link (/r/your-restaurant) - For printed QR codes\n• Share link (/your-restaurant) - For social media\n\nThe QR code tracks scans separately in your analytics!\n\nWant to see the full setup guide?",
        contentPanel: getTutorialContent('qr_code_setup')
      };
    }
    
    if (lowerMessage.includes('menu') || lowerMessage.includes('item') || lowerMessage.includes('add')) {
      return {
        response: "To add menu items:\n\n1. Go to **Menu** tab\n2. Click **Add Item** button\n3. Fill in:\n   • Name (required)\n   • Category (Breakfast, Lunch, Dinner, etc)\n   • Price (required)\n   • Description (recommended)\n4. Upload photo or video\n5. Click **Save**\n\n**Tips:**\n• Use clear, appetizing photos\n• Write descriptions that make people hungry\n• Add videos for your most popular items\n• Keep prices up to date\n\nNeed more details?",
        contentPanel: getTutorialContent('add_menu_item')
      };
    }
    
    if (lowerMessage.includes('report') || lowerMessage.includes('download') || lowerMessage.includes('export')) {
      return {
        response: "To download analytics reports:\n\n1. Go to **Analytics** tab\n2. Select time period (Today, Last 7 Days, Last 30 Days)\n3. Click **Download Report**\n4. Choose format:\n   • CSV - For spreadsheet analysis\n   • Excel - Pre-formatted tables\n   • PDF - Printable report\n\nReports include all your metrics, conversion funnel, and top performing items with MenuLove branding.\n\nWant to see what's included?",
        contentPanel: getTutorialContent('download_reports')
      };
    }
    
    if (lowerMessage.includes('subscription') || lowerMessage.includes('plan') || lowerMessage.includes('billing')) {
      return {
        response: "Your subscription includes:\n\n✅ Unlimited menu items\n✅ Unlimited video uploads\n✅ Full analytics dashboard\n✅ QR code generation\n✅ Custom restaurant profile\n✅ Priority support\n\n**30-day free trial** when you sign up!\n\nManage your subscription in the **Settings** tab.\n\nNeed help with billing?",
        contentPanel: getTutorialContent('manage_subscription')
      };
    }
    
    // Default response for other questions
    return {
      response: "I can help you with:\n\n• Uploading videos and photos\n• Understanding your analytics\n• Managing your menu items\n• Using QR codes\n• Downloading reports\n• Managing your subscription\n\nWhat would you like to know more about?"
    };

  } catch (error) {
    console.error('Chat error:', error);
    return {
      response: "I'm having trouble connecting right now. Please try again in a moment, or contact support if the issue persists."
    };
  }
};

const getTutorialContent = (type: string): ContentPanelData => {
  const tutorials: Record<string, ContentPanelData> = {
    upload_video: {
      type: 'tutorial',
      title: 'How to Upload Videos',
      content: `
# Uploading Videos to Your Menu

Follow these steps to add videos to your menu items:

## Step 1: Navigate to Menu Tab
- Click on the **Menu** tab in your dashboard
- Find the item you want to add a video to, or create a new item

## Step 2: Edit Menu Item
- Click the **Edit** button (pencil icon) on the menu item
- Scroll to the **Video** section

## Step 3: Upload Video
- Click **Upload Video** or drag and drop your video file
- Supported formats: MP4, MOV, WebM
- Recommended: 
  - Duration: 15-30 seconds
  - Resolution: 1080x1920 (vertical)
  - File size: Under 50MB

## Step 4: Add Details
- Write a compelling description
- Set the price
- Choose the category
- Click **Save**

## Tips for Great Videos
✅ Show the dish being prepared or served
✅ Use good lighting
✅ Keep it short and engaging
✅ Show the dish from multiple angles
✅ Include close-ups of key ingredients

Your video will appear in your restaurant profile and can be shared via QR code or link!
      `,
      actions: [
        {
          label: 'Go to Menu',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('chat-navigate', { detail: { tab: 'menu' } }));
          },
          variant: 'primary'
        }
      ]
    },
    add_menu_item: {
      type: 'tutorial',
      title: 'Adding Menu Items',
      content: `
# Adding New Menu Items

## Quick Start
1. Go to **Menu** tab
2. Click **Add Item** button
3. Fill in the details
4. Upload photo or video
5. Click **Save**

## Required Information
- **Name**: The dish name
- **Category**: Breakfast, Lunch, Dinner, etc.
- **Price**: In dollars (e.g., 15.99)

## Optional but Recommended
- **Description**: Tell customers what makes this dish special
- **Photo**: High-quality image of the dish
- **Video**: Short clip showing the dish (highly recommended!)

## Best Practices
✅ Use clear, appetizing photos
✅ Write descriptions that make people hungry
✅ Keep prices up to date
✅ Add videos for your most popular items
✅ Use consistent category names

## Managing Items
- **Edit**: Click the pencil icon
- **Delete**: Click the trash icon (items are archived, not permanently deleted)
- **Reorder**: Drag items to change order within categories
      `
    },
    analytics_guide: {
      type: 'guide',
      title: 'Understanding Your Analytics',
      content: `
# Analytics Dashboard Guide

Your analytics help you understand how customers interact with your restaurant profile.

## Key Metrics

### Profile Views
Total number of times your restaurant profile was viewed.

### Item Views
How many times customers viewed individual menu items.

### Video Plays
Number of times your menu videos were played.

### Directions
How many customers clicked to get directions to your restaurant.

### QR Scans
Number of times your QR code was scanned.

## Conversion Funnel
Shows the customer journey from viewing your profile to taking action.

## Time Periods
- **Today**: Real-time data for today
- **Last 7 Days**: Weekly overview
- **Last 30 Days**: Monthly trends

## Download Reports
Export your analytics data in:
- **CSV**: For spreadsheet analysis
- **Excel**: Formatted tables
- **PDF**: Printable reports

## Tips for Growth
📈 More videos = More engagement
📈 Update menu regularly = More repeat visits
📈 Share your link on social media = More profile views
📈 Display QR code prominently = More scans
      `,
      actions: [
        {
          label: 'View Analytics',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('chat-navigate', { detail: { tab: 'analytics' } }));
          },
          variant: 'primary'
        }
      ]
    },
    qr_code_setup: {
      type: 'guide',
      title: 'QR Code Setup Guide',
      content: `
# Using Your QR Code

Your MenuLove QR code gives customers instant access to your video menu.

## How to Get Your QR Code
1. Go to **Dashboard** tab
2. Find the QR code section
3. Click **Download QR Code**

## Where to Display
✅ Table tents
✅ Menu covers
✅ Window displays
✅ Receipt holders
✅ Takeaway bags
✅ Social media posts

## Two Types of Links

### QR Code Link (/r/your-restaurant)
- **For printed QR codes only**
- Tracks QR scan analytics separately
- Customers stay focused on your menu
- No navigation away from your profile

### Share Link (/your-restaurant)
- **For social media and online sharing**
- Allows customers to explore the app
- Better for discovery and sharing

## Best Practices
✅ Print in high quality
✅ Test the QR code before printing
✅ Place at eye level
✅ Add "Scan for Video Menu" text
✅ Keep the code visible and accessible

## Tracking
View QR scan analytics in your **Analytics** tab to see how many customers are using your QR code!
      `
    },
    download_reports: {
      type: 'tutorial',
      title: 'Downloading Analytics Reports',
      content: `
# Download Analytics Reports

Export your analytics data for deeper analysis or record keeping.

## How to Download
1. Go to **Analytics** tab
2. Select time period (Today, Last 7 Days, Last 30 Days)
3. Click **Download Report** button
4. Choose format:
   - **CSV**: For Excel/Google Sheets
   - **Excel**: Pre-formatted tables
   - **PDF**: Printable report

## What's Included
- Summary statistics
- Profile views, item views, video plays
- Directions clicks and QR scans
- Conversion funnel data
- Device breakdown (mobile, desktop, tablet)
- Top performing items

## Report Features
✅ MenuLove branding
✅ Date range clearly marked
✅ Professional formatting
✅ Ready to share with stakeholders

## Use Cases
- Monthly performance reviews
- Marketing campaign analysis
- Menu optimization decisions
- Investor/partner updates
- Historical record keeping
      `,
      actions: [
        {
          label: 'Go to Analytics',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('chat-navigate', { detail: { tab: 'analytics' } }));
          },
          variant: 'primary'
        }
      ]
    },
    manage_subscription: {
      type: 'guide',
      title: 'Managing Your Subscription',
      content: `
# Subscription Management

## Your Plan
MenuLove offers a simple subscription plan with all features included.

### What's Included
✅ Unlimited menu items
✅ Unlimited video uploads
✅ Full analytics dashboard
✅ QR code generation
✅ Custom restaurant profile
✅ Priority support

## Free Trial
- **30 days free** when you sign up
- No credit card required upfront
- Full access to all features
- Cancel anytime during trial

## Billing
- Monthly subscription
- Automatic renewal
- Update payment method anytime
- View billing history

## Managing Your Subscription
1. Go to **Settings** tab
2. Click **Subscription** section
3. View current plan and billing date
4. Update payment method
5. Cancel or modify subscription

## Cancellation
- Cancel anytime
- Access continues until end of billing period
- No cancellation fees
- Can reactivate anytime

## Need Help?
Contact support at contact@menulove.com.au or use this chat for assistance!
      `,
      actions: [
        {
          label: 'Go to Settings',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('chat-navigate', { detail: { tab: 'settings' } }));
          },
          variant: 'primary'
        }
      ]
    }
  };

  return tutorials[type] || {
    type: 'help',
    title: 'Help',
    content: 'Tutorial content not found. Please ask me a specific question and I\'ll do my best to help!'
  };
};
