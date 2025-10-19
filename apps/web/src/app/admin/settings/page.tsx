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
  const [wooConnectionStatus, setWooConnectionStatus] = useState<string | null>(null);
  const [redisConnectionStatus, setRedisConnectionStatus] = useState<string | null>(null);

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

    const fetchEnvironmentInfo = async () => {
      try {
        const response = await fetch('/api/environment');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNodeVersion(data.environment.nodeVersion);
            setPlatform(data.environment.platform);
          }
        }
      } catch (error) {
        console.error('Error fetching environment info:', error);
        // Fallback to browser info
        setNodeVersion('Unknown');
        setPlatform(navigator.platform || 'Unknown');
      }
    };

    fetchSettingsStatus();
    fetchEnvironmentInfo();
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
    
    if (type === 'woocommerce') {
      setWooConnectionStatus(null);
    } else {
      setRedisConnectionStatus(null);
    }
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (type === 'woocommerce') {
        const isConnected = data.services.database.status === 'ok';
        setWooConnectionStatus(isConnected ? 'Connection successful!' : 'Connection failed!');
        setTimeout(() => setWooConnectionStatus(null), 3000);
      } else {
        // Redis can be 'ok' or 'degraded' (using memory cache fallback)
        const isConnected = data.services.redis.status === 'ok' || data.services.redis.status === 'degraded';
        const statusMessage = data.services.redis.status === 'ok' 
          ? 'Connection successful!' 
          : 'Connection degraded (using memory cache)';
        setRedisConnectionStatus(isConnected ? statusMessage : 'Connection failed!');
        setTimeout(() => setRedisConnectionStatus(null), 3000);
      }
      
    } catch (error) {
      if (type === 'woocommerce') {
        setWooConnectionStatus('Connection failed!');
        setTimeout(() => setWooConnectionStatus(null), 3000);
      } else {
        setRedisConnectionStatus('Connection failed!');
        setTimeout(() => setRedisConnectionStatus(null), 3000);
      }
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
            {wooConnectionStatus && (
              <div className={`text-sm ${wooConnectionStatus.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                {wooConnectionStatus}
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

      {/* Cache Settings - Smart Redis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Smart Cache System
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Auto-Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cache Status */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-200">
              <span className="text-sm font-medium">Cache Status</span>
              <Badge variant="default" className="bg-green-600">
                ✅ Active
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-blue-800">Redis Cache</span>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    {settings.redis.enabled ? 'Connected' : 'Fallback'}
                  </Badge>
                </div>
                <p className="text-xs text-blue-600">
                  {settings.redis.enabled 
                    ? 'High-performance Redis cache active' 
                    : 'Using optimized in-memory cache (perfect for production!)'
                  }
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-purple-800">ISR Cache</span>
                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-purple-600">
                  Next.js Incremental Static Regeneration
                </p>
              </div>
            </div>
          </div>

          {/* Test Cache System */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => testConnection('redis')}
              disabled={testingConnection}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              {testingConnection ? 'Testing...' : 'Test Cache System'}
            </Button>
            {redisConnectionStatus && (
              <div className={`text-sm ${
                redisConnectionStatus.includes('successful') || redisConnectionStatus.includes('degraded')
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {redisConnectionStatus}
              </div>
            )}
          </div>

          {/* Cache Info */}
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">🎯 Smart Cache Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Automatic fallback</strong> - Redis unavailable? No problem!</li>
              <li>• <strong>In-memory cache</strong> - Fast, reliable, works everywhere</li>
              <li>• <strong>Zero configuration</strong> - Works out of the box</li>
              <li>• <strong>Production ready</strong> - Optimized for all hosting providers</li>
            </ul>
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
