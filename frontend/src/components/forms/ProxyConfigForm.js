// frontend/src/components/forms/ProxyConfigForm.js
import React, { useState, useEffect } from 'react';
import InputField from '../common/InputField';
import Button from '../common/Button';

function ProxyConfigForm({ onSubmit, initialData = null, onCancel }) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState('http');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setHost(initialData.host || '');
      setPort(initialData.port || '');
      setProtocol(initialData.protocol || 'http');
      setUsername(initialData.username || '');
      setPassword(initialData.password || '');
      setEnabled(initialData.enabled);
    } else {
      // Reset form for adding new
      setName('');
      setHost('');
      setPort('');
      setProtocol('http');
      setUsername('');
      setPassword('');
      setEnabled(true);
    }
    setFormError('');
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Basic client-side validation
    if (!name.trim() || !host.trim() || !port) {
      setFormError('Name, Host, and Port are required.');
      return;
    }
    if (isNaN(port) || Number(port) < 1 || Number(port) > 65535) {
      setFormError('Port must be a number between 1 and 65535.');
      return;
    }

    const data = {
      name,
      host,
      port: Number(port),
      protocol,
      username: username || null, // Send null if empty
      password: password || null, // Send null if empty
      enabled,
    };

    onSubmit(data); // Pass data to the parent component's handler
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-yellow-600">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        {initialData ? 'Edit Proxy Configuration' : 'Add New Proxy Configuration'}
      </h2>

      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Proxy Name"
          id="proxyName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Corporate Proxy"
          required
        />
        <InputField
          label="Host"
          id="proxyHost"
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="e.g., proxy.example.com or 192.168.1.1"
          required
        />
        <InputField
          label="Port"
          id="proxyPort"
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          min="1"
          max="65535"
          placeholder="e.g., 8080"
          required
        />
        <div>
          <label htmlFor="protocol" className="block text-sm font-medium text-gray-700 mb-1">
            Protocol
          </label>
          <select
            id="protocol"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          >
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>
        <InputField
          label="Username (Optional)"
          id="proxyUsername"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g., proxyuser"
        />
        <InputField
          label="Password (Optional)"
          id="proxyPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
        />
        <div className="flex items-center mt-4 md:col-span-2">
          <input
            id="proxyEnabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="proxyEnabled" className="ml-2 block text-sm text-gray-900">
            Enabled
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
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
          >
            {initialData ? 'Update Proxy' : 'Add Proxy'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProxyConfigForm;
