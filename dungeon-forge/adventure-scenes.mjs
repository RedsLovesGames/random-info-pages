export const scenarios = {
  ancient: [
    ['The Bell Below', 'The village bell rang from beneath the ground at midnight. Its keeper offers a reward to anyone who brings back the missing clapper.', 'Recover the bronze clapper from the final chamber.', 'Each loud fight rings the bell once. On the third ring, the final guardian closes a side route.', 'A copper rubbing shows where to brace the bell before lifting the clapper.', 'The old keeper’s slate tells how the guardian once calmed at the sound of its own title.'],
    ['The Stone Witness', 'A mason’s apprentice insists that the dungeon’s last statue spoke her missing brother’s name.', 'Bring the stone witness’s inscribed tablet to the surface.', 'The wardens want the tablet back in its plinth. They will trade safe passage for a convincing copy.', 'A broken tablet names the password that opens the witness’s alcove.', 'A folded survey shows which part of the tablet the wardens will accept as proof.']
  ],
  molten: [
    ['A Debt to the Forge', 'An ironworker has cooled the village furnaces to keep them from feeding the forge below.', 'Remove the ember seal from the final furnace.', 'The seal can be handled safely only after quenching it or letting the furnace complete a cycle.', 'A pair of scratched marks identifies the lever that opens the cold-water channel.', 'A discarded order identifies the forge keeper’s side of a broken bargain.'],
    ['Ash Under the Door', 'Warm ash has been drifting out of locked cellars. A courier begs you to find the object drawing the heat.', 'Carry the ash compass out of the furnace hall.', 'The forge guard will stop pursuing if the party opens a route for the trapped workers.', 'A note pinned with a nail marks the old shift bell and its purpose.', 'The least scorched maintenance arrows identify the cool side of the final furnace.']
  ],
  frost: [
    ['The Thawing Vault', 'A thaw exposed a stairway that the village sealed decades ago. A winter scout went in and left their pack outside.', 'Recover the scout’s signal horn from the final vault.', 'As the party opens inner doors, the thaw spreads and makes a previously safe route noisy.', 'Carved boot prints mark the load-bearing ice and a safe crossing.', 'A scrap of the scout’s scarf identifies the door they entered before the last alarm.'],
    ['The Last Winter Lantern', 'A lantern meant to guide a caravan has gone dark beneath a ridge, and a storm is coming in.', 'Relight or retrieve the storm lantern in the final chamber.', 'The chamber guardian will trade access for the return of a missing charm.', 'A notch on an old charm matches the pattern on the guardian’s shield.', 'A waxed journal records the maker’s mark on the missing charm.']
  ],
  grim: [
    ['Names for the Nameless', 'The village memorial lost its names overnight. Identical letters appeared on the crypt’s stone doors.', 'Retrieve the burial ledger from the final chamber.', 'Disturbing a grave draws attention. Replacing its nameplate can quiet it.', 'Worn chalk shows the gesture that lets visitors pass one of the old wards in peace.', 'A loose nameplate identifies the final guardian and what they still protect.'],
    ['Grave Goods', 'The gravedigger asks you to settle an inheritance before the dead settle it themselves.', 'Recover the disputed signet and decide who should keep it.', 'Taking the signet without presenting a claim provokes the chamber’s guardian.', 'A folded will reveals who can make a legitimate claim to the signet.', 'A page from the gravedigger’s journal names a witness to the disputed inheritance.']
  ],
  verdant: [
    ['The Rootbound Spring', 'The village spring tastes sweet and grows a layer of green scum overnight.', 'Retrieve the moss-covered sluice key from the root chamber.', 'The caretakers are divided over the spring. Freeing a blocked channel earns an ally.', 'Charcoal arrows show where the sluice can be opened without flooding the trails.', 'A cut root smells of clean water: the garden’s decay comes from a blockage, not the spring itself.'],
    ['The Greenhouse Below', 'A botanist offers a finder’s fee for a seed pod precious enough to lock behind stone doors.', 'Bring the sealed seed pod out of the deepest garden.', 'The garden reacts to open flame. Plant life blocks one spur after the first obvious fire.', 'A pressed leaf marks the clean path through the spore beds.', 'Graffiti gives the greenhouse keeper’s price for turning over the seed.']
  ]
};

