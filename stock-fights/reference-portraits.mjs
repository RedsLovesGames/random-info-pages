// Authentic character-image links associated with the Spenn character reference.
// The original images were listed on the community wiki mirror at
// https://www.namu.moe/w/Spenn/%EB%93%B1%EC%9E%A5%EC%9D%B8%EB%AC%BC
// These are external source references, not hosted or redistributed image binaries.
// At research time the remote host returned 503 to automated requests. Treat these as
// BEST-EFFORT links, never as guaranteed-to-load assets, and prefer locally supplied
// images on failure. Missing fighters have no verified portrait link yet.
const originalImageIds = {
  "cactus": "7895cc19e2eff767fbefb5f4dd26757808d2f7680aaa498166896236d4d8c83c",
  "angry": "9827ec33ecae7d58915ed85364dc73c9665bd1aaaee88f2bd231ab52c14145cf",
  "tired": "120d1f9d67a56d7eacda37e8c8c920ba6ff06009a7eb3698afc308b2580698cc",
  "cool": "850d94df1f25a21b8aacb94f17879214a542c01dc39da335d4945f67292c0c2d",
  "business": "b1a37762e93449d1d3090b64eb689a4086a3d9c2e1309d26bd1b7bbadb5c7ad8",
  "chef": "f4250f36199008856cf2b88d8e0b21645f1b1e505cc6d32c14c7992b3fd1290f",
  "woman": "edb513c84fa3b34fec118d6ec72d447cfcf81d192bddcc9343b2de5ebe251151",
  "dealer": "65e7c93f98cf2185b6a0b56b7c9de45b8209148be362d88310233f1b701bef76",
  "drunk": "6c39a84422521f97d01441ee7f51b0fe81471458a5e5d0bca27b01f587c457ca",
  "tennis": "348a7986e618af0c1ec95b0a3bda5caaca1acccab5179139c44b0fd13ee3c291",
  "boxing": "0e9ec5560ad868c1db4927ac63d97c4997a078b65de2ec923cf6c4930230a3a5",
  "magician": "44e1127c96274ca9f8aca051bc92747ca1a114f8db6852adaef057bb4b4e2c20",
  "gravity": "3de56af241119cdd1d80f1d88c9f735f876f3bc0a251d435c62db9b93b9ea550",
  "pong": "d6a3b2f7bdde647a5f74f99290a7937874dba06969133962a8685612654e5143",
  "watermark": "5b48871e00f012f7f47069053b41d48e8c82459c5b0fc3137b0d4e0cfd5b1e03",
  "time": "9c741948b795544c4b5d2fb88e854bc34ead14a0914321d85e4e12ce01358d3c",
  "cowboy": "4e8e6bd83dda7135dd44f83f6261929a27883f60de6bbcb2e00461a84a771e76",
  "sentient": "65cb7610647d3a5d0a10ef1bd1df82a1927059ec156920b46522767ec9c3fdf1",
  "traffic": "b4923acdd8d6cc121cfdec4c0a084d1706adeef3c16f55ad46d94006fbadb0fa",
  "ghost": "7a818279b1d168c2129da3a0bd16c7805a1c9fdf18058774c667a20d68a9127f",
  "exploding": "ff151344e2d1d12c3ce44466fd20c1b38ab9d48ee4f7ad884919bb8aac36afece0bb549d2b2d73d826e04cf81432c9b1",
  "priest": "c6843abc55788c5525e7ffef921b63b25bb97f446d2a106c5745ceebf2df7a9f",
  "blind": "ff0c048f58806d8c59d38f6c4e0856f9e74b894ea43302f44fa2af7a0e7d0c34",
  "necromancer": "bb9301ee180c2b5c2d5629aba43e5cf025a0776255d6f45d296e955890ace8e06802c740c38fe85c0640fcb4840cf23b",
  "blacksmith": "d9e972e86c36dc1398646d9a506e0308d4c415c7b4ccb86a9844b1f04b97b4711d124a6e16d136781b1e0c0a393650d6",
  "detective": "4072f1111f9079cab78407879ea15d2a0c3012c7c8a707d641fb952b85519db9",
  "knight": "fd39582e07731a1d5695f36924d22b23a0a994afcd4cdda268724ec897d1017c",
  "fireworks": "f3cda4c26f5218c48e696da954f396669d290a1cefdef6c7fcaecef249d73fc2",
  "weather": "b614cbbd4471e47b250f0e9b77e5afbd05e23a93bf6a5c89e79462329868efa2"
};
export const referencePortraits = Object.freeze(Object.fromEntries(
  Object.entries(originalImageIds).map(([id,hash])=>[id,'https://file.namu.moe/file/'+hash])
));
export const referencePage = 'https://www.namu.moe/w/Spenn/%EB%93%B1%EC%9E%A5%EC%9D%B8%EB%AC%BC';
