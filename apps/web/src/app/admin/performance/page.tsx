'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface PerformanceStats {
  totalMetrics: number;
  performanceScore: number;
  failedBudgets: number;
  recommendations: string[];
}

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  services: {
    redis: { status: string; lastCheck: string; error?: string };
    wordpress: { status: string; responseTime: number; lastCheck: string };
    database: { status: string; responseTime: number; lastCheck: string };
  };
  performance: {
    memory: { used: number; total: number; percentage: number };
    cpu: { load: number };
  };
  uptime: number;
}

export default function PerformanceDashboard() {
  const [performanceStats, setPerformanceStats] =
    useState<PerformanceStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch performance stats
      const perfResponse = await fetch('/api/performance/stats');
      if (perfResponse.ok) {
        const perfData = await perfResponse.json();
        setPerformanceStats(perfData);
      }

      // Fetch health status
      const healthResponse = await fetch('/api/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealthStatus(healthData);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return (
          <Badge variant="default" className="bg-green-500">
            OK
          </Badge>
        );
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Degraded</Badge>;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading && !performanceStats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring and analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      {performanceStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <div className="text-4xl font-bold text-blue-600">
                {performanceStats.performanceScore}/100
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${performanceStats.performanceScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {performanceStats.totalMetrics}
                </div>
                <div className="text-sm text-gray-600">Metrics Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {performanceStats.failedBudgets}
                </div>
                <div className="text-sm text-gray-600">Failed Budgets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {performanceStats.recommendations.length}
                </div>
                <div className="text-sm text-gray-600">Recommendations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health */}
      {healthStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {getStatusIcon(healthStatus.status)}
                <span className="ml-2">System Health</span>
                {getStatusBadge(healthStatus.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Uptime</span>
                  <span className="text-sm text-gray-600">
                    {formatUptime(healthStatus.uptime)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Memory Usage</span>
                  <span className="text-sm text-gray-600">
                    {formatBytes(healthStatus.performance.memory.used)} /{' '}
                    {formatBytes(healthStatus.performance.memory.total)}
                    <span className="ml-2 text-xs">
                      ({healthStatus.performance.memory.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">CPU Load</span>
                  <span className="text-sm text-gray-600">
                    {healthStatus.performance.cpu.load.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {getStatusIcon(healthStatus.services.redis.status)}
                    <span className="ml-2 font-medium">Redis</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {healthStatus.services.redis.lastCheck}
                    </div>
                    {healthStatus.services.redis.error && (
                      <div className="text-xs text-red-500">
                        {healthStatus.services.redis.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {getStatusIcon(healthStatus.services.wordpress.status)}
                    <span className="ml-2 font-medium">WordPress</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {healthStatus.services.wordpress.responseTime}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      {healthStatus.services.wordpress.lastCheck}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {getStatusIcon(healthStatus.services.database.status)}
                    <span className="ml-2 font-medium">Database</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {healthStatus.services.database.responseTime}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      {healthStatus.services.database.lastCheck}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {performanceStats && performanceStats.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {performanceStats.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    {recommendation}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
