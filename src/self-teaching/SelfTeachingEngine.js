import { ReasoningAboutReasoning } from '../reasoning/ReasoningAboutReasoning.js';
import { NarseseParser } from '../parser/NarseseParser.js';

/**
 * Self-Teaching Engine
 * Implements autonomous teaching and demonstration capabilities
 */
export class SelfTeachingEngine {
    constructor(nar, config = {}) {
        this.nar = nar;
        this.config = {
            enabled: config.enabled !== false,
            demoInterval: config.demoInterval || 60000, // 1 minute
            teachingMode: config.teachingMode || 'adaptive', // 'adaptive', 'systematic', 'interactive'
            difficultyAdaptation: config.difficultyAdaptation !== false,
            feedbackIntegration: config.feedbackIntegration !== false,
            ...config
        };

        this.isRunning = false;
        this.demoIntervalId = null;
        this.learningPath = [];
        this.knowledgeGaps = new Set();
        this.userInteractionHistory = [];
        this.currentDemo = null;
        this.demoHistory = [];
        this.teachingProgress = new Map(); // Tracks what users have learned
        
        this.parser = new NarseseParser(nar._termFactory);
        this.reasoningAnalyzer = new ReasoningAboutReasoning(nar, config.reasoningAboutReasoning || {});
        
        this._setupEventListeners();
    }

    _setupEventListeners() {
        if (!this.nar._eventBus) return;

        // Listen for user interactions
        this.nar._eventBus.on('task.input', (data) => {
            if (data.source === 'user') {
                this.userInteractionHistory.push({
                    type: 'input',
                    data,
                    timestamp: Date.now()
                });
                
                // Analyze the input to detect learning needs
                this._analyzeLearningNeeds(data.originalInput);
            }
        });

        this.nar._eventBus.on('task.processed', (data) => {
            if (data.source === 'user') {
                this.userInteractionHistory.push({
                    type: 'processed',
                    data,
                    timestamp: Date.now()
                });
            }
        });
    }

    start() {
        if (this.isRunning) return false;
        
        this.isRunning = true;
        
        // Start periodic demonstration if enabled
        if (this.config.demoInterval > 0) {
            this.demoIntervalId = setInterval(() => {
                this._runDemonstrationCycle();
            }, this.config.demoInterval);
        }
        
        console.log('Self-teaching engine started');
        return true;
    }

    stop() {
        if (!this.isRunning) return false;
        
        if (this.demoIntervalId) {
            clearInterval(this.demoIntervalId);
            this.demoIntervalId = null;
        }
        
        this.isRunning = false;
        console.log('Self-teaching engine stopped');
        return true;
    }

    async _runDemonstrationCycle() {
        if (!this.config.enabled) return;

        try {
            // Analyze system state to identify demonstration opportunities
            const demonstration = await this._generateDemonstration();
            
            if (demonstration) {
                this.currentDemo = demonstration;
                
                // Execute the demonstration
                await this._executeDemonstration(demonstration);
                
                // Record in history
                this.demoHistory.push({
                    ...demonstration,
                    timestamp: Date.now(),
                    executed: true
                });
                
                console.log(`Executed demonstration: ${demonstration.title}`);
            }
        } catch (error) {
            console.error('Error in demonstration cycle:', error);
        }
    }

