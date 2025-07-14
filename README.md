# AudioLeap - Self-Service Demo Generator

This application is a powerful self-service tool designed to generate live, interactive demos of the AudioLeap audio player on any website. It enables sales and support teams to quickly create and share compelling demonstrations for potential partners without needing to write any code.

## Table of Contents

- [User Guide (for Sales & Support)](#user-guide-for-sales--support)
- [Developer Guide](#developer-guide)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Key Architectural Concepts](#key-architectural-concepts)
  - [Automated Placement Logic](#automated-placement-logic)
  - [Getting Started (Local Setup)](#getting-started-local-setup)
  - [Environment Variables](#environment-variables)
  - [Development & Testing Features](#development--testing-features)

---

## User Guide (for Sales & Support)

This guide explains how to use the demo generator to create and share live demos with potential partners.

### How to Create a Demo

The process is designed to be quick and intuitive, allowing you to create a demo live during a sales call.

1.  **Analyze the Website:**

    - Enter the partner's full website URL (e.g., `https://www.example.com`) into the **Website Analysis** input box.
    - Click the **"Analyze"** button.
    - The tool will automatically analyze the site's design (colors, fonts) and generate a live, interactive preview in the section below.

2.  **Configure the Player:**

    - In the **Player Configuration** section, you can customize the player's appearance.
    - **Player Type:** Choose a visual style from the dropdown menu (e.g., "Default", "Short Design"). The preview will update instantly.
    - **Accent Color:** The tool automatically suggests an accent color based on its analysis. You can change this using the color picker to perfectly match the partner's branding.

3.  **Place the Player:**

    - In the **Live Preview & Placement** section, move your mouse over the cloned website.
    - Click on the exact element where you want the player to appear (e.g., just below the article headline).
    - A dialog will pop up asking you to confirm placement **"Before"** or **"After"** the element you clicked. Choose one.
    - The player will instantly appear in the preview at your chosen location. You can clear the placement and try again if needed.
    - **Automatic Placement Check**: The tool will automatically analyze the website's structure. If it detects a complex structure that might cause issues, it will show a warning, letting you know that a developer may need to adjust the generated WordPress plugin for the best results.

4.  **Save and Share:**

    - Once you are happy with the placement and style, click the **"Save & Share"** button.
    - A dialog will appear with a unique, shareable link to the demo you just created.
    - Copy this link and send it to the partner. This link provides a live, interactive version of their site with the player integrated.
    - Saving the demo also automatically adds an entry to the team's central **Google Sheet tracker**, marking the status as "Pending".

5.  **Get Integration Code (for their developers):**
    - The **Get Integration Code** section provides the necessary code snippets for the partner's technical team.
    - **HTML/React:** For most partners, the simple HTML snippet is all they need.
    - **WordPress:** For partners using WordPress, you can configure and generate a custom-built plugin for them automatically.

### Tracking Installation Status

- **Real-Time Dashboard:** Click the **Dashboard** button in the header to view all created demos. The dashboard is live and updates automatically in real-time. You can see which demos are "Pending" and which are "Installed" without ever needing to refresh the page.
- **Notifications:** When a partner installs the player script on their site, the status in the dashboard and Google Sheet will automatically update to "✅ Installed", and you will receive an in-app and email notification.

---

## Developer Guide

### Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Firebase Firestore (with real-time listeners for the dashboard)
- **AI Analysis**: OpenAI API (`gpt-4o-mini`)
- **Automation**: GitHub API & GitHub Actions for WordPress plugin generation.
- **Email**: Nodemailer
- **Spreadsheet Integration**: Google Sheets API

### Project Structure

- `src/app/`: Main pages and layouts.
  - `(main)/`: Core app routes (generator, dashboard).
  - `demo/[id]/`: Dynamic page for rendering shared demos.
  - `api/`: API routes, like the installation confirmation endpoint.
- `src/components/`: Shared React components.
  - `sections/`: Major UI sections of the generator page.
- `src/lib/`: Core utilities and server actions.
  - `actions.ts`: Server Actions handling backend logic (saving demos, generating plugins).
  - `firebase-client.ts`: Firebase client SDK initialization (for client components).
  - `firebase.ts`: Firebase Admin SDK initialization (for server-side code).
  - `send-email.ts`: Nodemailer email sending utility.
- `src/services/`: Data access layer. Handles all communication with Firestore and Google Sheets.
- `src/ai/`: AI-related logic, including website analysis flows.
- `src/types/`: TypeScript type definitions.

### Key Architectural Concepts

- **Hybrid SSR and Real-Time Dashboard**: The dashboard at `/dashboard` uses a hybrid rendering approach for the best user experience.
  1.  **Initial Load (SSR)**: `src/app/(main)/dashboard/page.tsx` is a Server Component that fetches the initial list of demos via `getAllDemos()`. This provides a fast, non-interactive first paint of the data.
  2.  **Client-Side Hydration & Real-Time Updates**: The server-rendered data is passed to a client component, `src/components/dashboard/dashboard-client.tsx`. This component then establishes a real-time listener to the Firestore database using the `onSnapshot` function. Any changes in the database (new demos, status updates) are instantly pushed to the client and reflected in the UI without requiring a page refresh. This provides a seamless, live experience for the user.
- **Self-Contained Services**: The application abstracts all external service interactions (Firestore, Google Sheets, GitHub API) into a `services` directory. This makes the application more modular and easier to maintain. If we needed to switch databases, we would only need to update the `demo-service.ts` file.

### Automated Placement Logic

A key feature of this tool is its ability to automatically generate a CSS selector when a user clicks on the live preview. The goal is to create a selector that is both accurate and robust enough to work across multiple pages of the same site. This is handled by two key functions in `src/components/sections/live-preview-section.tsx`.

1.  **Selector Generation (`generateSelector`)**: This function creates a CSS selector for the clicked element. It's designed to prioritize stability over specificity by following these rules:
    -   It first looks for a unique `id` on the element or one of its parents. An ID is the most stable identifier.
    -   If no ID is found, it searches for common, descriptive class names that often denote main content areas (e.g., `article`, `post`, `content`, `entry`).
    -   It limits the selector's depth to avoid creating overly long and brittle chains (e.g., `div > div > div > p`).
    -   Alongside the selector, it calculates an `nth` index. This identifies *which* element was clicked if the selector matches multiple elements on the page (e.g., the 3rd `p` tag in the article body).

2.  **Fragility Check (`isSelectorFragile`)**: After a selector is generated, this function immediately analyzes it to predict if it might break on other pages. A selector is flagged as "fragile" if it meets any of these criteria:
    -   **It's too nested**: Selectors with many levels (e.g., more than 4 `>`) are often tied to a very specific DOM structure that can easily change.
    -   **It relies on position**: Selectors using `:nth-of-type` are brittle because adding or removing an element earlier in the page will break them.
    -   **It lacks a good anchor**: If the selector doesn't contain a unique ID or a meaningful class name, it's likely too generic and unreliable.

If a selector is determined to be fragile, the UI automatically displays a warning to the user and sets the WordPress plugin's injection strategy to "Custom", signaling that a developer may need to fine-tune the placement.

### Getting Started (Local Setup)

1.  **Clone the Repository**

    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Set up Environment Variables**

    - Create a new file named `.env` in the root of your project.
    - Copy the contents of the `.env.example` section below and fill in the values with your credentials.

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to see the result.

### Environment Variables

#### `.env.example`

```env
# The environment can be 'development' or 'production'.
# - In 'development', AI analysis is mocked, and emails are logged to the console instead of sent.
# - In 'production', the app uses real AI analysis and sends real emails.
NODE_ENV="development"

# --- AI Provider Configuration ---
# Set to 'true' to enable real AI-powered website analysis (requires OpenAI key).
# If 'false' or not set, the app will use mock data.
USE_AI_ANALYSIS="false"
AI_PROVIDER="openai"
OPENAI_API_KEY=""

# --- GitHub credentials for WordPress plugin generation ---
# Create a Personal Access Token with `repo` and `workflow` scopes.
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
GITHUB_TOKEN=""
NEXT_PUBLIC_GITHUB_REPO_OWNER="your-github-org"
NEXT_PUBLIC_GITHUB_REPO_NAME="your-plugin-repo-name"
# The filename of the GitHub Actions workflow for building the plugin (e.g., "partner-builds.yml").
GITHUB_WORKFLOW_ID=""


# --- Firebase Credentials (for Database) ---
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin credentials (for server-side operations)
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
# IMPORTANT: The private key must be a single-line string. Replace all newline characters with '\\n'.
# You can use a tool like https://www.text-magic.com/free-tools/find-and-replace to replace '\n' with '\\n'.
FIREBASE_PRIVATE_KEY="..."


# --- Google Sheets API Credentials ---
# The ID of the Google Sheet where demo data will be logged.
GOOGLE_SHEET_ID="..."
# The client email from your downloaded service account JSON key.
GOOGLE_SHEETS_CLIENT_EMAIL="..."
# The private key from your service account JSON. (Must be a single line, same as the Firebase key).
GOOGLE_SHEETS_PRIVATE_KEY="..."


# --- Email Notification Configuration ---
# For development, you can use a service like Ethereal (https://ethereal.email/) for a test SMTP account.
# In production, use real credentials (e.g., Gmail with an "App Password").
EMAIL_HOST="smtp.ethereal.email"
EMAIL_PORT="587"
EMAIL_USER="your-smtp-user@example.com"
EMAIL_PASS="your-smtp-password"
EMAIL_FROM="AudioLeap Notifier <your-smtp-user@example.com>"
# A comma-separated list of recipient email addresses.
EMAIL_TO="team-member-1@example.com, team-member-2@example.com"
```

### Development & Testing Features

When `NODE_ENV` is set to `development` in your `.env` file, several testing features are enabled:

- **Mocked AI Analysis:** To save costs and speed up development, the website analysis is mocked by default when `USE_AI_ANALYSIS` is `"false"`. Set it to `"true"` and provide an `OPENAI_API_KEY` to test with the real AI service.
- **Console Emails:** Email notifications for installations are **not** sent. Instead, a confirmation message is logged to the server console, showing you who the email would have been sent to. This is useful for verifying the installation tracking API (`/api/installs/confirm`).
- **Demo Status Reset:** On the **Dashboard**, the actions menu for each demo includes a "Reset Status" option. This allows you to reset an "Installed" demo back to "Pending", which is useful for re-testing the installation notification flow without having to create a new demo. This option is hidden in production.
- **Test Demo Link:** When you save a demo, the "Save & Share" dialog includes a "Test Demo" button that opens the shareable link in a new tab. This is for quick verification and is hidden in production.
