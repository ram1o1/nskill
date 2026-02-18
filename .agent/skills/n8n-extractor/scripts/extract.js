// .agent/skills/n8n-extractor/scripts/extract.js
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// --- CONFIGURATION ---
// We use process.cwd() to ensure it runs from the workspace root
const NODES_BASE_PATH = path.resolve(process.cwd(), 'node_modules/n8n-nodes-base/dist/nodes');
const OUTPUT_DIR = path.resolve(process.cwd(), 'temp_knowledge');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function extractNodes() {
    console.log(`Scanning for nodes in: ${NODES_BASE_PATH}`);

    // 1. Find all .node.js files
    // Using glob to recursively find all node definitions
    const files = await glob('**/*.node.js', { cwd: NODES_BASE_PATH, absolute: true });
    console.log(`Found ${files.length} node definition files.`);

    let successCount = 0;
    let failCount = 0;
    const skippedFiles = [];

    // Attempt to get n8n version for metadata
    let n8nVersion = 'unknown';
    try {
        n8nVersion = require(path.resolve(process.cwd(), 'node_modules/n8n-nodes-base/package.json')).version;
    } catch (e) { }

    for (const file of files) {
        try {
            // 2. Dynamic Require
            let nodeModule;
            try {
                nodeModule = require(file);
            } catch (e) {
                skippedFiles.push({ file, reason: `Require failed: ${e.message}` });
                failCount++;
                continue;
            }

            // 3. Find the Exported Class
            // We iterate all exports to find one that looks like an n8n Node
            let NodeClass = null;
            let NodeConstructor = null;

            // Priority: Check 'default' export first, then others
            const exportsToCheck = [nodeModule.default, ...Object.values(nodeModule)].filter(Boolean);

            for (const exportedItem of exportsToCheck) {
                try {
                    // Check if it's a class/function we can instantiate
                    if (typeof exportedItem === 'function' && exportedItem.prototype) {
                        const testInstance = new exportedItem();
                        // It's a match if it has a 'description' property
                        if (testInstance.description) {
                            NodeClass = testInstance; // The instance
                            NodeConstructor = exportedItem; // The class
                            break;
                        }
                    }
                } catch (e) {
                    // Ignore instantiation errors for non-node exports
                }
            }

            if (NodeClass) {
                // 4. EXTRACT SCHEMAS (With Version Logic)
                let description = NodeClass.description;

                // --- LOGIC INSERT: Handle Versioned Nodes (e.g., Slack) ---
                if (NodeClass.nodeVersions && description.defaultVersion) {
                    const rawVersion = description.defaultVersion;

                    // Try to find the version data (Key might be integer "1" or string "1")
                    let versionData = NodeClass.nodeVersions[rawVersion]
                        || NodeClass.nodeVersions[Math.floor(rawVersion)]
                        || NodeClass.nodeVersions[String(rawVersion)];

                    if (versionData) {
                        let versionInstance;

                        // Case A: versionData is a Constructor (Class)
                        if (typeof versionData === 'function') {
                            versionInstance = new versionData(description);
                        }
                        // Case B: versionData is already an Instance (Object)
                        else {
                            // Check if it's a module with a default export
                            const potentialInstance = versionData.default || versionData;
                            if (typeof potentialInstance === 'function') {
                                versionInstance = new potentialInstance(description);
                            } else {
                                versionInstance = potentialInstance;
                            }
                        }

                        // Merge the specific version properties onto the base description
                        if (versionInstance && versionInstance.description) {
                            description = {
                                ...description,
                                ...versionInstance.description,
                                name: description.name // Preserve the original system name
                            };
                        }
                    }
                }
                // -----------------------------------------------------------

                // 5. Save Logic
                // We prioritize the file name, then displayName
                let nodeName = description.name;
                if (!nodeName) nodeName = description.displayName;

                if (nodeName && description.properties) {
                    // Clean filename
                    const safeName = nodeName.replace(/[^a-zA-Z0-9-]/g, '');
                    const outputFilename = path.join(OUTPUT_DIR, `${safeName}.json`);

                    fs.writeFileSync(outputFilename, JSON.stringify(description, null, 2));
                    successCount++;
                } else {
                    skippedFiles.push({ file, reason: 'Missing name or properties in schema' });
                    failCount++;
                }

            } else {
                skippedFiles.push({ file, reason: 'No valid Node Class found in exports' });
                failCount++;
            }

        } catch (error) {
            skippedFiles.push({ file, reason: `Processing Error: ${error.message}` });
            failCount++;
        }
    }

    // 6. Final Summary
    fs.writeFileSync(path.join(OUTPUT_DIR, 'version.json'), JSON.stringify({ version: n8nVersion, generatedAt: new Date().toISOString() }, null, 2));

    console.log("\n--- Extraction Summary ---");
    console.log(`Total files scanned: ${files.length}`);
    console.log(`Successfully extracted: ${successCount}`);
    console.log(`Failed/Skipped: ${failCount}`);

    if (failCount > 0) {
        console.log("\nTop 5 Skipped Files (sample):");
        skippedFiles.slice(0, 5).forEach(item => {
            console.log(`- ${path.basename(item.file)}: ${item.reason}`);
        });
        if (skippedFiles.length > 5) console.log(`... and ${skippedFiles.length - 5} more.`);
    }
    console.log("--------------------------");
}

extractNodes();