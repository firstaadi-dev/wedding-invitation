const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pairs=[
 ['Teks / surface','#202B3D','#FFFFFF',4.5],['Muted / surface','#596477','#FFFFFF',4.5],['Muted / background','#596477','#F8F7F3',4.5],['Sidebar label / sidebar','#3D4E74','#E9EDF7',4.5],['Sidebar helper / sidebar','#4A5878','#E9EDF7',4.5],['Putih / primary','#FFFFFF','#2949A0',4.5],['Putih / hover','#FFFFFF','#203B82',4.5],['Putih / pressed','#FFFFFF','#172E6C',4.5],['Primary / soft','#2949A0','#EDF1FC',4.5],['Success / soft','#256044','#EAF4ED',4.5],['Warning / soft','#80551D','#FBF0DE',4.5],['Danger / soft','#A12B3A','#FCEDEF',4.5],['Putih / danger','#FFFFFF','#A12B3A',4.5],['Input border / putih','#7C879A','#FFFFFF',3],['Focus / background','#2949A0','#F8F7F3',3],['Focus / sidebar','#2949A0','#E9EDF7',3],['Disabled text / disabled','#596477','#EDF0F4',4.5],['Selection text / selection','#172E6C','#D9E3FF',4.5]
];
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
const results=pairs.map(([name,fg,bg,target])=>{const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(ratio>=target,`${name}: ${ratio}<${target}`);return `| ${name} | ${fg} / ${bg} | ${ratio.toFixed(2)}:1 | ≥${target}:1 |`;});
const table='| Pasangan | Warna | Rasio | Target |\n| --- | --- | --- | --- |\n'+results.join('\n');
if(process.argv.includes('--write')){const file=path.join(__dirname,'../../docs/weddinvita-cms-design-tokens.md');const s=fs.readFileSync(file,'utf8');fs.writeFileSync(file,s.replace(/<!-- contrast-results:start -->[\s\S]*?<!-- contrast-results:end -->/,'<!-- contrast-results:start -->\n'+table+'\n<!-- contrast-results:end -->'));}
console.log(table);
