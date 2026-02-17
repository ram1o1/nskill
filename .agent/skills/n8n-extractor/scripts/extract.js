// .agent/skills/n8n-extractor/scripts/extract.js
const fs = require('fs');
const path = require('path');
const { glob } = require('glob'); // Expects 'glob' to be installed in temp env

async function extract() {
    const outputDir = path.resolve(process.cwd(), 'temp_knowledge');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log('Searching for node definitions in n8n-nodes-base...');

    // Path to nodes in the installed package
    const nodesPath = path.resolve(process.cwd(), 'node_modules/n8n-nodes-base/dist/nodes/**/*.node.js');
    const nodeFiles = await glob(nodesPath);

    console.log(`Found ${nodeFiles.length} node files. Extracting schemas...`);

    let count = 0;
    const version = require(path.resolve(process.cwd(), 'node_modules/n8n-nodes-base/package.json')).version;

    for (const file of nodeFiles) {
        try {
            const NodeClass = require(file);
            // Handle both default and named exports
            const NodeConstructor = NodeClass.default || Object.values(NodeClass)[0];

            if (NodeConstructor && NodeConstructor.prototype) {
                const instance = new NodeConstructor();
                if (instance.description) {
                    const filename = `${instance.description.name}.json`;
                    fs.writeFileSync(
                        path.join(outputDir, filename),
                        JSON.stringify(instance.description, null, 2)
                    );
                    count++;
                }
            }
        } catch (e) {
            console.error(`Failed to load ${file}: ${e.message}`);
        }
    }

    // Save version metadata
    fs.writeFileSync(path.join(outputDir, 'version.json'), JSON.stringify({ version, generatedAt: new Date().toISOString() }, null, 2));

    console.log(`Successfully extracted ${count} node schemas to ./temp_knowledge`);
}

extract();