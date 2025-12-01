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
- **Backlog CRUD**: Users can perform Create, Read, Update, and Delete (CRUD) operations on local backlog entries, tracking custom statuses (Planning, Playing, Completed, Not Started) and user ratings.
- **Input Validation**: Robust input validation is enforced on both client and server layers.

### Data & Visualization
- **Playtime Visualization**: Uses Chart.js on the client to display a dynamic pie chart summarizing total playtime distribution across different backlog statuses.
- **Adaptive UI**: Supports adaptive Dark/Light mode based on user system preferences.
- **Data Persistence**: Data is stored persistently on the server using local JSON files (`users.json`, `backlog.json`).

---

## 🏛️ Architecture

| Component   | Technology                  | Description                                                                 |
|-------------|-----------------------------|-----------------------------------------------------------------------------|
| **Client**  | HTML5, CSS3, Vanilla JS     | Handles UI rendering, user interaction, client-side validation, and Chart.js visualization. |
| **Server**  | Node.js (Vanilla)           | Handles routing, API logic, file I/O (`fs`), authentication (`crypto`), and external API proxying (`https`). Only uses built-in Node.js modules. |
| **Persistence** | JSON Files (`/server/data`) | Stores user credentials (hashed) and backlog entries. |

---

## 🚀 Future Features (AI-Enhanced Capabilities)
The architecture is prepared for the following stretch goals, which require integration with a local LLM like **Ollama**:

- **AI Player Profile**: Generate a unique "Player Style Profile" based on playtime and game data analysis.
- **Life Balance Recommendations**: Provide specific, proactive advice to promote balanced screen time (e.g., suggesting breaks).

---

## ⚙️ Setup and Installation

### Prerequisites
- **Node.js**: Must be installed (LTS recommended).
- **Steam Web API Key**: You must register and obtain a Steam Web API Key.

### Installation Steps
1. **Clone the Repository**
```bash
   git clone [your-repo-url]
   cd steam-game-manager
```

2. **Configure Steam API Key**
- Open `server/utils/steamApi.js`
- **CRITICAL:** Replace the placeholder value for `STEAM_API_KEY` with your actual key.

3. **Seed Data**
- Ensure `server/data/users.json` and `server/data/backlog.json` exist and contain at least an empty array `[]`.

4. **Run the Server**
```bash
  node server/server.js
```

5. **Access the Application**
- The application will be available at [http://localhost:3000/](http://localhost:3000/).