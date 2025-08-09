
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  Search,
  Clock,
  Database,
  HardDrive,
  Image,
  User,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HealthCheckResult {
  status: 'healthy' | 'issues_found' | 'error';
  summary: {
    totalFiles: number;
    validFiles: number;
    brokenFiles: number;
    successRate: number;
  };
  details: {
    scriptFiles: { total: number; valid: number; broken: number; issues: any[] };
    coverImages: { total: number; valid: number; broken: number; issues: any[] };
    userPhotos: { total: number; valid: number; broken: number; issues: any[] };
  };
  recommendations: string[];
  timestamp: string;
}

export function AdminFileManagement() {
  const { data: session } = useSession();
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // Only show for admins
  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/files/health-check');
      if (!response.ok) {
        throw new Error('Failed to run health check');
      }
      
      const data = await response.json();
      setHealthData(data);
      setLastCheckTime(new Date().toLocaleString());
      
      toast({
        title: "Health check completed",
        description: `Found ${data.summary.brokenFiles} broken file(s) out of ${data.summary.totalFiles} total files.`,
      });
    } catch (error) {
      console.error('Health check error:', error);
      toast({
        title: "Error",
        description: "Failed to run health check.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    setCleaning(true);
    try {
      // Use the existing cleanup script via a new API endpoint
      const response = await fetch('/api/files/cleanup', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to run cleanup');
      }
      
      const data = await response.json();
      
      toast({
        title: "Cleanup completed",
        description: `Removed ${data.totalItemsCleaned} broken file references.`,
      });
      
      // Refresh health data after cleanup
      await runHealthCheck();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Error",
        description: "Failed to run cleanup operation.",
        variant: "destructive"
      });
    } finally {
      setCleaning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'issues_found':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'issues_found':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HardDrive className="w-6 h-6" />
            File Management
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor and manage file system integrity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={runHealthCheck}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Run Health Check
              </>
            )}
          </Button>
          {healthData && healthData.summary?.brokenFiles > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-800">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean Up Broken Files
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clean Up Broken Files</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove {healthData?.summary?.brokenFiles || 0} broken file references from the database. 
                    This action cannot be undone, but it will fix 404 errors users are experiencing.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={runCleanup}
                    disabled={cleaning}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {cleaning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cleaning...
                      </>
                    ) : (
                      'Clean Up Files'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Status Overview */}
      {healthData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusIcon(healthData.status)}
                    <Badge className={getStatusColor(healthData.status)}>
                      {healthData.status === 'healthy' ? 'Healthy' : 
                       healthData.status === 'issues_found' ? 'Issues Found' : 'Error'}
                    </Badge>
                  </div>
                </div>
                <Shield className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Files</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {healthData.summary.totalFiles}
                  </p>
                </div>
                <Database className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valid Files</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {healthData.summary.validFiles}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Broken Files</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {healthData.summary.brokenFiles}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Detailed Breakdown */}
      {healthData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                File Type Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Script Files</p>
                    <p className="text-sm text-gray-600">
                      {healthData.details.scriptFiles.valid} valid, {healthData.details.scriptFiles.broken} broken
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {healthData.details.scriptFiles.total} total
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Image className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Cover Images</p>
                    <p className="text-sm text-gray-600">
                      {healthData.details.coverImages.valid} valid, {healthData.details.coverImages.broken} broken
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {healthData.details.coverImages.total} total
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">User Photos</p>
                    <p className="text-sm text-gray-600">
                      {healthData.details.userPhotos.valid} valid, {healthData.details.userPhotos.broken} broken
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {healthData.details.userPhotos.total} total
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthData.recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {healthData.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm">No recommendations at this time.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Check Information */}
      {lastCheckTime && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Last health check: {lastCheckTime}
              {healthData && (
                <span className="ml-4">
                  Success rate: <span className="font-medium text-gray-900">{healthData.summary.successRate}%</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!healthData && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <HardDrive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">File System Health Check</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Run a comprehensive health check to identify broken file references and maintain system integrity.
            </p>
            <Button onClick={runHealthCheck} size="lg">
              <Search className="w-5 h-5 mr-2" />
              Run Initial Health Check
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
