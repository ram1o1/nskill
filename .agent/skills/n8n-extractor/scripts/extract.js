// .agent/skills/n8n-architect/scripts/find_node.js
const fs = require('fs');
const path = require('path');

const KNOWLEDGE_PATH = path.resolve(process.cwd(), '.agent/knowledge/n8n');

// 1. Get arguments
const rawQuery = process.argv[2] || '';

if (!rawQuery) {
    console.error("Please provide a search term.");
    process.exit(1);
}

// 2. Tokenize input: Split "Google Sheets" into ["google", "sheets"]
// This allows finding "Sheets Google" or just "Sheets"
const queryTokens = rawQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);

try {
    const files = fs.readdirSync(KNOWLEDGE_PATH);

    const results = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const fullPath = path.join(KNOWLEDGE_PATH, f);
            let data = {};

            // READ CONTENT: This makes it smart. We look inside the node definition.
            try {
                data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            } catch (err) {
                return null; // Skip broken files
            }

            // Extract searchable fields
            // Fallback to filename if JSON properties are missing
            const filename = f.replace('.json', '');
            const displayName = (data.displayName || '').toLowerCase();
            const nodeName = (data.name || filename).toLowerCase();
            const description = (data.description || '').toLowerCase();

            // SCORING LOGIC
            let score = 0;

            // Check every token in the query against our fields
            queryTokens.forEach(token => {
                // Priority 1: Exact match on Display Name (e.g. "Stripe")
                if (displayName === token) score += 50;

                // Priority 2: Starts with token (e.g. "Stri" -> "Stripe")
                else if (displayName.startsWith(token)) score += 30;
                else if (nodeName.startsWith(token)) score += 25;

                // Priority 3: Contains token (e.g. "sheet" -> "Google Sheets")
                else if (displayName.includes(token)) score += 15;
                else if (nodeName.includes(token)) score += 10;

                // Priority 4: Description match (lowest priority, helps with context)
                else if (description.includes(token)) score += 5;
            });

            // Bonus: If all tokens matched somewhere, boost score
            // This prevents "Google Drive" from outranking "Google Sheets" when searching "Sheets"
            const matchesAllTokens = queryTokens.every(token =>
                displayName.includes(token) || nodeName.includes(token) || description.includes(token)
            );

            if (!matchesAllTokens) {
                // Penalize heavily if not all words are present
                // e.g. "Google Sheets" query shouldn't match "Google Drive" just because "Google" matches
                score = score * 0.1;
            }

            return {
                filename: f,
                nodeType: filename,
                displayName: data.displayName || filename,
                description: data.description || '',
                score: score
            };
        })
        .filter(item => item && item.score > 1) // Filter out zero/low scores
        .sort((a, b) => b.score - a.score); // Sort by highest score first

    // 3. Return Top 5
    // removing score from output to keep it clean for the agent
    const cleanOutput = results.slice(0, 5).map(({ filename, nodeType, displayName, description }) => ({
        filename,
        nodeType,
        displayName,
        description: description.substring(0, 100) + "..." // Truncate description for cleaner logs
    }));

    if (cleanOutput.length === 0) {
        console.log("[]"); // Return empty JSON array if nothing found
    } else {
        console.log(JSON.stringify(cleanOutput, null, 2));
    }

} catch (e) {
    console.error(`Error searching knowledge base: ${e.message}`);
    process.exit(1);
}