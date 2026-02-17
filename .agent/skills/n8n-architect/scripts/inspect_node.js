// .agent/skills/n8n-architect/scripts/inspect_node.js
const fs = require('fs');
const path = require('path');

const KNOWLEDGE_PATH = path.resolve(process.cwd(), '.agent/knowledge/n8n');
const nodeFileName = process.argv[2];

if (!nodeFileName) {
    console.error("Please provide a node filename.");
    process.exit(1);
}

try {
    // 1. Load the Schema
    // Handles cases where user inputs "n8n-nodes-base.slack" or just "slack"
    let fullPath = path.join(KNOWLEDGE_PATH, nodeFileName);
    if (!fullPath.endsWith('.json')) fullPath += '.json';

    // Fallback search if exact match fails
    if (!fs.existsSync(fullPath)) {
        const allFiles = fs.readdirSync(KNOWLEDGE_PATH);
        const match = allFiles.find(f => f.toLowerCase().includes(nodeFileName.toLowerCase()));
        if (match) fullPath = path.join(KNOWLEDGE_PATH, match);
    }

    const schema = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    // 2. Extract Properties with Dropdown Options
    const properties = (schema.properties || []).map(p => {
        if (p.type === 'hidden') return null;

        // CRITICAL: Extract dropdown options if they exist
        let options = undefined;
        if (p.options) {
            // Simplify options to just { name, value } to save tokens
            options = p.options.map(opt => ({
                name: opt.name,
                value: opt.value,
                description: opt.description
            }));
        }

        return {
            name: p.name,
            displayName: p.displayName,
            type: p.type,
            required: p.required || false,
            default: p.default,
            // Show the agent the valid dropdown values
            options: options,
            // Show the agent when this field is visible
            displayOptions: p.displayOptions
        };
    }).filter(p => p !== null);

    // 3. Output summary for the Agent
    console.log(JSON.stringify({
        node: schema.displayName,
        description: schema.description,
        credentials: (schema.credentials || []).map(c => c.name),
        // The agent can now see the dropdowns in this array
        parameters: properties
    }, null, 2));

} catch (e) {
    console.error(`Error inspecting node: ${e.message}`);
    process.exit(1);
}