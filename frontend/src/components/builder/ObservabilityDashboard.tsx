import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { performanceMonitor } from '@/utils/performance';
import { errorTracker, useErrorTracker } from '@/utils/errorTracking';
import { useAICredits } from '@/utils/aiCredits';
import { 
  Activity, 
  AlertTriangle, 
  CreditCard, 
  Clock, 
  Cpu, 
  Download, 
  Eye, 
  FileText, 
  RefreshCw, 
  Settings, 
  TrendingUp,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface TabProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const Tab: React.FC<TabProps> = ({ label, icon, isActive, onClick }) => (
  <button
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
    }`}
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);

export function ObservabilityDashboard() {
  const [activeTab, setActiveTab] = useState<'logs' | 'performance' | 'errors' | 'credits'>('logs');
  const [isExpanded, setIsExpanded] = useState(false);
  const { errors, trackError, addFeedback, stats: errorStats } = useErrorTracker();
  const { 
    credits, 
    plan, 
    alerts, 
    stats: creditStats, 
    acknowledgeAlert, 
    usageHistory,
    canAfford,
    estimateCredits 
  } = useAICredits();

  
  const [logs, setLogs] = useState(logger.getLogs());
  const [performanceMetrics, setPerformanceMetrics] = useState(performanceMonitor.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(logger.getLogs());
      setPerformanceMetrics(performanceMonitor.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const exportData = (type: 'logs' | 'errors' | 'performance' | 'credits') => {
    let data = '';
    let filename = '';

    switch (type) {
      case 'logs':
        data = logger.exportLogs();
        filename = 'logs.json';
        break;
      case 'errors':
        data = errorTracker.exportErrors();
        filename = 'errors.json';
        break;
      case 'performance':
        data = performanceMonitor.exportMetrics();
        filename = 'performance.json';
        break;
      case 'credits':
        data = (window as any).aiCreditsManager?.exportData() || '{}';
        filename = 'credits.json';
        break;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearData = (type: 'logs' | 'errors' | 'performance' | 'credits') => {
    switch (type) {
      case 'logs':
        logger.clearLogs();
        setLogs([]);
        break;
      case 'errors':
        errorTracker.clearErrors();
        break;
      case 'performance':
        performanceMonitor.clearMetrics();
        setPerformanceMetrics([]);
        break;
      case 'credits':
        (window as any).aiCreditsManager?.clearAllData();
        break;
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Open Observability Dashboard"
        >
          <Activity size={20} />
        </button>
        
        {/* Alert indicator */}
        {alerts.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {alerts.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity size={20} />
          Observability Dashboard
        </h2>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
        <Tab
          label="Logs"
          icon={<FileText size={16} />}
          isActive={activeTab === 'logs'}
          onClick={() => setActiveTab('logs')}
        />
        <Tab
          label="Performance"
          icon={<Cpu size={16} />}
          isActive={activeTab === 'performance'}
          onClick={() => setActiveTab('performance')}
        />
        <Tab
          label="Errors"
          icon={<AlertTriangle size={16} />}
          isActive={activeTab === 'errors'}
          onClick={() => setActiveTab('errors')}
        />
        <Tab
          label="AI Credits"
          icon={<CreditCard size={16} />}
          isActive={activeTab === 'credits'}
          onClick={() => setActiveTab('credits')}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">System Logs</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportData('logs')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Download size={14} /> Export
                </button>
                <button
                  onClick={() => clearData('logs')}
                  className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.slice(-50).reverse().map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs font-mono ${
                    log.level === 3 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    log.level === 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    log.level === 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{log.message}</span>
                    <span className="opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {log.context && (
                    <pre className="mt-1 opacity-75">{JSON.stringify(log.context, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Performance Metrics</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportData('performance')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Download size={14} /> Export
                </button>
                <button
                  onClick={() => clearData('performance')}
                  className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">API Calls</div>
                <div className="text-lg font-semibold">
                  {performanceMetrics.filter(m => m.name.startsWith('api_')).length}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg Response Time</div>
                <div className="text-lg font-semibold">
                  {Math.round(performanceMonitor.getAverageMetric('api_improveResumeText') || 0)}ms
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {performanceMetrics.slice(-20).reverse().map((metric, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{metric.name}</span>
                    <span>{metric.value}{metric.unit}</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Error Tracking</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportData('errors')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Download size={14} /> Export
                </button>
                <button
                  onClick={() => clearData('errors')}
                  className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Errors</div>
                <div className="text-lg font-semibold">{errorStats.total}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Resolved</div>
                <div className="text-lg font-semibold text-green-600">{errorStats.resolved}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Resolution Rate</div>
                <div className="text-lg font-semibold">{Math.round(errorStats.resolutionRate)}%</div>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {errors.slice(-20).reverse().map((error) => (
                <div key={error.id} className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-red-800 dark:text-red-200">
                        {error.message}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        ID: {error.id} • {new Date(error.timestamp).toLocaleString()}
                      </div>
                      {error.context && (
                        <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto">
                          {JSON.stringify(error.context, null, 2)}
                        </pre>
                      )}
                    </div>
                    <button
                      onClick={() => addFeedback(error.id, { 
                        errorId: error.id, 
                        feedback: 'fixed-it', 
                        timestamp: new Date().toISOString() 
                      })}
                      className="ml-2 text-green-600 hover:text-green-700"
                      title="Mark as resolved"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Credits Tab */}
        {activeTab === 'credits' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Credits Management</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportData('credits')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Download size={14} /> Export
                </button>
              </div>
            </div>

            {/* Credits Overview */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Current Credits</div>
                <div className="text-lg font-semibold">{credits}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Used</div>
                <div className="text-lg font-semibold">{creditStats.totalCreditsUsed}</div>
              </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Alerts</h4>
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.timestamp} className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-yellow-600" />
                            <span className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                              {alert.type === 'out-of-credits' ? 'Out of Credits' : 
                               alert.type === 'low-credits' ? 'Low Credits' : 'Usage Spike'}
                            </span>
                          </div>
                          <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            {alert.message}
                          </div>
                        </div>
                        <button
                          onClick={() => acknowledgeAlert(alert.timestamp)}
                          className="ml-2 text-yellow-600 hover:text-yellow-700"
                          title="Acknowledge"
                        >
                          <CheckCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage History */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Recent Usage</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {usageHistory.slice(-10).reverse().map((usage) => (
                  <div key={usage.id} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{usage.operation}</span>
                      <span className={usage.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                        {usage.creditsUsed} credits
                      </span>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {new Date(usage.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
