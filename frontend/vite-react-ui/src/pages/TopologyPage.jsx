import React, { useState, useEffect } from 'react';
import IPScanForm from '../components/IPScanForm';
import TopologyVisualization from '../components/TopologyVisualization';
import Button from '../components/Button';
import Icon from '../components/Icon';

const TopologyPage = ({ onLogout }) => {
  const [topologyData, setTopologyData] = useState({ nodes: [], links: [] });
  const [isScanning, setIsScanning] = useState(true); // Start in loading state
  const [error, setError] = useState(null);
  
  const API_BASE_URL = 'http://127.0.0.1:5000/api';

  useEffect(() => {
    const fetchData = async () => {
        setIsScanning(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/topology-data`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setTopologyData(data);
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
    setTopologyData({ nodes: [], links: [] });
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
            {(isScanning && topologyData.nodes.length === 0) && <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-gray-600 p-4 rounded-lg z-20">Loading data or performing scan...</div>}
            <TopologyVisualization data={topologyData} />
        </div>
      </main>
    </div>
  );
};

export default TopologyPage;
