import {Capability, CapabilityManager, CapabilityTypes} from '../../../src/util/CapabilityManager.js';

describe('CapabilityManager', () => {
    describe('Capability class', () => {
        test('constructs with correct properties', () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ, {
                description: 'Test capability',
                scope: 'restricted',
                permissions: ['read-files'],
                requiresApproval: true
            });

            expect(capability.type).toBe(CapabilityTypes.FILE_SYSTEM_READ);
            expect(capability.description).toBe('Test capability');
            expect(capability.scope).toBe('restricted');
            expect(capability.permissions).toEqual(['read-files']);
            expect(capability.requiresApproval).toBe(true);
            expect(capability.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date format
        });

        test('validate method works for valid capability', () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ, {
                description: 'Valid capability',
                scope: 'default',
                permissions: ['read']
            });

            const result = capability.validate();
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('validate method fails for system configuration capability without approval', () => {
            const capability = new Capability(CapabilityTypes.SYSTEM_CONFIGURATION, {
                description: 'System config capability'
            });

            const result = capability.validate();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(`Capability ${CapabilityTypes.SYSTEM_CONFIGURATION} requires explicit approval`);
        });

        test('validate method fails for invalid resource limit', () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ, {
                resourceLimit: -1
            });

            const result = capability.validate();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid resource limit: -1');
        });
    });

    describe('CapabilityManager', () => {
        let manager;

        beforeEach(() => {
            manager = new CapabilityManager();
        });

        test('initializes with empty collections', () => {
            expect(manager.capabilities).toBeInstanceOf(Map);
            expect(manager.grants).toBeInstanceOf(Map);
            expect(manager.policyRules).toBeInstanceOf(Map);
            expect(manager.auditLog).toBeInstanceOf(Array);
        });

        test('registerCapability adds capability successfully', async () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ);

            const result = await manager.registerCapability('test-cap', capability);
            expect(result).toBe(true);
            expect(manager.capabilities.has('test-cap')).toBe(true);
            expect(manager.capabilities.get('test-cap')).toBe(capability);
        });

        test('registerCapability fails for duplicate ID', async () => {
            const capability1 = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            const capability2 = new Capability(CapabilityTypes.NETWORK_ACCESS);

            await manager.registerCapability('test-cap', capability1);

            await expect(manager.registerCapability('test-cap', capability2))
                .rejects
                .toThrow('Capability with ID "test-cap" already exists');
        });

        test('registerCapability fails for invalid capability', async () => {
            const invalidCapability = new Capability(CapabilityTypes.SYSTEM_CONFIGURATION); // Needs approval

            await expect(manager.registerCapability('test-cap', invalidCapability))
                .rejects
                .toThrow('Capability validation failed:');
        });

        test('grantCapabilities works for valid requests', async () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            await manager.registerCapability('read-cap', capability);

            const result = await manager.grantCapabilities('test-tool', ['read-cap'], {approved: true});

            expect(result.success).toBe(true);
            expect(result.granted).toEqual(['read-cap']);
            expect(result.totalGranted).toBe(1);
            expect(await manager.hasCapability('test-tool', 'read-cap')).toBe(true);
        });

        test('grantCapabilities fails for unregistered capability', async () => {
            await expect(manager.grantCapabilities('test-tool', ['non-existent'], {approved: true}))
                .rejects
                .toThrow('Capability ID "non-existent" does not exist');
        });

        test('grantCapabilities fails for capability requiring approval without approval', async () => {
            const capability = new Capability(CapabilityTypes.COMMAND_EXECUTION, {requiresApproval: true});
            await manager.registerCapability('cmd-cap', capability);

            await expect(manager.grantCapabilities('test-tool', ['cmd-cap']))
                .rejects
                .toThrow('Capability "cmd-cap" requires explicit approval');
        });

        test('revokeCapabilities removes granted capability', async () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            await manager.registerCapability('read-cap', capability);
            await manager.grantCapabilities('test-tool', ['read-cap'], {approved: true});

            const result = await manager.revokeCapabilities('test-tool', ['read-cap']);

            expect(result.revoked).toEqual(['read-cap']);
            expect(result.totalRevoked).toBe(1);
            expect(await manager.hasCapability('test-tool', 'read-cap')).toBe(false);
        });

        test('hasAllCapabilities checks all required capabilities', async () => {
            const cap1 = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            const cap2 = new Capability(CapabilityTypes.NETWORK_ACCESS);
            await manager.registerCapability('cap1', cap1);
            await manager.registerCapability('cap2', cap2);

            await manager.grantCapabilities('test-tool', ['cap1', 'cap2'], {approved: true});

            const hasAll = await manager.hasAllCapabilities('test-tool', ['cap1', 'cap2']);
            expect(hasAll).toBe(true);

            const hasMissing = await manager.hasAllCapabilities('test-tool', ['cap1', 'cap2', 'non-existent']);
            expect(hasMissing).toBe(false);
        });

        test('getToolCapabilities returns granted capabilities', async () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ, {
                description: 'Test read capability',
                scope: 'local',
                permissions: ['read-files']
            });
            await manager.registerCapability('read-cap', capability);
            await manager.grantCapabilities('test-tool', ['read-cap'], {approved: true});

            const toolCapabilities = await manager.getToolCapabilities('test-tool');

            expect(toolCapabilities).toHaveLength(1);
            expect(toolCapabilities[0].id).toBe('read-cap');
            expect(toolCapabilities[0].description).toBe('Test read capability');
            expect(toolCapabilities[0].permissions).toEqual(['read-files']);
        });

        test('getToolsWithCapability returns tools with specific capability', async () => {
            const capability = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            await manager.registerCapability('read-cap', capability);
            await manager.grantCapabilities('tool1', ['read-cap'], {approved: true});
            await manager.grantCapabilities('tool2', ['read-cap'], {approved: true});

            const tools = await manager.getToolsWithCapability('read-cap');

            expect(tools).toEqual(['tool1', 'tool2']);
        });

        test('getUsageStats returns correct statistics', async () => {
            const cap1 = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            const cap2 = new Capability(CapabilityTypes.NETWORK_ACCESS);
            await manager.registerCapability('cap1', cap1);
            await manager.registerCapability('cap2', cap2);
            await manager.grantCapabilities('tool1', ['cap1'], {approved: true});
            await manager.grantCapabilities('tool2', ['cap1', 'cap2'], {approved: true});

            const stats = manager.getUsageStats();

            expect(stats.totalCapabilities).toBe(2);
            expect(stats.totalGrants).toBe(3); // 1 for tool1, 2 for tool2
            expect(stats.toolsWithGrants).toBe(2);
            expect(stats.auditLogSize).toBeGreaterThan(0);
            expect(stats.capabilityUsage).toBeInstanceOf(Map);
            expect(stats.capabilityUsage.get('cap1')).toBe(2); // Used by both tools
            expect(stats.capabilityUsage.get('cap2')).toBe(1); // Used by one tool
        });

        test('addPolicyRule adds and enforces rules', async () => {
            const cap1 = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            await manager.registerCapability('cap1', cap1);

            // Add a policy rule that denies file system read capability for test tools
            const rule = {
                type: 'deny',
                tools: ['test-tool'],
                capabilities: ['cap1'],
                reason: 'Policy restriction'
            };

            await manager.addPolicyRule('test-rule', rule);

            // Should fail due to policy rule
            await expect(manager.grantCapabilities('test-tool', ['cap1'], {approved: true}))
                .rejects
                .toThrow('Policy violation: Policy restriction');
        });

        test('createSecurityManifest validates and creates manifest', async () => {
            const cap1 = new Capability(CapabilityTypes.FILE_SYSTEM_READ);
            await manager.registerCapability('cap1', cap1);

            const manifest = {
                id: 'test-manifest',
                name: 'Test Manifest',
                requiredCapabilities: ['cap1'],
                optionalCapabilities: [],
                metadata: {version: '1.0'}
            };

            const validated = manager.createSecurityManifest(manifest);

            expect(validated.id).toBe('test-manifest');
            expect(validated.name).toBe('Test Manifest');
            expect(validated.requiredCapabilities).toEqual(['cap1']);
            expect(validated.optionalCapabilities).toEqual([]);
            expect(validated.metadata.version).toBe('1.0');
            expect(validated.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        test('createSecurityManifest fails for unknown capability', async () => {
            const manifest = {
                id: 'test-manifest',
                name: 'Test Manifest',
                requiredCapabilities: ['unknown-cap'],
                optionalCapabilities: []
            };

            expect(() => manager.createSecurityManifest(manifest))
                .toThrow('Unknown capability in manifest: unknown-cap');
        });
    });

    describe('createDefaultManager', () => {
        test('creates manager with default capabilities', async () => {
            const defaultManager = await CapabilityManager.createDefaultManager();

            expect(defaultManager.capabilities.size).toBeGreaterThan(0);
            expect(defaultManager.capabilities.has('file-system-read')).toBe(true);
            expect(defaultManager.capabilities.has('network-access')).toBe(true);
            expect(defaultManager.capabilities.has('external-api-access')).toBe(true);

            const fsReadCap = defaultManager.capabilities.get('file-system-read');
            expect(fsReadCap.type).toBe(CapabilityTypes.FILE_SYSTEM_READ);
            expect(fsReadCap.scope).toBe('local');

            const extApiCap = defaultManager.capabilities.get('external-api-access');
            expect(extApiCap.requiresApproval).toBe(true);
        });
    });
});