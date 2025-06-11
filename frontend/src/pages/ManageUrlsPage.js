// frontend/src/pages/ManageUrlsPage.js
import React, { useEffect, useState } from 'react';
import {
  fetchUrls,
  addUrl,
  updateUrl,
  deleteUrl,
  fetchProxyConfigs,
} from '../api/monitoring';
import InputField from '../components/common/InputField';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext'; // To get user role for restrictions

function ManageUrlsPage() {
  const { user } = useAuth(); // Assuming user object has 'role'
  const isAdmin = user && user.role === 'admin';

  const [urls, setUrls] = useState([]);
  const [proxyConfigs, setProxyConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUrl, setEditingUrl] = useState(null); // null for add, object for edit

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('API'); // Default to API
  const [monitoringInterval, setMonitoringInterval] = useState(5);
  const [proxyConfigId, setProxyConfigId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setEditingUrl(null);
    setName('');
    setUrl('');
    setType('API');
    setMonitoringInterval(5);
    setProxyConfigId(''); // Reset to empty string
    setIsActive(true);
    setFormError('');
  };

  const loadUrlsAndProxies = async () => {
    setLoading(true);
    setError(null);
    try {
      const urlsResponse = await fetchUrls();
      setUrls(urlsResponse); // Assuming fetchUrls directly returns the array now
      const proxiesResponse = await fetchProxyConfigs();
      setProxyConfigs(proxiesResponse);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load URLs or Proxy Configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUrlsAndProxies();
  }, []);

  const handleEditClick = (urlToEdit) => {
    setEditingUrl(urlToEdit);
    setName(urlToEdit.name);
    setUrl(urlToEdit.url);
    setType(urlToEdit.type);
    setMonitoringInterval(urlToEdit.monitoring_interval_minutes);
    setProxyConfigId(urlToEdit.proxy_config_id ? String(urlToEdit.proxy_config_id) : ''); // Convert to string for select input
    setIsActive(urlToEdit.is_active);
    setFormError('');
  };

  const handleSaveUrl = async (e) => {
    e.preventDefault();
    setFormError('');

    const urlData = {
      name,
      url,
      type,
      monitoring_interval_minutes: Number(monitoringInterval),
      proxy_config_id: proxyConfigId ? Number(proxyConfigId) : null,
      is_active: isActive,
    };

    try {
      if (editingUrl) {
        await updateUrl(editingUrl.id, urlData);
        alert('URL updated successfully!');
      } else {
        await addUrl(urlData);
        alert('URL added successfully!');
      }
      resetForm();
      loadUrlsAndProxies(); // Reload data to reflect changes
    } catch (err) {
      console.error('Failed to save URL:', err);
      setFormError(err.message || 'Failed to save URL. Please check your input.');
    }
  };

  const handleDeleteUrl = async (id) => {
    if (window.confirm('Are you sure you want to delete this URL?')) {
      setError(null);
      try {
        await deleteUrl(id);
        alert('URL deleted successfully!');
        loadUrlsAndProxies(); // Reload data
      } catch (err) {
        console.error('Failed to delete URL:', err);
        setError(err.message || 'Failed to delete URL.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-700">Loading URLs and Proxy Configurations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center md:text-left">Manage Monitored URLs</h1>

      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          {formError}
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {editingUrl ? 'Edit URL' : 'Add New URL'}
          </h2>
          <form onSubmit={handleSaveUrl} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Name"
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <InputField
              label="URL"
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
              >
                {editingUrl ? 'Update URL' : 'Add URL'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Current Monitored URLs</h2>
      {urls.length === 0 ? (
        <p className="text-gray-600 text-center py-4">No URLs configured yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interval (min)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proxy
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                {isAdmin && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {urls.map((url) => (
                <tr key={url.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{url.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline">
                    <a href={url.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-xs block">{url.url}</a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{url.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{url.monitoring_interval_minutes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {url.proxy_name ? `${url.proxy_name} (${url.proxy_host}:${url.proxy_port})` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {url.is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        No
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <Button
                        onClick={() => handleEditClick(url)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        small
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteUrl(url.id)}
                        className="text-red-600 hover:text-red-900"
                        small
                      >
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManageUrlsPage;
