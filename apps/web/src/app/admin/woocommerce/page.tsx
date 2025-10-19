'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

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
}

export default function WooCommerceStatus() {
  const [status, setStatus] = useState<WooCommerceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWooCommerceStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch WooCommerce API status
      const apiResponse = await fetch('/api/woocommerce?endpoint=system_status');
      const apiData = await apiResponse.json();
      
      // Fetch products count
      const productsResponse = await fetch('/api/woocommerce?endpoint=products&per_page=1');
      const productsData = await productsResponse.json();
      
      // Fetch orders count
      const ordersResponse = await fetch('/api/woocommerce?endpoint=orders&per_page=1');
      const ordersData = await ordersResponse.json();
      
      // Fetch customers count
      const customersResponse = await fetch('/api/woocommerce?endpoint=customers&per_page=1');
      const customersData = await customersResponse.json();

      setStatus({
        api: {
          status: apiResponse.ok ? 'ok' : 'error',
          responseTime: Date.now() - Date.now(), // Placeholder
          lastCheck: new Date().toISOString(),
          version: apiData?.version || 'Unknown'
        },
        products: {
          total: productsData?.total || 0,
          published: productsData?.published || 0,
          featured: productsData?.featured || 0
        },
        orders: {
          total: ordersData?.total || 0,
          pending: ordersData?.pending || 0,
          completed: ordersData?.completed || 0
        },
        customers: {
          total: customersData?.total || 0,
          active: customersData?.active || 0
        },
        webhooks: {
          status: 'ok', // Placeholder
          count: 1
        }
      });
    } catch (error) {
      console.error('Error fetching WooCommerce status:', error);
      setStatus({
        api: { status: 'error', responseTime: 0, lastCheck: new Date().toISOString() },
        products: { total: 0, published: 0, featured: 0 },
        orders: { total: 0, pending: 0, completed: 0 },
        customers: { total: 0, active: 0 },
        webhooks: { status: 'error', count: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWooCommerceStatus();
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
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Disconnected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading && !status) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading WooCommerce status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">WooCommerce Integration</h1>
          <p className="text-gray-600">Backend API status and data overview</p>
        </div>
        <Button onClick={fetchWooCommerceStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* API Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon(status.api.status)}
              <span className="ml-2">API Connection</span>
              {getStatusBadge(status.api.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Response Time</div>
                <div className="text-lg font-semibold">{status.api.responseTime}ms</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">WooCommerce Version</div>
                <div className="text-lg font-semibold">{status.api.version}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Check</div>
                <div className="text-lg font-semibold">
                  {new Date(status.api.lastCheck).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Overview */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.products.total}</div>
              <div className="text-xs text-muted-foreground">
                {status.products.published} published, {status.products.featured} featured
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.orders.total}</div>
              <div className="text-xs text-muted-foreground">
                {status.orders.pending} pending, {status.orders.completed} completed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.customers.total}</div>
              <div className="text-xs text-muted-foreground">
                {status.customers.active} active
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.webhooks.count}</div>
              <div className="text-xs text-muted-foreground">
                {status.webhooks.status === 'ok' ? 'Active' : 'Inactive'}
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col">
              <ExternalLink className="h-6 w-6 mb-2" />
              <span className="text-sm">WooCommerce Admin</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col">
              <CheckCircle className="h-6 w-6 mb-2" />
              <span className="text-sm">Test API Connection</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col">
              <RefreshCw className="h-6 w-6 mb-2" />
              <span className="text-sm">Sync Products</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col">
              <AlertTriangle className="h-6 w-6 mb-2" />
              <span className="text-sm">View Logs</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">WooCommerce URL</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Consumer Key</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {process.env.WC_CONSUMER_KEY ? 'Set' : 'Not Set'}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Consumer Secret</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {process.env.WC_CONSUMER_SECRET ? 'Set' : 'Not Set'}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Webhook Secret</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {process.env.WOOCOMMERCE_WEBHOOK_SECRET ? 'Set' : 'Not Set'}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
