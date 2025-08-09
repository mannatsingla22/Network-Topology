import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';

// --- Icon Asset Management ---
// Defines the paths to your custom icons located in the `public/icons/` directory.
const icons = {
  default: '/icons/default.png',
  router: '/icons/router.png',
  server: '/icons/server.png',
  tower: '/icons/tower.png',
  vm: '/icons/vm.png',
  subnet: '/icons/b_5cd83af5abb62.svg'
};


// --- Reusable UI Helper Components ---

// A generic Icon component for SVG paths
const Icon = ({ path, className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

// A styled, reusable Button component
const Button = ({ children, onClick, className = '', type = 'button', disabled = false }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

// A styled, reusable Input component
const Input = ({ value, onChange, placeholder, className = '', ...props }) => (
    <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2 text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${className}`}
        {...props}
    />
);


// --- D3 Visualization Component ---

const TopologyVisualization = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    // Ensure we have the SVG container and data before proceeding
    if (!svgRef.current || !data || !data.nodes) {
        // Clear the SVG if there's no data
        d3.select(svgRef.current).selectAll("*").remove();
        return;
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render to prevent duplicates

    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    svg.attr('width', width).attr('height', height);

    // Create a deep copy to avoid mutating the original data prop during simulation
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    // Setup the force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Create a group element to hold the graph, allowing for zooming
    const g = svg.append('g');

    // Draw the links (lines)
    const link = g.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5);

    // Create groups for each node (icon + text)
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(drag(simulation)); // Attach drag behavior

    const tooltip = d3.select(tooltipRef.current);

    // Add custom icons to each node
    node.append('image')
      .attr('xlink:href', d => d.type === 'subnet' ? icons.subnet : icons.default)
      .attr('width', 32)
      .attr('height', 32)
      .attr('x', -16) // Center the image
      .attr('y', -16);
      
    // Add labels below the icons
    node.append('text')
        .text(d => d.id)
        .attr('x', 0)
        .attr('y', 28) // Position below the icon
        .attr('text-anchor', 'middle')
        .attr('fill', '#333')
        .style('font-size', '12px');

    // Add tooltip mouse events
    node.on('mouseover', (event, d) => {
        const openPorts = d.open_ports?.join(', ') || 'N/A';
        tooltip.style('opacity', 1)
               .html(`<strong>IP:</strong> ${d.id}<br/><strong>Type:</strong> ${d.type}<br/><strong>Ports:</strong> ${openPorts}`);
      })
      .on('mousemove', (event) => {
        tooltip.style('left', `${event.pageX + 15}px`)
               .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // The 'tick' function updates positions on each step of the simulation
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Implement zoom functionality
    svg.call(d3.zoom().on('zoom', (event) => {
      g.attr('transform', event.transform);
    }));

    // Helper functions for dragging nodes
    function drag(simulation) {
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

  }, [data]); // Rerun this effect whenever the data changes

  return (
    <div className="w-full h-full relative bg-gray-100 rounded-lg border border-gray-300 overflow-hidden">
        <svg ref={svgRef}></svg>
        <div
            ref={tooltipRef}
            className="absolute opacity-0 pointer-events-none bg-white text-gray-800 text-sm p-2 rounded-lg shadow-lg border border-gray-200 transition-opacity duration-200"
        ></div>
    </div>
  );
};


// --- IP Scan Form Component ---

const IPScanForm = ({ onScanStart, onScanComplete, isScanning }) => {
  const [ipRange, setIpRange] = useState('192.168.1.1/24');
  const [error, setError] = useState('');

  const API_BASE_URL = 'http://127.0.0.1:5000/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(ipRange)) {
        setError('Invalid IP range format. Please use CIDR notation (e.g., 192.168.1.1/24).');
        return;
    }
    setError('');
    onScanStart();

    try {
      // Trigger the backend scan
      await axios.post(`${API_BASE_URL}/scan-ip-range`, { ip_range: ipRange });
      
      // After scan is triggered, fetch the new data
      const dataResponse = await axios.get(`${API_BASE_URL}/topology-data`);
      onScanComplete(dataResponse.data);

    } catch (err) {
      console.error('Error during network scan:', err);
      const errorMessage = err.response?.data?.error || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
      onScanComplete(null, err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:flex-grow">
            <label htmlFor="ipRange" className="block text-sm font-medium text-gray-700 mb-1">
                IP Range (CIDR)
            </label>
            <Input
                id="ipRange"
                type="text"
                value={ipRange}
                onChange={(e) => setIpRange(e.target.value)}
                placeholder="e.g., 192.168.1.1/24"
                disabled={isScanning}
            />
        </div>
        <Button type="submit" disabled={isScanning} className="w-full sm:w-auto mt-2 sm:mt-6">
          {isScanning ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scanning...
            </div>
          ) : 'Scan Network'}
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </form>
  );
};


// --- Main Page Components ---

const TopologyPage = ({ onLogout }) => {
  const [topologyData, setTopologyData] = useState({ nodes: [], links: [] });
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState(null);
  
  const API_BASE_URL = 'http://localhost:5000/api';

  // Fetch initial data when the component mounts
  useEffect(() => {
    const fetchData = async () => {
        setIsScanning(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/topology-data`);
            setTopologyData(response.data);
        } catch (err) {
            setError(err.message || 'Failed to fetch initial data.');
            console.error(err);
        } finally {
            setIsScanning(false);
        }
    };
    fetchData();
  }, []);

  const handleScanStart = () => {
    setIsScanning(true);
    setError(null);
    setTopologyData({ nodes: [], links: [] }); // Clear old graph for better UX
  };

  const handleScanComplete = (data, err = null) => {
    if (data) {
      setTopologyData(data);
    }
    if(err) {
      setError('Scan or data fetch failed. Please check the console and backend services.');
    }
    setIsScanning(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="flex items-center justify-between p-4 bg-white shadow-md z-10">
        <h1 className="text-2xl font-bold text-gray-800">Network Topology Visualizer</h1>
        <Button onClick={onLogout} className="bg-red-500 hover:bg-red-600 focus:ring-red-500">
          <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </header>

      <main className="flex-grow p-4 flex flex-col gap-4">
        <IPScanForm onScanStart={handleScanStart} onScanComplete={handleScanComplete} isScanning={isScanning} />
        <div className="flex-grow relative">
            {error && <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-700 p-4 rounded-lg z-20">Error: {error}</div>}
            {(isScanning && (!topologyData || topologyData.nodes.length === 0)) && <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-gray-600 p-4 rounded-lg z-20">Loading data or performing scan...</div>}
            <TopologyVisualization data={topologyData} />
        </div>
      </main>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('password');

    const handleLogin = (e) => {
        e.preventDefault();
        // This is a mock login; in a real app, you'd validate credentials.
        onLogin();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Network Visualizer
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to continue
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                           <Input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="Email address"
                                className="rounded-t-md"
                           />
                        </div>
                        <div>
                            <Input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Password"
                                className="rounded-b-md"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full">
                        Sign In
                    </Button>
                </form>
            </div>
        </div>
    );
};


// --- Main App Component ---

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Simple routing logic based on mock authentication state
  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return <TopologyPage onLogout={() => setIsAuthenticated(false)} />;
}

export default App;
