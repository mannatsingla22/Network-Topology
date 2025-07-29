import React, { useState, useEffect } from 'react';
import IPScanForm from '../components/IPScanForm';
import Topology from '../components/Topology';

const TopologyPage = () => {
    const [topologyData, setTopologyData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(false);

    const fetchTopologyData = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/topology-data');
            const data = await response.json();
            setTopologyData(data);
        } catch (error) {
            console.error('Error fetching topology data:', error);
        }
    };

    useEffect(() => {
        fetchTopologyData();
    }, []);

    return (
        <div>
            <IPScanForm onScanComplete={fetchTopologyData} setLoading={setLoading} />
            {loading ? <p>Scanning...</p> : <Topology data={topologyData} />}
        </div>
    );
};

export default TopologyPage;