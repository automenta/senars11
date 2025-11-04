/**
 * DemoValidator - handles the validation logic for demos
 */
export class DemoValidator {
    static validateDemoControl(data) {
        if (!data || !data.payload) {
            console.error('Invalid demo control message: missing payload');
            return false;
        }

        const {command, demoId, parameters} = data.payload;

        // Validate required fields
        if (!command || typeof command !== 'string') {
            console.error('Invalid demo control message: missing or invalid command');
            return false;
        }

        if (!demoId || typeof demoId !== 'string') {
            console.error('Invalid demo control message: missing or invalid demoId');
            return false;
        }

        // Validate parameters if present
        if (parameters && typeof parameters !== 'object') {
            console.error('Invalid demo control message: parameters must be an object');
            return false;
        }

        return true;
    }

    static validateDemoExists(demos, demoId) {
        return demos.has(demoId);
    }
}