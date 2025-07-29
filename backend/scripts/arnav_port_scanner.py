import socket
from pymongo import MongoClient
from neo4j import GraphDatabase

# Neo4j Configuration
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "your_neo4j_password" # <-- IMPORTANT: Change this!

# MongoDB Configuration
MONGO_URI = "mongodb://localhost:27017"

def get_discovered_ips():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    ips = []
    with driver.session() as session:
        result = session.run("MATCH (ip:IP) RETURN ip.address AS address")
        ips = [record["address"] for record in result]
    driver.close()
    return ips

def get_service_name(port):
    try:
        return socket.getservbyport(port, 'tcp')
    except OSError:
        return "Unknown"

def scan_tcp_ports(ip, start_port=1, end_port=1024):
    open_ports = []
    for port in range(start_port, end_port + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex((ip, port)) == 0:
                service = get_service_name(port)
                open_ports.append({"port": port, "service": service})
    return open_ports

def save_to_mongodb(ip, open_ports):
    client = MongoClient(MONGO_URI)
    db = client["network_scan"]
    collection = db["open_ports"]
    collection.update_one(
        {"ip": ip},
        {"$set": {"open_ports": open_ports}},
        upsert=True
    )
    client.close()

if __name__ == "__main__":
    ips_to_scan = get_discovered_ips()
    for ip in ips_to_scan:
        print(f"Scanning ports for {ip}...")
        open_ports = scan_tcp_ports(ip)
        save_to_mongodb(ip, open_ports)
        print(f"Found {len(open_ports)} open ports for {ip}. Results stored in MongoDB.")