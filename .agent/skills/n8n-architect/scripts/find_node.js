// .agent/skills/n8n-architect/scripts/find_node.js
const fs = require('fs');
const path = require('path');

// Path to the knowledge base we built in the previous skill
const KNOWLEDGE_PATH = path.resolve(process.cwd(), '.agent/knowledge/n8n');

const query = process.argv[2] ? process.argv[2].toLowerCase() : '';

if (!query) {
    console.error("Please provide a search term.");
    process.exit(1);
}

try {
    const files = fs.readdirSync(KNOWLEDGE_PATH);
    // Simple inclusion match
    const matches = files
        .filter(f => f.toLowerCase().includes(query) && f.endsWith('.json'))
        .map(f => ({
            filename: f,
            // Extract the 'name' from the filename (e.g. "GoogleSheets.json" -> "GoogleSheets")
            nodeType: f.replace('.json', '') 
        }));

    console.log(JSON.stringify(matches, null, 2));
} catch (e) {
    console.error("Knowledge base not found. Run n8n-extractor first.");
}