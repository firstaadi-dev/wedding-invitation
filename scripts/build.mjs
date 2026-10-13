import {readFile,readdir,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
for (const directory of ['public','server','scripts','tests']) {
  for (const file of await readdir(directory)) {
    if (!/\.(m?js)$/.test(file)) continue;
    const result = spawnSync(process.execPath,['--check',`${directory}/${file}`],{stdio:'inherit'});
    assert.equal(result.status,0,`Syntax error: ${directory}/${file}`);
  }
}
const result = spawnSync('node_modules/.bin/tsc',['--noEmit'],{stdio:'inherit'});
assert.equal(result.status,0,'neon.ts config must compile');
const css = await readFile('public/styles.css','utf8');
for (const match of css.matchAll(/url\(['"]?(\/assets\/[^'"\)]+)['"]?\)/g)) await access(`public${match[1]}`);
console.log('Build passed: browser/server syntax, Neon config types, and referenced visual assets.');
