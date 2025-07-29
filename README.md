# Network Topology Visualizer

This project is a full-stack web application designed to scan a local network, discover active hosts and open ports, and visualize the results as an interactive network topology graph. The application uses a React frontend, a Node.js (Express) backend, and a combination of Neo4j and MongoDB databases to store and manage network data.

***

## Features

* **IP Range Scanning**: Users can input an IP range (e.g., `192.168.1.0/24`) to initiate a network scan.
* **Host Discovery**: The backend discovers active hosts within the specified range using ICMP (ping) requests and stores the network structure in a Neo4j database.
* **Port Scanning**: For each active host, the application scans for open TCP ports, identifies the running service, and stores the results in MongoDB.
* **Interactive Visualization**: The discovered network topology is rendered as a dynamic, force-directed graph using D3.js on an HTML canvas.
* **Dual Database System**:
    * **Neo4j**: Stores the network structure, including subnets and IP addresses, creating relationships between them.
    * **MongoDB**: Stores the results of the port scans, including open ports and services for each IP address.

***

## Tech Stack

* **Frontend**: React, Vite, D3.js
* **Backend**: Node.js, Express.js
* **Databases**: Neo4j, MongoDB
* **Scripts**: Python

***

## Project Structure

project-root
├── backend
│   ├── express-server
│   │   ├── index.js
│   │   └── package.json
│   └── scripts
│       ├── himanshu_subnet_discovery.py
│       └── arnav_port_scanner.py
├── frontend
│   └── vite-react-ui
│       ├── src
│       └── package.json
└── README.md

***

## Setup and Installation

### Prerequisites

* Node.js (v14 or later)
* Python 3
* Neo4j Desktop or Server
* MongoDB Community Server

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend/express-server

# Install dependencies
npm install

# IMPORTANT: Update the placeholder credentials in `index.js`, 
# `himanshu_subnet_discovery.py`, and `arnav_port_scanner.py` 
# with your actual database passwords.

# Start the server
npm start
```

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend/vite-react-ui

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. Database Setup

- **Neo4j:** Ensure your Neo4j database is running and accessible. The application will automatically clear old data and create the necessary nodes and relationships.

- **MongoDB:** Ensure your MongoDB server is running. The application will automatically create the `network_scan` database and `open_ports` collection on the first scan.

## How to Use

1. Navigate to the frontend URL (usually http://localhost:3000) in your browser.
2. Log in (the application uses a mock login).
3. On the topology page, enter the IP range you wish to scan (e.g., 192.168.1.0/24).
4. Click the "Scan IP Range" button to begin the scan. This process may take a few minutes.
5. Once the scan is complete, the network topology graph will be displayed on the canvas, showing discovered hosts and their open ports.

## Contributors

- Mannat
- Himanshu
- Arnav