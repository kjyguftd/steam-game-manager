# Steam Game Manager: Vanilla Full-Stack Application

## 🎮 Overview
The **Steam Game Manager** is a vanilla full-stack web application built using JavaScript on both the client (browser JS) and server (Node.js).  
It is designed to help gamers organize their Steam libraries, track their progress, and manage their game backlog.

The application securely communicates with the Steam Web API to fetch the user's game list and playtime statistics, allowing the user to create a personalized, manageable backlog on top of their real data.

This project meets all minimum requirements for the **Final Project Handout (Vanilla JavaScript Client and Server App).**

---

## ✨ Key Features

### Core Functionality
- **Secure Authentication**: User registration and login utilize `crypto.scrypt` for robust password hashing and salting.
- **Session Management**: Secure session handling implemented via HttpOnly cookies.
- **Steam API Proxy**: The server acts as a secure proxy (`https` module) to the Steam Web API, fetching owned games (AppIDs, playtime, names) while keeping the API Key hidden from the client.
- **Encrypted API Key Storage**: Steam API Keys are encrypted using AES-256-GCM before persistence, ensuring high security.
- **Dynamic API Key Configuration**: If the Steam API Key is missing, the backend returns a specific error code, triggering a user-friendly modal on the client to prompt the user for input and save the key for future syncs.
- **Backlog CRUD**: Users can perform Create, Read, Update, and Delete (CRUD) operations on local backlog entries, tracking custom statuses (Planning, Playing, Completed, Not Started) and user ratings.
- **Input Validation**: Robust input validation is enforced on both client and server layers.

### Performance & Visualization
- **Optimized UX on Status Change**: Updating a game's backlog status triggers local asynchronous UI updates (instead of full page refresh), significantly improving performance and user experience.
- **Playtime Visualization**: Uses Chart.js on the client to display a dynamic pie chart summarizing total playtime distribution. Chart rendering is optimized to re-render only when data or theme changes.
- **Adaptive UI**: Supports adaptive Dark/Light mode based on user system preferences.
- **Data Persistence**: Data is stored persistently on the server using local JSON files (`users.json`, `backlog.json`).

---

## 🏛️ Architecture

| Component   | Technology                  | Description                                                                 |
|-------------|-----------------------------|-----------------------------------------------------------------------------|
| **Client**  | HTML5, CSS3, Vanilla JS     | Handles UI rendering, user interaction, client-side validation, and Chart.js visualization. Now includes a streamlined modal for API Key input. |
| **Server**  | Node.js (Vanilla)           | Handles routing, API logic, file I/O (`fs`), authentication (`crypto`), and external API proxying (`https`). Manages secure key encryption/decryption. |
| **Persistence** | JSON Files (`/server/data`) | Stores user credentials (hashed), backlog entries, and encrypted Steam API Keys. |

---

## 🤖 AI Features (Ollama Integration)

This project integrates with **Ollama** to provide **local, privacy-friendly AI-powered insights**. The AI runs entirely on your machine—no data is sent to external servers.

### What is Ollama?
[Ollama](https://ollama.com) is an open-source tool that allows you to run large language models (LLMs) locally on your computer. Since the model runs on your machine, you don't need an internet connection for AI features, and your gaming data stays private.

### Prerequisites for AI Features
1. **Install Ollama**: Download and install from [ollama.com](https://ollama.com).
2. **Pull a Model**: The project is configured to use `gemma3:270m` (a lightweight model). Run:
   ```bash
   ollama pull gemma3:270m
   ```
   > **Note**: You can use other models (e.g., `llama3`, `mistral`) by changing the `OLLAMA_MODEL` variable in `server/controllers/ollamaController.js`.
3. **Ensure Ollama is Running**: 
   - If installed via Homebrew on macOS, it may auto-start as a background service.
   - Otherwise, run `ollama serve` in a terminal, or launch the Ollama desktop app.
   - You can verify it's running by visiting `http://localhost:11434` in your browser.

### AI Features
- **AI Player Profile**: Analyzes your top 15 most-played games and generates a fun personality/gaming style profile.
- **Life Balance Recommendations**: Based on your total playtime, provides friendly advice about gaming habits.

### Important Notes
- **AI features are optional**: The rest of the application works perfectly without Ollama.
- **Local-only**: No API keys or cloud services required. All AI processing happens on your machine.
- **Model size**: `gemma3:270m` is ~300MB. Larger models provide better responses but require more RAM/disk space.
- **Response time**: First request may take a few seconds as the model loads into memory.

### Troubleshooting
| Issue | Solution |
|-------|----------|
| "Ollama connection failed" | Ensure Ollama is running (`ollama serve` or check the app). |
| "Model not found" | Run `ollama pull gemma3:270m` to download the model. |
| "Address already in use" (when running `ollama serve`) | Ollama is already running. This is fine—just proceed with `npm start`. |

---

## ⚙️ Setup and Installation

### Prerequisites
- **Node.js**: Must be installed (LTS recommended).
- **Steam Web API Key**: You must register and obtain a Steam Web API Key.
- **Encryption Secret**: You need to set an environment variable for the encryption key.

### Installation Steps
1. **Clone the Repository**
```bash
   git clone [your-repo-url]
   cd steam-game-manager
```

2. **Configure Steam API Key (Mandatory)**
- The application requires a secret key for encrypting API keys. Set it as an environment variable
```bash
   # Choose a long, random string for 'YOUR_API_KEY_SECRET'
   export API_KEY_SECRET="YOUR_API_KEY_SECRET"
```

3. **Seed Data**
- Ensure `server/data/users.json` and `server/data/backlog.json` exist and contain at least an empty array `[]`.

4. **Run the Server**
```bash
  node server/server.js
```

5. **Access the Application**
- The application will be available at [http://localhost:3000/](http://localhost:3000/).
- **Post-Login**: If the API Key is missing, the application will prompt you via a modal to input and save your Steam Web API Key.