const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Custom replaces
  content = content.replace(/Business/g, 'Property');
  content = content.replace(/businessRepository/g, 'propertyRepository');
  content = content.replace(/businessId/g, 'propertyId');
  content = content.replace(/business/g, 'property');
  content = content.replace(/BUSINESS/g, 'HOST');
  content = content.replace(/CLIENT/g, 'GUEST');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

traverse('src');
