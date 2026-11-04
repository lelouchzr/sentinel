import type { Room } from "../game.ts";
import { artwork } from "./art.ts";

export const observatory: Room = {
  title: "Moonwatch",
  description:
    "An astronomer left the village entrusting you with her observatory. Recover her observations, restore the optics, and discover what she wishes to preserve beneath the night sky.",
  story:
    "Since her departure, the villagers still call this house \"Aline's place.\" Aline Perrin spent years there observing the sky and welcoming the curious. Then she closed her shutters, returned her books, and left the village. In her last card, she tells you she is staying with her friend Salomé, in the valley, and that she will pick up her mail at her own pace. She entrusts you with the keys to Moonwatch.\n\n\"I left my observations and a letter for you. The optics need a small overhaul; all the instructions are on site. Go through the house before deciding what you wish to do with my notes. You will better understand my proposal from the terrace.\"\n\nYou arrive at the start of a clear night, after the rain. The village lights its windows below. Behind the porthole, the great telescope has remained pointed at its adjustment target. A cupboard, a chest, and a stopped clock are familiar to you: you helped Aline repaint this room one summer. This time, she leaves you time to look without guiding your shoulder.",
  theme: "mystere",
  difficulty: "intermediaire",
  duration: 30,
  ...artwork("vigie-base"),
  provenance: { method: "manual", model: null, generatedAt: null },
  chapters: [
    {
      id: "vigie",
      title: "The house beneath the sky",
      subtitle: "The first landmarks are at eye level.",
      objective:
        "Find the set of keys and the telescope ring to access the archives.",
      story:
        "The air in the observatory keeps a coolness of stone. Aline has covered her armchair, tidied the cables, and left a square of felt beneath each small tool. Her departure was prepared with the same patience she brought to her observing sessions.\n\nNear the porthole, a strip of paper bears three journal headings. At the clock, a note sticks out beneath the frame. Aline used this dial to set meeting times, then ended up hanging on it everything she did not want to forget. The chest remains closed; the great telescope awaits a part kept in the cupboard. You can start with the two notes, before touching the instrument.",
      ...artwork("vigie-base"),
      requires: [],
      unlockMessage:
        "You enter the observatory. The notes at the porthole and the clock are the first landmarks left by Aline.",
      ambience: "rain",
    },
    {
      id: "archives",
      title: "The nights preserved",
      subtitle:
        "Observations, drafts, and a letter left at the desk.",
      objective:
        "Find the notebook and use its headings to open the desk.",
      story:
        "The archives occupy the narrowest room in the house. On the shelves, the notebooks have been bound with different fabrics; a ribbon marks the latest volume. The globe in the corner served as a stand for a small map of the garden. Aline liked to bring together the things she saw in a single glance, even when they did not fit on the same map.\n\nThe desk is locked. An envelope addressed to you can be seen behind its glass, near two keys. On top, the desk pad bears marks left by visitors' cups. The house still feels inhabited by all the evenings when someone came to ask a question.",
      ...artwork("vigie-archives"),
      requires: ["v-porte-archives"],
      unlockMessage:
        "The set of keys opens the archives. A bookcase, a locked desk, and a globe await you.",
      ambience: "dust",
    },
    {
      id: "atelier-optique",
      title: "A well-adjusted light",
      subtitle: "Aline prepared the parts and left the steps to follow.",
      objective:
        "Collect the optics, then return to the observatory to test the great telescope.",
      story:
        "The workshop smells of waxed wood and dry linen. In the center, lenses wait in their closed cases. The left-hand cupboard holds the tools; on the right, the copper case protects the optics frame. A maintenance sheet has been attached to the workbench. You will not have to invent the adjustments: Aline prepared them for you.\n\nThe back door leads to the terrace. Before opening it, she asks you to bring the complete optics back to the observatory and check its sharpness on the target set up in the courtyard. The old telescope must be ready to welcome a next visit, whatever future you give to her notebooks.",
      ...artwork("vigie-optique"),
      requires: ["v-porte-atelier"],
      unlockMessage:
        "The workshop opens. The cases and the maintenance sheet give all the necessary instructions.",
      ambience: "dust",
    },
    {
      id: "terrasse",
      title: "The garden under the stars",
      subtitle: "A final letter gives meaning to the observations.",
      objective:
        "Read the terrace notes and choose how to carry on Aline's work.",
      story:
        "The roof shelters you from the wind. The small terrace telescope has remained in place, beside a lectern and a box. It was used for visits, while the great instrument in the observatory was reserved for longer surveys. Aline had set two stools here so that no one would feel rushed to give up their place.\n\nBelow, a rectangle of garden stays dark among the lit houses. You recognize it on the maps in the notebook. A smell of damp earth rises to you. The last letter is in the box; Aline simply asks you to first read what she placed on the lectern and to look through the small instrument.",
      ...artwork("vigie-terrasse"),
      requires: ["v-porte-terrasse"],
      unlockMessage:
        "The test is finished. You open the terrace onto a calm night and a garden left in shadow.",
      ambience: "stars",
    },
  ],
  objects: [
    {
      id: "v-hublot",
      chapterId: "vigie",
      name: "The porthole headings",
      prompt: "Read the strip of paper near the porthole",
      action: "inspect",
      region: { x: 0.02, y: 0.03, w: 0.24, h: 0.35 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Aline, on a strip of paper",
      message:
        "Three labels are copied onto a strip of paper: \"MIST — 4,\" \"MOON — 2,\" \"FIREFLY — 7.\" A note from Aline explains: \"These figures are the markers of my old files. They are also used for the chest padlock. The note at the clock will give you the order of the headings.\"\n\nBeneath the paper, she added an ordinary observation: \"That evening, we spent twenty minutes talking about a reflection on the glass before thinking of opening it. I loved those twenty minutes.\"\n\nYou half-open the shutter to let the damp from the rain dry. A small adjustment target is set up in the courtyard: it is toward this that the great telescope will need to be checked after the repair.",
      lockedMessage: "A strip of paper is attached just beside the porthole.",
      hint: "The pairs are mist 4, moon 2, firefly 7. Look for the order at the clock.",
    },
    {
      id: "v-horloge",
      chapterId: "vigie",
      name: "The clock note",
      prompt: "Take down the note beneath the dial",
      action: "inspect",
      region: { x: 0.48, y: 0.28, w: 0.1, h: 0.22 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Aline, near the dial",
      message:
        "Aline removed the battery before her departure. The note beneath the dial speaks of the chest: \"Take the figures for the headings in this exact order: MOON, then MIST, then FIREFLY. The values are on the porthole paper. One figure per heading is enough.\"\n\nAnother line is addressed to the person who gave her the clock: \"I will take it with me on my next visit. Salomé has only one that works, and we already arrive early for our walks.\"\n\nYou picture Aline in an unfamiliar kitchen, telling the same story of the too-loud dial. She left details of her life to come among the instructions, as if to keep you company during the visit.",
      lockedMessage:
        "The note can be read without setting the clock going again.",
      hint: "The order is moon, mist, firefly. Replace these words with the figures from the porthole.",
    },
    {
      id: "v-coffre",
      animation: "lid",
      chapterId: "vigie",
      name: "The observatory chest",
      prompt: "Enter the code of the three headings",
      action: "code",
      region: { x: 0.56, y: 0.74, w: 0.14, h: 0.14 },
      requires: ["v-hublot", "v-horloge"],
      code: "247",
      itemName: "Observatory set of keys",
      speaker: "Aline, in a first letter",
      message:
        "The chest contains a set of keys, envelopes, and a recent letter.\n\n\"I arrived safely at Salomé's. Her house looks over meadows and she claims she is missing someone to watch her bean plants. I take this mission seriously. I chose to step away from the village for a few months; I will tell you more when my days have found their rhythm.\n\nFor the notebooks, start with the archives. Before that, take from the cupboard the centering ring for the great telescope. I removed it while cleaning. The optics are stored in the workshop, and its sheet will guide you.\n\nThank you for making the house fit to welcome visitors again. I would like the nights spent here to still be of use to someone.\"\n\nThe set of keys bears two labels: \"cupboard\" and \"archives.\"",
      lockedMessage:
        "The padlock awaits the figures from the porthole in the order written at the clock.",
      hint: "Moon 2, mist 4, firefly 7: enter 247.",
    },
    {
      id: "v-armoire",
      chapterId: "vigie",
      name: "The instrument cupboard",
      prompt: "Collect the centering ring",
      action: "unlock",
      region: { x: 0.2, y: 0.36, w: 0.19, h: 0.44 },
      requires: ["v-coffre"],
      code: null,
      itemName: "Centering ring",
      message:
        "The cupboard key opens a narrow wooden door. The centering ring is wrapped in felt, with a sheet: \"To keep for the return from the workshop. The optics frame slides into this ring, then the two knobs hold it. The mounting mark is already adjusted.\"\n\nA small visitors' book occupies the rest of the shelf. Visitors wrote their first name in it and what they wished to see again. One child asked for \"the same thing, but for longer.\" A baker had drawn the moon on the back of an order list.\n\nAline marked the last page: \"I would like one day to find again the place of the person watching for the first time.\" You take the ring; the archives key is still on the set of keys.",
      lockedMessage:
        "The set of keys stored in the chest contains the cupboard key.",
      hint: "Open the chest, then take the ring: you will use it after the visit to the workshop.",
    },
    {
      id: "v-porte-archives",
      chapterId: "vigie",
      name: "The archives door",
      prompt: "Enter the notebooks room",
      action: "unlock",
      region: { x: 0.77, y: 0.15, w: 0.2, h: 0.73 },
      requires: ["v-coffre", "v-armoire"],
      code: null,
      itemName: null,
      message:
        "The second key on the set opens the door. Before pushing it, you look at the great telescope. It remains incomplete, but you have the first part and the instructions to return and finish it. You will be able to find this room again from the other locations.\n\nIn the archives, a low lamp lights the desk. Aline left an index within reach, on the bookcase. You recognize her hand-bound notebooks; she said she remembered a night better when she could also remember the fabric of its cover.",
      lockedMessage:
        "Collect the set of keys and the centering ring before moving on to the archives.",
      hint: "The chest contains the set of keys; the cupboard contains the ring to take with you.",
    },
    {
      id: "v-telescope",
      chapterId: "vigie",
      name: "The great telescope to reassemble",
      prompt: "Come back to fit the optics and run the test",
      action: "unlock",
      region: { x: 0.03, y: 0.45, w: 0.15, h: 0.43 },
      requires: ["v-armoire", "v-mecanisme"],
      code: null,
      itemName: "Test sheet completed",
      message:
        "Back in the observatory, you place the optics frame into the ring prepared by Aline. The marks line up. You tighten the two knobs by hand, as the sheet instructs, then you look at the target set up in the courtyard.\n\nThe drawing becomes sharp. You make out the three circles described on the check sheet and tick the \"test finished\" box. No other adjustment is required. The great telescope is ready for upcoming visits.\n\nAt the bottom of the sheet, Aline wrote: \"Thank you for coming back here. I wanted you to know how to restore the instrument before discovering what I observed elsewhere. You can now join the terrace through the workshop. The small telescope there is already ready.\"",
      lockedMessage:
        "The optics are missing. Take the ring from the cupboard, then follow the archives to the workshop before returning here.",
      hint: "Open the copper case in the workshop, then return to this telescope to run the test.",
    },
    {
      id: "v-rayon",
      chapterId: "archives",
      name: "The bookcase index",
      prompt: "Look for the latest notebook in the index",
      action: "inspect",
      region: { x: 0.03, y: 0.06, w: 0.25, h: 0.29 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Aline, in the index",
      message:
        "The index has an underlined entry: \"Latest notebook: blue cover, low shelf, linen ribbon.\" A note asks you to take the volume for the rest of the visit.\n\n\"I started by recording only what I saw in the eyepiece. Then the margins welcomed the weather, the conversations, and where we had placed the chairs. That mixture long seemed disorderly to me. Rereading it, I find in it the conditions of each observation.\n\nThe blue notebook also holds three markers for opening the desk. They are written out in full in the volume, with their number. The small map attached to the globe will give you their order.\"\n\nBeside the index, a lending list bears the first names of several neighbors. Aline left enough to continue them.",
      lockedMessage: "An index lies halfway up the bookcase.",
      hint: "The index points to the blue notebook on the low shelf of this bookcase.",
    },
    {
      id: "v-carnet",
      chapterId: "archives",
      name: "The blue notebook",
      prompt: "Take the notebook marked with a ribbon",
      action: "collect",
      region: { x: 0.04, y: 0.43, w: 0.23, h: 0.31 },
      requires: ["v-rayon"],
      code: null,
      itemName: "Observation notebook",
      message:
        "The ribbon opens the notebook to three sections: “ORCHARD — 8”, “STREAM — 3”, “HEDGE — 5”. Aline added: “For the desk lock, replace the names on the globe map with these numbers.”\n\nThe neighboring pages are more unexpected. In them Aline compares evenings spent on the terrace and in a small garden in the village. She notes the quality of attention as much as the details of the sky: “Three people. One low chair. We waited until everyone was settled. No one asked for the time.”\n\nOn one page, a visitor wrote: “I had looked at your charts without daring to ask what it looked like outside.” Aline circled that sentence. You take the notebook with its readings and these margins she chose to keep.",
      lockedMessage:
        "First check the index to identify the volume Aline is entrusting to you.",
      hint: "The notebook gives orchard 8, stream 3, hedge 5. The order is on the globe.",
    },
    {
      id: "v-globe",
      chapterId: "archives",
      name: "The map attached to the globe",
      prompt: "Read the route on the globe paper",
      action: "inspect",
      region: { x: 0.73, y: 0.32, w: 0.23, h: 0.4 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "The globe carries a small map drawn on folded paper. An arrow links three words, and Aline copied them below to avoid any ambiguity: “HEDGE, then ORCHARD, then STREAM”.\n\nA box gives the desk instruction: “Keep this order and use the numbers from the blue notebook. You need no other map.”\n\nOn the back, she tells how Salomé had offered her this globe for her fiftieth birthday. They had spent the evening looking for a village too small to appear on it. Salomé had ended up sticking a dot at its approximate location. Next to the map, that small piece of paper is still holding. Aline carried it everywhere she moved her books.",
      lockedMessage: "The paper attached to the globe can be read as soon as you arrive.",
      hint: "The order is hedge, orchard, stream. Take their numbers from the blue notebook.",
    },
    {
      id: "v-bureau",
      animation: "drawer",
      chapterId: "archives",
      name: "The letter desk",
      prompt: "Open the desk with the map route",
      action: "code",
      region: { x: 0.53, y: 0.6, w: 0.13, h: 0.12 },
      requires: ["v-carnet", "v-globe"],
      code: "583",
      itemName: "Workshop and terrace keys",
      speaker: "Aline, in the desk letter",
      message:
        "The glass lifts. You take the keys and unfold the letter.\n\n“When visits became frequent, I wanted to welcome everyone well. I added sessions, answered mail in the morning and prepared charts in the afternoon. I loved that work. I realized I was hardly looking at the sky for myself anymore.\n\nSo I would go walking in the garden behind the house with green shutters. Its owners would lend me a chair there. They agreed that I could sometimes invite one or two people. That is where I resumed the notes in this notebook.\n\nI would like to continue them, and I am leaving two proposals in the terrace chest. Before choosing, please restore the large telescope. The cases in the workshop and its sheet give the code for the optical housing. Thank you for taking this time.”",
      lockedMessage:
        "The desk awaits the three numbers from the notebook, in the order of the map attached to the globe.",
      hint: "Hedge 5, orchard 8, stream 3: enter 583.",
    },
    {
      id: "v-porte-atelier",
      chapterId: "archives",
      name: "The workshop door",
      prompt: "Open the lens room",
      action: "unlock",
      region: { x: 0.37, y: 0.2, w: 0.16, h: 0.39 },
      requires: ["v-bureau"],
      code: null,
      itemName: null,
      message:
        "One of the keys from the desk is marked “workshop”. The lock turns easily. You keep the blue notebook with you; its pages will be needed on the terrace once both instruments are ready.\n\nOn the inside door, a tracking sheet has two boxes: “optical frame recovered” and “test carried out in the watchtower”. Aline left the pencil on its string. You smile at this way of entrusting you with a task: the steps are prepared, and she held back from adding a note between every line. The next room holds everything you need.",
      lockedMessage: "The workshop keys are kept in the locked desk.",
      hint: "Open the desk with the code from the blue notebook and the globe map.",
    },
    {
      id: "v-lentilles",
      chapterId: "atelier-optique",
      name: "The lens cases",
      prompt: "Read the marks on the three cases",
      action: "inspect",
      region: { x: 0.35, y: 0.67, w: 0.28, h: 0.12 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "The cases rest on a clean cloth. Their labels are copied onto the workbench sheet: “CLEAR — 2”, “BLUE — 9”, “AMBER — 6”. A note explains that these marks open the copper housing; the entry order is in the tool cabinet.\n\nThe lenses themselves are already cleaned and protected. You leave their lids in place. Aline prepared a complete frame that mounts without separating the glass; it is this frame that the housing holds.\n\nUnder the cloth, an old photograph shows the same table cluttered with cups. On the back: “First workshop. In the end we spent the evening repairing the lamp. The telescope waited until the next day.”",
      lockedMessage: "The sheet by the cases is available as soon as you enter.",
      hint: "Note clear 2, blue 9, amber 6. The tool cabinet gives their order.",
    },
    {
      id: "v-outils",
      chapterId: "atelier-optique",
      name: "The tool cabinet",
      prompt: "Take the assembly sheet and the felt",
      action: "collect",
      region: { x: 0.03, y: 0.14, w: 0.25, h: 0.55 },
      requires: [],
      code: null,
      itemName: "Assembly sheet and felt",
      speaker: "Aline, on the assembly sheet",
      message:
        "The cabinet is not locked. Inside you find a transport felt and a sheet: “Housing code: CLEAR, then BLUE, then AMBER. Enter the number from each case in this order.”\n\nThe rest describes the assembly: wrap the frame in the felt, carry it back to the large telescope in the watchtower, fit it into the centering ring, tighten the two knobs by hand. The check is done on the courtyard target; a sharp image of the three circles completes the test.\n\nIn the margin, Aline added: “I already adjusted the frame. Just take the time to check. The most useful tools tonight will be your hands and a clear table.” You fold the felt around the sheet.",
      lockedMessage:
        "The tool cabinet is simply pushed shut, ready to be opened.",
      hint: "The sheet gives the order clear, blue, amber. Match it to the numbers on the cases.",
    },
    {
      id: "v-mecanisme",
      animation: "light",
      chapterId: "atelier-optique",
      name: "The copper housing",
      prompt: "Open the housing and take the optical frame",
      action: "code",
      region: { x: 0.72, y: 0.33, w: 0.22, h: 0.48 },
      requires: ["v-lentilles", "v-outils"],
      code: "296",
      itemName: "Optical frame ready to mount",
      message:
        "The mechanism releases the copper lid. The optical frame is held in a felt cradle; the two knobs are already loosened by a few turns for mounting. You lift it by its handles and wrap it without touching the glass.\n\nA paper rests in the empty cradle: “Now return to the watchtower. The ring from the cabinet and this frame will restore the large telescope. Test it on the courtyard target, then come back to open the terrace from the workshop.”\n\nYou check the first box on the tracking sheet. Next to the second, Aline drew the watchtower armchair, the one that creaks when you sit down too fast. The way back is now familiar to you.",
      lockedMessage:
        "The housing awaits the three marks from the cases in the order given by the cabinet sheet.",
      hint: "Clear 2, blue 9, amber 6: enter 296, then return to the large telescope in the watchtower.",
    },
    {
      id: "v-porte-terrasse",
      chapterId: "atelier-optique",
      name: "The terrace door",
      prompt: "Open after testing the instrument",
      action: "unlock",
      region: { x: 0.44, y: 0.31, w: 0.1, h: 0.3 },
      requires: ["v-mecanisme", "v-telescope"],
      code: null,
      itemName: null,
      message:
        "The sheet now bears both checks. You recovered the frame and carried out the test in the watchtower. You put the felt away on the workbench, then take the second key from the desk.\n\nThe door opens onto the terrace. In the night, the small telescope waits by the lectern. A paper holds the pages down so they will not blow away: “Start with the notes on the lectern. Then look through the small instrument. The chest will give you my proposal once you have taken your time.”\n\nYou leave the workshop light behind you. The terrace gradually takes shape: a stool, the edge of the roof, then the garden Aline described in her margins.",
      lockedMessage:
        "Aline asks you to finish the test: take the frame to the workshop, then return to the large telescope in the watchtower.",
      hint: "After the 296 code, go back to solve the large telescope in the watchtower, then return to this door.",
    },
    {
      id: "v-pupitre",
      chapterId: "terrasse",
      name: "The lectern notes",
      prompt: "Compare the sheets with the blue notebook",
      action: "inspect",
      region: { x: 0.19, y: 0.71, w: 0.47, h: 0.11 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "The lectern sheets match the last pages of the notebook. Aline prepared a legible copy of her readings: date of each session, sky conditions, drawing and remarks. Another sheet keeps the stories of the small evenings in the garden.\n\n“These two sets both appeal to me, she writes. The readings could join the library archives. The stories make me want to keep the garden alive, with little light and modest visits. I can help you begin with one or the other.”\n\nThe small telescope is pointed at the group of stars drawn on the first sheet. Aline invites you to quietly compare the drawing with what you see. No names to know, no answer to calculate: you simply have a gaze to lend.",
      lockedMessage:
        "The lectern sheets can be read as soon as you arrive on the terrace.",
      hint: "Read these notes before looking through the small telescope, then open the chest.",
    },
    {
      id: "v-petite-lunette",
      animation: "light",
      chapterId: "terrasse",
      name: "The small terrace telescope",
      prompt: "Look at the sky shown in the drawing",
      action: "inspect",
      region: { x: 0.05, y: 0.39, w: 0.25, h: 0.39 },
      requires: ["v-pupitre"],
      code: null,
      itemName: null,
      message:
        "You pull the stool closer. The group of stars looks like the drawing on the lectern, with its fainter points you must wait a little to make out. You understand why Aline planned for two seats: staying here mostly requires being able to feel comfortable.\n\nA note is tied to the foot of the instrument. “The first time I came to this house, I said I would return when I knew more. The person welcoming me offered me a chair. That is the gesture I would like to keep.”\n\nYou lower your eyes toward the garden. The benches now appear in the shadows. Aline had found there that same available time. The chest can be opened; its last letter is for you.",
      lockedMessage:
        "The lectern explains what Aline invites you to look at and why she prepared this session.",
      hint: "Read the lectern sheets, then take a moment at the small telescope.",
    },
    {
      id: "v-coffret",
      animation: "lid",
      chapterId: "terrasse",
      name: "Aline’s last letter",
      prompt: "Lift the lid of the chest",
      action: "collect",
      region: { x: 0.73, y: 0.66, w: 0.21, h: 0.3 },
      requires: ["v-petite-lunette"],
      code: null,
      itemName: "Letter and two proposals",
      speaker: "Aline, in the last letter",
      message:
        "The chest opens without a key. Two folders accompany the letter.\n\n“You have my observations and you now know the garden. If you would like to pass the readings on to the library, I have prepared the copies and notes. You can organize a first reading evening there, then invite interested people to the watchtower.\n\nIf you would rather begin by protecting the garden’s tranquility, its owners agree to keep its evenings without additional lighting. They would like someone to care for the benches and welcome small visits. The pages in this folder gather our ideas.\n\nI offer you a first step, sized to the time you have. I will return for a few days in spring. I hope then to sit beside you and ask what you have seen since I left. Aline.”",
      lockedMessage:
        "Aline invites you to read the lectern and look through the small telescope before opening her last letter.",
      hint: "After the lectern notes and the observation with the small telescope, open the chest.",
    },
    {
      id: "v-decision",
      chapterId: "terrasse",
      name: "The page you will carry on",
      prompt: "Choose the first follow-up to give to the notes",
      action: "choose",
      region: { x: 0.25, y: 0.83, w: 0.3, h: 0.07 },
      requires: ["v-pupitre", "v-petite-lunette", "v-coffret"],
      code: null,
      itemName: null,
      message:
        "You lay out the two folders on the lectern. The copies of the observations are ready to join the library; the garden pages describe more discreet gatherings and the care to give the place. You restored the main instrument, found the notes and read the whole letter.\n\nAline invites you to begin with the project you wish to devote your time to. You will choose the details later with the people concerned. On a blank postcard, you prepare the first words of your reply.",
      lockedMessage:
        "Read the notes, look through the small telescope and read the last letter.",
      hint: "The two projects open the gate. Choose the one you wish to begin.",
      choices: [
        {
          id: "transmettre",
          label: "Pass the observations on to the library",
          reply:
            "You gather the copies and notes to offer them to the village library.",
        },
        {
          id: "jardin",
          label: "Preserve the calm of the night garden",
          reply:
            "You take the garden folder to prepare small evenings and preserve its darkness.",
        },
      ],
    },
    {
      id: "v-portillon",
      chapterId: "terrasse",
      name: "The gate on the way back",
      prompt: "Go back down with your reply for Aline",
      action: "exit",
      region: { x: 0.4, y: 0.5, w: 0.19, h: 0.18 },
      requires: ["v-decision"],
      code: null,
      itemName: null,
      message:
        "You close the chest and put the sheets safely away. On the card, you write that the large telescope works again, that you took the time to look and that you chose where to begin.\n\nThe gate opens onto the familiar staircase, softly lit by the house windows. You will walk down to the village with a folder under your arm. You no longer have to imagine the reasons for Aline’s departure: she entrusted them to you. You have a letter to send and a first meeting to prepare.",
      lockedMessage:
        "First choose on the lectern the project you wish to begin.",
      hint: "Make your decision on the lectern page, then open the gate.",
    },
  ],
  ending: {
    sourceObjectId: "v-decision",
    variants: [
      {
        choiceId: "transmettre",
        title: "Nights to share",
        text: "You bring the copies to the library. The person who greets you recognizes several first names in the margins: Aline’s notebooks already belong a little to the village’s memories. You suggest a first evening around the drawings and stories, with a few seats and time for questions.\n\nYou keep the notices with the readings, along with the distinction Aline prepared between her observations, her trials and her impressions. The next pages can bear other names. The large telescope in the watchtower is ready; you agree to consider everyone’s wishes before adding gatherings.\n\nA few days later, Aline replies to your card. Salomé has set up a bench near her beans, she writes, and she has started drawing in the evening again. She thanks you for giving her notes a place without automatically giving her the role of lecturer. In spring, she will come as she promised.\n\nYou file her reply in the blue notebook. On the next page, you note the date of the first meeting. Moonwatch keeps its name, with a new person to open the door and offer a chair.",
      },
      {
        choiceId: "jardin",
        title: "A chair in the night",
        text: "You meet the garden owners with the folder prepared by Aline. Together you reread the ideas for small visits, the layout of the benches and the paths to leave clear. You decide to begin with a single evening, with a few people who already know the place.\n\nThe extra lights stay put away. You check the seats, prepare blankets and leave room for anyone who simply wants to listen. The observations remain available at the watchtower; the blue notebook can also accompany the evenings in the garden. You begin by caring for the conditions in which Aline loved to look.\n\nIn your reply, you tell her about the sound of the gate and the time spent at the small telescope. She writes a few days later that she would like to bring a cake for the next visit. You save her a chair, without asking her to prepare a presentation.\n\nOn the agreed evening, everyone arrives with a different question. You show where to put things, then you sit down too. Above the hedge, the sky opens between two clouds. Someone asks if we can stay a little longer. You planned for the time.",
      },
    ],
  },
};
