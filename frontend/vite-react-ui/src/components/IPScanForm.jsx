import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';

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
      const scanResponse = await fetch(`${API_BASE_URL}/scan-ip-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_range: ipRange }),
      });

      if (!scanResponse.ok) {
        const errData = await scanResponse.json().catch(() => ({ error: `Scan failed with status: ${scanResponse.status}` }));
        throw new Error(errData.error || `Scan failed with status: ${scanResponse.status}`);
      }
      
      const dataResponse = await fetch(`${API_BASE_URL}/topology-data`);
      if (!dataResponse.ok) {
          throw new Error(`Fetching data failed with status: ${dataResponse.status}`);
      }
      const result = await dataResponse.json();
      onScanComplete(result);

    } catch (err) {
      console.error('Error during network scan:', err);
      setError(err.message || 'An unexpected error occurred.');
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

export default IPScanForm;
