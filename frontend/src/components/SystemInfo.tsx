import React from 'react';
import { systemIntegration } from '../services/systemIntegration.ts';

interface SystemInfoProps {
  className?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === -1) return 'Unavailable';
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SystemInfo: React.FC<SystemInfoProps> = ({ className }) => {
  const [systemInfo, setSystemInfo] = React.useState(systemIntegration.getSystemInfo());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSystemInfo(systemIntegration.getSystemInfo());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`system-info ${className || ''}`}>
      <div className="info-grid">
        <div className="info-item">
          <span className="label">Memory:</span>
          <span className={`value ${systemInfo.memory.total === -1 ? 'text-gray-500' : ''}`}>
            {systemInfo.memory.total === -1 ? (
              'Unavailable'
            ) : (
              `${formatBytes(systemInfo.memory.used)} / ${formatBytes(systemInfo.memory.total)}`
            )}
          </span>
        </div>
        
        <div className="info-item">
          <span className="label">Storage:</span>
          <span className="value">
            {formatBytes(systemInfo.storage.used)} / {formatBytes(systemInfo.storage.total)}
          </span>
        </div>
        
        <div className="info-item">
          <span className="label">Network:</span>
          <span className={`value status-${systemInfo.network.status}`}>
            {systemInfo.network.status}
            {systemInfo.network.type && ` (${systemInfo.network.type})`}
          </span>
        </div>
        
        {systemInfo.battery && (
          <div className="info-item">
            <span className="label">Battery:</span>
            <span className="value">
              {Math.round(systemInfo.battery.level)}%
              {systemInfo.battery.charging && ' ⚡'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemInfo;