# 🚀 Collaborative Coding Platform

This repository hosts the full-stack application for a real-time, collaborative coding platform designed to help users practice coding challenges together. It utilizes a **microservices architecture** for scalability and leverages external APIs for **AI-powered assistance** and **code execution**.

---

## 🏗️ Architecture Overview

The platform is structured around five core backend microservices, supported by a dedicated frontend, an identity provider, and persistent data stores.


```mermaid
flowchart TB
    %% ==== MAIN COMPONENTS ====
    FE[Frontend]
    AUTH0[Auth0 Identity Provider]
    BACKEND[[Backend Microservices]]
    EXTERNAL[[External APIs (Gemini, Judge0)]]
    DB[(Databases)]
    %% ==== FLOWS ====
    FE -- "Login / Auth" --> AUTH0
    FE -- "Requests with Auth Token" --> BACKEND
    BACKEND -- "Verify Token" --> AUTH0
    BACKEND -- "Store & Retrieve Data" --> DB
    BACKEND -. "AI & Code Execution" .-> EXTERNAL
    %% ==== STYLES ====
    classDef client fill:#B5EAEA,stroke:#333,stroke-width:1px;
    classDef auth fill:#FFBCBC,stroke:#333,stroke-width:1px;
    classDef backend fill:#FFF3B0,stroke:#333,stroke-width:1px;
    classDef external fill:#D3F8E2,stroke:#333,stroke-width:1px;
    classDef db fill:#A0E7E5,stroke:#333,stroke-width:1px;
    class FE client
    class AUTH0 auth
    class BACKEND backend
    class EXTERNAL external
    class DB db
```


### Key Components

* **Frontend (FE):** The user interface (Web/Mobile) where users access the platform, join rooms, and write code.
* **Auth0 Identity Provider:** Handles all user authentication and authorization (Login/Signup).
* **Backend Microservices:** A collection of specialized services managing core business logic (e.g., matching, collaboration, execution).
* **External APIs:** Integrations with third-party services like **Gemini** for AI chat/suggestions and **Judge0** for secure code execution.
* **Persistence Layer (DB):** Dedicated data stores for each service to ensure loose coupling and specialized data handling.

---

## 💻 Microservices and Project Structure

The project is divided into several main directories, each containing its own specialized `README.md` for setup, configuration, and detailed functionality.

### 🌐 Frontend

| Directory | Service | Description |
| :--- | :--- | :--- |
| `frontend/` | **Frontend** | The client-side application (Web/Mobile) for user interaction. |
| | | **[Detailed Frontend README](./frontend/README.md)** |

### 🛠️ Backend Services

| Directory | Service | Description |
| :--- | :--- | :--- |
| `matching_service/` | **Matching Service** | Handles user pairing, matchmaking logic, and room creation. |
| | | **[Detailed Matching Service README](./matching_service/README.md)** |
| `collaboration-service/` | **Collaboration Service** | Manages real-time code editing, chat, and room state via WebSockets. |
| | | **[Detailed Collaboration Service README](./collaboration-service/docs/README.md)** |
| `question_service/` | **Question Service** | Manages the repository and retrieval of coding challenges (Question Bank). |
| | | **[Detailed Question Service README](./question_service/README.md)** |
| `execution-service/` | **Execution Service** | Handles code submission, interfacing with the Judge0 API for running user code. |
| | | **[Detailed Execution Service README](./execution-service/README.md)** |
| `history-service/` | **History Service** | Logs and stores completed collaboration sessions, code runs, and user activity. |
| | | **[Detailed History Service README](./history-service/README.md)** |


---

## 🚀 Getting Started

Follow these steps to get the entire system running locally.

### 1. Prerequisites

* **Docker** and **Docker Compose**
* **Node.js** (for Frontend development)
* **Recommended Browser:** **Google Chrome (Stable Version)** for the best frontend experience and WebSockets support.
* **External API Keys:**
    * **Auth0** Domain and Client IDs
    * **Gemini** API Key (for AI features)
    * **Judge0** API Endpoint/Key (if using a self-hosted instance)

### 2. Configuration

Set up environment variables for each service. Refer to the respective `README.md` files for exact `.env` file requirements.

### 3. Running with Docker Compose

For a fast, complete setup, use Docker Compose to spin up all services and databases:

```bash
docker-compose up --build