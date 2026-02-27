# CS205 Final Project: AI-Assisted Feature Development

## Overview

For this final project, you will use **AI coding agents** to extend a simple Mood Tracking web application into a more full-featured health and wellness platform. The base app lets users log their mood on a 1-5 scale, view daily/weekly graphs, and import/export data as JSON.

Your job is to **leverage AI tools to plan, build, and ship new features** on top of this codebase. This project is less about writing every line by hand and more about learning to effectively collaborate with AI to produce quality software quickly.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Base App Overview](#base-app-overview)
- [Project Structure](#project-structure)
- [Project Requirements](#project-requirements)
- [Feature Suggestions](#feature-suggestions)
- [Grading Rubric](#grading-rubric)
- [AI Agent Shortcomings (Read This!)](#ai-agent-shortcomings-read-this)
- [AI Coding Agents (Free for Students)](#ai-coding-agents-free-for-students)
- [Submission Guidelines](#submission-guidelines)

---

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- An AI coding agent (see [AI Coding Agents](#ai-coding-agents-free-for-students))

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open your browser to `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

---

## Base App Overview

The starter app is a **Mood Tracking** web app with the following features:

- **Mood Logging** - Record mood on a 1-5 scale with automatic timestamps
- **Daily Graph** - Line chart of mood entries throughout the current day
- **Weekly Graph** - Bar chart of average daily mood over the last 7 days
- **History View** - All-time mood entries organized by date
- **Data Management** - Export/import mood data as JSON files
- **Local Persistence** - Data saved to browser localStorage (no backend)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Storage | Browser localStorage |

---

## Project Structure

```
src/
├── modules/                      # Feature modules
│   └── MoodTracker.jsx           # Mood tracking input and display
├── components/                   # Reusable UI components
│   ├── DailyGraph.jsx            # Daily analytics chart
│   ├── WeeklyGraph.jsx           # Weekly analytics chart
│   ├── HistoryView.jsx           # All-time history view
│   └── FileManager.jsx           # Data import/export UI
├── context/                      # State management
│   └── HealthDataContext.jsx     # Central data store (React Context)
├── utils/                        # Helper functions
│   ├── helpers.js                # Date/time utilities
│   ├── storage.js                # localStorage operations
│   └── fileOperations.js         # File import/export logic
├── App.jsx                       # Main app with tab navigation
├── main.jsx                      # Entry point
└── index.css                     # Global styles
```

### Data Format

```json
{
  "moodEntries": [
    {
      "id": 1705320000000,
      "mood": 4,
      "timestamp": "2024-01-15T12:00:00.000Z",
      "time": "12:00 PM",
      "date": "1/15/2024"
    }
  ]
}
```
---

## Feature Suggestions

The base app is intentionally minimal. Here are some ideas to get you started, organized by category. You are **not limited to this list** - creative and original features are encouraged.

### New Trackers

Extend beyond mood tracking into a broader health/wellness platform:

- **Sleep Tracker** - Log hours slept, sleep quality, bedtime/wake time
- **Water Intake** - Track daily water consumption with goal setting
- **Exercise Log** - Record workouts, duration, calories burned
- **Meal/Nutrition Tracker** - Log meals, calorie counting
- **Medication Reminders** - Track medications and dosage schedules
- **Journal/Notes** - Free-form text entries attached to mood logs

### Better Analytics

- **Monthly/yearly trend charts** with date range selectors
- **Correlation analysis** - e.g., does sleep affect mood?
- **Streaks and goals** - track consistency and daily goals
- **Statistics dashboard** - averages, best/worst days, patterns
- **Mood calendar heatmap** - GitHub-style contribution grid for mood

### User Experience

- **Dark mode** toggle
- **Custom themes** and color schemes
- **Onboarding flow** for new users
- **Responsive mobile design** improvements
- **Accessibility improvements** (screen reader support, keyboard navigation)
- **Notifications/reminders** to log mood at set times
- **Multi-language support** (i18n)

### Backend and Data

- **User authentication** - login/signup with email or OAuth
- **Cloud database** - store data server-side (Firebase, Supabase, etc.)
- **Multi-device sync** - access data from any device
- **Data encryption** - protect sensitive health data
- **REST API** - build a proper backend with Express, FastAPI, etc.
- **Social features** - share mood summaries, group challenges

---

## Grading Rubric

| Category | Weight | Description |
|----------|--------|-------------|
| **Feature Depth** | 30% | How well-built and polished are your features? Do they handle edge cases? Are they fully functional end-to-end? |
| **Feature Breadth** | 25% | How many meaningful features did you add? Quantity matters, but only if the features work. |
| **Presentation & Demo** | 20% | Clear explanation of what you built, live demo, and discussion of your development process with AI agents. |
| **Code Quality & Security** | 15% | Clean, readable code. Proper input validation. No obvious security vulnerabilities (XSS, injection, exposed secrets, etc.). |
| **AI Tool Usage** | 10% | Demonstrated effective use of AI coding agents. Briefly document which tools you used and how they helped. |

### Bonus Points

| Bonus | Points | Description |
|-------|--------|-------------|
| **Mobile App (Android)** | +10% | Ship a working Android app using React Native, Capacitor, or similar |
| **Mobile App (iOS)** | +10% | Ship a working iOS app using React Native, Capacitor, or similar |
| **Deployed/Hosted** | +5% | App is live and accessible via a public URL (Vercel, Netlify, etc.) |

---

## AI Agent Shortcomings (Read This!)

AI coding agents are powerful, but they have known problems. **Part of your job is to review and fix the code they generate.** Submitting AI-generated code with these issues will result in point deductions.

### Verbose / Over-Engineered Code

AI agents tend to over-abstract and over-engineer. They'll create unnecessary helper functions, add layers of indirection, and write 50 lines where 10 would do. They also love adding unsolicited comments, docstrings, and type annotations to code that doesn't need them.

**Your responsibility**: Keep code simple and concise. If a helper function is only used once, inline it. Remove unnecessary abstractions. Don't let the agent turn a simple feature into an enterprise architecture.

### Excessive Defensive Programming

Agents add try/catch blocks, null checks, fallback values, and error handling for scenarios that will never happen. They validate inputs that are already guaranteed by the framework. This clutters the code and makes it harder to read.

**Your responsibility**: Only validate at system boundaries (user input, external APIs). Trust internal code and framework guarantees. Remove unnecessary error handling that obscures the actual logic.

### Destructive Actions / Deleting Your Code

AI agents can and will occasionally **delete or overwrite your existing code** while making changes. They may remove files, replace working implementations, or break features that were already complete. This can be devastating if you don't have a recent commit to fall back on.

**Your responsibility**: **Commit early and commit often.** Make small, frequent git commits so you can always roll back. Before letting an agent make large changes, commit your current working state. Review diffs carefully before accepting changes.

### Outdated Package Knowledge

AI models have training data cutoffs. They may suggest deprecated APIs, old package versions, or patterns that are no longer best practice. They might install packages that have been renamed, abandoned, or have known vulnerabilities.

**Your responsibility**: Check that packages and APIs are current. Verify suggestions against official documentation. Run `npm audit` periodically to catch vulnerability issues.

### Leaking API Keys and Secrets

If you integrate third-party services (Firebase, OpenAI, etc.), AI agents will often **hardcode API keys directly into your source code**. If you push this to a public GitHub repo, your keys are now exposed to the entire internet.

**Your responsibility**: Never commit API keys or secrets to your repository. Use environment variables (`.env` files) and add `.env` to your `.gitignore`. If you accidentally push a key, **revoke it immediately** and generate a new one.

> **Bottom line**: AI agents are your collaborator, not your replacement. You are expected to **review, clean up, and take ownership** of all code in your submission. "The AI wrote it" is not an excuse for bad code.

---

## AI Coding Agents (Free for Students)

A major part of this project is learning to use AI coding agents effectively. The following tools are **free for students** with a `.edu` email address:

### Cursor

- **Website**: [cursor.com](https://cursor.com)
- **What it is**: An AI-powered code editor (fork of VS Code) with built-in chat, autocomplete, and multi-file editing
- **Free for students**: Sign up with your `.edu` email for a free Pro subscription through GitHub Education
- **Best for**: Inline code generation, refactoring, and codebase-wide edits

### GitHub Copilot

- **Website**: [github.com/features/copilot](https://github.com/features/copilot)
- **What it is**: AI pair programmer that integrates into VS Code, JetBrains, and other editors
- **Free for students**: Free through the [GitHub Student Developer Pack](https://education.github.com/pack) with your `.edu` email
- **Best for**: Code autocomplete, inline suggestions, and quick boilerplate generation

### Google Gemini

- **Website**: [gemini.google.com](https://gemini.google.com)
- **What it is**: Google's AI assistant with code generation, explanation, and debugging capabilities
- **Free for students**: Google Workspace for Education provides access with your `.edu` email. Gemini Code Assist is also available free in VS Code and JetBrains.
- **Best for**: Code generation from descriptions, debugging help, and explaining unfamiliar code

### Claude / Claude Code

- **Website**: [claude.ai](https://claude.ai)
- **What it is**: Anthropic's AI assistant with strong coding capabilities. Claude Code is a CLI-based coding agent.
- **Best for**: Complex multi-step tasks, code review, and architectural planning

### Other Tools

- **Windsurf** - AI-powered editor similar to Cursor
- **Cline / Roo Code** - Open-source AI coding agents for VS Code
- **ChatGPT** - OpenAI's general purpose assistant with code capabilities
- **v0.dev** - AI UI component generator by Vercel (great for React/Tailwind)

> **Tip**: You don't have to pick just one. Many developers use multiple AI tools together - for example, Cursor for writing code and Claude for planning architecture.

---

## Submission Guidelines

1. **Code**: Push your final code to a GitHub repository and add [@Patchwork53](https://github.com/Patchwork53) as a collaborator
2. **AI Usage Summary**: Include a brief section in your repo (e.g., `AI_USAGE.md`) describing:
   - Which AI tools you used
   - How they helped (planning, coding, debugging, etc.)
   - Any limitations or issues you ran into
3. **Presentation**: Prepare a short presentation with a live demo of your features
4. **Deadline**: See the course syllabus for the due date

---

## License

This project is for educational purposes as part of CS205.
