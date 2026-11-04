import type { Room } from "../game.ts";
import { artwork } from "./art.ts";

export const greenhouse: Room = {
  title: "The Greenhouse Secret",
  description:
    "Ada trusts you with her greenhouse before leaving the village. Among forgotten letters, passages under the roots and carefully named seeds, discover what she spent her life preserving, then choose how this legacy will continue to live.",
  story:
    "The letter arrived yesterday, in an envelope that smelled of thyme. “Come before daybreak. I have left the greenhouse door open. You will find what I never managed to explain to the village.” Ada, the keeper of the gardens, always signs her messages with a little drawn leaf. This time, the leaf looks like a waving hand.\n\nYou knew her when you were a child: she let you water the tomatoes and never said a question was silly. Then the years passed. You learned of her departure from the neighbours, along with that strange rumour: the old greenhouse was hiding an inheritance Ada refused to sell.\n\nInside, the morning coolness still holds the night. A watering can waits on a table, a chest occupies the centre of the room and a clock seems to watch over the plants. The glass door at the back leads to the workshop. Ada is not here, but someone has prepared your visit with care.\n\nAt the bottom of her letter, she added: “Do not hurry to find the exit. What matters is understanding what you will take with you.”",
  theme: "cosy",
  difficulty: "intermediaire",
  duration: 30,
  ...artwork("serre-base"),
  provenance: { method: "manual", model: null, generatedAt: null },
  chapters: [
    {
      id: "serre",
      title: "I. What waits under glass",
      subtitle: "An invitation and a waiting chest",
      objective:
        "Find the workshop key by bringing together the two notes left by Ada.",
      story:
        "The greenhouse keeps the small sounds you had forgotten: a drop in a saucer, the rustle of a leaf against glass, the quiet creaking of furniture. Nothing feels like an abandoned place. The tools have been cleaned and the pots watered.\n\nA box bearing your first name sits near the watering can. The central chest is closed with a small brass lock. You look around in vain; no key waits on the nearby hook. On the green cabinet, however, a three-digit combination lock looks recent.\n\nFrom the outside path, a low voice calls to you. “Are you the person Ada was waiting for? I am Jules, her neighbour. She asked me to stay near the garden until you arrived. She said some things are better understood by discovering them.” Then gravel crunches: he leaves you to explore.\n\nAda has not turned her house into a trial. She has left you the habits of a craft, precise enough for you to pick up the gestures after her.",
      ...artwork("serre-base"),
      requires: [],
      unlockMessage:
        "You push open the greenhouse door. Ada’s invitation waits for you near the watering can.",
      ambience: "leaves",
    },
    {
      id: "atelier",
      title: "II. The keeper’s hands",
      subtitle: "The harvest notebook and the night of the flood",
      objective:
        "Understand the water circuit and open the box holding the tool for the passage.",
      story:
        "The workshop smells of dry earth, wax and paper. The desk is covered with small finished repairs: a sewn handle, a polished shaft, a reglued envelope. Ada cared for objects with the same patience as for plants.\n\nOn the shelf, the bottles weigh down a technical sheet. In the centre, a metal box waits under a square of cloth. The wooden door at the back is swollen with damp; a thin coolness escapes from underneath.\n\nThe open notebook on the desk recalls an old flood. You were too young to remember it. In the village, people said Ada had closed her gardens after that night. The story seemed simple: too much damage, too little money. Yet the pages show visits, harvests and exchanges throughout all the following years.\n\nBetween two leaves, you recognize Jules’s round handwriting. Ada may never have worked as alone as you thought. To understand what they saved together, you will have to go down to where the water used to flow.",
      ...artwork("serre-atelier"),
      requires: ["serre-porte"],
      unlockMessage:
        "The key turns. In the workshop, Ada’s notebook lies open at the story of a night of flooding.",
      ambience: "dust",
    },
    {
      id: "passage",
      title: "III. Under the roots",
      subtitle: "Held-back water and four lines for a first name",
      objective:
        "Restore the water, find the small key, then go back to open the greenhouse chest.",
      story:
        "A few steps lead down beneath the workshop. Bricks rounded by time outline a passage wide enough for a wheelbarrow. A lamp lights the central valve, and the trickling water gives the place a steady breathing.\n\nTo the right, a metal locker has been fixed above the old watermark. At the far end, a staircase climbs back up to the garden. Its upper grate is locked. Beyond it you can see a sky beginning to pale.\n\nAn Ada label, well protected from the damp, warns: “This passage is not a shortcut. This is where we understood what deserved to be kept.” The flood left marks, but hands have maintained the place since. The joints are repointed, the steps cleared.\n\nJules hears you from the other side of the grate. “She made me promise not to give you the answer. But I can tell you this: the chest is not a family treasure. At least, not for a single family.” He urges you to examine the valve before going on.",
      ...artwork("serre-passage"),
      requires: ["atelier-porte"],
      unlockMessage:
        "The wooden door opens onto a brick passage. The garden lies on the other side.",
      ambience: "rain",
    },
    {
      id: "jardin",
      title: "IV. What Can Begin Again",
      subtitle: "The legacy finally finds a future",
      objective:
        "Return the water to the garden, meet its history and choose how it will be passed on.",
      story:
        "The grate opens just as daylight touches the last panes of the greenhouse. The garden is not huge. A bench, a fountain and a few flowerbeds are enough to make it feel like a place where you can talk for a long time.\n\nJules sits near the gate with two cups wrapped in a cloth. “Ada arrived safely at her sister’s, he says. She would have welcomed you herself if she had not been so afraid of changing her mind. She loves this village. Leaving costs her more than she shows.”\n\nYou tell him the names from the chest. He nods. “People thought she was keeping rare varieties. Some probably are. But look at the cards: they are mostly meals, voices, moments when someone wanted to thank someone else.”\n\nOne last envelope waits for you on the bench. Ada has left you neither an obligation nor a secret to keep to yourself. She has entrusted you with a possibility. Before the gate opens onto the village’s ordinary morning, you still have to give it a shape.",
      ...artwork("serre-jardin"),
      requires: ["passage-escalier"],
      unlockMessage:
        "Beyond the grate, Jules waits for you in the garden. Day is beginning to rise.",
      ambience: "petals",
    },
  ],
  objects: [
    {
      id: "serre-lettre",
      chapterId: "serre",
      name: "The letter by the watering can",
      prompt: "Read the box with your name on it",
      action: "inspect",
      region: { x: 0.06, y: 0.53, w: 0.24, h: 0.22 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "“Here you are. I know, I could have handed you a key over tea. But then you would have missed the time spent here. Take it.\n\nThe green cabinet holds the key to my workshop. Its code follows the order in which my mother sowed the flowers: NASTURTIUM, then MARIGOLD, then BORAGE. One digit per flower. I left the quantities from her little sowing behind the clock door; they are not stored in that order.\n\nThe central chest will wait. Its small key stayed in the locker in the underground passage, after the flood. What it protects needs to be understood before it is opened.\n\nAda.”\n\nUnder the signature, a more recent sentence appears: “Your first watering can was too heavy. You asked if the plants could drink together. I have not forgotten.” You set the box down more gently than you picked it up.",
      lockedMessage: "The box sits next to the watering can.",
      hint: "The letter gives the flower order for the green cabinet. The quantities are at the clock.",
      speaker: "Ada",
    },
    {
      id: "serre-horloge",
      chapterId: "serre",
      name: "The greenhouse clock",
      prompt: "Open the clock’s small door",
      action: "inspect",
      region: { x: 0.4, y: 0.26, w: 0.13, h: 0.19 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "The clock door opens without resistance. A folded sheet protects the pendulum; you remove it and the ticking resumes. Ada has copied out an old order:\n\n“Little sowing of Rose — BORAGE: 6 seeds; NASTURTIUM: 4 seeds; MARIGOLD: 2 seeds. One variety at a time, we make fewer mistakes.”\n\nBelow, in another hand, Jules’s: “I set the clock right. Don’t let it stop again to spare me the noise.” Ada answered: “It was not the noise. It was the silence after. Thank you for coming back.”\n\nThe note is neither an old riddle nor a message meant for strangers: these are traces of a conversation carried on for years. You now know how many seeds go with each flower. You still have to put them back in the order shown near the watering can.",
      lockedMessage: "The clock’s small door is not locked.",
      hint: "The quantities are borage 6, nasturtium 4, marigold 2. The letter by the watering can gives their order.",
    },
    {
      id: "serre-meuble",
      animation: "drawer",
      chapterId: "serre",
      name: "The green cabinet",
      prompt: "Set the three digits on the cabinet",
      action: "code",
      region: { x: 0.65, y: 0.54, w: 0.13, h: 0.35 },
      requires: ["serre-lettre", "serre-horloge"],
      code: "426",
      itemName: "Workshop key",
      message:
        "The three wheels line up. The cabinet opens onto an iron key, darned gloves and an empty packet of nasturtiums, kept with as much care as the key.\n\nAda slipped a letter under the gloves. “You may have heard talk of an inheritance. The word spread because a buyer wanted the garden’s old varieties. He offered me enough money to redo all the panes. I almost accepted. Then I tried to write the list of what I would sell him. I could not write only plant names on it.\n\nIn the workshop, my notebook will show you why. If you find a stain at the bottom of a page, it is not always water. Gardens sometimes give us reasons to cry that are not sad.”\n\nThe key bears a cloth label: “Workshop — glass door”. You take it; the gloves stay in place, as if Ada might still need them tomorrow.",
      lockedMessage:
        "The lock expects three digits. The flower order and the quantities still need to be brought together.",
      hint: "Nasturtium, marigold, borage: take their quantities in that order. You get 4, then 2, then 6.",
      speaker: "Ada",
    },
    {
      id: "serre-coffre",
      animation: "lid",
      chapterId: "serre",
      name: "The central chest",
      prompt: "Open the chest with the small key",
      action: "unlock",
      region: { x: 0.36, y: 0.59, w: 0.29, h: 0.29 },
      requires: ["passage-casier"],
      code: null,
      itemName: "Seed register and garden key",
      message:
        "Back in the greenhouse, you insert the small key. The chest holds seed envelopes and a register. Each variety comes with a name, a date and a story. “Lucie’s bean: brought after her first meal in the village.” “Sami’s tomato: seeds kept from his father’s garden.” “Rose’s marigold: the flowers she sowed in front of Ada’s window.”\n\nThe last page finally tells of the flood. Residents had sheltered their supplies here. Ada and Jules had spent the night saving the packets and their labels. Some harvests were lost; many donors have died or left since. Ada kept growing their seeds, but above all she recorded their words. That is the legacy she refused to sell off separately.\n\n“I did not keep the past intact, she writes. I kept enough to answer it. Seeds grow differently every year. So do stories.”\n\nA copper key is tied to the register: “Grate at the top of the passage stairs”. You carry the register and this key toward the garden.",
      lockedMessage:
        "The small key is in the locker in the underground passage. First open the workshop and continue your visit.",
      hint: "After opening the locker in the passage, return to this first place. The small key opens the central chest.",
      speaker: "Ada",
    },
    {
      id: "serre-porte",
      chapterId: "serre",
      name: "The glass door",
      prompt: "Enter Ada’s workshop",
      action: "unlock",
      region: { x: 0.84, y: 0.13, w: 0.13, h: 0.75 },
      requires: ["serre-meuble"],
      code: null,
      itemName: null,
      message:
        "The iron key turns with slight effort. As you push the door, you notice a strip of paper fixed inside the frame.\n\n“If you opened the cabinet, you have already done what I asked of you: bring together two things I had left apart. That will be useful for the rest. Memories, too, sometimes need another person to make sense again.”\n\nJules calls to you from the path: “I'll stay by the gate. Call out if you need me. Ada always says that helping someone doesn't mean doing it in their place. That's so like her, isn't it?”\n\nHe laughs softly, then adds: “And if you're looking for the key to the chest, it's really down below. I put it somewhere safe myself.” The workshop waits behind the glass, more intimate and more cluttered than the greenhouse.",
      lockedMessage:
        "The glass door is locked. The workshop key is in the green cabinet.",
      hint: "Open the green cabinet with the code obtained from the flowers, then use the key here.",
      speaker: "Jules",
    },
    {
      id: "atelier-carnet",
      chapterId: "atelier",
      name: "The notebook on the desk",
      prompt: "Read the harvest notebook",
      action: "inspect",
      region: { x: 0.14, y: 0.56, w: 0.19, h: 0.16 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "The notebook begins with a dedication: “To my mother, Rose, who kept seeds in letter envelopes.” Ada noted down the harvests, then the people who came to collect them. Some names return over thirty years. Others appear only once, with a whole sentence beside them.\n\nOn the page about the flood, the handwriting becomes more hurried. “Jules says we can save the bags if we shut off the water. I wanted to carry out the tools. He reminded me that a handle can be replaced. Not what people entrusted to us.”\n\nThe next page describes restoring water to the garden: “Always in this order: isolate the RESERVE, drain the BASIN, feed the GARDEN. The three pipe numbers, read in that order, open the tool box. The number sheet is on the shelf, under the vials.”\n\nAda adds: “This is not a plumbing secret. It is so that whoever takes the tool knows what they are about to restart.”",
      lockedMessage: "The notebook lies open on the desk.",
      hint: "The notebook sets the order: reserve, basin, garden. Find the number of each pipe on the shelf.",
      speaker: "Ada",
    },
    {
      id: "atelier-tiroir",
      animation: "drawer",
      chapterId: "atelier",
      name: "The half-open drawer",
      prompt: "Read the card in the desk drawer",
      action: "inspect",
      region: { x: 0.1, y: 0.74, w: 0.25, h: 0.15 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "A postcard sticks out of the drawer. It shows a pale sea and bears a date from last week.\n\n“Ada, the room is ready. The sun comes in in the morning. You can put your cuttings on the sill, but I warn you: here, I make the coffee. Your sister who is waiting for you, Madeleine.”\n\nOn the back, Ada started an unsent reply: “I'm coming Thursday. I asked someone to pick up the thread at the garden. I thought that by tidying everything away, leaving would become easy. That's wrong. But today I bought a suitcase. That's already something.”\n\nYou understand that her disappearance is not one. Ada did not prepare a final riddle before vanishing: she is trying to allow herself another life. This small card, with no code or instruction, makes her absence far less worrying. You put it back in the drawer, above a carefully folded train ticket.",
      lockedMessage:
        "The drawer is half-open; the card can be read without moving anything else.",
      hint: "This card sheds light on Ada's departure. It is not needed to open the box.",
      speaker: "Madeleine and Ada",
    },
    {
      id: "atelier-flacons",
      chapterId: "atelier",
      name: "The sheet under the vials",
      prompt: "Clear the pipe reference sheet",
      action: "inspect",
      region: { x: 0.65, y: 0.2, w: 0.29, h: 0.17 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "The vials are empty and perfectly clean. They hold down a sheet to keep it from curling. You lay it flat:\n\n“Pipe reference marks. GARDEN: number 5. RESERVE: number 3. BASIN: number 1. These marks do not indicate the order of operations. For that order, consult the desk notebook.”\n\nAn annotation by Jules fills the bottom of the sheet: “The passage valve must only be handled with the flat key from the box. When the circuit is ready, a single quarter-turn will be enough; the stop will halt you. No need to force it.”\n\nOn the paper there is also a clumsy drawing of a boot full of water. Ada wrote beneath it: “Souvenir of our great skill during the flood.” Despite the almost solemn care of the preparations, they kept the right to laugh about that night. You put the vials back in place after noting the three numbers.",
      lockedMessage: "The sheet is held down by the vials on the shelf.",
      hint: "The numbers are garden 5, reserve 3, basin 1. The notebook tells you in which order to use them.",
    },
    {
      id: "atelier-boite",
      animation: "lid",
      chapterId: "atelier",
      name: "The metal box",
      prompt: "Enter the numbers in circuit order",
      action: "code",
      region: { x: 0.4, y: 0.69, w: 0.21, h: 0.18 },
      requires: ["atelier-carnet", "atelier-flacons"],
      code: "315",
      itemName: "Flat valve key",
      message:
        "The lid lifts. A flat key rests in an oiled cloth, along with a small handle for the wooden door. You fit the handle into its slot; it had been removed to prevent a visitor from going down before reading the instructions.\n\nAda left a note under the tool: “The passage is sound and Jules checked it yesterday. Do not see it as a forbidden place. We simply left there too long things we no longer had the courage to tell.\n\nYou will find the valve in the center. The water was isolated to repair the basin; the circuit is now waiting for its quarter-turn. Once the water is lowered in the small channel, the lower step will be accessible. I put back there the word my mother taught me. It will help you with the locker.”\n\nYou take the flat key. Its handle is polished by many hands, and you recognize on the cloth the same small leaf as on your invitation.",
      lockedMessage:
        "The box asks for three digits: the pipe numbers in the order given by the notebook.",
      hint: "Isolate the reserve (3), drain the basin (1), feed the garden (5). The code is 315.",
      speaker: "Ada",
    },
    {
      id: "atelier-porte",
      chapterId: "atelier",
      name: "The wooden door",
      prompt: "Go down into the passage",
      action: "unlock",
      region: { x: 0.18, y: 0.09, w: 0.23, h: 0.44 },
      requires: ["atelier-boite"],
      code: null,
      itemName: null,
      message:
        "With its handle restored, the door opens silently. A sturdy ramp runs alongside the steps. You grip the flat key and go down; with each step, the scent of the workshop gives way to that of damp stone.\n\nOn the back of the door, Jules fixed a note: “Everything is cleared. The lamp works. The upper grate opens with the copper key, which stayed in the greenhouse chest. So you will have to go back up for that chest after the locker. Ada wanted to keep the route as we made it that night: go down to save, go back up to understand, come back out to carry on.”\n\nBelow, Ada added: “He claims I'm the one who complicates things. He's the one who came up with that sentence.” You imagine them, just yesterday, discussing the best place to hang this note. The underground already feels less lonely.",
      lockedMessage:
        "The door is missing its handle. Open the metal box to find it and take the tool.",
      hint: "The central box contains the tool and handle needed to open this passage.",
      speaker: "Jules and Ada",
    },
    {
      id: "passage-lampe",
      animation: "light",
      chapterId: "passage",
      name: "The passage lamp",
      prompt: "Examine the letter by the lamp",
      action: "inspect",
      region: { x: 0.07, y: 0.22, w: 0.2, h: 0.29 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "A letter is tucked behind the base of the lamp. The envelope reads: “For Jules, when I am gone.” Inside, Ada specified that you may read it.\n\n“Do you remember what you told me during the flood? That we were not going to end up drowned for beans. You were right. We came back up as soon as the water reached the last step. But you came back the next day with dry boots, then the day after with new labels. I never thanked you for the days after. Yet that is what allowed me to carry on.\n\nIf the person I invited decides to keep the garden open, help them. If they prefer to entrust the seeds to the village, help them too. What I want to pass on is not my way of doing everything. It is the chance not to do it alone.”\n\nYou fold the letter again. Above you, Jules coughs in the garden, as if he had guessed what you just discovered.",
      lockedMessage: "The letter is kept safe by the lamp.",
      hint: "This letter sheds light on Jules's promise. To continue, use the flat key on the central valve.",
      speaker: "Ada",
    },
    {
      id: "passage-vanne",
      chapterId: "passage",
      name: "The central valve",
      prompt: "Restore the circuit with the flat key",
      action: "unlock",
      region: { x: 0.33, y: 0.49, w: 0.08, h: 0.19 },
      requires: ["atelier-boite"],
      code: null,
      itemName: null,
      message:
        "The flat key fits the nut. You guide the valve to its stop, with a single quarter-turn, as Jules indicated. At first, nothing happens. Then a breath moves through the pipe and the trickling changes direction.\n\nThe water leaves the small channel running alongside the steps to join the garden pipe. On the lower step, a waxed pouch gradually emerges. It had been placed high enough to stay dry, but you would have had to walk through water to reach it before the maneuver.\n\nFrom the grate, Jules calls out: “I can hear it! Up there, all that will remain is to open the fountain inlet. Take your time with the locker. The old mechanism likes to be given the right word.”\n\nYou keep the flat key: it will still be useful in the garden. The passage, freed from the sound of leaking, lets something else be heard: the first birds of the morning.",
      lockedMessage:
        "You need the flat key kept in the workshop box.",
      hint: "The workshop box holds the right tool. The instructions call for a simple quarter-turn to the stop.",
      speaker: "Jules",
    },
    {
      id: "passage-marche",
      chapterId: "passage",
      name: "The pouch on the low step",
      prompt: "Read the four lines kept safe from the water",
      action: "inspect",
      region: { x: 0.56, y: 0.81, w: 0.16, h: 0.1 },
      requires: ["passage-vanne"],
      code: null,
      itemName: null,
      message:
        "You pick up the pouch. It contains a recent copy of a much older paper. Ada wrote above it: “My mother began each line with a letter of her first name. Read only those four first letters, from top to bottom: they open the locker.”\n\n“Receive what is entrusted to you.\nOffer what you can help grow.\nStore in memory the hands that gave it to you.\nEndeavour again after a difficult winter.”\n\nBelow, Ada recounts: “I found these sentences far too serious when I was little. Mother had written them after losing her first harvest. She did not need wisdom: she needed to start again. Her name was Rose. You may have seen her name in my notebook.”\n\nYou understand why these lines survived so many years. They do not say how to avoid losing something. They say what is still possible to do afterward.",
      lockedMessage:
        "The low step is still edged with water. The central valve will clear the access.",
      hint: "Read the first letter of each of the four lines: R, O, S, E. The locker code is ROSE.",
      speaker: "Ada",
    },
    {
      id: "passage-casier",
      chapterId: "passage",
      name: "The locker above the waters",
      prompt: "Enter the first name formed by the four lines",
      action: "code",
      region: { x: 0.8, y: 0.6, w: 0.15, h: 0.31 },
      requires: ["passage-marche"],
      code: "ROSE",
      itemName: "Small chest key",
      message:
        "The letters align and the locker opens. A small brass key hangs from a blue ribbon. Its label leaves no doubt: “Central greenhouse chest.” Beside it, Jules stored two old labels blackened by water.\n\nHis note accompanies them: “For a long time we believed the seeds were the fragile thing. In truth, we knew how to grow more. The names, though, faded at the first soaking. Ada dried these two labels in her hands all night, afraid she would no longer remember whom they belonged to.”\n\nAda added a line: “Go back to the chest. It will show you what I finally understood. You will also find there the copper key for the grate at the top of these stairs.”\n\nYou take the small key. The way is familiar now: the passage, the workshop, the glass door, then the chest you left closed in the middle of the greenhouse.",
      lockedMessage:
        "The lock asks for a four-letter word. The pouch on the low step explains how to form it.",
      hint: "The first letters of the text on the step give ROSE. After the locker, return to the greenhouse chest.",
      speaker: "Jules and Ada",
    },
    {
      id: "passage-escalier",
      chapterId: "passage",
      name: "The grate at the top of the stairs",
      prompt: "Open the garden grate",
      action: "unlock",
      region: { x: 0.58, y: 0.39, w: 0.14, h: 0.35 },
      requires: ["serre-coffre"],
      code: null,
      itemName: null,
      message:
        "You return to the passage with the register under your arm. This time, you are no longer looking for a nameless treasure. You carry the traces of people who entrusted a little of their lives to this garden.\n\nThe copper key opens the grate on the first try. Jules holds out his hand for the last step. “Did you see the envelopes? There are my wife's peas. She swore they were better than all the others. It was probably mostly the way she cooked them. Ada wrote her recipe on the back.”\n\nHe lets a silence pass before smiling. “That's why I'm still here. We must not let stories become heavier than the people who carry them. Come. The tea is getting cold.”\n\nYou step through the grate. The open air feels almost warm after the damp bricks. The fountain is still silent, but the water is now waiting behind its inlet.",
      lockedMessage:
        "The grate requires the copper key. Open the central greenhouse chest with the locker key, then return here.",
      hint: "The chest from the first scene holds the copper key. Make that round trip before going up to the garden.",
      speaker: "Jules",
    },
    {
      id: "jardin-banc",
      chapterId: "jardin",
      name: "The last envelope on the bench",
      prompt: "Read the letter Ada addresses to you",
      action: "inspect",
      region: { x: 0.06, y: 0.53, w: 0.27, h: 0.18 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "“If you are reading this outside, the day must already be breaking. I hope Jules hasn't forgotten the tea.\n\nI did not hide a fortune. I kept the seeds of people who did not always have much to leave a great trace. For a long time, I believed preserving their names meant moving nothing. So the greenhouse became a place no one dared touch anymore. That was not what my mother taught me.\n\nTwo futures seem beautiful to me. You can reopen the greenhouse as a memory garden: people will come there to sow, tell stories, and learn together. Or you can entrust batches to the village gardens: each family will keep some of the seeds and a copy of the stories. In both cases, keep the names. They are the link between what we receive and what we offer.\n\nI'll let you choose with Jules. But first, bring the water back to the fountain. I would like to imagine that sound when I have my first coffee at my sister's. Ada.”",
      lockedMessage: "The envelope waits for you on the bench.",
      hint: "Ada allows two forms of passing on. Before choosing, restore the water to the fountain and look at the flowerbed.",
      speaker: "Ada",
    },
    {
      id: "jardin-fontaine",
      chapterId: "jardin",
      name: "The fountain inlet",
      prompt: "Open the inlet with the flat key",
      action: "unlock",
      region: { x: 0.3, y: 0.5, w: 0.33, h: 0.22 },
      requires: ["jardin-banc", "passage-vanne"],
      code: null,
      itemName: null,
      message:
        "At the base of the fountain, you find the inlet Ada pointed to in her letter. With the flat key, you gently open the tap to the stop mark. The pipe was prepared in the passage: the water rises, hesitates, then falls back into the basin with a clear sound.\n\nJules closes his eyes for a moment. “We hadn't heard it for weeks. Ada said that, without it, the garden sounded as if it were holding its breath.” He takes out his phone, records a few seconds, and puts it back in his pocket. “I'll play it for her when she calls.”\n\nA small trickle of water reaches the channels of the flowerbed. You understand their layout: they connect the plants without erasing their differences. Nothing grew miraculously during your visit. They are the same leaves, the same fragile stems. But someone will now be able to look after them tomorrow.",
      lockedMessage:
        "First read Ada's last letter. The water must also have been restored in the passage.",
      hint: "The passage valve prepares the circuit. The letter on the bench asks you to open this inlet with the same flat key.",
      speaker: "Jules",
    },
    {
      id: "jardin-parterre",
      chapterId: "jardin",
      name: "The first seed packets of the flowerbed",
      prompt: "Take the envelopes prepared for you",
      action: "collect",
      region: { x: 0.7, y: 0.55, w: 0.25, h: 0.3 },
      requires: ["jardin-fontaine"],
      code: null,
      itemName: "First packets of passing on",
      message:
        "At the edge of the flowerbed, under an upturned saucer, Jules shows you a box sheltered from damp. It holds three new envelopes: nasturtium, marigold, borage. The same flowers that let you open the green cabinet.\n\n“Ada prepared them for the first person willing to carry on, he explains. Not the whole reserve. Just enough to start without fear of spoiling everything.” Each packet bears sowing advice, a name, and an empty space: “Now it's your turn to add a story.”\n\nYou take the envelopes. On the marigold one, Ada noted: “Rose kept some by her window because morning arrived there late. She said those flowers brought her a little sunshine early.”\n\nJules then holds out the open register. “We can make the greenhouse a place where people meet, or send the seeds travelling from garden to garden. You now know what each of these decisions carries with it. Let's write the first page of what's next.”",
      lockedMessage:
        "First bring the water back to the fountain. Jules will then show you the packets prepared at the edge of the flowerbed.",
      hint: "Open the fountain inlet; the first packets can then be taken at the flowerbed.",
      speaker: "Jules",
    },
    {
      id: "jardin-decision",
      chapterId: "jardin",
      name: "The register by the fountain",
      prompt: "Choose how to pass on the legacy",
      action: "choose",
      region: { x: 0.51, y: 0.69, w: 0.11, h: 0.12 },
      requires: ["jardin-parterre"],
      code: null,
      itemName: null,
      message:
        "On the last page of the register, Ada left enough room for a plan. You discuss it with Jules. Keeping the garden as a meeting place will give the stories a home and require a regular presence. Entrusting batches to the residents will send the seeds travelling and require keeping the links between gardens.\n\nJules places the pen within your reach. “I can help you with either. What we write today does not forbid us from changing later. But we have to start somewhere.”\n\nYou reread Rose's words and choose what you will propose to the village. Ada gave you the right to make it a living decision, with joys, work, and room for other hands.",
      lockedMessage:
        "Read Ada's letter, restore the water, and take the first packets before writing what comes next.",
      hint: "Both decisions end the adventure and give a different ending. Choose the future you want to carry.",
      speaker: "Jules",
      choices: [
        {
          id: "jardin-ouvert",
          label: "Reopen the greenhouse as a memory garden",
          reply:
            "You write: “An open garden, a meeting every week, a place for every story.” Jules suggests Saturday morning. You entrust him with the register while you prepare the first packets for future visitors. The greenhouse will have a new way of being lived in.",
        },
        {
          id: "graines-voyageuses",
          label: "Entrust the seeds to the village gardens",
          reply:
            "You write: “Shared seeds, copied stories, gardens answering one another.” Jules already knows three neighbours ready to begin. You prepare the first batches while keeping the names on each envelope. The legacy will have several homes.",
        },
      ],
    },
    {
      id: "jardin-portail",
      chapterId: "jardin",
      name: "The village gate",
      prompt: "Leave with your promise",
      action: "exit",
      region: { x: 0.34, y: 0.17, w: 0.29, h: 0.31 },
      requires: ["jardin-decision"],
      code: null,
      itemName: null,
      message:
        "Jules pulls back the bolt on the gate. The path joins a street where the first shutters are opening. You came looking for what Ada had left behind; you are leaving with something still to be done.\n\nThe fountain keeps flowing behind you. In your pocket, the three packets make a faint papery rustle. Jules picks up an empty cup, hands you the other one and says, \"We'll tell her together. She'll want every detail.\"\n\nYou step through the gate. The Greenhouse Secret has stopped being a secret; it has become an invitation.",
      lockedMessage:
        "The gate is waiting for your decision. First write in the ledger how the legacy will be passed on.",
      hint: "Choose one of the two futures in the ledger on the bench, then go through the gate.",
      speaker: "Jules",
    },
  ],
  ending: {
    sourceObjectId: "jardin-decision",
    variants: [
      {
        choiceId: "jardin-ouvert",
        title: "The House of Stories",
        text: "The following Saturday, Jules opens the gate before you. He has brought a large coffeepot and a slate: \"Garden of memory — come in, even if you don't know how to garden.\" You place the ledger on the table in the old greenhouse.\n\nThe first visitor came for ROSE's marigolds. She did not know Ada, but her grandmother used to talk about a neighbour who sowed yellow flowers in front of a dark window. The two stories meet. Later, a child asks if plants can drink for two. You hand him a small watering can.\n\nNot everything becomes easy. A pane needs repairing, rotas need organising, learning to let someone else put the tools away. You keep the main batches on site; anyone can come and cultivate a share and add memories to the ledger. The garden becomes a shared responsibility, with appointments you end up keeping.\n\nAda calls you from Madeleine's kitchen. Jules holds the fountain up to the phone for her to hear, then you tell her about the first morning. She stays silent for a moment. \"So,\" she says at last, \"I'll be able to stay here a little longer.\"\n\nYou understand that by giving the stories a home, you have also allowed their keeper to leave. In the evening, before closing the greenhouse, you find a new envelope on the table. Someone has written a name on it. There is still plenty of room in the ledger.",
      },
      {
        choiceId: "graines-voyageuses",
        title: "The Gardens That Answer Each Other",
        text: "The following week, the greenhouse table is covered with envelopes. With Jules, you copy out the names, the advice and the little stories. Each batch leaves with a blank page: the person who receives it can write down what grew at her house. A reserve stock and the original ledger stay safe in the greenhouse.\n\nThe first packets travel to Lucie's vegetable garden, to Sami's balcony and to the schoolyard. No one promises that every seed will take. You simply agree to keep in touch and to share whatever harvests can be shared. The legacy no longer has a single garden: it lies in the paths the neighbours are starting to make toward one another.\n\nIn spring, you receive a letter from Madeleine. In a photograph, Ada is holding a small pot of marigolds in front of her new window. On the back: \"These come from our place now. I've added a line to ROSE's story.\"\n\nJules hangs a map of the village in the workshop. Threads connect the houses where seeds were entrusted. A child asks if he can add his aunt's house, farther away. You hand him the pencil.\n\nThe greenhouse has emptied a little, but it has lost none of its warmth. When you open the ledger to file the first replies, the old names are still there. New handwriting is beginning to answer them.",
      },
    ],
  },
};
