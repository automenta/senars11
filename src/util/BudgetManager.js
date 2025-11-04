/**
 * Resource budget management utility
 */
export class BudgetManager {
    constructor(initialBudget = 1000) {
        this.budget = initialBudget;
        this.allocations = new Map();
    }
    
    allocate(id, amount) {
        if (this.budget >= amount) {
            this.budget -= amount;
            this.allocations.set(id, (this.allocations.get(id) || 0) + amount);
            return true;
        }
        return false;
    }
    
    release(id) {
        const amount = this.allocations.get(id) || 0;
        this.budget += amount;
        this.allocations.delete(id);
        return amount;
    }
    
    getAvailable() {
        return this.budget;
    }
    
    getTotalAllocated() {
        return Array.from(this.allocations.values()).reduce((sum, val) => sum + val, 0);
    }
    
    getAllocation(id) {
        return this.allocations.get(id) || 0;
    }
    
    hasBudget(amount) {
        return this.budget >= amount;
    }
    
    utilization() {
        const allocated = this.getTotalAllocated();
        const total = allocated + this.budget;
        return total > 0 ? allocated / total : 0;
    }
}