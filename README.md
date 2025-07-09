# Instaread - Self-Service Demo Generator

This application is a powerful self-service tool designed to generate live, interactive demos of the Instaread audio player on any website. It enables sales and support teams to quickly create and share compelling demonstrations for potential partners without needing to write any code.

## Key Features

- **Website Analysis**: Enter a URL and the app automatically analyzes the site's design system, extracting primary colors, fonts, and the underlying tech stack.
- **Live Visual Cloning**: Instantly generates a high-fidelity, interactive visual clone of the target website for the demo.
- **Click-to-Place Player**: Interactively click any element on the live preview to precisely position the audio player.
- **Player Customization**: Configure the player's visual style and accent color to match the partner's branding.
- **Code Generation**: Get simple HTML and React code snippets for manual integration.
- **WordPress Plugin Generation**: Automatically generate and build a complete, ready-to-install WordPress plugin for a specific partner via GitHub Actions.
- **Save & Share**: Persists demo configurations to a database (Firebase Firestore) and generates unique, shareable links for each demo.
- **Dashboard**: A central dashboard to view, manage, and delete all created demos, sorted by the most recently updated.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Firebase Firestore
- **AI Analysis**: OpenAI API (`gpt-4o-mini`)
- **Automation**: GitHub API & GitHub Actions for plugin generation

## Getting Started

Follow these steps to get the project running locally.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-name>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Environment Variables

Create a new file named `.env` in the root of your project. Copy the contents of the `.env.example` file below and fill in the values with your specific credentials.

#### `.env.example`
```env
# The environment can be 'development' or 'production'.
# In development, the app uses mock data and a placeholder publication name ('xyz').
# In production, it uses real AI analysis and derives the publication name from the URL.
NODE_ENV="development"

# --- GitHub credentials for WordPress plugin generation ---
# Create a Personal Access Token with `repo` and `workflow` scopes.
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
GITHUB_TOKEN=""

# The owner/organization and name of the repository where the WordPress plugin source code lives.
NEXT_PUBLIC_GITHUB_REPO_OWNER=""
NEXT_PUBLIC_GITHUB_REPO_NAME=""

# The filename of the GitHub Actions workflow responsible for building the plugin.
# e.g., "partner-builds.yml"
GITHUB_WORKFLOW_ID=""


# --- AI Provider Configuration ---
# Set this to 'true' to enable AI-powered website analysis.
# If 'false' or not set, the app will use mock data.
USE_AI_ANALYSIS="false"

# Specify the AI provider to use. Currently supports 'openai'.
AI_PROVIDER="openai"

# Your OpenAI API Key. Required if USE_AI_ANALYSIS is 'true' and AI_PROVIDER is 'openai'.
OPENAI_API_KEY=""


# --- Firebase Credentials ---
# These are required for the "Save & Share" functionality and the dashboard.
# 1. Go to your Firebase project -> Project Settings -> Service Accounts.
# 2. Click "Generate new private key". A JSON file will be downloaded.
# 3. Copy the entire contents of that JSON file and paste it here as a single line.
# IMPORTANT: The entire JSON string must be enclosed in double quotes ("").
FIREBASE_SERVICE_ACCOUNT_JSON=""
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app/`: Contains the main pages and layouts for the Next.js App Router.
  - `(main)/`: Routes for the primary application (generator, dashboard).
  - `demo/[id]/`: The dynamic page for rendering shared demos.
- `src/components/`: Shared React components used across the application.
  - `sections/`: Larger components that make up the main sections of the generator page.
  - `ui/`: Core UI components from shadcn/ui.
- `src/lib/`: Core utilities, server actions, and constants.
  - `actions.ts`: Server Actions for handling form submissions and backend logic.
  - `firebase.ts`: Firebase Admin SDK initialization logic.
- `src/services/`: Data access layer. Handles all direct communication with the database.
- `src/ai/`: Contains all AI-related logic, including flows and provider implementations.
- `src/types/`: TypeScript type definitions for the project.