    async _generateDemonstration() {
        // Generate a relevant demonstration based on system state and user history
        const systemState = this.reasoningAnalyzer.getReasoningState();
        const recentInteractions = this.userInteractionHistory.slice(-10);
        
        // Determine what to demonstrate based on different factors
        const demonstrationTypes = [
            { type: 'basic_reasoning', priority: this._calculateBasicReasoningPriority(systemState, recentInteractions) },
            { type: 'inheritance', priority: this._calculateInheritancePriority(systemState, recentInteractions) },
            { type: 'similarity', priority: this._calculateSimilarityPriority(systemState, recentInteractions) },
            { type: 'goal_reasoning', priority: this._calculateGoalReasoningPriority(systemState, recentInteractions) },
            { type: 'concept_formation', priority: this._calculateConceptFormationPriority(systemState, recentInteractions) }
        ];
        
        // Find highest priority demonstration
        demonstrationTypes.sort((a, b) => b.priority - a.priority);
        const highestPriority = demonstrationTypes[0];
        
        if (highestPriority.priority > 0.3) { // Only demonstrate if priority is above threshold
            switch (highestPriority.type) {
                case 'basic_reasoning':
                    return this._createBasicReasoningDemo();
                case 'inheritance':
                    return this._createInheritanceDemo();
                case 'similarity':
                    return this._createSimilarityDemo();
                case 'goal_reasoning':
                    return this._createGoalReasoningDemo();
                case 'concept_formation':
                    return this._createConceptFormationDemo();
                default:
                    return null;
            }
        }
        
        return null;
    }

    _calculateBasicReasoningPriority(systemState, recentInteractions) {
        // Priority increases if user hasn't interacted with basic reasoning recently
        const basicReasoningUsed = recentInteractions.some(interaction => 
            interaction.data?.originalInput && 
            (interaction.data.originalInput.includes('->') || 
             interaction.data.originalInput.includes('<->'))
        );
        
        return basicReasoningUsed ? 0.1 : 0.8; // Low priority if recently used, high if not used
    }

    _calculateInheritancePriority(systemState, recentInteractions) {
        // Priority based on concept diversity and recent usage
        const inheritanceUsed = recentInteractions.some(interaction => 
            interaction.data?.originalInput?.includes('->')
        );
        
        const conceptDiversity = systemState.taskCount.totalTasks / Math.max(1, systemState.taskCount.beliefs);
        
        return inheritanceUsed ? 0.2 : 0.7 * conceptDiversity; // Adjust based on concept diversity
    }

    _calculateSimilarityPriority(systemState, recentInteractions) {
        const similarityUsed = recentInteractions.some(interaction => 
            interaction.data?.originalInput?.includes('<->')
        );
        
        return similarityUsed ? 0.2 : 0.6;
    }

    _calculateGoalReasoningPriority(systemState, recentInteractions) {
        // High priority if system has many goals but user hasn't interacted with goal reasoning
        const hasGoals = systemState.taskCount.goals > 0;
        const goalReasoningUsed = recentInteractions.some(interaction => 
            interaction.data?.originalInput?.includes('!')
        );
        
        return hasGoals && !goalReasoningUsed ? 0.9 : 0.1;
    }

    _calculateConceptFormationPriority(systemState, recentInteractions) {
        // Priority based on system's concept formation activity
        const conceptCount = systemState.taskCount.beliefs + systemState.taskCount.questions;
        const memoryPressure = systemState.memoryStats.conceptCount / systemState.memoryStats.maxConcepts;
        
        return Math.min(0.8, memoryPressure * 0.8 + conceptCount * 0.001);
    }

    _createBasicReasoningDemo() {
        return {
            id: `demo_${Date.now()}_basic_reasoning`,
            title: 'Basic Reasoning Example',
            description: 'Demonstrates fundamental reasoning with inheritance relationships',
            type: 'basic_reasoning',
            difficulty: 'beginner',
            steps: [
                {
                    type: 'explanation',
                    content: 'In NARS, we can represent knowledge using inheritance relations like <bird -> animal>'
                },
                {
                    type: 'input',
                    narsese: '<bird -> animal>.',
                    explanation: 'This states that birds are a type of animal'
                },
                {
                    type: 'input', 
                    narsese: '<tweety -> bird>.',
                    explanation: 'This states that Tweety is a bird'
                },
                {
                    type: 'output_prediction',
                    expected: '<tweety -> animal>.',
                    explanation: 'The system will derive that Tweety is an animal through transitive inference'
                }
            ],
            estimatedTime: 30000 // 30 seconds
        };
    }

