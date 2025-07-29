const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// MongoDB Configuration
const mongoUri = 'mongodb://localhost:27017';
const mongoClient = new MongoClient(mongoUri);

// Neo4j Configuration
const neo4jUri = 'bolt://localhost:7687';
const neo4jUser = 'neo4j';
const neo4jPassword = 'your_neo4j_password'; // <-- IMPORTANT: Change this!
const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));

// API Endpoint to trigger the scan
app.post('/api/scan-ip-range', (req, res) => {
  const { ipRange } = req.body;

  if (!ipRange) {
    return res.status(400).send('ipRange is required');
  }

  // 1. Run Himanshu's subnet discovery script
  const subnetDiscovery = spawn('python', ['../scripts/himanshu_subnet_discovery.py', ipRange]);

  subnetDiscovery.stdout.on('data', (data) => {
    console.log(`Subnet Discovery: ${data}`);
  });

  subnetDiscovery.stderr.on('data', (data) => {
    console.error(`Subnet Discovery Error: ${data}`);
  });

  subnetDiscovery.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).send('Subnet discovery failed');
    }

    // 2. Run Arnav's port scanner script
    const portScanner = spawn('python', ['../scripts/arnav_port_scanner.py']);

    portScanner.stdout.on('data', (data) => {
      console.log(`Port Scanner: ${data}`);
    });

    portScanner.stderr.on('data', (data) => {
      console.error(`Port Scanner Error: ${data}`);
    });

    portScanner.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).send('Port scanning failed');
      }
      res.status(200).send('Scan complete');
    });
  });
});

// API Endpoint to fetch topology data
app.get('/api/topology-data', async (req, res) => {
  const session = driver.session();
  try {
    // Fetch IP data from Neo4j
    const neo4jResult = await session.run(
      'MATCH (ip:IP) RETURN ip.address AS address'
    );
    const ips = neo4jResult.records.map(record => record.get('address'));

    // Fetch port data from MongoDB
    await mongoClient.connect();
    const db = mongoClient.db('network_scan');
    const collection = db.collection('open_ports');
    const portData = await collection.find({ ip: { $in: ips } }).toArray();

    // Combine data
    const topologyData = {
      nodes: [],
      links: []
    };

    const ipNodeMap = {};

    ips.forEach((ip, index) => {
      const node = { id: ip, type: 'vm' };
      topologyData.nodes.push(node);
      ipNodeMap[ip] = node;

      if (index > 0) {
          topologyData.links.push({ source: ips[0], target: ip });
      }
    });

    portData.forEach(scanResult => {
        const ipNode = ipNodeMap[scanResult.ip];
        if (ipNode && scanResult.open_ports) {
            scanResult.open_ports.forEach(portInfo => {
                const portNodeId = `${scanResult.ip}:${portInfo.port}`;
                topologyData.nodes.push({ id: portNodeId, type: 'service', label: `${portInfo.port}/${portInfo.service}`});
                topologyData.links.push({ source: scanResult.ip, target: portNodeId });
            });
        }
    });


    res.json(topologyData);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching topology data');
  } finally {
    await session.close();
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});