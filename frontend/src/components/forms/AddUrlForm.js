// frontend/src/components/forms/AddUrlForm.js
import React, { useState, useEffect } from 'react';
import InputField from '../common/InputField'; // Corrected casing
import Button from '../common/Button';
import { fetchProxyConfigs } from '../../api/monitoring'; // To load proxy options

function AddUrlForm({ onSubmit, initialData = null, onCancel }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('API'); // Default to API
  const [monitoringInterval, setMonitoringInterval] = useState(5);
  const [proxyConfigId, setProxyConfigId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [proxyConfigs, setProxyConfigs] = useState([]);
  const [loadingProxies, setLoadingProxies] = useState(true);
  const [proxyError, setProxyError] = useState(null);

  useEffect(() => {
    // Populate form if initialData is provided (for editing)
    if (initialData) {
      setName(initialData.name);
      setUrl(initialData.url);
      setType(initialData.type);
      setMonitoringInterval(initialData.monitoring_interval_minutes);
      // Ensure proxyConfigId is set correctly for the select dropdown
      setProxyConfigId(initialData.proxy_config_id ? String(initialData.proxy_config_id) : '');
      setIsActive(initialData.is_active);
    } else {
      // Reset form if no initialData (for adding new)
      setName('');
      setUrl('');
      setType('API');
      setMonitoringInterval(5);
      setProxyConfigId('');
      setIsActive(true);
    }
    setFormError(''); // Clear errors on initial load or data change
  }, [initialData]);

  useEffect(() => {
    const loadProxyOptions = async () => {
      setLoadingProxies(true);
      setProxyError(null);
      try {
        const fetchedProxies = await fetchProxyConfigs();
        setProxyConfigs(fetchedProxies);
      } catch (err) {
        console.error('Failed to fetch proxy configurations for form:', err);
        setProxyError('Failed to load proxy options.');
      } finally {
        setLoadingProxies(false);
      }
    };
    loadProxyOptions();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Basic client-side validation for required fields before sending to backend
    if (!name.trim() || !url.trim()) {
      setFormError('Name and URL are required.');
      return;
    }
    if (monitoringInterval < 1) {
        setFormError('Monitoring interval must be at least 1 minute.');
        return;
    }

    const data = {
      name,
      url,
      type,
      monitoring_interval_minutes: Number(monitoringInterval),
      // Convert empty string to null for DB foreign key
      proxy_config_id: proxyConfigId ? Number(proxyConfigId) : null,
      is_active: isActive,
    };
    onSubmit(data); // Pass data to the parent component's handler
  };

  if (loadingProxies) {
    return <div className="text-center text-gray-500">Loading proxy options...</div>;
  }

  if (proxyError) {
    return <div className="text-center text-red-500">Error loading proxies: {proxyError}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 md:col-span-2">
        {initialData ? 'Edit Monitored URL' : 'Add New Monitored URL'}
      </h2>

      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 col-span-2" role="alert">
          {formError}
        </div>
      )}

      <InputField
        label="Name"
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., My Website Homepage"
        required
      />
      <InputField
        label="URL"
        id="url"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/api/health or https://example.com"
        required
      />

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        >
          <option value="API">API</option>
          <option value="DOMAIN">DOMAIN</option>
        </select>
      </div>

      <InputField
        label="Monitoring Interval (minutes)"
        id="monitoringInterval"
        type="number"
        value={monitoringInterval}
        onChange={(e) => setMonitoringInterval(e.target.value)}
        min="1"
        required
        placeholder="e.g., 5"
      />

      <div>
        <label htmlFor="proxyConfig" className="block text-sm font-medium text-gray-700 mb-1">
          Proxy Configuration (Optional)
        </label>
        <select
          id="proxyConfig"
          value={proxyConfigId}
          onChange={(e) => setProxyConfigId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">No Proxy</option>
          {proxyConfigs.map((proxy) => (
            <option key={proxy.id} value={proxy.id}>
              {proxy.name} ({proxy.host}:{proxy.port})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center mt-4">
        <input
          id="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
          Is Active
        </label>
      </div>

      <div className="md:col-span-2 flex justify-end space-x-3 mt-6">
        <Button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          {initialData ? 'Update URL' : 'Add URL'}
        </Button>
      </div>
    </form>
  );
}

export default AddUrlForm;
