import * as dfd from 'danfojs';
import {Knowledge} from './Knowledge.js';

export class DataTableKnowledge extends Knowledge {
    constructor(data = null, tableName = 'data', options = {}) {
        super(data, options);
        this.tableName = tableName;
    }

    async initDataTable(data) {
        if (Array.isArray(data)) {
            this.df = new dfd.DataFrame(data);
        } else if (data && typeof data === 'object') {
            this.df = new dfd.DataFrame([this.flattenObject(data)]);
        }
    }

    async initDataFrame() {
        await this.initDataTable(this.data);
    }

    flattenObject(obj, prefix = '') {
        const flattened = {};
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}_${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(flattened, this.flattenObject(value, newKey));
            } else {
                flattened[newKey] = value;
            }
        }
        return flattened;
    }

    async processData() {
        if (!this.df) await this.initDataTable(this.data);
        let processedDf = this.df;
        if (this.options.handleMissingValues) processedDf = processedDf?.dropna?.();
        if (this.options.removeDuplicates) processedDf = processedDf?.dropDuplicates?.();
        this.df = processedDf;
        return this.df;
    }

    async toTasks() {
        if (!this.df) await this.processData();
        const tasks = [], rows = this.df?.values || [], cols = this.df?.columns || [];
        for (let i = 0; i < (rows.length || 0); i++) {
            const row = rows[i] || [];
            const rowObj = {};
            (cols || []).forEach((col, idx) => rowObj[col] = row[idx]);
            const task = await this.rowToTask(rowObj, i);
            if (task) tasks.push(task);
        }
        return tasks;
    }

    async rowToTask(row, index) {
        const keys = Object.keys(row);
        if (keys.length > 0) {
            const firstKey = keys[0];
            const value = row[firstKey];
            const identifier = `${firstKey}_${index}`.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
            return `<("${identifier}" --> ${firstKey}) --> ${value}>. %0.50;0.90%`;
        }
        return null;
    }

    async getItems() {
        if (!this.df) await this.processData();
        const rows = this.df?.values || [], cols = this.df?.columns || [];
        return (rows || []).map(row => {
            const item = {};
            (cols || []).forEach((col, idx) => item[col] = (row || [])[idx]);
            return item;
        });
    }

    async getSummary() {
        if (!this.df) await this.processData();
        const shape = this.df?.shape || [0, 0];
        const summary = {
            tableName: this.tableName,
            rowCount: shape[0],
            columnCount: shape[1],
            columns: this.df?.columns || [],
            statistics: {}
        };

        const numericCols = [];
        const allCols = this.df?.columns || [];
        for (const col of allCols) {
            try {
                const colData = this.df?.column?.(col);
                if (colData && ['int32', 'float32', 'float64'].includes(colData.dtype)) {
                    numericCols.push(col);
                }
            } catch (e) {
            }
        }

        for (const col of numericCols) {
            try {
                const colData = this.df?.column?.(col);
                if (!colData) continue;

                const mean = await colData.mean?.();
                const std = await colData.std?.();
                const min = await colData.min?.();
                const max = await colData.max?.();

                if (mean !== undefined && std !== undefined && min !== undefined && max !== undefined) {
                    summary.statistics[col] = {
                        mean: parseFloat(mean.toFixed(4)),
                        std: parseFloat(std.toFixed(4)),
                        min: parseFloat(min.toFixed(4)),
                        max: parseFloat(max.toFixed(4))
                    };
                }
            } catch (e) {
                console.warn(`Could not calculate statistics for column ${col}: ${e.message}`);
            }
        }
        return summary;
    }

    async createRelationships() {
        return [];
    }

    async describe() {
        if (!this.df) await this.processData();
        return await this.df?.describe?.();
    }
}