import sys
import ipaddress
import subprocess
import platform
import psutil
from neo4j import GraphDatabase

# Neo4j Configuration
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "your_neo4j_password"  # <-- IMPORTANT: Change this!

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def ping_ip(ip):
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', str(ip)]
    try:
        subprocess.check_output(command, stderr=subprocess.DEVNULL)
        return str(ip), True
    except subprocess.CalledProcessError:
        return str(ip), False

def store_in_neo4j(subnet, used_ips):
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n") # Clear old data
        session.run(
            "MERGE (s:Subnet {cidr: $cidr})",
            cidr=str(subnet)
        )
        for ip in used_ips:
            session.run(
                "MERGE (ip:IP {address: $ip})",
                ip=ip
            )
            session.run(
                "MATCH (s:Subnet {cidr: $cidr}), (ip:IP {address: $ip}) " +
                "MERGE (ip)-[:BELONGS_TO]->(s)",
                cidr=str(subnet), ip=ip
            )

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python himanshu_subnet_discovery.py <IP_RANGE>")
        sys.exit(1)

    ip_range = sys.argv[1]
    try:
        subnet = ipaddress.ip_network(ip_range)
    except ValueError:
        print("Invalid IP range format.")
        sys.exit(1)

    used_ips = []
    for ip in subnet.hosts():
        ip_str, is_up = ping_ip(ip)
        if is_up:
            used_ips.append(ip_str)
            print(f"Host {ip_str} is UP")

    store_in_neo4j(subnet, used_ips)
    print("Subnet discovery complete. Data stored in Neo4j.")