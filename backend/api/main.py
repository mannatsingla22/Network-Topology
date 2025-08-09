import os
import subprocess
from flask import Flask, jsonify, request
from flask_cors import CORS
from neo4j import GraphDatabase
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Database Connection Setup ---
try:
    NEO4J_URI = os.getenv("NEO4J_URI")
    NEO4J_USER = os.getenv("NEO4J_USER")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
    MONGO_URI = os.getenv("MONGO_URI")

    if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, MONGO_URI]):
        raise ValueError("Database environment variables are not fully set.")

    neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client.get_default_database() # Use default DB from URI
except Exception as e:
    print(f"FATAL: Could not connect to databases. Please check .env file. Error: {e}")
    neo4j_driver = None
    db = None

@app.route('/api/scan-ip-range', methods=['POST'])
def scan_ip_range():
    if not neo4j_driver or not db:
        return jsonify({"error": "Backend database connections are not configured."}), 500

    data = request.get_json()
    # *** FIX: Changed 'ipRange' to 'ip_range' to match the frontend request ***
    ip_range = data.get('ip_range')
    if not ip_range:
        return jsonify({"error": "ip_range is a required field."}), 400

    try:
        # --- Run Subnet Discovery Script ---
        # The `check=True` flag will raise an error if the script fails
        subnet_process = subprocess.run(
            ["python", "../subnet_discovery/himanshu_subnet_discovery.py", ip_range],
            capture_output=True, text=True, check=True
        )
        print("Subnet Discovery Output:", subnet_process.stdout)

        # --- Run Port Scanner Script ---
        port_scan_process = subprocess.run(
            ["python", "../port_scanner/arnav_port_scanner.py"],
            capture_output=True, text=True, check=True
        )
        print("Port Scanner Output:", port_scan_process.stdout)

    except subprocess.CalledProcessError as e:
        # This catches errors if the scripts fail to run
        print(f"A subprocess failed: {e}")
        print(f"Stderr: {e.stderr}")
        return jsonify({"error": "A backend script failed during execution.", "details": e.stderr}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An unexpected error occurred during the scan."}), 500

    return jsonify({"message": "Scan completed successfully"})

@app.route('/api/topology-data', methods=['GET'])
def get_topology_data():
    if not neo4j_driver or not db:
        return jsonify({"error": "Backend database connections are not configured."}), 500

    nodes = []
    links = []
    
    # Use a set to keep track of added nodes to prevent duplicates
    added_nodes = set()

    # Fetch data from Neo4j
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (ip:IP)
            OPTIONAL MATCH (ip)-[:BELONGS_TO]->(subnet:Subnet)
            RETURN ip.address AS ip_address, subnet.address AS subnet_address
        """)
        for record in result:
            ip = record["ip_address"]
            subnet = record["subnet_address"]
            
            if ip and ip not in added_nodes:
                nodes.append({"id": ip, "type": "ip"})
                added_nodes.add(ip)
                
            if subnet and subnet not in added_nodes:
                nodes.append({"id": subnet, "type": "subnet"})
                added_nodes.add(subnet)

            if ip and subnet:
                links.append({"source": ip, "target": subnet})

    # Fetch data from MongoDB and enrich the IP nodes
    ip_node_map = {node['id']: node for node in nodes if node['type'] == 'ip'}
    for port_info in db.ports.find():
        ip = port_info.get('ip_address')
        if ip in ip_node_map:
            # Add open port info to the existing IP node object
            ip_node_map[ip]['open_ports'] = [p['port'] for p in port_info.get('open_ports', [])]

    return jsonify({"nodes": nodes, "links": links})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
