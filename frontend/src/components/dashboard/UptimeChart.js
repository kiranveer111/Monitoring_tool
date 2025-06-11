// frontend/src/components/dashboard/UptimeChart.js
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchMonitoringLogs } from '../../api/monitoring';

function UptimeChart({ urlId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLogs = async () => {
      if (!urlId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetchMonitoringLogs(urlId, 50); // Fetch last 50 logs
        // Assuming response.data.logs is the array
        const formattedLogs = response.data.logs.map(log => ({
          ...log,
          // Format timestamp for display, e.g., 'HH:mm'
          // Recharts tooltip will use this format
          timestamp: new Date(log.created_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
          // Convert 'up'/'down' to numeric for chart (e.g., 1 for up, 0 for down)
          statusValue: log.status === 'up' ? 1 : 0,
        })).reverse(); // Reverse to show oldest first on chart

        setLogs(formattedLogs);
      } catch (err) {
        console.error('Failed to fetch monitoring logs:', err);
        setError(err.message || 'Failed to load uptime logs.');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Poll every 30 seconds for fresh data
    return () => clearInterval(interval);
  }, [urlId]);

  if (loading) {
    return <div className="text-center text-gray-500">Loading uptime data...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (logs.length === 0) {
    return <div className="text-center text-gray-500">No monitoring data available for this URL yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={logs}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis
          domain={[0, 1]}
          ticks={[0, 1]}
          tickFormatter={(tick) => (tick === 1 ? 'Up' : 'Down')}
          width={80} // Adjust width to prevent labels from overlapping
        />
        <Tooltip
          formatter={(value, name, props) => {
            if (name === 'statusValue') {
              return [props.payload.status === 'up' ? 'Up' : 'Down', 'Status'];
            }
            return [value, name];
          }}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend />
        <Line
          type="stepAfter" // Use stepAfter to show clear "up" or "down" blocks
          dataKey="statusValue"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
          name="Uptime Status"
          dot={false} // Hide individual dots for cleaner step chart
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="#82ca9d"
          yAxisId={0} // Use the same Y-axis for simplicity or add a second one
          name="Latency (ms)"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default UptimeChart;
