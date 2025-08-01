import socket
from neo4j import GraphDatabase
from pymongo import MongoClient

# --- Neo4j Configuration ---
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "Himanshu@07"  # ✅ Your actual password

# --- MongoDB Configuration ---
MONGO_URI = "mongodb://localhost:27017"

# --- Get IPs from Neo4j ---
def get_discovered_ips():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    ips = []
    with driver.session() as session:
        result = session.run("MATCH (ip:IP) RETURN ip.address AS address")
        ips = [record["address"] for record in result]
    driver.close()
    return ips

# --- Scan open ports on an IP ---
def scan_ports(ip, ports_to_check):
    open_ports = []
    for port in ports_to_check:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            try:
                s.connect((ip, port))
                open_ports.append(port)
            except:
                continue
    return open_ports

# --- Save result to MongoDB ---
def save_scan_result(ip, open_ports, uri=MONGO_URI):
    client = MongoClient(uri)
    db = client["network_scan"]
    collection = db["open_ports"]
    collection.update_one({"ip": ip}, {"$set": {"open_ports": open_ports}}, upsert=True)
    print(f"✅ Stored scan results for {ip}")

# --- Main script ---
if __name__ == "__main__":
    ips = get_discovered_ips()
    ports_to_scan = list(range(1, 1025))


    for ip in ips:
        print(f"🔍 Scanning {ip}...")
        open_ports = scan_ports(ip, ports_to_scan)
        print(f"✅ Open ports on {ip}: {open_ports}")
        save_scan_result(ip, open_ports)

    print("🎉 Scanning complete. Results saved to MongoDB.")
