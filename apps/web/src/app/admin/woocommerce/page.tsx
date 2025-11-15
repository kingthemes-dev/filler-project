'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Webhook,
} from 'lucide-react';

interface WooCommerceStatus {
  api: {
    status: string;
    responseTime: number;
    lastCheck: string;
    version?: string;
  };
  products: {
    total: number;
    published: number;
    featured: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
  customers: {
    total: number;
    active: number;
  };
  webhooks: {
    status: string;
    count: number;
  };
  integration: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    webhookSecret: string;
  };
}

export default function WooCommerceStatus() {
  const [status, setStatus] = useState<WooCommerceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWooCommerceStatus = async () => {
    try {
      setLoading(true);

      // Fetch WooCommerce status from dedicated endpoint
      const response = await fetch('/api/woocommerce-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        console.error('Failed to fetch WooCommerce status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching WooCommerce status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWooCommerceStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'ok' || status === 'active')
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'degraded' || status === 'warning')
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const handleTestConnection = async () => {
    await fetchWooCommerceStatus();
  };

  const handleSyncProducts = async () => {
    try {
      console.log('Syncing products...');
      // Trigger product sync via API
      const response = await fetch(
        '/api/woocommerce?endpoint=products&per_page=100',
        {
          method: 'GET',
        }
      );
      if (response.ok) {
        console.log('Products synced successfully');
        await fetchWooCommerceStatus(); // Refresh status
      } else {
        console.error('Failed to sync products');
      }
    } catch (error) {
      console.error('Error syncing products:', error);
    }
  };

  const handleViewLogs = () => {
    // Navigate to logs page
    window.location.href = '/admin/logs';
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <p className="ml-3 text-lg">Loading WooCommerce status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">WooCommerce Integration</h1>
          <p className="text-gray-600">Backend API status and data overview</p>
        </div>
        <Button onClick={fetchWooCommerceStatus} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {status && (
        <>
          {/* API Connection Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">API Connection</CardTitle>
              {getStatusIcon(status.api.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span
                    className={`text-sm font-bold ${status.api.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {status.api.status === 'ok' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Response Time:</span>
                  <span className="text-sm">{status.api.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">
                    WooCommerce Version:
                  </span>
                  <span className="text-sm">
                    {status.api.version || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Last Check:</span>
                  <span className="text-sm">
                    {new Date(status.api.lastCheck).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status.products.total}
                </div>
                <p className="text-xs text-gray-500">
                  {status.products.published} published,{' '}
                  {status.products.featured} featured
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status.orders.total}</div>
                <p className="text-xs text-gray-500">
                  {status.orders.pending} pending, {status.orders.completed}{' '}
                  completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status.customers.total}
                </div>
                <p className="text-xs text-gray-500">
                  {status.customers.active} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
                <Webhook className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status.webhooks.count}
                </div>
                <p className="text-xs text-gray-500 capitalize">
                  {status.webhooks.status}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    window.open(
                      `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-admin`,
                      '_blank'
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  WooCommerce Admin
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleTestConnection}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test API Connection
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSyncProducts}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Products
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleViewLogs}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Integration Details */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">WooCommerce URL:</span>
                  <span className="text-sm font-mono text-gray-600">
                    {status.integration.url}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Consumer Key:</span>
                  <span className="text-sm font-mono text-gray-600">
                    {status.integration.consumerKey}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Consumer Secret:</span>
                  <span className="text-sm font-mono text-gray-600">
                    {status.integration.consumerSecret}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Webhook Secret:</span>
                  <span className="text-sm font-mono text-gray-600">
                    {status.integration.webhookSecret}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