    _createInheritanceDemo() {
        return {
            id: `demo_${Date.now()}_inheritance`,
            title: 'Inheritance Relations',
            description: 'Shows how inheritance relationships enable knowledge organization',
            type: 'inheritance',
            difficulty: 'intermediate',
            steps: [
                {
                    type: 'explanation',
                    content: 'Inheritance (->) represents a is-a relationship. It allows knowledge to be inherited from more general concepts to specific instances.'
                },
                {
                    type: 'input',
                    narsese: '<robin -> bird>.',
                    explanation: 'Robins are a type of bird'
                },
                {
                    type: 'input',
                    narsese: '<bird -> animal>.',
                    explanation: 'Birds are a type of animal'
                },
                {
                    type: 'input',
                    narsese: '<robin -> animal>?',
                    explanation: 'Ask: Is a robin an animal? (The system will derive this)'
                }
            ],
            estimatedTime: 45000
        };
    }

    _createSimilarityDemo() {
        return {
            id: `demo_${Date.now()}_similarity`,
            title: 'Similarity Relations',
            description: 'Demonstrates symmetric relationships using similarity',
            type: 'similarity',
            difficulty: 'intermediate',
            steps: [
                {
                    type: 'explanation',
                    content: 'Similarity (<->) represents bidirectional inheritance. If A is similar to B, then B is similar to A.'
                },
                {
                    type: 'input',
                    narsese: '<swan <-> bird>.',
                    explanation: 'Swans are similar to birds (bidirectional)'
                },
                {
                    type: 'prediction',
                    explanation: 'The system now knows both <swan -> bird> and <bird -> swan>'
                }
            ],
            estimatedTime: 40000
        };
    }

    _createGoalReasoningDemo() {
        return {
            id: `demo_${Date.now()}_goal_reasoning`,
            title: 'Goal Reasoning',
            description: 'Shows how the system pursues goals and reasons toward achieving them',
            type: 'goal_reasoning',
            difficulty: 'advanced',
            steps: [
                {
                    type: 'explanation',
                    content: 'Goals (!) represent desired states. The system reasons about how to achieve goals.'
                },
                {
                    type: 'input',
                    narsese: '<bird -> fly>.',
                    explanation: 'Birds can fly'
                },
                {
                    type: 'input',
                    narsese: '<tweety -> bird>.',
                    explanation: 'Tweety is a bird'
                },
                {
                    type: 'input',
                    narsese: '<tweety -> fly>!',
                    explanation: 'Goal: Make tweety fly'
                },
                {
                    type: 'prediction',
                    explanation: 'The system recognizes Tweety can fly based on being a bird'
                }
            ],
            estimatedTime: 50000
        };
    }

    _createConceptFormationDemo() {
        return {
            id: `demo_${Date.now()}_concept_formation`,
            title: 'Concept Formation',
            description: 'Shows how the system forms new concepts from experience',
            type: 'concept_formation',
            difficulty: 'advanced',
            steps: [
                {
                    type: 'explanation',
                    content: 'The system creates new concepts when it encounters similar patterns'
                },
                {
                    type: 'input_sequence',
                    inputs: [
                        '<robin -> bird>.',
                        '<eagle -> bird>.',
                        '<sparrow -> bird>.',
                        '<bird -> fly>.'
                    ],
                    explanation: 'Different examples leading to general concept'
                },
                {
                    type: 'prediction',
                    explanation: 'System forms concept of "bird" with associated properties'
                }
            ],
            estimatedTime: 60000
        };
    }

    async _executeDemonstration(demonstration) {
        if (!demonstration || !demonstration.steps) return false;
        
        console.log(`Starting demonstration: ${demonstration.title}`);
        
        for (const step of demonstration.steps) {
            try {
                await this._executeDemoStep(step);
                
                // Wait between steps to allow user to follow along
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`Error in demonstration step:`, error);
                break; // Stop the demo if there's an error
            }
        }
        
