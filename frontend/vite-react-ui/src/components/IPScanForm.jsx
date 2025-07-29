import React, { useState } from 'react';

const IPScanForm = ({ onScanComplete, setLoading }) => {
    const [ipRange, setIpRange] = useState('192.168.1.0/24');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await fetch('http://localhost:3001/api/scan-ip-range', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ipRange }),
            });
            onScanComplete();
        } catch (error) {
            console.error('Error starting scan:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '20px', textAlign: 'center' }}>
            <input
                type="text"
                value={ipRange}
                onChange={(e) => setIpRange(e.target.value)}
                style={{ padding: '10px', width: '300px' }}
            />
            <button type="submit" style={{ padding: '10px' }}>Scan IP Range</button>
        </form>
    );
};

export default IPScanForm;