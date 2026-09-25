const ACCESS_USER = 'tommy';
const ACCESS_HASH = '38083c7ee9121e17401883566a148aa5c2e2d55dc53bc4a94a026517dbff3c6b';
export const ACCESS_STORAGE_KEY = 'rip.time.access.v1';

function hex(buffer){
  return [...new Uint8Array(buffer)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function hashAccessValue(value){
  const bytes=new TextEncoder().encode(String(value));
  return hex(await crypto.subtle.digest('SHA-256',bytes));
}

export async function validateTimeAccess(username,password){
  if(String(username).trim().toLowerCase()!==ACCESS_USER)return false;
  return (await hashAccessValue(password))===ACCESS_HASH;
}

export function hasTimeAccess(storage=globalThis.localStorage){
  try{return storage?.getItem(ACCESS_STORAGE_KEY)==='granted';}catch{return false;}
}

export function rememberTimeAccess(storage=globalThis.localStorage){
  try{storage?.setItem(ACCESS_STORAGE_KEY,'granted');return true;}catch{return false;}
}

export function clearTimeAccess(storage=globalThis.localStorage){
  try{storage?.removeItem(ACCESS_STORAGE_KEY);return true;}catch{return false;}
}
