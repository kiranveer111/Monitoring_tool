// frontend/src/pages/DashboardPage.js
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import UrlCard from '../components/dashboard/UrlCard';
import UptimeChart from '../components/dashboard/UptimeChart';
import CertificateDisplay from '../components/dashboard/CertificateDisplay';
import { fetchUrls } from '../api/monitoring'; // Removed fetchMonitoringLogs, fetchCertificateInfo
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth(); // Removed 'user'
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUrlIdForChart, setSelectedUrlIdForChart] = useState(null); // State for chart
  const [selectedUrlTypeForCert, setSelectedUrlTypeForCert] = useState(null); // State for certificate display
  const navigate = useNavigate();

  // Memoize loadData with useCallback to prevent infinite loops in useEffect
  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const fetchedUrls = await fetchUrls();
      setUrls(fetchedUrls);
      setError(null);
      // Automatically select the first URL for details if available
      if (fetchedUrls.length > 0 && selectedUrlIdForChart === null) { // Only set if not already selected
        setSelectedUrlIdForChart(fetchedUrls[0].id);
        setSelectedUrlTypeForCert(fetchedUrls[0].type);
      } else if (fetchedUrls.length === 0) {
        setSelectedUrlIdForChart(null);
        setSelectedUrlTypeForCert(null);
      }
    } catch (err) {
      console.error('Failed to fetch URLs:', err);
      setError(err.message || 'Failed to load monitoring data.');
      setUrls([]); // Clear URLs on error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedUrlIdForChart]); // Added selectedUrlIdForChart as dependency

  useEffect(() => {
    // Only fetch data if authenticated
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 60000); // Poll every minute
      return () => clearInterval(interval); // Cleanup on unmount
    } else if (!isLoading) {
      // If not authenticated and loading is complete, redirect to login
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate, loadData]); // Added loadData to dependency array

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-700">Loading user session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This case should ideally be handled by the redirect in useEffect
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-700">Loading dashboard data...</div>
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
        <p className="mt-4 text-gray-600">Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center md:text-left">Monitoring Dashboard</h1>

      {urls.length === 0 && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-8 text-center" role="alert">
          <strong className="font-bold">No URLs monitored yet!</strong>
          <span className="block sm:inline"> Start by adding one from the "Manage URLs" page.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {urls.map((url) => (
          <UrlCard
            key={url.id}
            url={url}
            onViewDetailsClick={() => {
              setSelectedUrlIdForChart(url.id);
              setSelectedUrlTypeForCert(url.type);
            }}
            isSelected={selectedUrlIdForChart === url.id}
          />
        ))}
      </div>

      {(selectedUrlIdForChart && selectedUrlTypeForCert === 'API') && (
        <div className="mt-12 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Uptime Trend (Last 24 Hours)</h2>
          <UptimeChart urlId={selectedUrlIdForChart} />
        </div>
      )}

      {(selectedUrlIdForChart && selectedUrlTypeForCert === 'DOMAIN') && (
        <div className="mt-12 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Certificate Expiry Details</h2>
          <CertificateDisplay urlId={selectedUrlIdForChart} />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
