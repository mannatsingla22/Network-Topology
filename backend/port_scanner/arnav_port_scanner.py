import os
import socket
from pymongo import MongoClient
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

class PortScanner:
    def __init__(self, neo4j_uri, neo4j_user, neo4j_password, mongo_uri):
        self.neo4j_driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client.network_topology

    def close(self):
        self.neo4j_driver.close()
        self.mongo_client.close()

    def get_ips_from_neo4j(self):
        with self.neo4j_driver.session() as session:
            result = session.run("MATCH (i:IP) RETURN i.address AS ip")
            return [record["ip"] for record in result]

    def scan_ports(self, ip_address):
        open_ports = []
        common_ports = {
            21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
            80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 3306: "MySQL",
            3389: "RDP", 5900: "VNC"
        }
        for port, service in common_ports.items():
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((ip_address, port))
                if result == 0:
                    open_ports.append({"port": port, "service": service})
        return open_ports

    def store_port_scan_results(self, ip_address, open_ports):
        self.db.ports.update_one(
            {"ip_address": ip_address},
            {"$set": {"open_ports": open_ports}},
            upsert=True
        )

    def run_scan(self):
        ips = self.get_ips_from_neo4j()
        for ip in ips:
            open_ports = self.scan_ports(ip)
            if open_ports:
                self.store_port_scan_results(ip, open_ports)
                print(f"Found open ports on {ip}: {open_ports}")

if __name__ == '__main__':
    NEO4J_URI = os.getenv("NEO4J_URI")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
    MONGO_URI = os.getenv("MONGO_URI")

    port_scanner = PortScanner(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, MONGO_URI)
    port_scanner.run_scan()
    port_scanner.close()
    print("Port scanning complete and data stored in MongoDB.")