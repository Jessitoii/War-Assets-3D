
const fs = require('fs');

try {
    const jsonPath = 'd:/Software/Expo/War-Assets-3D-main/mobile/assets/data/military-assets.json';
    console.log(`Reading from: ${jsonPath}`);
    const content = fs.readFileSync(jsonPath, 'utf8');
    console.log(`File read successfully, content length: ${content.length}`);
    const assets = JSON.parse(content);
    console.log(`JSON parsed, total assets: ${assets.length}`);

    const missingCatId = assets.filter(a => !a.catId);
    console.log(`Assets missing catId: ${missingCatId.length}`);

    if (missingCatId.length > 0) {
        console.log('Sample missing catId assets:');
        missingCatId.slice(0, 10).forEach(a => {
            console.log(`- ${a.name} (ID: ${a.id}, Threat: ${a.threatType}, Role: ${a.role || (a.specs && a.specs?.role)})`);
        });
    }
} catch (error) {
    console.error('Error:', error.message);
}
