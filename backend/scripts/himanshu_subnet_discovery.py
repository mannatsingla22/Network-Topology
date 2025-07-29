import socket
import ipaddress
import subprocess
import platform
import psutil
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from neo4j import GraphDatabase

# Neo4j Configuration
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "Himanshu@07"  # <<< Replace with your Neo4j password

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def get_local_ip_and_netmask():
    interfaces = psutil.net_if_addrs()
    for interface in interfaces.values():
        for addr in interface:
            if addr.family == socket.AF_INET:
                ip = addr.address
                if not ip.startswith("127.") and not ip.startswith("169.254."):
                    return ip, addr.netmask

    for interface in interfaces.values():
        for addr in interface:
            if addr.family == socket.AF_INET and addr.address.startswith("169.254."):
                print(f"[!] Detected fallback IP: {addr.address}")
                print("[!] Your system is not connected to any network.")
                print("[!] Please connect to Wi-Fi or Ethernet and try again.")
                sys.exit(1)

    raise RuntimeError("No suitable IPv4 network interface found.")

def get_subnet(ip, netmask):
    return ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)

def ping_ip(ip):
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', '-w', '500', str(ip)] if platform.system().lower() == 'windows' \
              else ['ping', param, '1', '-W', '1', str(ip)]
    try:
        subprocess.check_output(command, stderr=subprocess.DEVNULL)
        return str(ip), True
    except subprocess.CalledProcessError:
        return str(ip), False

def discover_hosts_parallel(subnet, max_workers=100):
    used_ips = []
    available_ips = []

    print(f"[*] Scanning {len(list(subnet.hosts()))} IPs in parallel...\n")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(ping_ip, ip): ip for ip in subnet.hosts()}

        for future in as_completed(futures):
            ip_str, is_up = future.result()
            if is_up:
                used_ips.append(ip_str)
                print(f"[+] Host {ip_str} is UP")
            else:
                available_ips.append(ip_str)
                print(f"[-] Host {ip_str} is DOWN")

    return used_ips, available_ips

def store_in_neo4j(local_ip, netmask, subnet, used_ips, available_ips, available_percentage):
    with driver.session() as session:
        # Store subnet node with statistics
        session.execute_write(lambda tx: tx.run("""
            MERGE (s:Subnet {cidr: $cidr})
            SET s.netmask = $netmask,
                s.network = $network,
                s.total_ips = $total,
                s.used_ips = $used,
                s.available_ips = $available,
                s.available_percentage = $available_pct
        """, cidr=subnet.with_prefixlen,
             netmask=netmask,
             network=str(subnet.network_address),
             total=len(list(subnet.hosts())),
             used=len(used_ips),
             available=len(available_ips),
             available_pct=round(available_percentage, 2)))

        # Store used IPs with host/interface nodes
        for ip in used_ips:
            interface_type = "primary" if ip == local_ip else "secondary"
            host_name = f"host-{ip.replace('.', '-')}"
            interface_name = f"{host_name}-{interface_type}"

            session.execute_write(lambda tx: tx.run("""
                MERGE (h:Host {name: $host})
                MERGE (i:Interface {name: $interface})
                SET i.type = $type
                MERGE (h)-[:HAS_INTERFACE]->(i)
                MERGE (ip:IP {address: $ip})
                SET ip.status = "used"
                MERGE (i)-[:HAS_IP]->(ip)
                MERGE (s:Subnet {cidr: $cidr})
                MERGE (ip)-[:BELONGS_TO]->(s)
            """, host=host_name, interface=interface_name, type=interface_type,
                 ip=ip, cidr=subnet.with_prefixlen))

        # Store available IPs as nodes
        for ip in available_ips:
            session.execute_write(lambda tx: tx.run("""
                MERGE (ip:IP {address: $ip})
                SET ip.status = "available"
                MERGE (s:Subnet {cidr: $cidr})
                MERGE (ip)-[:BELONGS_TO]->(s)
            """, ip=ip, cidr=subnet.with_prefixlen))

if __name__ == "__main__":
    print("[*] Discovering local IP and subnet mask...")
    local_ip, netmask = get_local_ip_and_netmask()
    subnet = get_subnet(local_ip, netmask)
    print(f"[*] Local IP: {local_ip}")
    print(f"[*] Subnet Mask: {netmask}")
    print(f"[*] Subnet: {subnet}\n")

    used_ips, available_ips = discover_hosts_parallel(subnet)

    total_ips = len(list(subnet.hosts()))
    num_available = len(available_ips)
    available_percentage = (num_available / total_ips) * 100 if total_ips > 0 else 0

    print("\n================== RESULTS ==================")
    print(f"Subnet: {subnet}")
    print(f"Total Usable IPs: {total_ips}")

    print(f"\nUsed IPs (alive): {len(used_ips)}")
    for ip in used_ips:
        print(f" - {ip}")

    print(f"\nAvailable IPs (no response): {num_available}")
    for ip in available_ips:
        print(f" - {ip}")

    print(f"\nPercentage of Available IPs: {available_percentage:.2f}%")

    # Store results in Neo4j
    print("\n[*] Storing results in Neo4j...")
    store_in_neo4j(local_ip, netmask, subnet, used_ips, available_ips, available_percentage)
    print("[*] Data stored in Neo4j successfully.")
