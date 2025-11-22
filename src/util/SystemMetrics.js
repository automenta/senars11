import {PERFORMANCE} from '../config/constants.js';
import {Statistics} from './Statistics.js';

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
        this.reset();
    }

    recordCycle(cycleData) {
        this.metrics.cycleCount++;
        const cycleTime = cycleData.duration || 0;
        this.cycleTimes.push(cycleTime);

        if (this.cycleTimes.length > PERFORMANCE.CACHE_SIZE) {
            this.cycleTimes.shift();
        }

        if (this.cycleTimes.length > 0) {
            this.metrics.averageCycleTime = Statistics.mean(this.cycleTimes);
        }
        this.metrics.totalProcessingTime += cycleTime;
    }

    recordTask() {
        this.metrics.taskCount++;
    }

    recordConcept() {
        this.metrics.conceptCount++;
    }

    recordError() {
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
        let cycleTimeVariance = 0;
        let cycleTimeStd = 0;
        let cycleTimeMedian = 0;
        let cycleTimePercentiles = {p25: 0, p75: 0, p95: 0};

        if (this.cycleTimes.length > 0) {
            cycleTimeMedian = Statistics.median(this.cycleTimes);
            cycleTimeStd = Statistics.stdDev(this.cycleTimes);
            cycleTimeVariance = Math.pow(cycleTimeStd, 2);

            const quantiles = Statistics.quantiles(this.cycleTimes, [0.25, 0.75, 0.95]);
            cycleTimePercentiles = {
                p25: quantiles.p25,
                p75: quantiles.p75,
                p95: quantiles.p95
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
            errorRate,
            systemLoad: this.metrics.cycleCount / Math.max(1, uptime / 1000),
            memoryPressure: this.metrics.peakMemoryUsage > 0 ? this.metrics.memoryUsage / this.metrics.peakMemoryUsage : 0,
        };
    }

    getAdvancedPerformanceMetrics() {
        if (this.cycleTimes.length === 0) {
            return {
                trend: 'stable',
                outliers: [],
                stability: 'unknown'
            };
        }

        const mean = Statistics.mean(this.cycleTimes);
        const std = Statistics.stdDev(this.cycleTimes);

        const outliers = this.cycleTimes.filter(value =>
            Math.abs(value - mean) > 2 * std
        );

        const recentCount = Math.max(1, Math.floor(this.cycleTimes.length * 0.1));
        const recentSlice = this.cycleTimes.slice(-recentCount);
        const recentAvg = Statistics.mean(recentSlice);
        const earlySlice = this.cycleTimes.slice(0, recentCount);
        const earlyAvg = Statistics.mean(earlySlice);

        let trend = 'stable';
        if (recentAvg > earlyAvg * 1.1) trend = 'degrading';
        else if (recentAvg < earlyAvg * 0.9) trend = 'improving';

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

    getRecentCycleTimes(count = 10) {
        return this.cycleTimes.slice(-count);
    }

    getErrorRate() {
        const uptime = Date.now() - this.metrics.startTime;
        return uptime > 0 ? this.metrics.errorCount / (uptime / 1000) : 0;
    }
}
