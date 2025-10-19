'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, CheckCircle, TrendingUp, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface QuickStats {
  performanceScore: number;
  totalMetrics: number;
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
  uptime: number;
}

export default function AdminDashboard() {
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch performance stats
      const perfResponse = await fetch('/api/performance/stats');
      if (perfResponse.ok) {
        const perfData = await perfResponse.json();
        setQuickStats(perfData);
      }

      // Fetch health status
      const healthResponse = await fetch('/api/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealthStatus(healthData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'ok') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'degraded') return <Activity className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-red-500" />;
  };

  if (loading && !quickStats && !healthStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <p className="ml-3 text-lg">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600">System overview and quick actions</p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      {quickStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
              <Activity className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats.performanceScore}%</div>
              <p className="text-xs text-gray-500">{quickStats.failedBudgets} failed budgets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Metrics Tracked</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{quickStats.totalMetrics}</div>
              <p className="text-xs text-gray-500">Active monitoring</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {healthStatus && getStatusIcon(healthStatus.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{healthStatus?.status || 'Unknown'}</div>
              <p className="text-xs text-gray-500">Uptime: {healthStatus ? (healthStatus.uptime / 3600000).toFixed(2) : '0'} hours</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/performance">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="h-4 w-4 mr-2" />
                Performance Dashboard
              </Button>
            </Link>
            <Link href="/admin/api-status">
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="h-4 w-4 mr-2" />
                API Status
              </Button>
            </Link>
            <Link href="/sklep">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Store Frontend
              </Button>
            </Link>
            <Link href={`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-admin`} target="_blank">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="h-4 w-4 mr-2" />
                WooCommerce Admin
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {quickStats && quickStats.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              {quickStats.recommendations.map((rec, index) => (
                <li key={index} className="text-gray-700">{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}