export const roomsByRole = {
  entrance: [
    ['Broken Threshold', 'An abandoned bundle sits beyond the threshold, with fresh tracks circling it.', 'A discarded tool gives the characters a last chance to prepare before they enter.'],
    ['Watchers’ Step', 'Two paths of dust meet here. A strip of cloth on the stone moves in a faint draft.', 'Look for signs that distinguish a well-used route from a recently disturbed one.']
  ],
  combat: [
    ['Broken Watchpost', 'A scatter of disturbed stones gives way to a clear crossing between low heaps of rubble.', 'The occupants want to protect their route. They fall back or bargain when their position stops being defensible.'],
    ['Crossing Hall', 'Old fixtures break the room into pockets. Fresh marks score the shortest route across.', 'Use the pillars or rubble as cover. An observant party can approach from a side passage or make a distraction.'],
    ['Borrowed Camp', 'A rough camp has been arranged against the most sheltered wall.', 'The occupants have a prize to defend and a route to retreat. They may trade information if the exit stays open.']
  ],
  elite: [
    ['Keeper’s Station', 'Travel along this route has left the stone smooth. Something has swept the middle of the room clear.', 'The strongest defender blocks the clean route. The party can draw it away by attacking its objective or making a credible bargain.'],
    ['The Inner Guard', 'A damaged marker is visible from every entrance. Someone stationed here has been watching the approaches.', 'Defenders try to hold the entrance with cover. Give them a chance to call for help if the party lingers.']
  ],
  treasure: [
    ['Old Pay Chest', 'A stout container or recess lies under a cluster of conspicuously clean stones.', 'The reward is tucked away. Footprints and tool marks can reveal how the previous owner reached it.'],
    ['Sealed Store', 'A low shelf survives under a stone lip. A few objects have been moved out of the dust.', 'The party can inspect the shelf from outside arm’s reach before disturbing what rests there.']
  ],
  shrine: [
    ['Quiet Offering', 'Someone has cleared a place for an offering. The dust nearby holds the print of a bare hand.', 'A small offering or a moment of quiet prompts a visible response. A careful player can recognize it as a hint.'],
    ['A Place to Breathe', 'The sound from the corridors fades here. A flat stone and two unlit recesses face the wall.', 'The party can regroup or examine the markings. Choosing to stay gives the dungeon’s occupants time to act.']
  ],
  boss: [
    ['The Last Ward', 'The ceiling rises here. Old scars in the floor lead to an object set in the far half of the chamber.', 'The opposition protects the objective. Characters can seize it and escape, disable its support, or negotiate passage.'],
    ['Seat of the Keeper', 'The walls open around a raised center. The object you came for is in plain sight.', 'The keeper responds first to a direct threat to the objective. Use the side approaches and the room’s terrain to give the party choices.']
  ],
  quiet: [
    ['A Forgotten Niche', 'A shallow niche holds a discarded container, its lid pushed aside.', 'The room gives the party a chance to examine evidence or take a short breather.'],
    ['Old Workroom', 'Worn grooves in the floor run from a broken work surface toward the passage.', 'The abandoned setup can be searched for tools, repair supplies, or a way around the next obstacle.']
  ]
};

export const traps = [
  { name:'Falling rubble', cue:'Fresh grit gathers beneath a cracked lintel; a cord runs through a drilled hole.', trigger:'Moving through the opening without securing the line dislodges the stones.', disarm:'Brace the lintel or gently pin and cut the cord.', save:'Dexterity', damage:'bludgeoning' },
  { name:'False step', cue:'The paving around one tile is smoother, and the seams are unusually wide.', trigger:'Stepping on the loose paving drops the victim into a shallow, concealed pit.', disarm:'Bridge the slab with a plank or wedge it in place.', save:'Dexterity', damage:'bludgeoning' },
  { name:'Warding glyph', cue:'A thin line of powdered mineral marks a nearly complete circle on the stone.', trigger:'Moving the protected object completes the glyph and releases a burst of force.', disarm:'Break the circle from outside it or rearrange the symbols to interrupt the ward.', save:'Dexterity', damage:'force' },
  { name:'Choking dust', cue:'Tiny holes surround the recess and a dry, bitter scent hangs over it.', trigger:'Lifting the lid sends a burst of irritant dust through the openings.', disarm:'Plug the vents or open the lid from the far side using a cord.', save:'Constitution', damage:'poison' },
  { name:'Sweeping counterweight', cue:'A scrape arcs across the floor and a pinned chain disappears into the wall.', trigger:'Moving the chain releases a hidden beam across the approach.', disarm:'Immobilize the counterweight or detach the chain from the release.', save:'Dexterity', damage:'bludgeoning' }
];

export const puzzles = [
  { name:'Three worn marks', setup:'Three inlaid marks stand before a closed recess. The worn edge of an old tool fits one mark at a time.', solution:'Follow the increasing number of nicks (one, two, three). Press each matching mark in order. The marks reset quietly if they guess wrong.', bypass:'Lift the tool with a hook and use it to turn the latch from the side.' },
  { name:'A balanced offering', setup:'A stone plate has two shallow pans. Three loose weights are etched with one, two, and three circles.', solution:'Put the three-circle weight on one pan and the other two weights on the opposite pan.', bypass:'Keep the plate level with a brace while another character reaches the catch.' },
  { name:'The reversed arrow', setup:'An arrow on a hinged plaque points down a corridor. The underside shows an identical arrow pointing back.', solution:'Turn the plaque over and follow the arrow reflected in the polished mark opposite it.', bypass:'Inspect or probe the lower wall on the reverse side to find the concealed catch.' }
];
