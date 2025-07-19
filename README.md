
-----

# Ollama UI: Your Local AI Chat Companion 🤖💬

## Project Title and Description

**Ollama UI** is a friendly web interface that lets you chat with Large Language Models (LLMs) right on your computer using Ollama. 🚀 It's designed for a smooth conversation experience, helping you manage chats, switch between your favorite models, and keep your AI interactions private and fast\!

-----

## Table of Contents

*(**Note:** For these links to navigate within the document, please view this README on its [GitHub repository](https://github.com/attiquers/ollama-ui).)*

* [🌟 Features](#features)
* [🛠️ Technologies Used](#technologies-used)
* [✅ Prerequisites](#prerequisites)
* [🚀 Getting Started](#getting-started)
    * [1. Clone the Repository](#1-clone-the-repository)
    * [2. Create Frontend Environment File](#2-create-frontend-environment-file)
    * [3. Run with Docker Compose](#3-run-with-docker-compose)
* [🌐 Accessing the Application](#accessing-the-application)
* [🛑 Stopping the Application](#stopping-the-application)
* [📂 Project Structure](#project-structure)
* [📜 License](#license)

-----

## 🌟 Features

  * **Intuitive Chat Interface:** A clean, responsive, and easy-to-use chat window. ✨
  * **Local LLM Integration:** Connects directly to your local Ollama setup for private and super-fast AI chats. 🔒⚡
  * **Chat History Management:** Your conversations are saved and easily accessible with MongoDB. 📚
  * **Model Switching:** Hop between different LLMs available on your Ollama server with a click\! 🔄
  * **Streaming Responses:** Watch AI responses appear in real-time, character by character. ✍️
  * **Dockerized Deployment:** Simple setup and hassle-free portability across various systems. 🐳

-----

## 🛠️ Technologies Used

  * **Frontend:** React, TypeScript, Vite, Tailwind CSS, Axios, React Router DOM
  * **Backend:** Node.js, Express.js, Mongoose (MongoDB ODM), Axios, `node-fetch`, CORS
  * **Database:** MongoDB
  * **LLM Runtime:** Ollama
  * **Containerization:** Docker, Docker Compose
  * **Web Server (Frontend):** Nginx

-----

## ✅ Prerequisites

Before you dive in, make sure you have these tools ready on your machine:

  * **Docker Desktop (or Docker Engine & Docker Compose):**
      * [Install Docker here](https://docs.docker.com/get-docker/) 🐳
      * Confirm `docker compose` (the newer command without the hyphen) or `docker-compose` (the older command with the hyphen) works in your terminal.
  * **Ollama:**
      * [Download Ollama here](https://ollama.com/download) 🧠
      * Ensure Ollama is running on your host machine (usually `http://localhost:11434`) and you've downloaded at least one LLM model (e.g., run `ollama run llama2` in your terminal to get started). This project uses your *host's* Ollama instance.

-----

## 🚀 Getting Started

Let's get your Ollama UI up and running with just a few commands\!

### 1\. Clone the Repository

First things first, grab the code from GitHub:

```bash
git clone https://github.com/attiquers/ollama-ui.git
cd ollama-ui
```

### 2\. Create Frontend Environment File

Your React app needs a little heads-up about where its backend lives.

Navigate into the `client` directory and create a new file named `.env.production`:

```bash
cd client
touch .env.production
```

Open this new `.env.production` file in your favorite text editor and add this single, crucial line:

```
VITE_REACT_APP_API_URL=http://localhost:5000/api
```

Save the file and head back to the main project folder:

```bash
cd ..
```

### 3\. Run with Docker Compose

Now for the magic\! ✨ From the root of your `ollama-ui` project (where you see `docker-compose.yml`), execute this command:

```bash
docker compose up --build -d
```

  * `--build`: This tells Docker to build (or rebuild) your custom backend and frontend images. Essential for the first run or after code changes\! 🏗️
  * `-d`: Runs everything quietly in the background, so your terminal stays free. 🤫

**Heads up\!** The very first time might take a few minutes as Docker downloads images and builds your app. Grab a coffee\! ☕

-----

## 🌐 Accessing the Application

Once your containers are happily running (you can verify with `docker compose ps`), open your web browser and point it to:

### **`http://localhost:3000`** 🎉

You should now see your awesome Ollama UI chat interface\!

**Quick Access for Devs/Debugging:**

  * **Backend API:** `http://localhost:5000`
  * **MongoDB:** `mongodb://localhost:27018`
  * **Host Ollama:** `http://localhost:11434`

-----

## 🛑 Stopping the Application

When you're done chatting and want to shut down the services:

Navigate to the root of your `ollama-ui` project and run:

```bash
docker compose down
```

This will gracefully stop and remove all containers, but don't worry, your MongoDB chat history will be safe in its Docker volume\! 💾

Want to wipe everything clean and start fresh?

```bash
docker compose down -v
```

**🚨 Warning:** The `-v` flag will **permanently delete** your MongoDB data volumes\! Use with caution\!

-----

## 📂 Project Structure

```
ollama-ui/
├── client/                     # Frontend (React, Vite) ⚛️
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── CurrentHistory.tsx
│   │   │   ├── Header.tsx
│   │   │   └── SideBar.tsx
│   │   ├── App.tsx             # Main application component
│   │   ├── ChatRoutes.tsx      # React Router setup
│   │   ├── index.css
│   │   └── main.tsx            # React entry point
│   ├── .env.production         # Frontend production environment variables (NEW! 📄)
│   ├── Dockerfile              # Docker build instructions for frontend
│   ├── nginx.conf              # Nginx server configuration
│   └── package.json
│
├── server/                     # Backend (Node.js, Express.js) 🌐
│   ├── models/                 # Mongoose models
│   │   └── Chat.js
│   ├── routes/                 # API route definitions
│   │   ├── chats.js
│   │   └── ollama.js
│   ├── index.js                # Main backend server file
│   ├── Dockerfile              # Docker build instructions for backend
│   └── package.json
│
└── docker-compose.yml          # The master plan! Orchestrates all services 🚢
```

-----

## 📜 License

This project is open-source and available under the [MIT License](https://opensource.org/licenses/MIT). Feel free to use, modify, and share\! 🤝

-----