// PRISMKEEP configuration: the keep, its four realms and its twelve nights.
// Every night is one beam-routing room: one dawn source, a web of rotatable
// mirror shards, lanterns to light and shadow moths that hunt them.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 46;
export const FIELD = { x: 34, y: 64, w: 1212, h: 622 }; // playable stone floor

export const DIRS = [
  { x: 1, y: 0, name: 'E' },
  { x: 0, y: 1, name: 'S' },
  { x: -1, y: 0, name: 'W' },
  { x: 0, y: -1, name: 'N' },
];

// A '/' shard (tilt 0) sends E->N, N->E, S->W, W->S.
// A '\' shard (tilt 1) sends E->S, S->E, W->N, N->W.
export const REFLECT = [
  { E: 'N', N: 'E', S: 'W', W: 'S' },
  { E: 'S', S: 'E', W: 'N', N: 'W' },
];
export const DIR_INDEX = { E: 0, S: 1, W: 2, N: 3 };
export const DIR_NAME = ['E', 'S', 'W', 'N'];

export const REALMS = [
  {
    name: 'Dawn Court', nights: [1, 2, 3],
    floor: '#1b1640', floorAlt: '#231c52', wall: '#2c2560', wallEdge: '#57499f',
    gloom: 'rgba(6,4,20,0.55)', accent: '#ffb347', beamCore: '#fff6d8', beamGlow: '#ffc44d',
    moth: '#8f7bd8', text: '#ffe9b8',
  },
  {
    name: 'Mirror Vault', nights: [4, 5, 6],
    floor: '#12203a', floorAlt: '#182a4a', wall: '#22355c', wallEdge: '#4d74b8',
    gloom: 'rgba(3,6,18,0.55)', accent: '#7fd4ff', beamCore: '#f2fbff', beamGlow: '#54b9ff',
    moth: '#7a6fd0', text: '#dff2ff',
  },
  {
    name: 'Moth Hollow', nights: [7, 8, 9],
    floor: '#122b1a', floorAlt: '#173723', wall: '#1f4530', wallEdge: '#3f8a5c',
    gloom: 'rgba(2,10,5,0.62)', accent: '#a5e86b', beamCore: '#fbffd8', beamGlow: '#b6e34d',
    moth: '#b06fd8', text: '#eaffc9',
  },
  {
    name: 'Sunspire', nights: [10, 11, 12],
    floor: '#33160f', floorAlt: '#3f1c12', wall: '#57241a', wallEdge: '#b85c3a',
    gloom: 'rgba(14,3,2,0.55)', accent: '#ff7a4d', beamCore: '#fff2cf', beamGlow: '#ff8a3d',
    moth: '#e05a7a', text: '#ffe3c2',
  },
];

// One entry per night. turns = mirror bends on the true path, prisms split the
// beam to side lanterns, decoys are extra shards the player may ignore.
export const NIGHTS = [
  { night: 1,  turns: 2, prisms: 0, decoys: 0, lanterns: 3, mothEvery: 6.5, mothSpeed: 26, shadowMax: 100 },
  { night: 2,  turns: 3, prisms: 0, decoys: 1, lanterns: 4, mothEvery: 6.0, mothSpeed: 29, shadowMax: 100 },
  { night: 3,  turns: 3, prisms: 1, decoys: 1, lanterns: 5, mothEvery: 5.6, mothSpeed: 32, shadowMax: 100 },
  { night: 4,  turns: 4, prisms: 1, decoys: 1, lanterns: 5, mothEvery: 5.2, mothSpeed: 35, shadowMax: 100 },
  { night: 5,  turns: 4, prisms: 1, decoys: 2, lanterns: 6, mothEvery: 4.9, mothSpeed: 38, shadowMax: 100 },
  { night: 6,  turns: 5, prisms: 1, decoys: 2, lanterns: 6, mothEvery: 4.6, mothSpeed: 41, shadowMax: 100 },
  { night: 7,  turns: 5, prisms: 2, decoys: 2, lanterns: 7, mothEvery: 4.3, mothSpeed: 44, shadowMax: 100 },
  { night: 8,  turns: 6, prisms: 2, decoys: 2, lanterns: 7, mothEvery: 4.0, mothSpeed: 47, shadowMax: 100 },
  { night: 9,  turns: 6, prisms: 2, decoys: 3, lanterns: 8, mothEvery: 3.8, mothSpeed: 50, shadowMax: 100 },
  { night: 10, turns: 6, prisms: 2, decoys: 3, lanterns: 8, mothEvery: 3.6, mothSpeed: 53, shadowMax: 100 },
  { night: 11, turns: 7, prisms: 2, decoys: 3, lanterns: 9, mothEvery: 3.4, mothSpeed: 56, shadowMax: 100 },
  { night: 12, turns: 7, prisms: 2, decoys: 3, lanterns: 9, mothEvery: 3.2, mothSpeed: 58, shadowMax: 100, boss: true },
];

export const SCORE = {
  lantern: 120,      // per lantern lit when the night clears
  mothBurn: 35,      // per shadow moth burned by the beam
  secondLeft: 6,     // time bonus per second of dawn left
  bossHit: 4,        // per point of boss hide burned
  bossDown: 1500,    // the Nightmare Moth, ended
};

export const NIGHT_SECONDS = 150;   // dawn budget per night
export const LANTERN_RADIUS = 17;
export const MIRROR_HALF = 17;      // half-length of a mirror shard segment
export const BEAM_KILL_DIST = 15;   // a moth this close to the beam burns
export const BOSS_NAME = 'the Nightmare Moth';
export const BOSS_HP = 320;
