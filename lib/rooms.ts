import type { Room } from "./game";

export const kitchen: Room = {
  title: "Le dernier service",
  description:
    "Un restaurant endormi. Cinq assiettes, un tiroir fermé et une dernière sortie à trouver.",
  story:
    "Le dernier client est parti et le restaurant a fermé ses portes. La clé de la sortie a été rangée quelque part dans la cuisine. Sur le plan de travail, un mot vous attend : « Tout est à sa place. Prenez le temps de regarder. »",
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
      name: "Les assiettes",
      prompt: "plate",
      action: "inspect",
      region: { x: 0.65, y: 0.065, w: 0.2, h: 0.17 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Un billet glissé sur l’étagère indique : « Le code du tiroir se lit de haut en bas. Comptez les assiettes de chaque rangée. »",
      lockedMessage: "Observez l’étagère.",
      hint: "Il y a deux rangées. Le premier chiffre vient de celle du haut.",
    },
    {
      id: "tiroir",
      name: "Le tiroir fermé",
      prompt: "drawer",
      action: "code",
      region: { x: 0.649, y: 0.405, w: 0.1, h: 0.043 },
      requires: ["assiettes"],
      code: "23",
      itemName: "Clé en laiton",
      message:
        "Le tiroir s’ouvre avec un petit déclic. Vous récupérez une clé en laiton et un billet : « La poignée de sortie est coincée. L’outil est sous les fruits. »",
      lockedMessage:
        "Un cadenas à deux chiffres ferme ce tiroir. L’étagère pourrait vous donner une piste.",
      hint: "Deux assiettes en haut, trois en bas. Le cadenas attend deux chiffres.",
    },
    {
      id: "fruits",
      name: "Les fruits",
      prompt: "fruit",
      action: "collect",
      region: { x: 0.474, y: 0.465, w: 0.157, h: 0.13 },
      requires: ["tiroir"],
      code: null,
      itemName: "Petit tournevis",
      message:
        "Vous déplacez les fruits et trouvez un petit tournevis. Il devrait permettre de libérer la poignée de la porte.",
      lockedMessage:
        "Des fruits reposent sur le plan de travail. Rien n’indique encore ce que vous cherchez ici.",
      hint: "Le billet du tiroir mentionne quelque chose sous les fruits.",
    },
    {
      id: "porte",
      name: "La porte de sortie",
      prompt: "door",
      action: "exit",
      region: { x: 0.026, y: 0.25, w: 0.077, h: 0.45 },
      requires: ["tiroir", "fruits"],
      code: null,
      itemName: null,
      message:
        "Vous libérez la poignée avec le tournevis, tournez la clé et poussez la porte. L’air frais du soir vous accueille. Le dernier service est terminé.",
      lockedMessage:
        "La porte est fermée à clé et sa poignée est coincée. Il vous manque de quoi l’ouvrir.",
      hint: "Il faut une clé et un petit outil. Le tiroir et les fruits vous aideront.",
    },
  ],
};

export const japanese: Room = {
  title: "La pièce silencieuse",
  description: "Un écran éteint, un meuble fermé et un message à retrouver.",
  story:
    "La porte s’est refermée derrière vous. Un papier posé sur la télévision indique : « Commencez par l’écran. La sortie attendra. »",
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
      name: "La télévision",
      prompt: "television",
      action: "inspect",
      region: { x: 0.605, y: 0.22, w: 0.285, h: 0.26 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Vous allumez l’écran. Deux chiffres apparaissent : 4 puis 2. Une flèche désigne le meuble en dessous.",
      lockedMessage: "Un écran attend d’être allumé.",
      hint: "Cliquez sur la télévision pour allumer l’écran.",
    },
    {
      id: "meuble",
      name: "Le meuble",
      prompt: "cabinet",
      action: "code",
      region: { x: 0.605, y: 0.505, w: 0.283, h: 0.126 },
      requires: ["television"],
      code: "42",
      itemName: "Clé de la pièce",
      message: "Le meuble s’ouvre. À l’intérieur : la clé de la porte.",
      lockedMessage:
        "Le meuble est fermé par un code. L’écran pourrait vous renseigner.",
      hint: "L’écran affiche 4, puis 2.",
    },
    {
      id: "porte",
      name: "La porte",
      prompt: "door",
      action: "exit",
      region: { x: 0, y: 0.11, w: 0.074, h: 0.59 },
      requires: ["meuble"],
      code: null,
      itemName: null,
      message:
        "La clé tourne. Vous ouvrez la porte et retrouvez votre liberté.",
      lockedMessage: "La porte est fermée. La clé est encore dans la pièce.",
      hint: "Cherchez dans le meuble sous la télévision.",
    },
  ],
};

export const seedCard = {
  slug: "le-dernier-service",
  title: kitchen.title,
  description: kitchen.description,
  image: kitchen.image,
  theme: kitchen.theme,
  difficulty: kitchen.difficulty,
  duration: kitchen.duration,
  author: "L’atelier Storyscape",
  createdAt: "2026-11-04T12:00:00Z",
  builtin: true,
};
