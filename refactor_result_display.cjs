const fs = require('fs');
const path = require('path');

const filePath = 'src/tool/software/analyzers/ResultDisplay.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add import
const importStatement = "import { formatNumber, formatPercentage, formatFileSize, truncateText } from '../../../util/Format.js';";
content = content.replace(
    "import {DisplayUtils} from '../../../util/DisplayUtils.js';",
    "import {DisplayUtils} from '../../../util/DisplayUtils.js';\n" + importStatement
);

// Replace usages
content = content.split('DisplayUtils.formatNumber').join('formatNumber');
content = content.split('DisplayUtils.formatPercentage').join('formatPercentage');
content = content.split('DisplayUtils.formatFileSize').join('formatFileSize');
content = content.split('DisplayUtils.truncateText').join('truncateText');

// Write back
fs.writeFileSync(filePath, content);
console.log('Refactored ResultDisplay.js');
