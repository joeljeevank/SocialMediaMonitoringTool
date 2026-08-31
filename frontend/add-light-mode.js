const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

walk('./src/app', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/(?<!dark:)bg-\[\#090014\]\/60/g, 'bg-white/80 dark:bg-[#090014]/60');
    content = content.replace(/(?<!dark:)bg-\[\#090014\]\/40/g, 'bg-white/80 dark:bg-[#090014]/40');
    content = content.replace(/(?<!dark:)bg-\[\#090014\](?![\/\w])/g, 'bg-slate-50 dark:bg-[#090014]');
    content = content.replace(/(?<!dark:)bg-white\/5/g, 'bg-slate-100 dark:bg-white/5');
    content = content.replace(/(?<!dark:)hover:bg-white\/5/g, 'hover:bg-slate-200 dark:hover:bg-white/5');
    content = content.replace(/(?<!dark:)hover:bg-white\/10/g, 'hover:bg-slate-200 dark:hover:bg-white/10');
    
    content = content.replace(/(?<!dark:)text-white(?![\w])/g, 'text-slate-900 dark:text-white');
    content = content.replace(/(?<!dark:)text-gray-400/g, 'text-slate-500 dark:text-gray-400');
    content = content.replace(/(?<!dark:)text-gray-300/g, 'text-slate-600 dark:text-gray-300');
    content = content.replace(/(?<!dark:)hover:text-white/g, 'hover:text-slate-900 dark:hover:text-white');
    content = content.replace(/(?<!dark:)text-purple-300/g, 'text-purple-700 dark:text-purple-300');
    content = content.replace(/(?<!dark:)text-purple-400/g, 'text-purple-600 dark:text-purple-400');
    content = content.replace(/(?<!dark:)hover:text-purple-300/g, 'hover:text-purple-700 dark:hover:text-purple-300');
    
    content = content.replace(/(?<!dark:)border-purple-500\/50/g, 'border-purple-200 dark:border-purple-500/50');
    content = content.replace(/(?<!dark:)border-purple-500\/30/g, 'border-purple-200 dark:border-purple-500/30');
    content = content.replace(/(?<!dark:)border-white\/10/g, 'border-slate-200 dark:border-white/10');
    
    content = content.replace(/(?<!dark:)from-purple-500\/20/g, 'from-purple-100 dark:from-purple-500/20');
    content = content.replace(/(?<!dark:)to-pink-500\/10/g, 'to-pink-100 dark:to-pink-500/10');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
