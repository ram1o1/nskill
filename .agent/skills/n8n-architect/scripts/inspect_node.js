// .agent/skills/n8n-architect/scripts/inspect_node.js
const fs = require('fs');
const path = require('path');

const KNOWLEDGE_PATH = path.resolve(process.cwd(), '.agent/knowledge/n8n');
const nodeFileName = process.argv[2]; // e.g., "n8n-nodes-base.googleSheets.json"

if (!nodeFileName) {
    console.error("Please provide a node filename (e.g., 'googleSheets.json')");
    process.exit(1);
}

try {
    // 1. Load the Schema
    const fullPath = path.join(KNOWLEDGE_PATH, nodeFileName.endsWith('.json') ? nodeFileName : `${nodeFileName}.json`);
    const schema = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    // 2. Extract Credentials (User must fill these in UI)
    const credentials = schema.credentials || [];

    // 3. Extract Properties (User might need to provide these)
    // We filter heavily to save tokens, keeping only what helps the agent ask questions.
    const properties = (schema.properties || []).map(p => {
        // Skip hidden or internal fields
        if (p.type === 'hidden') return null;

        return {
            name: p.name,
            displayName: p.displayName,
            type: p.type,
            description: p.description,
            required: p.required || false,
            default: p.default,
            // displayOptions help the agent know when a field is relevant
            // e.g. "Only show 'Sheet ID' if 'Operation' is 'Read'"
            displayOptions: p.displayOptions
        };
    }).filter(p => p !== null);

    // 4. Output the summary for the Agent
    console.log(JSON.stringify({
        nodeName: schema.displayName,
        description: schema.description,
        credentials: credentials.map(c => c.name), // Just names, e.g., "googleSheetsOAuth2"
        inputs: properties
    }, null, 2));

} catch (e) {
    console.error(`Error inspecting node: ${e.message}`);
    process.exit(1);
}