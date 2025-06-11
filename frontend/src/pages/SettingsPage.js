// frontend/src/pages/SettingsPage.js
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import InputField from '../components/common/InputField';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import {
  fetchAlertConfig,
  saveAlertConfig,
  fetchProxyConfigs,
  addProxyConfig,
  updateProxyConfig,
  deleteProxyConfig
} from '../api/monitoring'; // Assuming these API calls exist
import ProxyConfigForm from '../components/forms/ProxyConfigForm';

function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';

  // Alert Config State
  const [emailRecipient, setEmailRecipient] = useState('');
  const [snmpReceiverHost, setSnmpReceiverHost] = useState('');
  const [snmpCommunity, setSnmpCommunity] = useState('');
  const [snmpApiDownOid, setSnmpApiDownOid] = useState('');
  const [snmpCertExpiryOid, setSnmpCertExpiryOid] = useState('');
  const [certWarningDays, setCertWarningDays] = useState(30);
  const [alertConfigMessage, setAlertConfigMessage] = useState('');
  const [alertConfigError, setAlertConfigError] = useState('');

  // Proxy Config State
  const [proxyConfigs, setProxyConfigs] = useState([]);
  const [editingProxy, setEditingProxy] = useState(null); // null for add, object for edit
  const [proxyMessage, setProxyMessage] = useState('');
  const [proxyError, setProxyError] = useState('');

  // Memoize loadAlertConfig with useCallback
  const loadAlertConfig = useCallback(async () => {
    setAlertConfigError('');
    try {
      if (isAdmin) {
        const config = await fetchAlertConfig();
        setEmailRecipient(config.email_recipient || '');
        setSnmpReceiverHost(config.snmp_receiver_host || '');
        setSnmpCommunity(config.snmp_community || '');
        setSnmpApiDownOid(config.snmp_api_down_oid || '');
        setSnmpCertExpiryOid(config.snmp_cert_expiry_oid || '');
        setCertWarningDays(config.cert_warning_days || 30);
      }
    } catch (err) {
      console.error("Failed to fetch alert config:", err);
      setAlertConfigError(err.message || "Failed to load alert configuration.");
    }
  }, [isAdmin]);

  // Memoize loadProxyConfigs with useCallback
  const loadProxyConfigs = useCallback(async () => {
    setProxyError('');
    try {
      if (isAdmin) {
        const configs = await fetchProxyConfigs();
        setProxyConfigs(configs);
      }
    } catch (err) {
      console.error("Failed to fetch proxy configs:", err);
      setProxyError(err.message || "Failed to load proxy configurations.");
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAlertConfig();
    loadProxyConfigs();
  }, [isAdmin, loadAlertConfig, loadProxyConfigs]); // Added loadAlertConfig, loadProxyConfigs to dependencies

  const handleSaveAlertConfig = async (e) => {
    e.preventDefault();
    setAlertConfigMessage('');
    setAlertConfigError('');

    const configData = {
      email_recipient: emailRecipient,
      snmp_receiver_host: snmpReceiverHost,
      snmp_community: snmpCommunity,
      snmp_api_down_oid: snmpApiDownOid,
      snmp_cert_expiry_oid: snmpCertExpiryOid,
      cert_warning_days: Number(certWarningDays)
    };

    try {
      await saveAlertConfig(configData);
      setAlertConfigMessage('Alert configuration saved successfully!');
    } catch (err) {
      console.error("Failed to save alert config:", err);
      setAlertConfigError(err.message || "Failed to save alert configuration.");
    }
  };

  const handleSaveProxyConfig = async (proxyData) => {
    setProxyMessage('');
    setProxyError('');
    try {
      if (editingProxy) {
        await updateProxyConfig(editingProxy.id, proxyData);
        setProxyMessage('Proxy configuration updated successfully!');
      } else {
        await addProxyConfig(proxyData);
        setProxyMessage('Proxy configuration added successfully!');
      }
      setEditingProxy(null); // Exit editing mode
      await loadProxyConfigs(); // Reload proxies
    } catch (err) {
      console.error("Failed to save proxy config:", err);
      setProxyError(err.message || "Failed to save proxy configuration.");
    }
  };

  const handleDeleteProxyConfig = async (id) => {
    if (window.confirm('Are you sure you want to delete this proxy configuration? This cannot be undone.')) {
      setProxyMessage('');
      setProxyError('');
      try {
        await deleteProxyConfig(id);
        setProxyMessage('Proxy configuration deleted successfully!');
        await loadProxyConfigs(); // Reload proxies
      } catch (err) {
        console.error("Failed to delete proxy config:", err);
        setProxyError(err.message || "Failed to delete proxy configuration.");
      }
    }
  };


  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You do not have administrative privileges to view this page.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center md:text-left">Settings</h1>

      {/* Alert Configuration Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Alert Configurations</h2>
        {alertConfigMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            {alertConfigMessage}
          </div>
        )}
        {alertConfigError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {alertConfigError}
          </div>
        )}
        <form onSubmit={handleSaveAlertConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Email Recipient"
            id="emailRecipient"
            type="email"
            value={emailRecipient}
            onChange={(e) => setEmailRecipient(e.target.value)}
            placeholder="alerts@example.com"
          />
          <InputField
            label="SNMP Receiver Host"
            id="snmpReceiverHost"
            type="text"
            value={snmpReceiverHost}
            onChange={(e) => setSnmpReceiverHost(e.target.value)}
            placeholder="192.168.1.100"
          />
          <InputField
            label="SNMP Community"
            id="snmpCommunity"
            type="text"
            value={snmpCommunity}
            onChange={(e) => setSnmpCommunity(e.target.value)}
            placeholder="public"
          />
          <InputField
            label="SNMP API Down OID"
            id="snmpApiDownOid"
            type="text"
            value={snmpApiDownOid}
            onChange={(e) => setSnmpApiDownOid(e.target.value)}
            placeholder=".1.3.6.1.4.1.9999.1.1"
          />
          <InputField
            label="SNMP Cert Expiry OID"
            id="snmpCertExpiryOid"
            type="text"
            value={snmpCertExpiryOid}
            onChange={(e) => setSnmpCertExpiryOid(e.target.value)}
            placeholder=".1.3.6.1.4.1.9999.1.2"
          />
          <InputField
            label="Certificate Warning Days"
            id="certWarningDays"
            type="number"
            value={certWarningDays}
            onChange={(e) => setCertWarningDays(e.target.value)}
            min="1"
            max="365"
          />
          <div className="md:col-span-2 flex justify-end mt-4">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
            >
              Save Alert Settings
            </Button>
          </div>
        </form>
      </div>

      {/* Proxy Configuration Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Proxy Configurations</h2>
        {proxyMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            {proxyMessage}
          </div>
        )}
        {proxyError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {proxyError}
          </div>
        )}

        <ProxyConfigForm
          onSubmit={handleSaveProxyConfig}
          initialData={editingProxy}
          onCancel={() => setEditingProxy(null)}
        />

        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Existing Proxies</h3>
        {proxyConfigs.length === 0 ? (
          <p className="text-gray-600">No proxy configurations added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host:Port</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auth</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enabled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proxyConfigs.map((proxy) => (
                  <tr key={proxy.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{proxy.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{proxy.host}:{proxy.port}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{proxy.protocol}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proxy.username ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {proxy.enabled ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <Button
                        onClick={() => setEditingProxy(proxy)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        small
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteProxyConfig(proxy.id)}
                        className="text-red-600 hover:text-red-900"
                        small
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
