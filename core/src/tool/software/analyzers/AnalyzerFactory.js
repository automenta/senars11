import {TestAnalyzer} from './TestAnalyzer.js';
import {CoverageAnalyzer} from './CoverageAnalyzer.js';
import {ProjectAnalyzer} from './ProjectAnalyzer.js';
import {StaticAnalyzer} from './StaticAnalyzer.js';
import {RequirementsAnalyzer} from './RequirementsAnalyzer.js';
import {FeatureSpecificationAnalyzer} from './FeatureSpecificationAnalyzer.js';
import {TechnicalDebtAnalyzer} from './TechnicalDebtAnalyzer.js';
import {ArchitectureAnalyzer} from './ArchitectureAnalyzer.js';
import {PlanningAnalyzer} from './PlanningAnalyzer.js';

export class AnalyzerFactory {
    static createAnalyzer(type, options, verbose) {
        switch (type) {
            case 'tests':
                return new TestAnalyzer(options, verbose);
            case 'coverage':
                return new CoverageAnalyzer(options, verbose);
            case 'project':
                return new ProjectAnalyzer(options, verbose);
            case 'static':
                return new StaticAnalyzer(options, verbose);
            case 'requirements':
                return new RequirementsAnalyzer(options, verbose);
            case 'featurespecs':
                return new FeatureSpecificationAnalyzer(options, verbose);
            case 'technicaldebt':
                return new TechnicalDebtAnalyzer(options, verbose);
            case 'architecture':
                return new ArchitectureAnalyzer(options, verbose);
            case 'planning':
                return new PlanningAnalyzer(options, verbose);
            default:
                throw new Error(`Unknown analyzer type: ${type}`);
        }
    }

    static getAllAnalyzerTypes() {
        return ['tests', 'coverage', 'project', 'static', 'requirements', 'featurespecs', 'technicaldebt', 'architecture', 'planning'];
    }
}