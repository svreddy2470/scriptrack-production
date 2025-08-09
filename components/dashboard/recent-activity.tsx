
"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function RecentActivity() {
  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          <Link href="/scripts">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              View All Scripts
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ActivityTimeline 
          limit={10} 
          showHeader={false}
        />
      </CardContent>
    </Card>
  )
}
