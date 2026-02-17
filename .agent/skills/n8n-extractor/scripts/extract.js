// .agent/skills/n8n-extractor/scripts/extract.js
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function extract() {
    const outputDir = path.resolve(process.cwd(), 'temp_knowledge');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log('Searching for node definitions in n8n-nodes-base...');
    const nodesPath = path.resolve(process.cwd(), 'node_modules/n8n-nodes-base/dist/nodes/**/*.node.js');
    const nodeFiles = await glob(nodesPath);

    console.log(`Found ${nodeFiles.length} node files. Extracting schemas...`);

    let count = 0;
    const version = require(path.resolve(process.cwd(), 'node_modules/n8n-nodes-base/package.json')).version;

    for (const file of nodeFiles) {
        try {
            const NodeClass = require(file);
            const NodeConstructor = NodeClass.default || Object.values(NodeClass)[0];

            if (NodeConstructor && NodeConstructor.prototype) {
                const instance = new NodeConstructor();

                // 1. Get the Base Description
                let description = instance.description;

                // SKIP if no description found
                if (!description) continue;

                // 2. HANDLE VERSIONED NODES (The Fix)
                // If this is a "Shell" node (has versions but no properties), we must resolve the default version.
                if (instance.nodeVersions && description.defaultVersion) {
                    const versionKey = description.defaultVersion;
                    const versionData = instance.nodeVersions[versionKey];

                    if (versionData) {
                        // Instantiate the specific version to get its properties
                        const VersionConstructor = versionData.default || versionData;
                        const versionInstance = new VersionConstructor();

                        // Merge the version's description onto the base description
                        // This fills in 'properties', 'displayName', etc.
                        description = {
                            ...description,
                            ...versionInstance.description,
                            // Ensure the name remains the stable identifier (e.g. "slack")
                            name: description.name
                        };
                    }
                }

                // 3. Save only if we have properties (avoid saving empty shells)
                if (description.properties) {
                    const filename = `${description.name}.json`;
                    fs.writeFileSync(
                        path.join(outputDir, filename),
                        JSON.stringify(description, null, 2)
                    );
                    count++;
                }
            }
        } catch (e) {
            // Ignore errors (some internal utility files might fail to load)
        }
    }

    fs.writeFileSync(path.join(outputDir, 'version.json'), JSON.stringify({ version, generatedAt: new Date().toISOString() }, null, 2));
    console.log(`Successfully extracted ${count} node schemas to ./temp_knowledge`);
}

extract();