const fs = require('fs');
const path = require('path');

function patchFile(relativeTarget, searchString, replaceString) {
    const targetFile = path.resolve(__dirname, '..', relativeTarget);
    if (fs.existsSync(targetFile)) {
        let content = fs.readFileSync(targetFile, 'utf8');
        if (content.includes(searchString)) {
            console.log(`Patching ${relativeTarget}...`);
            const patchedContent = content.replace(searchString, replaceString);
            fs.writeFileSync(targetFile, patchedContent);
            console.log('Successfully patched.');
        } else if (content.includes(replaceString) || content.includes('gds.default || gds')) {
            console.log(`${relativeTarget} already patched or search string not found.`);
        } else {
            console.log(`Search string not found in ${relativeTarget}.`);
        }
    } else {
        console.error('Target file not found:', targetFile);
    }
}

// 1. Patch expo-router
patchFile(
    'node_modules/expo-router/build/getDevServer/index.native.js',
    "exports.getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer');",
    "const gds = require('react-native/Libraries/Core/Devtools/getDevServer');\nexports.getDevServer = gds.default || gds;"
);

// 2. Patch @expo/metro-runtime getDevServer.native.ts
// This file is used as source, so we change the import to be more robust
patchFile(
    'node_modules/@expo/metro-runtime/src/getDevServer.native.ts',
    "import getDevServer from 'react-native/Libraries/Core/Devtools/getDevServer';",
    "const gds = require('react-native/Libraries/Core/Devtools/getDevServer');\nconst getDevServer = gds.default || gds;"
);

// 3. Patch @expo/metro-runtime messageSocket.native.ts
patchFile(
    'node_modules/@expo/metro-runtime/src/messageSocket.native.ts',
    "const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer');",
    "const gds = require('react-native/Libraries/Core/Devtools/getDevServer');\n  const getDevServer = gds.default || gds;"
);
