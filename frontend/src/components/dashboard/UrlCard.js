// frontend/src/components/dashboard/UrlCard.js
import React from 'react';
import Button from '../common/Button';

function UrlCard({ url, onViewDetailsClick, isSelected }) {
  const lastStatus = url.last_status || 'N/A'; // Assuming 'last_status' comes from backend
  const statusColor = lastStatus === 'up' ? 'bg-green-500' : (lastStatus === 'down' ? 'bg-red-500' : 'bg-gray-400');
  const typeBadgeColor = url.type === 'API' ? 'bg-blue-500' : 'bg-purple-500';
  const lastCheckTime = url.last_checked_at ? new Date(url.last_checked_at).toLocaleString() : 'Never';

  // Placeholder for certificate info if type is DOMAIN
  const certExpiryStatus = url.certificate_status || 'N/A';
  let certExpiryColor = 'text-gray-600';
  if (certExpiryStatus === 'valid') certExpiryColor = 'text-green-600';
  else if (certExpiryStatus === 'warning') certExpiryColor = 'text-yellow-600';
  else if (certExpiryStatus === 'expired') certExpiryColor = 'text-red-600';

  const certDaysRemaining = url.days_remaining !== undefined && url.days_remaining !== null ? `${url.days_remaining} days` : 'N/A';

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 flex flex-col justify-between border-t-4 ${isSelected ? 'border-blue-600' : 'border-gray-200'}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-gray-800 break-words pr-2">{url.name}</h3>
          <span className={`${typeBadgeColor} text-white text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
            {url.type}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-4 truncate">{url.url}</p>

        <div className="flex items-center text-sm mb-2">
          <span className={`w-3 h-3 ${statusColor} rounded-full mr-2`}></span>
          <span className="font-medium text-gray-700">Status:</span>
          <span className={`ml-1 capitalize ${lastStatus === 'up' ? 'text-green-700' : (lastStatus === 'down' ? 'text-red-700' : 'text-gray-700')}`}>{lastStatus}</span>
        </div>

        {url.type === 'API' && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium text-gray-700">Latency:</span> {url.last_latency ? `${url.last_latency}ms` : 'N/A'}
          </div>
        )}

        {url.type === 'DOMAIN' && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium text-gray-700">Cert Status:</span> <span className={`${certExpiryColor}`}>{certExpiryStatus.replace(/_/g, ' ')}</span>
            <br />
            <span className="font-medium text-gray-700">Expires In:</span> {certDaysRemaining}
          </div>
        )}

      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
        <span>Last Checked: {lastCheckTime}</span>
        <Button onClick={onViewDetailsClick} className="text-blue-600 hover:text-blue-800 font-medium bg-transparent shadow-none" small>
          View Details
        </Button>
      </div>
    </div>
  );
}

export default UrlCard;