        console.log(`Completed demonstration: ${demonstration.title}`);
        return true;
    }

    async _executeDemoStep(step) {
        switch (step.type) {
            case 'input':
                console.log(`Input: ${step.narsese} - ${step.explanation}`);
                await this.nar.input(step.narsese);
                break;
                
            case 'input_sequence':
                for (const input of step.inputs) {
                    console.log(`Input: ${input}`);
                    await this.nar.input(input);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between inputs
                }
                console.log(step.explanation);
                break;
                
            case 'explanation':
                console.log(`Explanation: ${step.content}`);
                break;
                
            case 'prediction':
                console.log(`Prediction: ${step.explanation}`);
                break;
                
            case 'output_prediction':
                console.log(`Expected output: ${step.expected} - ${step.explanation}`);
                break;
                
            default:
                console.log(`Step: ${step.explanation || step.type}`);
        }
    }

    async teachConcept(conceptName, difficulty = 'beginner') {
        // Generate teaching material for a specific concept
        const teachingPlan = this._createTeachingPlan(conceptName, difficulty);
        
        if (teachingPlan) {
            await this._executeTeachingPlan(teachingPlan);
            return teachingPlan;
        }
        
        return null;
    }

    _createTeachingPlan(conceptName, difficulty = 'beginner') {
        // Create a structured teaching plan for a specific concept
        const plans = {
            'inheritance': {
                title: 'Learning Inheritance Relations',
                difficulty,
                modules: this._createInheritanceModules(difficulty)
            },
            'similarity': {
                title: 'Learning Similarity Relations',
                difficulty,
                modules: this._createSimilarityModules(difficulty)
            },
            'goals': {
                title: 'Learning Goal Reasoning',
                difficulty,
                modules: this._createGoalModules(difficulty)
            },
            'truth-values': {
                title: 'Learning Truth Values',
                difficulty,
                modules: this._createTruthValueModules(difficulty)
            },
            'narsese': {
                title: 'Learning Narsese Syntax',
                difficulty,
                modules: this._createNarseseModules(difficulty)
            }
        };
        
        return plans[conceptName.toLowerCase()] || null;
    }

    _createInheritanceModules(difficulty) {
        let modules = [
            {
                id: 'inheritance-basics',
                title: 'What is Inheritance?',
                content: 'Inheritance (->) represents a type-of relationship where the subject is a special case of the predicate.',
                examples: ['<bird -> animal> means "birds are a type of animal"'],
                exercises: ['Create your own inheritance statement']
            }
        ];
        
        if (difficulty !== 'beginner') {
            modules.push({
                id: 'inheritance-reasoning',
                title: 'Inheritance-based Reasoning',
                content: 'How inheritance enables transitive reasoning and knowledge inheritance.',
                examples: ['<robin -> bird> and <bird -> animal> leads to <robin -> animal>'],
                exercises: ['Derive a new inheritance relation from given facts']
            });
        }
        
        if (difficulty === 'advanced') {
            modules.push({
                id: 'inheritance-complex',
                title: 'Complex Inheritance Patterns',
                content: 'Advanced inheritance relationships and their reasoning implications.',
                examples: ['Higher-order inheritance patterns'],
                exercises: ['Construct complex inheritance hierarchies']
            });
        }
        
        return modules;
    }

    _createSimilarityModules(difficulty) {
        let modules = [
            {
                id: 'similarity-basics',
                title: 'What is Similarity?',
                content: 'Similarity (<->) represents bidirectional inheritance relationships.',
                examples: ['<swan <-> bird> means both <swan -> bird> and <bird -> swan>'],
                exercises: ['Create a similarity statement']
            }
        ];
        
        return modules;
    }

    _createGoalModules(difficulty) {
        let modules = [
            {
                id: 'goal-basics',
                title: 'What are Goals?',
                content: 'Goals (!) represent desired states that the system tries to achieve.',
                examples: ['<I -> happy>! means "I want to be happy"'],
                exercises: ['Formulate a simple goal']
            }
        ];
        
        if (difficulty !== 'beginner') {
            modules.push({
                id: 'goal-reasoning',
                title: 'Goal-oriented Reasoning',
                content: 'How the system reasons to achieve goals.',
                examples: ['Goal + belief = potential action'],
                exercises: ['Create a goal and relevant belief']
            });
        }
        
        return modules;
    }

    _createTruthValueModules(difficulty) {
        let modules = [
            {
                id: 'truth-basics',
                title: 'Understanding Truth Values',
                content: 'Truth values have frequency (how often true) and confidence (how sure we are).',
                examples: ['(0.9, 0.8) means 90% frequency with 80% confidence'],
                exercises: ['Interpret a truth value']
            }
        ];
        
        return modules;
    }

    _createNarseseModules(difficulty) {
        let modules = [
            {
                id: 'syntax-basics',
                title: 'Narsese Syntax Basics',
                content: 'Narsese is the formal language of NARS with specific punctuation and structure.',
                examples: ['<bird -> animal>. (belief), <bird -> fly>? (question), <bird -> fly>! (goal)'],
                exercises: ['Write a simple narsese statement']
            }
        ];
        
        return modules;
    }

    async _executeTeachingPlan(teachingPlan) {
        if (!teachingPlan || !teachingPlan.modules) return false;
        
        console.log(`Starting teaching plan: ${teachingPlan.title}`);
        
        for (const module of teachingPlan.modules) {
            await this._executeTeachingModule(module);
            
            // Record progress
            this.teachingProgress.set(module.id, {
                completed: true,
                timestamp: Date.now(),
                difficulty: teachingPlan.difficulty
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000)); // Pause between modules
        }
        
        console.log(`Completed teaching plan: ${teachingPlan.title}`);
        return true;
    }

    async _executeTeachingModule(module) {
        console.log(`Module: ${module.title}`);
        console.log(`Content: ${module.content}`);
        
        for (const example of module.examples || []) {
            console.log(`Example: ${example}`);
        }
        
        // For interactive mode, we might prompt the user
        // For now, we'll just log the exercises
        for (const exercise of module.exercises || []) {
            console.log(`Exercise: ${exercise}`);
        }
    }

    _analyzeLearningNeeds(userInput) {
        // Analyze what the user might need to learn based on their input
        const analysis = {
            conceptsMentioned: [],
            reasoningPatterns: [],
            knowledgeGaps: [],
            suggestedLearning: []
        };

        // Check for basic concepts
        if (userInput.includes('->')) analysis.conceptsMentioned.push('inheritance');
        if (userInput.includes('<->')) analysis.conceptsMentioned.push('similarity');
        if (userInput.includes('!')) analysis.conceptsMentioned.push('goals');
        if (userInput.includes('?')) analysis.conceptsMentioned.push('questions');

        // Identify potential knowledge gaps based on input patterns
        if (userInput.includes('->') && !userInput.includes(' <-> ') && analysis.conceptsMentioned.length === 1) {
            analysis.knowledgeGaps.push('similarity');
            analysis.suggestedLearning.push('similarity');
        }

        // Add to knowledge gaps set
        for (const gap of analysis.knowledgeGaps) {
            this.knowledgeGaps.add(gap);
        }

        return analysis;
    }

    async generatePersonalizedLearningPath(userId = 'default') {
        // Generate a personalized learning path for a user
        const userProgress = this.teachingProgress;
        const availableConcepts = ['inheritance', 'similarity', 'goals', 'truth-values', 'narsese'];
        
        const learningPath = [];
        
        for (const concept of availableConcepts) {
            const hasLearned = Array.from(userProgress.keys()).some(key => key.includes(concept));
            const isGap = this.knowledgeGaps.has(concept);
            
            let difficulty = 'beginner';
            if (hasLearned) difficulty = 'intermediate';
            if (isGap) difficulty = 'beginner'; // Prioritize gaps
            
            learningPath.push({
                concept,
                priority: isGap ? 2 : (hasLearned ? 0 : 1),
                difficulty,
                recommended: true
            });
        }
        
        // Sort by priority (gaps first)
        learningPath.sort((a, b) => b.priority - a.priority);
        
        this.learningPath = learningPath;
        return learningPath;
    }

    async getInteractiveTutorial(conceptName, userLevel = 'beginner') {
        // Create an interactive tutorial for a concept
        const tutorial = {
            concept: conceptName,
            level: userLevel,
            steps: [],
            interactive: true,
            feedbackEnabled: true
        };

        // Generate appropriate steps based on concept and level
        switch (conceptName.toLowerCase()) {
            case 'inheritance':
                tutorial.steps = await this._createInteractiveInheritanceSteps(userLevel);
                break;
            case 'similarity':
                tutorial.steps = await this._createInteractiveSimilaritySteps(userLevel);
                break;
            case 'goals':
                tutorial.steps = await this._createInteractiveGoalSteps(userLevel);
                break;
            default:
                tutorial.steps = await this._createInteractiveGenericSteps(conceptName, userLevel);
        }

        return tutorial;
    }

    async _createInteractiveInheritanceSteps(level) {
        const steps = [
            {
                step: 1,
                title: 'Introduction to Inheritance',
                content: 'Inheritance (->) represents a "type-of" relationship.',
                inputPrompt: 'Enter an inheritance statement (e.g., "<cat -> animal>.")',
                expectedPattern: /<.*->.*>\./,
                feedback: 'Good! You created an inheritance relation.'
            }
        ];

        if (level !== 'beginner') {
            steps.push({
                step: 2,
                title: 'Transitive Inference',
                content: 'Inheritance enables transitive reasoning.',
                inputPrompt: 'Given "<robin -> bird>." and "<bird -> animal>.", what can you derive?',
                expectedOutputs: ['<robin -> animal>.'],
                feedback: 'Correct! This is transitive inference.'
            });
        }

        return steps;
    }

    async _createInteractiveSimilaritySteps(level) {
        const steps = [
            {
                step: 1,
                title: 'Introduction to Similarity',
                content: 'Similarity (<->) represents bidirectional inheritance.',
                inputPrompt: 'Enter a similarity statement (e.g., "<swan <-> bird>.")',
                expectedPattern: /<.*<->.*>\./,
                feedback: 'Correct! Similarity works in both directions.'
            }
        ];

        return steps;
    }

    async _createInteractiveGoalSteps(level) {
        const steps = [
            {
                step: 1,
                title: 'Introduction to Goals',
                content: 'Goals (!) represent desired states.',
                inputPrompt: 'Enter a goal (e.g., "<I -> happy>!")',
                expectedPattern: /<.*->.*>!/,
                feedback: 'Good! You created a goal.'
            }
        ];

        return steps;
    }

    async _createInteractiveGenericSteps(conceptName, level) {
        // Generic steps for any concept
        return [
            {
                step: 1,
                title: `Introduction to ${conceptName}`,
                content: `Learning about ${conceptName} in NARS.`,
                inputPrompt: `Try using ${conceptName} in a statement`,
                feedback: 'Great! You are exploring this concept.'
            }
        ];
    }

    async createSelfDemonstration(description) {
        // Create a demonstration based on a description
        const demo = {
            id: `custom_demo_${Date.now()}`,
            title: `Custom Demonstration: ${description}`,
            description,
            type: 'custom',
            difficulty: 'intermediate',
            steps: [
                {
                    type: 'explanation',
                    content: description
                }
            ],
            estimatedTime: 60000
        };

        await this._executeDemonstration(demo);
        this.demoHistory.push({
            ...demo,
            timestamp: Date.now(),
            executed: true
        });

        return demo;
    }

    getTeachingStatus() {
        return {
            isRunning: this.isRunning,
            totalDemos: this.demoHistory.length,
            activeDemo: this.currentDemo,
            knowledgeGaps: Array.from(this.knowledgeGaps),
            userInteractions: this.userInteractionHistory.length,
            teachingProgress: Object.fromEntries(this.teachingProgress),
            learningPath: this.learningPath
        };
    }

    // Methods for integration with UI
    async prepareDemoForUI(demoType) {
        // Prepare a demo in a format suitable for UI display
        const demo = await this._generateDemonstration();
        if (!demo) return null;

        return {
            ...demo,
            steps: demo.steps.map((step, index) => ({
                ...step,
                stepNumber: index + 1,
                totalSteps: demo.steps.length
            }))
        };
    }

    async evaluateUserProgress(userId = 'default') {
        // Evaluate how much the user has learned
        const progress = Array.from(this.teachingProgress.values());
        const completedCount = progress.filter(p => p.completed).length;
        const totalCount = progress.length;
        
        const masteryIndicators = {
            basic: this.userInteractionHistory.filter(i => 
                i.data?.originalInput?.includes('->') || 
                i.data?.originalInput?.includes('.') 
            ).length > 5,
            intermediate: this.userInteractionHistory.filter(i => 
                i.data?.originalInput?.includes('!') || 
                i.data?.originalInput?.includes('?')
            ).length > 3,
            advanced: this.userInteractionHistory.filter(i => 
                i.data?.originalInput?.includes('<->')
            ).length > 2
        };
        
        return {
            completionRate: totalCount > 0 ? completedCount / totalCount : 0,
            masteryLevel: this._determineMasteryLevel(masteryIndicators),
            strengths: this._identifyStrengths(),
            improvementAreas: Array.from(this.knowledgeGaps)
        };
    }

    _determineMasteryLevel(masteryIndicators) {
        if (masteryIndicators.advanced) return 'advanced';
        if (masteryIndicators.intermediate) return 'intermediate';
        if (masteryIndicators.basic) return 'beginner';
        return 'new';
    }

    _identifyStrengths() {
        const strengths = [];
        
        if (this.userInteractionHistory.filter(i => i.data?.originalInput?.includes('->')).length > 10) {
            strengths.push('inheritance reasoning');
        }
        
        if (this.userInteractionHistory.filter(i => i.data?.originalInput?.includes('!')).length > 5) {
            strengths.push('goal reasoning');
        }
        
        if (this.userInteractionHistory.filter(i => i.data?.originalInput?.includes('?')).length > 5) {
            strengths.push('question handling');
        }
        
        return strengths;
    }

    async suggestNextLearningStep(userId = 'default') {
        // Suggest what the user should learn next
        const progress = await this.evaluateUserProgress(userId);
        const learningPath = await this.generatePersonalizedLearningPath(userId);
        
        // Find the first unlearned concept that addresses a knowledge gap
        const nextStep = learningPath.find(item => {
            const hasLearned = Array.from(this.teachingProgress.keys()).some(key => key.includes(item.concept));
            return !hasLearned && this.knowledgeGaps.has(item.concept);
        });
        
        if (nextStep) {
            return {
                concept: nextStep.concept,
                difficulty: nextStep.difficulty,
                reason: 'Addressing identified knowledge gap',
                recommendedTutorial: await this.getInteractiveTutorial(nextStep.concept, nextStep.difficulty)
            };
        }
        
        // If no gaps, suggest the next logical concept
        const nextLogical = learningPath.find(item => {
            const hasLearned = Array.from(this.teachingProgress.keys()).some(key => key.includes(item.concept));
            return !hasLearned;
        });
        
        if (nextLogical) {
            return {
                concept: nextLogical.concept,
                difficulty: nextLogical.difficulty,
                reason: 'Continuing learning sequence',
                recommendedTutorial: await this.getInteractiveTutorial(nextLogical.concept, nextLogical.difficulty)
            };
        }
        
        return { concept: null, message: 'No specific learning step recommended at this time' };
    }
}