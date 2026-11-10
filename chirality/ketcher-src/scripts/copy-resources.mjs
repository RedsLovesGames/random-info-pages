import {cpSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const src=join(process.cwd(),'node_modules/ketcher-react/dist');
if(!existsSync(src))throw new Error('Ketcher resources not found at '+src);
const dest=join(process.cwd(),'dist/ketcher-static');
mkdirSync(dest,{recursive:true});
cpSync(src,dest,{recursive:true,force:true});
console.log('Staged Ketcher icons and templates at '+dest);
