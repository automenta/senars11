import fs from 'fs';
import {BaseAnalyzer} from './BaseAnalyzer.js';

export class RequirementsAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Requirements Analysis...');

        return await this.safeAnalyze(async () => {
            if (!fs.existsSync('./README.md')) {
                this.log('README.md not found', 'error');
                return {error: 'README.md not found'};
            }

            const readmeContent = this._readFileContent('./README.md');
            if (!readmeContent) {
                return {error: 'Could not read README.md'};
            }

            const requirements = this._analyzeRequirements(readmeContent);

            const satisfiedCount = Object.values(requirements).filter(value => value === true).length;
            const totalCount = Object.keys(requirements).length;

            requirements.complianceScore = Math.round((satisfiedCount / totalCount) * 100);
            requirements.satisfiedRequirements = satisfiedCount;
            requirements.totalRequirements = totalCount;

            return requirements;
        }, 'Requirements analysis failed');
    }

    _analyzeRequirements(readmeContent) {
        return {
            hasImmutableDataFoundation: readmeContent.includes('Immutable Data Foundation'),
            hasComponentBasedArchitecture: readmeContent.includes('Component-Based Architecture'),
            hasDualMemoryArchitecture: readmeContent.includes('Dual Memory Architecture'),
            hasHybridReasoningIntegration: readmeContent.includes('Hybrid Reasoning Integration'),
            hasLayerBasedExtensibility: readmeContent.includes('Layer-Based Extensibility'),

            hasTermClassDocumentation: readmeContent.includes('`Term` Class') || readmeContent.toLowerCase().includes('term') && readmeContent.includes('knowledge'),
            hasTaskClassDocumentation: readmeContent.includes('`Task` Class') || readmeContent.toLowerCase().includes('task') && readmeContent.includes('unit of work'),
            hasTruthDocumentation: readmeContent.includes('`Truth` Value Representation') || readmeContent.toLowerCase().includes('truth value'),
            hasStampDocumentation: readmeContent.includes('`Stamp` and Evidence Tracking') || readmeContent.toLowerCase().includes('stamp') && readmeContent.includes('evidence'),

            hasNARDocumentation: readmeContent.includes('`NAR` (NARS Reasoner Engine)') || readmeContent.toLowerCase().includes('nar') && readmeContent.includes('orchestrator'),
            hasMemoryDocumentation: readmeContent.includes('Memory and Focus Management') || readmeContent.toLowerCase().includes('memory') && readmeContent.includes('concept'),
            hasParserDocumentation: readmeContent.includes('Parser System') || readmeContent.toLowerCase().includes('parser') && readmeContent.includes('narsese'),
            hasLMDocumentation: readmeContent.includes('Language Model Integration') || readmeContent.toLowerCase().includes('lm integration'),

            hasBeliefGoalDistinction: readmeContent.includes('Belief vs. Goal') || readmeContent.toLowerCase().includes('belief') && readmeContent.includes('goal'),
            hasUsageExamples: readmeContent.includes('Usage Examples'),
            hasTestingStrategy: readmeContent.includes('Testing Strategy'),
            hasAPIConventions: readmeContent.includes('API Conventions') || readmeContent.includes('conventions'),
            hasErrorHandling: readmeContent.includes('Error Handling') || readmeContent.includes('robustness'),
            hasSecurityImplementation: readmeContent.includes('Security Implementation'),

            hasCompoundIntelligence: readmeContent.includes('Compound Intelligence Architecture') || readmeContent.includes('compound intelligence'),
            hasReinforcementLearning: readmeContent.includes('General-Purpose Reinforcement Learning') || readmeContent.includes('reinforcement learning'),
            hasKeyObjectives: readmeContent.includes('Key Design Objectives') || readmeContent.includes('simplicity') || readmeContent.includes('robustness') || readmeContent.includes('consistency'),

            hasTechnicalChallenges: readmeContent.includes('Core Technical Challenges'),

            systemSize: readmeContent.length,
            hasLongTermSpec: readmeContent.includes('Long-Term Specification'),
            hasUserExperienceGoals: readmeContent.includes('User Experience Goals'),
            hasTechnicalExcellence: readmeContent.includes('Technical Excellence Standards'),
            hasDirectoryStructure: readmeContent.includes('Directory Structure'),
            readmeComplete: readmeContent.length > 5000,
        };
    }

    _readFileContent(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${filePath}`, 'warn', {error: readError.message});
            return null;
        }
    }
}