import os
import sys
from ipaddress import ip_network
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

class SubnetDiscovery:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def discover_and_store_subnet(self, ip_range):
        with self.driver.session() as session:
            # Use execute_write for modern py-driver compatibility
            session.execute_write(self._create_subnet_and_ips, ip_range)

    @staticmethod
    def _create_subnet_and_ips(tx, ip_range):
        network = ip_network(ip_range, strict=False) # Use strict=False to allow host bits in network address
        subnet_address = str(network.network_address)
        
        # Clear old data for this subnet to avoid duplicates on re-scan
        tx.run("""
            MATCH (s:Subnet {address: $subnet_address})
            OPTIONAL MATCH (s)<-[:BELONGS_TO]-(ip:IP)
            DETACH DELETE s, ip
        """, subnet_address=subnet_address)

        # Create Subnet node
        tx.run("MERGE (s:Subnet {address: $address})", address=subnet_address)

        # Create IP nodes and relationships
        for ip in network.hosts():
            ip_address = str(ip)
            tx.run("""
                MATCH (s:Subnet {address: $subnet_address})
                MERGE (i:IP {address: $ip_address})
                MERGE (i)-[:BELONGS_TO]->(s)
            """, subnet_address=subnet_address, ip_address=ip_address)

if __name__ == '__main__':
    # *** FIX: Read the IP range from the command-line arguments ***
    if len(sys.argv) < 2:
        print("Error: Please provide an IP range as a command-line argument.", file=sys.stderr)
        sys.exit(1)
    
    target_ip_range = sys.argv[1]
    
    try:
        NEO4J_URI = os.getenv("NEO4J_URI")
        NEO4J_USER = os.getenv("NEO4J_USER")
        NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

        if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
            raise ValueError("Database environment variables are not fully set in .env file.")

        print(f"Starting subnet discovery for: {target_ip_range}")
        subnet_discovery = SubnetDiscovery(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
        subnet_discovery.discover_and_store_subnet(target_ip_range)
        subnet_discovery.close()
        print(f"Subnet discovery complete for {target_ip_range}. Data stored in Neo4j.")

    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)
