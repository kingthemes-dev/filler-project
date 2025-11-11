'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Switch } from '@/components/ui/switch'; // Switch component not available
import { Save, Eye, EyeOff } from 'lucide-react';

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

  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nodeVersion, setNodeVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // Load environment variables after hydration
  useEffect(() => {
    setSettings({
      woocommerce: {
        url: (process.env.NEXT_PUBLIC_WORDPRESS_URL || '') + '/wp-json/wc/v3',
        consumerKey: process.env.WC_CONSUMER_KEY || '',
        consumerSecret: process.env.WC_CONSUMER_SECRET || '',
        webhookSecret: process.env.WOOCOMMERCE_WEBHOOK_SECRET || ''
      },
      redis: {
        url: process.env.REDIS_URL || '',
        enabled: !!process.env.REDIS_URL
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

  const updateSetting = <
    Section extends keyof Settings,
    Key extends keyof Settings[Section]
  >(
    section: Section,
    key: Key,
    value: Settings[Section][Key],
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

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
      
    } catch {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wc-url">API URL</Label>
              <Input
                id="wc-url"
                value={settings.woocommerce.url}
                onChange={(e) => updateSetting('woocommerce', 'url', e.target.value)}
                placeholder="https://your-site.com/wp-json/wc/v3"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => testConnection('woocommerce')}
                disabled={testingConnection}
                className="w-full"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
              {connectionStatus && (
                <div className={`text-sm mt-2 ${connectionStatus.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionStatus}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wc-key">Consumer Key</Label>
              <div className="relative">
                <Input
                  id="wc-key"
                  type={showSecrets ? 'text' : 'password'}
                  value={settings.woocommerce.consumerKey}
                  onChange={(e) => updateSetting('woocommerce', 'consumerKey', e.target.value)}
                  placeholder="ck_..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="wc-secret">Consumer Secret</Label>
              <div className="relative">
                <Input
                  id="wc-secret"
                  type={showSecrets ? 'text' : 'password'}
                  value={settings.woocommerce.consumerSecret}
                  onChange={(e) => updateSetting('woocommerce', 'consumerSecret', e.target.value)}
                  placeholder="cs_..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="wc-webhook">Webhook Secret</Label>
            <div className="relative">
              <Input
                id="wc-webhook"
                type={showSecrets ? 'text' : 'password'}
                value={settings.woocommerce.webhookSecret}
                onChange={(e) => updateSetting('woocommerce', 'webhookSecret', e.target.value)}
                placeholder="wc_wh_..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
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
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="redis-enabled">Enable Redis</Label>
              <p className="text-sm text-gray-600">Use Redis for caching</p>
            </div>
            <input
              id="redis-enabled"
              type="checkbox"
              checked={settings.redis.enabled}
              onChange={(e) => updateSetting('redis', 'enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          {settings.redis.enabled && (
            <div>
              <Label htmlFor="redis-url">Redis URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="redis-url"
                  type={showSecrets ? 'text' : 'password'}
                  value={settings.redis.url}
                  onChange={(e) => updateSetting('redis', 'url', e.target.value)}
                  placeholder="redis://localhost:6379"
                />
                <Button
                  variant="outline"
                  onClick={() => testConnection('redis')}
                >
                  Test
                </Button>
              </div>
            </div>
          )}
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
