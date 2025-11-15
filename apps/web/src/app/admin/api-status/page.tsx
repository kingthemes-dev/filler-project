'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface ApiEndpoint {
  name: string;
  url: string;
  method: string;
  status: 'ok' | 'error' | 'warning';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

export default function ApiStatus() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const apiEndpoints = useMemo(
    () => [
      {
        name: 'Health Check',
        url: '/api/health',
        method: 'GET',
      },
      {
        name: 'WooCommerce Products',
        url: '/api/woocommerce?endpoint=products&per_page=1',
        method: 'GET',
      },
      {
        name: 'WooCommerce Categories',
        url: '/api/woocommerce?endpoint=products/categories',
        method: 'GET',
      },
      {
        name: 'WooCommerce Orders',
        url: '/api/woocommerce?endpoint=orders&per_page=1',
        method: 'GET',
      },
      {
        name: 'Performance Stats',
        url: '/api/performance/stats',
        method: 'GET',
      },
      {
        name: 'Webhook Endpoint',
        url: '/api/webhooks',
        method: 'POST',
      },
    ],
    []
  );

  const checkApiEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const results: ApiEndpoint[] = [];

      for (const endpoint of apiEndpoints) {
        try {
          const startTime = Date.now();
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const responseTime = Date.now() - startTime;

          let status: 'ok' | 'error' | 'warning' = 'ok';
          if (!response.ok) {
            status = response.status >= 500 ? 'error' : 'warning';
          } else if (responseTime > 2000) {
            status = 'warning';
          }

          results.push({
            name: endpoint.name,
            url: endpoint.url,
            method: endpoint.method,
            status,
            responseTime,
            lastCheck: new Date().toISOString(),
            error: !response.ok ? `HTTP ${response.status}` : undefined,
          });
        } catch (error) {
          results.push({
            name: endpoint.name,
            url: endpoint.url,
            method: endpoint.method,
            status: 'error',
            responseTime: 0,
            lastCheck: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      setEndpoints(results);
    } catch (error) {
      console.error('Error checking API endpoints:', error);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoints]);

  useEffect(() => {
    checkApiEndpoints();
    const interval = setInterval(checkApiEndpoints, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkApiEndpoints]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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
      case 'warning':
        return <Badge variant="secondary">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 500) return 'text-green-600';
    if (responseTime < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallStatus =
    endpoints.length > 0
      ? endpoints.every(e => e.status === 'ok')
        ? 'ok'
        : endpoints.some(e => e.status === 'error')
          ? 'error'
          : 'warning'
      : 'unknown';

  if (loading && endpoints.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Checking API endpoints...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Status</h1>
          <p className="text-gray-600">Real-time API endpoint monitoring</p>
        </div>
        <Button onClick={checkApiEndpoints} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {getStatusIcon(overallStatus)}
            <span className="ml-2">Overall API Status</span>
            {getStatusBadge(overallStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {endpoints.filter(e => e.status === 'ok').length}
              </div>
              <div className="text-sm text-gray-600">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {endpoints.filter(e => e.status === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Warning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {endpoints.filter(e => e.status === 'error').length}
              </div>
              <div className="text-sm text-gray-600">Error</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {endpoints.length}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <div className="space-y-4">
        {endpoints.map((endpoint, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(endpoint.status)}
                  <div>
                    <div className="font-medium">{endpoint.name}</div>
                    <div className="text-sm text-gray-600">
                      {endpoint.method} {endpoint.url}
                    </div>
                    {endpoint.error && (
                      <div className="text-sm text-red-600 mt-1">
                        {endpoint.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div
                      className={`font-medium ${getResponseTimeColor(endpoint.responseTime)}`}
                    >
                      {endpoint.responseTime}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(endpoint.lastCheck).toLocaleTimeString()}
                    </div>
                  </div>
                  {getStatusBadge(endpoint.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Available Endpoints:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/health
                  </code>
                  <span className="text-gray-600">System health check</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/woocommerce
                  </code>
                  <span className="text-gray-600">WooCommerce API proxy</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/performance/stats
                  </code>
                  <span className="text-gray-600">Performance metrics</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    POST /api/webhooks
                  </code>
                  <span className="text-gray-600">WooCommerce webhooks</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
