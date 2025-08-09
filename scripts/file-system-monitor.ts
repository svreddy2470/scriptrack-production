
import { PrismaClient } from '@prisma/client'
import { readFile, stat, writeFile } from 'fs/promises'
import { existsSync, watch } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface MonitoringReport {
  timestamp: string
  totalFiles: number
  suspiciousFiles: string[]
  newFiles: string[]
  deletedFiles: string[]
  sizeChanges: Array<{
    filename: string
    oldSize: number
    newSize: number
  }>
}

class FileSystemMonitor {
  private uploadsDir: string
  private lastSnapshot: Map<string, number> = new Map()
  private reportPath: string
  
  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads')
    this.reportPath = path.join(process.cwd(), 'file-monitoring-reports.json')
  }
  
  async takeSnapshot(): Promise<Map<string, number>> {
    const snapshot = new Map<string, number>()
    
    if (!existsSync(this.uploadsDir)) {
      return snapshot
    }
    
    const fs = require('fs')
    const files = fs.readdirSync(this.uploadsDir)
    
    for (const filename of files) {
      try {
        const filePath = path.join(this.uploadsDir, filename)
        const stats = await stat(filePath)
        snapshot.set(filename, stats.size)
      } catch (error) {
        console.warn(`Could not stat file ${filename}:`, error)
      }
    }
    
    return snapshot
  }
  
  async detectSuspiciousFiles(): Promise<string[]> {
    const suspicious: string[] = []
    
    if (!existsSync(this.uploadsDir)) {
      return suspicious
    }
    
    const fs = require('fs')
    const files = fs.readdirSync(this.uploadsDir)
    
    for (const filename of files) {
      try {
        const filePath = path.join(this.uploadsDir, filename)
        const stats = await stat(filePath)
        
        // Check for suspiciously small files
        if (stats.size < 100) {
          const content = await readFile(filePath, 'utf-8')
          if (content.includes('dummy') || content.includes('Mock content') || content.includes('Test')) {
            suspicious.push(filename)
          }
        }
      } catch (error) {
        // Could be binary file, ignore
      }
    }
    
    return suspicious
  }
  
  async generateReport(): Promise<MonitoringReport> {
    const currentSnapshot = await this.takeSnapshot()
    const suspiciousFiles = await this.detectSuspiciousFiles()
    
    const newFiles: string[] = []
    const deletedFiles: string[] = []
    const sizeChanges: Array<{filename: string, oldSize: number, newSize: number}> = []
    
    // Compare with last snapshot
    for (const [filename, size] of currentSnapshot) {
      if (!this.lastSnapshot.has(filename)) {
        newFiles.push(filename)
      } else {
        const oldSize = this.lastSnapshot.get(filename)!
        if (oldSize !== size) {
          sizeChanges.push({ filename, oldSize, newSize: size })
        }
      }
    }
    
    for (const [filename] of this.lastSnapshot) {
      if (!currentSnapshot.has(filename)) {
        deletedFiles.push(filename)
      }
    }
    
    const report: MonitoringReport = {
      timestamp: new Date().toISOString(),
      totalFiles: currentSnapshot.size,
      suspiciousFiles,
      newFiles,
      deletedFiles,
      sizeChanges
    }
    
    // Update snapshot
    this.lastSnapshot = currentSnapshot
    
    return report
  }
  
  async saveReport(report: MonitoringReport) {
    let reports: MonitoringReport[] = []
    
    if (existsSync(this.reportPath)) {
      try {
        const content = await readFile(this.reportPath, 'utf-8')
        reports = JSON.parse(content)
      } catch (error) {
        console.warn('Could not read existing reports:', error)
      }
    }
    
    reports.push(report)
    
    // Keep only last 100 reports
    if (reports.length > 100) {
      reports = reports.slice(-100)
    }
    
    await writeFile(this.reportPath, JSON.stringify(reports, null, 2))
  }
  
  async runCheck(): Promise<MonitoringReport> {
    console.log('🔍 Running file system check...')
    
    const report = await this.generateReport()
    await this.saveReport(report)
    
    // Log significant findings
    if (report.suspiciousFiles.length > 0) {
      console.log(`🚨 Found ${report.suspiciousFiles.length} suspicious files:`)
      report.suspiciousFiles.forEach(file => console.log(`   - ${file}`))
    }
    
    if (report.newFiles.length > 0) {
      console.log(`📁 New files: ${report.newFiles.length}`)
    }
    
    if (report.deletedFiles.length > 0) {
      console.log(`🗑️  Deleted files: ${report.deletedFiles.length}`)
    }
    
    if (report.sizeChanges.length > 0) {
      console.log(`📏 Size changes: ${report.sizeChanges.length}`)
    }
    
    return report
  }
  
  async startMonitoring(intervalMinutes: number = 30) {
    console.log(`🚀 Starting file system monitoring (checking every ${intervalMinutes} minutes)`)
    
    // Initial check
    await this.runCheck()
    
    // Set up periodic checks
    setInterval(async () => {
      try {
        await this.runCheck()
      } catch (error) {
        console.error('Monitoring check failed:', error)
      }
    }, intervalMinutes * 60 * 1000)
    
    console.log('📊 Monitoring active. Reports saved to:', this.reportPath)
  }
}

// Allow script to be run directly
if (require.main === module) {
  const monitor = new FileSystemMonitor()
  
  const command = process.argv[2] || 'check'
  
  if (command === 'check') {
    monitor.runCheck()
      .then(report => {
        console.log('\n📋 MONITORING REPORT:')
        console.log(`   Total Files: ${report.totalFiles}`)
        console.log(`   Suspicious Files: ${report.suspiciousFiles.length}`)
        console.log(`   New Files: ${report.newFiles.length}`)
        console.log(`   Deleted Files: ${report.deletedFiles.length}`)
        console.log(`   Size Changes: ${report.sizeChanges.length}`)
        
        if (report.suspiciousFiles.length > 0) {
          console.log('\n🚨 IMMEDIATE ACTION REQUIRED: Suspicious files detected!')
          process.exit(1)
        } else {
          console.log('\n✅ File system appears healthy')
          process.exit(0)
        }
      })
      .catch(error => {
        console.error('Monitoring failed:', error)
        process.exit(1)
      })
  } else if (command === 'monitor') {
    const interval = parseInt(process.argv[3]) || 30
    monitor.startMonitoring(interval)
      .catch(error => {
        console.error('Failed to start monitoring:', error)
        process.exit(1)
      })
  } else {
    console.log('Usage:')
    console.log('  yarn ts-node scripts/file-system-monitor.ts check')
    console.log('  yarn ts-node scripts/file-system-monitor.ts monitor [interval-minutes]')
    process.exit(1)
  }
}

export { FileSystemMonitor }
