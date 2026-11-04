import type { Room } from "./game";

export const kitchen: Room = {
  title: "The Last Service",
  description:
    "A sleeping restaurant. Five plates, a locked drawer and one last way out to find.",
  story:
    "The last customer has left and the restaurant has closed its doors. The exit key has been put away somewhere in the kitchen. On the counter, a note awaits you: “Everything is in its place. Take the time to look.”",
  theme: "cosy",
  difficulty: "facile",
  duration: 5,
  image: "/scenes/kitchen.png",
  credits: [
    {
      title: "Kitchen Background (4 styles)",
      author: "jcrown41",
      license: "CC0-1.0",
      url: "https://opengameart.org/content/kitchen-background-4-styles",
    },
  ],
  provenance: { method: "manual", model: null, generatedAt: null },
  objects: [
    {
      id: "assiettes",
      name: "The plates",
      prompt: "plate",
      action: "inspect",
      region: { x: 0.65, y: 0.065, w: 0.2, h: 0.17 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "A note slipped onto the shelf says: “The drawer code reads from top to bottom. Count the plates on each row.”",
      lockedMessage: "Look at the shelf.",
      hint: "There are two rows. The first digit comes from the top one.",
    },
    {
      id: "tiroir",
      name: "The locked drawer",
      prompt: "drawer",
      action: "code",
      region: { x: 0.649, y: 0.405, w: 0.1, h: 0.043 },
      requires: ["assiettes"],
      code: "23",
      itemName: "Brass key",
      message:
        "The drawer opens with a small click. You recover a brass key and a note: “The exit handle is stuck. The tool is under the fruits.”",
      lockedMessage:
        "A two-digit combination lock closes this drawer. The shelf might give you a lead.",
      hint: "Two plates on top, three below. The lock expects two digits.",
    },
    {
      id: "fruits",
      name: "The fruits",
      prompt: "fruit",
      action: "collect",
      region: { x: 0.474, y: 0.465, w: 0.157, h: 0.13 },
      requires: ["tiroir"],
      code: null,
      itemName: "Small screwdriver",
      message:
        "You move the fruits and find a small screwdriver. It should free the door handle.",
      lockedMessage:
        "Some fruits rest on the counter. Nothing yet shows what you are looking for here.",
      hint: "The note from the drawer mentions something under the fruits.",
    },
    {
      id: "porte",
      name: "The exit door",
      prompt: "door",
      action: "exit",
      region: { x: 0.026, y: 0.25, w: 0.077, h: 0.45 },
      requires: ["tiroir", "fruits"],
      code: null,
      itemName: null,
      message:
        "You free the handle with the screwdriver, turn the key and push the door. The cool evening air greets you. The last service is over.",
      lockedMessage:
        "The door is locked and its handle is stuck. You still lack what you need to open it.",
      hint: "You need a key and a small tool. The drawer and the fruits will help you.",
    },
  ],
};

export const japanese: Room = {
  title: "The Quiet Room",
  description: "A dark screen, a closed cabinet and a message to recover.",
  story:
    "The door has closed behind you. A paper placed on the television says: “Start with the screen. The exit will wait.”",
  theme: "mystere",
  difficulty: "facile",
  duration: 4,
  image: "/scenes/japanese.png",
  credits: [
    {
      title: "Japanese Room",
      author: "HachiStudio",
      license: "CC0-1.0",
      url: "https://opengameart.org/content/japanese-room",
    },
  ],
  provenance: { method: "manual", model: null, generatedAt: null },
  objects: [
    {
      id: "television",
      name: "The television",
      prompt: "television",
      action: "inspect",
      region: { x: 0.605, y: 0.22, w: 0.285, h: 0.26 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "You switch on the screen. Two digits appear: 4 then 2. An arrow points to the cabinet below.",
      lockedMessage: "A screen waits to be switched on.",
      hint: "Click on the television to switch on the screen.",
    },
    {
      id: "meuble",
      name: "The cabinet",
      prompt: "cabinet",
      action: "code",
      region: { x: 0.605, y: 0.505, w: 0.283, h: 0.126 },
      requires: ["television"],
      code: "42",
      itemName: "Room key",
      message: "The cabinet opens. Inside: the door key.",
      lockedMessage:
        "The cabinet is closed with a code. The screen could inform you.",
      hint: "The screen shows 4, then 2.",
    },
    {
      id: "porte",
      name: "The door",
      prompt: "door",
      action: "exit",
      region: { x: 0, y: 0.11, w: 0.074, h: 0.59 },
      requires: ["meuble"],
      code: null,
      itemName: null,
      message:
        "The key turns. You open the door and find your freedom.",
      lockedMessage: "The door is locked. The key is still in the room.",
      hint: "Look inside the cabinet under the television.",
    },
  ],
};

export const seedCard = {
  slug: "the-last-service",
  title: kitchen.title,
  description: kitchen.description,
  image: kitchen.image,
  theme: kitchen.theme,
  difficulty: kitchen.difficulty,
  duration: kitchen.duration,
  author: "Storyscape Studio",
  createdAt: "2026-11-04T12:00:00Z",
  builtin: true,
};
