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

                // 1. Get Base Description
                let description = instance.description;
                if (!description) continue;

                // 2. HANDLE VERSIONED NODES (FIXED)
                if (instance.nodeVersions && description.defaultVersion) {
                    const rawVersion = description.defaultVersion;

                    // FIX: Try exact match first, then try the integer (Major) version
                    // e.g. If defaultVersion is 2.4, look for key "2.4", then key "2"
                    let versionData = instance.nodeVersions[rawVersion];
                    if (!versionData) {
                        versionData = instance.nodeVersions[Math.floor(rawVersion)];
                    }

                    if (versionData) {
                        const VersionConstructor = versionData.default || versionData;
                        const versionInstance = new VersionConstructor();

                        // Merge properties
                        description = {
                            ...description,
                            ...versionInstance.description,
                            name: description.name // Keep the original shell name
                        };
                    }
                }

                // 3. Save
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
            // console.error(`Failed ${file}: ${e.message}`);
        }
    }

    fs.writeFileSync(path.join(outputDir, 'version.json'), JSON.stringify({ version, generatedAt: new Date().toISOString() }, null, 2));
    console.log(`Successfully extracted ${count} node schemas to ./temp_knowledge`);
}

extract();