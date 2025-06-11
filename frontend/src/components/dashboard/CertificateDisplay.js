// frontend/src/components/dashboard/CertificateDisplay.js
import React, { useEffect, useState } from 'react';
import { fetchCertificateInfo } from '../../api/monitoring';

function CertificateDisplay({ urlId }) {
  const [certInfo, setCertInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCertInfo = async () => {
      if (!urlId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetchCertificateInfo(urlId);
        // Ensure response.data and response.data.certificate exist
        if (response && response.data && response.data.certificate) {
          setCertInfo(response.data.certificate);
        } else {
          setCertInfo(null);
          // More specific error message if backend confirms no cert info
          setError("No certificate information found for this URL, or it's not a domain type.");
        }
      } catch (err) {
        console.error('Failed to fetch certificate info:', err);
        setError(err.message || 'Failed to load certificate information.');
        setCertInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadCertInfo();
    const interval = setInterval(loadCertInfo, 3600000); // Poll every hour for cert info
    return () => clearInterval(interval);
  }, [urlId]);

  if (loading) {
    return <div className="text-center text-gray-500">Loading certificate information...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (!certInfo) {
    return <div className="text-center text-gray-500">No certificate information available for this URL. Ensure it's a DOMAIN type.</div>;
  }

  // Destructure certInfo only after checking it's not null
  const { status, days_remaining } = certInfo;

  // Ensure status is a string before calling replace
  let statusText = (status || 'N/A').replace(/_/g, ' ');

  let statusColor = 'text-gray-700';
  if (status === 'valid') {
    statusColor = 'text-green-600';
  } else if (status === 'warning') {
    statusColor = 'text-yellow-600';
  } else if (status === 'expired') {
    statusColor = 'text-red-600';
  } else if (status === 'unavailable' || status === 'not_reachable' || status === 'error') {
    statusColor = 'text-red-800';
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-md border-t-4 border-purple-600">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Certificate Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
        <div>
          <p className="font-medium">Status:</p>
          <p className={`text-lg font-bold ${statusColor}`}>{statusText}</p>
        </div>
        <div>
          <p className="font-medium">Days Remaining:</p>
          <p className="text-lg font-bold">
            {days_remaining !== undefined && days_remaining !== null ? `${days_remaining} days` : 'N/A'}
          </p>
        </div>
        {/* You can add more certificate details here if needed, e.g., issuer, subject, expiry_date */}
        {/*
        {certInfo.expiry_date && (
            <div>
                <p className="font-medium">Expiry Date:</p>
                <p>{new Date(certInfo.expiry_date).toLocaleDateString()}</p>
            </div>
        )}
        {certInfo.issuer && (
            <div>
                <p className="font-medium">Issuer:</p>
                <p className="break-words">{certInfo.issuer}</p>
            </div>
        )}
        {certInfo.subject && (
            <div>
                <p className="font-medium">Subject:</p>
                <p className="break-words">{certInfo.subject}</p>
            </div>
        )}
        */}
      </div>
      {(status === 'warning' || status === 'expired') && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <strong>Action Required:</strong> Your certificate is either expiring soon or has expired. Please renew it to ensure continuous service.
        </div>
      )}
    </div>
  );
}

export default CertificateDisplay;
