'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Switch } from '@/components/ui/switch'; // Switch component not available
import { RefreshCw, Save, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface Settings {
  woocommerce: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    webhookSecret: string;
  };
  redis: {
    url: string;
    enabled: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    cacheTtl: number;
    monitoringEnabled: boolean;
  };
  security: {
    csrfEnabled: boolean;
    rateLimitEnabled: boolean;
    corsEnabled: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    woocommerce: {
      url: '',
      consumerKey: '',
      consumerSecret: '',
      webhookSecret: ''
    },
    redis: {
      url: '',
      enabled: false
    },
    performance: {
      cacheEnabled: true,
      cacheTtl: 60,
      monitoringEnabled: true
    },
    security: {
      csrfEnabled: true,
      rateLimitEnabled: true,
      corsEnabled: true
    }
  });

  const [saving, setSaving] = useState(false);
  const [nodeVersion, setNodeVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // Load settings status from API
  useEffect(() => {
    const fetchSettingsStatus = async () => {
      try {
        const response = await fetch('/api/settings/status');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings status:', error);
      }
    };

    fetchSettingsStatus();
    
    // Set Node.js version and platform after hydration
    setNodeVersion(process.version);
    setPlatform(process.platform);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would save to an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Settings are now read-only - no updateSetting needed

  const testConnection = async (type: 'woocommerce' | 'redis') => {
    setTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      let isConnected = false;
      
      if (type === 'woocommerce') {
        const response = await fetch('/api/health');
        const data = await response.json();
        isConnected = data.services.database.status === 'ok';
      } else {
        const response = await fetch('/api/health');
        const data = await response.json();
        isConnected = data.services.redis.status === 'ok';
      }
      
      setConnectionStatus(isConnected ? 'Connection successful!' : 'Connection failed!');
      
      // Clear status after 3 seconds
      setTimeout(() => setConnectionStatus(null), 3000);
      
    } catch (error) {
      setConnectionStatus('Connection failed!');
      setTimeout(() => setConnectionStatus(null), 3000);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">System configuration and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* WooCommerce Settings */}
      <Card>
        <CardHeader>
          <CardTitle>WooCommerce Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API URL - Read Only */}
          <div className="space-y-2">
            <Label>API URL</Label>
            <div className="p-3 bg-gray-50 rounded-md border">
              <code className="text-sm">{settings.woocommerce.url}</code>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => testConnection('woocommerce')}
              disabled={testingConnection}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            {connectionStatus && (
              <div className={`text-sm ${connectionStatus.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                {connectionStatus}
              </div>
            )}
          </div>
          
          {/* Configuration Status - Read Only */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Configuration Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium">Consumer Key</span>
                <Badge variant={settings.woocommerce.consumerKey ? "default" : "secondary"}>
                  {settings.woocommerce.consumerKey ? 'Set' : 'Not Set'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium">Consumer Secret</span>
                <Badge variant={settings.woocommerce.consumerSecret ? "default" : "secondary"}>
                  {settings.woocommerce.consumerSecret ? 'Set' : 'Not Set'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium">Webhook Secret</span>
                <Badge variant={settings.woocommerce.webhookSecret ? "default" : "secondary"}>
                  {settings.woocommerce.webhookSecret ? 'Set' : 'Not Set'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redis Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Redis Cache</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Redis Status - Read Only */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="text-sm font-medium">Redis Configuration</span>
              <Badge variant={settings.redis.enabled ? "default" : "secondary"}>
                {settings.redis.enabled ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>
            
            {settings.redis.enabled && (
              <div className="space-y-2">
                <Label>Redis URL</Label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  <code className="text-sm text-gray-600">redis://***:***@redis3.cyber-folks.pl:25775/0</code>
                </div>
              </div>
            )}
          </div>

          {/* Test Redis Connection */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => testConnection('redis')}
              disabled={testingConnection}
            >
              {testingConnection ? 'Testing...' : 'Test Redis Connection'}
            </Button>
            {connectionStatus && (
              <div className={`text-sm ${connectionStatus.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                {connectionStatus}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cache-enabled">Enable Caching</Label>
              <p className="text-sm text-gray-600">Cache API responses</p>
            </div>
            <input
              id="cache-enabled"
              type="checkbox"
              checked={settings.performance.cacheEnabled}
              onChange={(e) => updateSetting('performance', 'cacheEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="monitoring-enabled">Enable Monitoring</Label>
              <p className="text-sm text-gray-600">Track performance metrics</p>
            </div>
            <input
              id="monitoring-enabled"
              type="checkbox"
              checked={settings.performance.monitoringEnabled}
              onChange={(e) => updateSetting('performance', 'monitoringEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div>
            <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
            <Input
              id="cache-ttl"
              type="number"
              value={settings.performance.cacheTtl}
              onChange={(e) => updateSetting('performance', 'cacheTtl', parseInt(e.target.value))}
              min="1"
              max="3600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="csrf-enabled">CSRF Protection</Label>
              <p className="text-sm text-gray-600">Protect against CSRF attacks</p>
            </div>
            <input
              id="csrf-enabled"
              type="checkbox"
              checked={settings.security.csrfEnabled}
              onChange={(e) => updateSetting('security', 'csrfEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rate-limit-enabled">Rate Limiting</Label>
              <p className="text-sm text-gray-600">Limit API requests per IP</p>
            </div>
            <input
              id="rate-limit-enabled"
              type="checkbox"
              checked={settings.security.rateLimitEnabled}
              onChange={(e) => updateSetting('security', 'rateLimitEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cors-enabled">CORS</Label>
              <p className="text-sm text-gray-600">Enable Cross-Origin Resource Sharing</p>
            </div>
            <input
              id="cors-enabled"
              type="checkbox"
              checked={settings.security.corsEnabled}
              onChange={(e) => updateSetting('security', 'corsEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Environment</Label>
              <div className="text-sm text-gray-600">
                <Badge variant="outline">{process.env.NODE_ENV || 'development'}</Badge>
              </div>
            </div>
            <div>
              <Label>Next.js Version</Label>
              <div className="text-sm text-gray-600">15.0.0</div>
            </div>
            <div>
              <Label>Node.js Version</Label>
              <div className="text-sm text-gray-600">{nodeVersion || 'Loading...'}</div>
            </div>
            <div>
              <Label>Platform</Label>
              <div className="text-sm text-gray-600">{platform || 'Loading...'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
