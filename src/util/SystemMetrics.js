import * as dfd from 'danfojs';
import {PERFORMANCE} from '../config/constants.js';

export class SystemMetrics {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            cycleCount: 0,
            taskCount: 0,
            conceptCount: 0,
            errorCount: 0,
            memoryUsage: 0,
            averageCycleTime: 0,
            peakMemoryUsage: 0,
            totalProcessingTime: 0,
        };
        this.cycleTimes = [];
        this.cycleTimesDf = null; // danfojs DataFrame for advanced analytics
        this.reset();
    }

    recordCycle(cycleData) {
        this.metrics.cycleCount++;
        const cycleTime = cycleData.duration || 0;
        this.cycleTimes.push(cycleTime);

        if (this.cycleTimes.length > PERFORMANCE.CACHE_SIZE) {
            this.cycleTimes.shift();
        }

        // Use danfojs for more sophisticated statistics calculation
        if (this.cycleTimes.length > 0) {
            const df = new dfd.Series(this.cycleTimes);
            this.metrics.averageCycleTime = df.mean();
        }
        this.metrics.totalProcessingTime += cycleTime;
    }

    recordTask(taskData) {
        this.metrics.taskCount++;
    }

    recordConcept(conceptData) {
        this.metrics.conceptCount++;
    }

    recordError(errorData) {
        this.metrics.errorCount++;
    }

    updateMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            this.metrics.memoryUsage = usage.heapUsed;
            this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, usage.heapUsed);
        }
    }

    getSystemMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            memoryUsageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024),
            peakMemoryUsageMB: Math.round(this.metrics.peakMemoryUsage / 1024 / 1024),
            averageCycleTimeMs: Math.round(this.metrics.averageCycleTime),
            cyclesPerSecond: this.metrics.averageCycleTime > 0 ? Math.round(1000 / this.metrics.averageCycleTime) : 0,
        };
    }

    getPerformanceMetrics() {
        // Use danfojs for advanced statistical calculations
        let cycleTimeVariance = 0;
        let cycleTimeStd = 0;
        let cycleTimeMedian = 0;
        let cycleTimePercentiles = { p25: 0, p75: 0, p95: 0 };
        
        if (this.cycleTimes.length > 0) {
            const df = new dfd.Series(this.cycleTimes);
            cycleTimeVariance = df.var();
            cycleTimeStd = df.std();
            cycleTimeMedian = df.median();
            
            // Calculate percentiles using danfojs
            cycleTimePercentiles = {
                p25: df.quantile(0.25),
                p75: df.quantile(0.75),
                p95: df.quantile(0.95)
            };
        }

        return {
            averageCycleTime: this.metrics.averageCycleTime,
            cyclesPerSecond: this.metrics.averageCycleTime > 0 ? 1000 / this.metrics.averageCycleTime : 0,
            totalProcessingTime: this.metrics.totalProcessingTime,
            cycleTimeVariance,
            cycleTimeStd,
            cycleTimeMedian,
            cycleTimePercentiles,
            memoryEfficiency: this.metrics.memoryUsage > 0 ? this.metrics.taskCount / this.metrics.memoryUsage : 0,
        };
    }

    getHealthMetrics() {
        const uptime = Date.now() - this.metrics.startTime;
        const errorRate = uptime > 0 ? this.metrics.errorCount / (uptime / 1000) : 0;

        return {
            isHealthy: errorRate < 0.1 && this.metrics.averageCycleTime < 100,
            errorRate: errorRate,
            systemLoad: this.metrics.cycleCount / Math.max(1, uptime / 1000),
            memoryPressure: this.metrics.memoryUsage / this.metrics.peakMemoryUsage,
        };
    }

    // Advanced statistical analysis methods using danfojs
    getAdvancedPerformanceMetrics() {
        if (this.cycleTimes.length === 0) {
            return {
                trend: 'stable',
                outliers: [],
                stability: 'unknown'
            };
        }

        const df = new dfd.Series(this.cycleTimes);
        const mean = df.mean();
        const std = df.std();
        
        // Identify outliers (values more than 2 standard deviations from mean)
        const outliers = this.cycleTimes.filter(value => 
            Math.abs(value - mean) > 2 * std
        );
        
        // Simple trend analysis based on last 10% vs first 10% of data
        const recentCount = Math.max(1, Math.floor(this.cycleTimes.length * 0.1));
        const recentSlice = this.cycleTimes.slice(-recentCount);
        const recentAvg = recentSlice.reduce((sum, val) => sum + val, 0) / recentSlice.length;
        const earlySlice = this.cycleTimes.slice(0, recentCount);
        const earlyAvg = earlySlice.reduce((sum, val) => sum + val, 0) / earlySlice.length;
        
        let trend = 'stable';
        if (recentAvg > earlyAvg * 1.1) trend = 'degrading';
        else if (recentAvg < earlyAvg * 0.9) trend = 'improving';
        
        // Stability based on coefficient of variation
        const coefVariation = mean > 0 ? std / mean : Infinity;
        const stability = coefVariation < 0.1 ? 'high' : 
                         coefVariation < 0.2 ? 'medium' : 'low';
        
        return {
            trend,
            outliers,
            stability,
            coefficientOfVariation: coefVariation
        };
    }

    reset() {
        this.metrics = {
            startTime: Date.now(),
            cycleCount: 0,
            taskCount: 0,
            conceptCount: 0,
            errorCount: 0,
            memoryUsage: 0,
            averageCycleTime: 0,
            peakMemoryUsage: 0,
            totalProcessingTime: 0,
        };
        this.cycleTimes = [];
        this.cycleTimesDf = null;
    }

    exportMetrics() {
        return {
            system: this.getSystemMetrics(),
            performance: this.getPerformanceMetrics(),
            health: this.getHealthMetrics(),
            advanced: this.getAdvancedPerformanceMetrics(),
            timestamp: Date.now(),
        };
    }
}