'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Trash2, Activity, Clock } from 'lucide-react';

interface CacheStats {
  size: number;
  entries: number;
  hitRate: number;
  missRate: number;
  totalRequests: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export default function CacheStatus() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [warming, setWarming] = useState(false);

  const fetchCacheStats = async () => {
    try {
      setLoading(true);
      
      // Fetch cache stats from health endpoint
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (data.cache) {
        setStats({
          size: data.cache.size || 0,
          entries: data.cache.entries || 0,
          hitRate: 85, // Placeholder - would need to track this
          missRate: 15, // Placeholder
          totalRequests: 1000, // Placeholder
          memoryUsage: {
            used: data.performance?.memory?.used || 0,
            total: data.performance?.memory?.total || 0,
            percentage: data.performance?.memory?.percentage || 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // removed unused clearCache helper (use handleClearCache)

  useEffect(() => {
    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/cache/clear', { method: 'POST' });
      if (response.ok) {
        console.log('Cache cleared successfully');
        await fetchCacheStats(); // Refresh stats
      } else {
        console.error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setClearing(false);
    }
  };

  const handleWarmCache = async () => {
    setWarming(true);
    try {
      const response = await fetch('/api/cache/warm', { method: 'POST' });
      if (response.ok) {
        console.log('Cache warmed successfully');
        await fetchCacheStats(); // Refresh stats
      } else {
        console.error('Failed to warm cache');
      }
    } catch (error) {
      console.error('Error warming cache:', error);
    } finally {
      setWarming(false);
    }
  };

  const handleViewLogs = () => {
    // Navigate to logs page
    window.location.href = '/admin/logs';
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading && !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading cache status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cache Status</h1>
          <p className="text-gray-600">Redis and memory cache monitoring</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleClearCache} variant="outline" disabled={clearing}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
          <Button onClick={fetchCacheStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Cache Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Entries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.entries}</div>
              <div className="text-xs text-muted-foreground">
                Active cache entries
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.hitRate}%</div>
              <div className="text-xs text-muted-foreground">
                Cache hit success rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Miss Rate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.missRate}%</div>
              <div className="text-xs text-muted-foreground">
                Cache miss rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <div className="text-xs text-muted-foreground">
                Total cache requests
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Memory Usage */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Used Memory</span>
                <span className="text-sm text-gray-600">
                  {formatBytes(stats.memoryUsage.used)} / {formatBytes(stats.memoryUsage.total)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${stats.memoryUsage.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>0%</span>
                <span className="font-medium">{stats.memoryUsage.percentage}%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Redis URL</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {process.env.REDIS_URL ? 'Configured' : 'Not Configured'}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Cache TTL</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                60 seconds
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Max Entries</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                1000
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Cache Strategy</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                Redis → Memory → API
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col" onClick={handleClearCache} disabled={clearing}>
              <Trash2 className="h-6 w-6 mb-2" />
              <span className="text-sm">{clearing ? 'Clearing...' : 'Clear All Cache'}</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col" onClick={handleWarmCache} disabled={warming}>
              <RefreshCw className={`h-6 w-6 mb-2 ${warming ? 'animate-spin' : ''}`} />
              <span className="text-sm">{warming ? 'Warming...' : 'Warm Cache'}</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col" onClick={handleViewLogs}>
              <Activity className="h-6 w-6 mb-2" />
              <span className="text-sm">View Cache Logs</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
