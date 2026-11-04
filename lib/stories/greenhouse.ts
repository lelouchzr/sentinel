import type { Room } from "../game.ts";
import { artwork } from "./art.ts";

export const greenhouse: Room = {
  title: "Le Secret de la serre",
  description:
    "Ada vous confie sa serre avant de quitter le village. Entre lettres oubliées, passages sous les racines et graines soigneusement nommées, découvrez ce qu’elle a passé sa vie à préserver, puis choisissez comment cet héritage continuera de vivre.",
  story:
    "La lettre est arrivée hier, dans une enveloppe qui sentait le thym. « Venez avant le lever du jour. J’ai laissé la porte de la serre ouverte. Vous trouverez ce que je n’ai jamais réussi à expliquer au village. » Ada, la gardienne des jardins, signe toujours ses messages d’une petite feuille dessinée. Cette fois, la feuille ressemble à une main qui salue.\n\nVous l’avez connue lorsque vous étiez enfant : elle vous laissait arroser les tomates et ne disait jamais qu’une question était bête. Puis les années ont passé. Vous avez appris son départ par les voisins, ainsi que cette étrange rumeur : la vieille serre cacherait un héritage qu’Ada refusait de vendre.\n\nÀ l’intérieur, la fraîcheur du matin retient encore la nuit. Un arrosoir attend sur une table, un coffre occupe le centre de la pièce et une horloge semble veiller sur les plantes. La porte vitrée du fond mène à l’atelier. Ada n’est pas là, mais quelqu’un a préparé votre visite avec soin.\n\nAu bas de sa lettre, elle a ajouté : « Ne vous pressez pas pour trouver la sortie. Ce qui compte, c’est de comprendre ce que vous emporterez. »",
  theme: "cosy",
  difficulty: "intermediaire",
  duration: 30,
  ...artwork("serre-base"),
  provenance: { method: "manual", model: null, generatedAt: null },
  chapters: [
    {
      id: "serre",
      title: "I. Ce qui attend sous verre",
      subtitle: "Une invitation et un coffre qui attend",
      objective:
        "Retrouvez la clé de l’atelier en rapprochant les deux notes laissées par Ada.",
      story:
        "La serre conserve les petits bruits que vous aviez oubliés : une goutte dans une soucoupe, le froissement d’une feuille contre une vitre, le craquement tranquille d’un meuble. Rien ne donne l’impression d’un lieu abandonné. Les outils ont été nettoyés et les pots arrosés.\n\nUn carton porte votre prénom près de l’arrosoir. Le coffre central est fermé par une petite serrure de laiton. Vous avez beau chercher du regard, aucune clé n’attend au crochet voisin. Sur le meuble vert, en revanche, une serrure à trois chiffres paraît récente.\n\nDepuis l’allée extérieure, une voix basse vous appelle. « Vous êtes la personne qu’Ada attendait ? Je suis Jules, son voisin. Elle m’a demandé de rester près du jardin jusqu’à votre arrivée. Elle disait que certaines choses se comprennent mieux en les découvrant. » Puis le gravier crisse : il vous laisse explorer.\n\nAda n’a pas transformé sa maison en épreuve. Elle vous a laissé les habitudes d’un métier, assez précises pour que vous puissiez reprendre les gestes après elle.",
      ...artwork("serre-base"),
      requires: [],
      unlockMessage:
        "Vous poussez la porte de la serre. L’invitation d’Ada vous attend près de l’arrosoir.",
      ambience: "leaves",
    },
    {
      id: "atelier",
      title: "II. Les mains de la gardienne",
      subtitle: "Le carnet des récoltes et la nuit de la crue",
      objective:
        "Comprenez le circuit d’eau et ouvrez la boîte qui contient l’outil du passage.",
      story:
        "L’atelier sent la terre sèche, la cire et le papier. Le bureau est couvert de petites réparations achevées : une anse cousue, un manche poli, une enveloppe recollée. Ada s’occupait des objets avec la même patience que des plantes.\n\nSur l’étagère, les flacons servent de poids à une fiche technique. Au centre, une boîte métallique attend sous un carré de tissu. La porte de bois au fond est gonflée par l’humidité ; une mince fraîcheur s’échappe dessous.\n\nLe carnet ouvert sur le bureau évoque une crue ancienne. Vous étiez trop jeune pour vous en souvenir. Au village, on racontait qu’Ada avait fermé ses jardins après cette nuit-là. Le récit paraissait simple : trop de dégâts, trop peu d’argent. Pourtant les pages montrent des visites, des récoltes et des échanges pendant toutes les années suivantes.\n\nEntre deux feuillets, vous reconnaissez l’écriture ronde de Jules. Ada n’a peut-être jamais travaillé aussi seule que vous le pensiez. Pour comprendre ce qu’ils ont sauvé ensemble, il faudra descendre là où passait l’eau.",
      ...artwork("serre-atelier"),
      requires: ["serre-porte"],
      unlockMessage:
        "La clé tourne. Dans l’atelier, le carnet d’Ada est ouvert au récit d’une nuit de crue.",
      ambience: "dust",
    },
    {
      id: "passage",
      title: "III. Sous les racines",
      subtitle: "Une eau retenue et quatre lignes pour un prénom",
      objective:
        "Rétablissez l’eau, trouvez la petite clé, puis retournez ouvrir le coffre de la serre.",
      story:
        "Quelques marches conduisent sous l’atelier. Les briques arrondies par le temps dessinent un passage assez large pour une brouette. Une lampe éclaire la vanne centrale, et le ruissellement donne à l’endroit une respiration régulière.\n\nÀ droite, un casier de métal a été fixé au-dessus de l’ancienne marque des eaux. Au fond, un escalier remonte vers le jardin. Sa grille supérieure est fermée. Vous apercevez au-delà un ciel qui commence à pâlir.\n\nUne étiquette d’Ada, bien protégée de l’humidité, prévient : « Ce passage n’est pas un raccourci. C’est ici que nous avons compris ce qui méritait d’être gardé. » La crue a laissé des traces, mais des mains ont entretenu le lieu depuis. Les joints sont repris, les marches dégagées.\n\nJules vous entend depuis l’autre côté de la grille. « Elle m’a fait promettre de ne pas vous donner la réponse. Mais je peux vous dire ceci : le coffre n’est pas un trésor de famille. Du moins, pas d’une seule famille. » Il vous encourage à examiner la vanne avant de poursuivre.",
      ...artwork("serre-passage"),
      requires: ["atelier-porte"],
      unlockMessage:
        "La porte de bois s’ouvre sur un passage de briques. Le jardin se trouve de l’autre côté.",
      ambience: "rain",
    },
    {
      id: "jardin",
      title: "IV. Ce qui peut recommencer",
      subtitle: "L’héritage trouve enfin un avenir",
      objective:
        "Rendez l’eau au jardin, rencontrez son histoire et choisissez la forme de sa transmission.",
      story:
        "La grille s’ouvre au moment où le jour touche les dernières vitres de la serre. Le jardin n’est pas immense. Un banc, une fontaine et quelques parterres suffisent à lui donner l’air d’un lieu où l’on peut parler longtemps.\n\nJules est assis près du portail avec deux tasses enveloppées dans un torchon. « Ada est bien arrivée chez sa sœur, dit-il. Elle vous aurait accueilli elle-même si elle n’avait pas eu si peur de changer d’avis. Elle aime ce village. Partir lui coûte davantage qu’elle ne le montre. »\n\nVous lui racontez les noms du coffre. Il hoche la tête. « Les habitants croyaient qu’elle gardait des variétés rares. Certains le sont, sans doute. Mais regardez les fiches : ce sont surtout des repas, des voix, des moments où quelqu’un a voulu remercier quelqu’un d’autre. »\n\nUne dernière enveloppe vous attend sur le banc. Ada ne vous a légué ni une obligation ni un secret à garder pour vous. Elle vous a confié une possibilité. Avant que le portail s’ouvre sur la matinée ordinaire du village, il reste à lui donner une forme.",
      ...artwork("serre-jardin"),
      requires: ["passage-escalier"],
      unlockMessage:
        "Au-delà de la grille, Jules vous attend dans le jardin. Le jour commence à se lever.",
      ambience: "petals",
    },
  ],
  objects: [
    {
      id: "serre-lettre",
      chapterId: "serre",
      name: "La lettre près de l’arrosoir",
      prompt: "Lire le carton à votre nom",
      action: "inspect",
      region: { x: 0.06, y: 0.53, w: 0.24, h: 0.22 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "« Vous voilà. Je sais, j’aurais pu vous remettre une clé autour d’un thé. Mais il vous aurait manqué le temps passé ici. Prenez-le.\n\nLe meuble vert contient la clé de mon atelier. Son code suit l’ordre dans lequel ma mère semait les fleurs : CAPUCINE, puis SOUCI, puis BOURRACHE. Il faut un chiffre par fleur. J’ai laissé les quantités de son petit semis derrière la porte de l’horloge ; elles n’y sont pas rangées dans cet ordre.\n\nLe coffre central attendra. Sa petite clé est restée dans le casier du passage souterrain, après la crue. Ce qu’il protège a besoin d’être compris avant d’être ouvert.\n\nAda. »\n\nSous la signature, une phrase plus récente apparaît : « Votre premier arrosoir était trop lourd. Vous aviez demandé si les plantes pouvaient boire à deux. Je n’ai pas oublié. » Vous reposez le carton avec plus de douceur que vous ne l’avez pris.",
      lockedMessage: "Le carton est posé à côté de l’arrosoir.",
      hint: "La lettre donne l’ordre des fleurs pour le meuble vert. Les quantités se trouvent à l’horloge.",
      speaker: "Ada",
    },
    {
      id: "serre-horloge",
      chapterId: "serre",
      name: "L’horloge de la serre",
      prompt: "Ouvrir la petite porte de l’horloge",
      action: "inspect",
      region: { x: 0.4, y: 0.26, w: 0.13, h: 0.19 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "La porte de l’horloge s’ouvre sans résistance. Un feuillet plié protège le balancier ; vous le retirez et le tic-tac reprend. Ada a recopié une ancienne commande :\n\n« Petit semis de Rose — BOURRACHE : 6 graines ; CAPUCINE : 4 graines ; SOUCI : 2 graines. Une seule variété à la fois, on se trompe moins. »\n\nPlus bas, une autre écriture, celle de Jules : « J’ai remis la pendule à l’heure. Ne la laissez plus s’arrêter pour m’épargner le bruit. » Ada a répondu : « Ce n’était pas le bruit. C’était le silence après. Merci d’être revenu. »\n\nLa note n’est ni une énigme ancienne ni un message destiné à des inconnus : ce sont les traces d’une conversation poursuivie pendant des années. Vous savez désormais combien de graines correspondent à chaque fleur. Il reste à les remettre dans l’ordre indiqué près de l’arrosoir.",
      lockedMessage: "La petite porte de l’horloge n’est pas verrouillée.",
      hint: "Les quantités sont bourrache 6, capucine 4, souci 2. La lettre près de l’arrosoir fournit leur ordre.",
    },
    {
      id: "serre-meuble",
      chapterId: "serre",
      name: "Le meuble vert",
      prompt: "Régler les trois chiffres du meuble",
      action: "code",
      region: { x: 0.65, y: 0.54, w: 0.13, h: 0.35 },
      requires: ["serre-lettre", "serre-horloge"],
      code: "426",
      itemName: "Clé de l’atelier",
      message:
        "Les trois roulettes s’alignent. Le meuble s’ouvre sur une clé de fer, des gants reprisés et un sachet de capucines vide, conservé avec autant de soin que la clé.\n\nAda a glissé une lettre sous les gants. « On vous a peut-être parlé d’un héritage. Le mot a couru parce qu’un acheteur voulait les anciennes variétés du jardin. Il m’offrait assez d’argent pour refaire toutes les vitres. J’ai failli accepter. Puis j’ai essayé de rédiger la liste de ce que je lui vendrais. Je n’ai pas réussi à n’y écrire que des noms de plantes.\n\nDans l’atelier, mon carnet vous montrera pourquoi. Si vous trouvez une tache au bas d’une page, ce n’est pas toujours de l’eau. Les jardins nous donnent parfois des raisons de pleurer qui ne sont pas tristes. »\n\nLa clé porte une étiquette de toile : « Atelier — porte vitrée ». Vous la prenez ; les gants restent à leur place, comme si Ada allait encore en avoir besoin demain.",
      lockedMessage:
        "La serrure attend trois chiffres. L’ordre des fleurs et les quantités sont encore à rapprocher.",
      hint: "Capucine, souci, bourrache : prenez leurs quantités dans cet ordre. Vous obtenez 4, puis 2, puis 6.",
      speaker: "Ada",
    },
    {
      id: "serre-coffre",
      chapterId: "serre",
      name: "Le coffre central",
      prompt: "Ouvrir le coffre avec la petite clé",
      action: "unlock",
      region: { x: 0.36, y: 0.59, w: 0.29, h: 0.29 },
      requires: ["passage-casier"],
      code: null,
      itemName: "Registre des semences et clé du jardin",
      message:
        "De retour dans la serre, vous introduisez la petite clé. Le coffre contient des enveloppes de graines et un registre. Chaque variété est accompagnée d’un nom, d’une date et d’une histoire. « Haricot de Lucie : apporté après son premier repas au village. » « Tomate de Sami : graines gardées du jardin de son père. » « Souci de Rose : les fleurs qu’elle semait devant la fenêtre d’Ada. »\n\nLa dernière page raconte enfin la crue. Les habitants avaient mis leurs réserves à l’abri ici. Ada et Jules avaient passé la nuit à sauver les sachets et leurs étiquettes. Certaines récoltes furent perdues ; beaucoup de donateurs sont morts ou partis depuis. Ada a continué à cultiver leurs graines, mais surtout à noter leurs mots. Voilà l’héritage qu’elle refusait de vendre séparément.\n\n« Je n’ai pas gardé le passé intact, écrit-elle. J’ai gardé de quoi lui répondre. Les graines poussent autrement chaque année. Les histoires aussi. »\n\nUne clé de cuivre est attachée au registre : « Grille en haut de l’escalier du passage ». Vous emportez le registre et cette clé vers le jardin.",
      lockedMessage:
        "La petite clé est dans le casier du passage souterrain. Ouvrez d’abord l’atelier et poursuivez votre visite.",
      hint: "Après avoir ouvert le casier du passage, revenez dans ce premier lieu. La petite clé ouvre le coffre central.",
      speaker: "Ada",
    },
    {
      id: "serre-porte",
      chapterId: "serre",
      name: "La porte vitrée",
      prompt: "Entrer dans l’atelier d’Ada",
      action: "unlock",
      region: { x: 0.84, y: 0.13, w: 0.13, h: 0.75 },
      requires: ["serre-meuble"],
      code: null,
      itemName: null,
      message:
        "La clé de fer tourne avec un léger effort. Au moment de pousser la porte, vous remarquez une bande de papier fixée à l’intérieur du montant.\n\n« Si vous avez ouvert le meuble, vous avez déjà fait ce que je vous demandais : rapprocher deux choses que j’avais laissées séparées. Ce sera utile pour le reste. Les souvenirs, eux aussi, ont parfois besoin d’une autre personne pour reprendre leur sens. »\n\nJules vous répond depuis l’allée : « Je reste près du portail. Appelez si vous avez besoin de moi. Ada dit toujours qu’aider quelqu’un ne veut pas dire faire à sa place. C’est bien sa manière, hein ? »\n\nIl rit doucement, puis reprend : « Et si vous cherchez la clé du coffre, elle est vraiment en bas. Je l’ai mise moi-même à l’abri. » L’atelier vous attend derrière la vitre, plus intime et plus désordonné que la serre.",
      lockedMessage:
        "La porte vitrée est fermée. La clé de l’atelier se trouve dans le meuble vert.",
      hint: "Ouvrez le meuble vert avec le code obtenu grâce aux fleurs, puis utilisez la clé ici.",
      speaker: "Jules",
    },
    {
      id: "atelier-carnet",
      chapterId: "atelier",
      name: "Le carnet sur le bureau",
      prompt: "Lire le carnet des récoltes",
      action: "inspect",
      region: { x: 0.14, y: 0.56, w: 0.19, h: 0.16 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Le carnet commence par une dédicace : « À ma mère, Rose, qui conservait les graines dans des enveloppes de lettres. » Ada a noté les récoltes, puis les personnes venues les chercher. Certains noms reviennent pendant trente ans. D’autres n’apparaissent qu’une fois, avec une phrase entière à leur côté.\n\nÀ la page de la crue, l’écriture devient plus pressée. « Jules dit que nous pouvons sauver les sacs si nous fermons l’eau. J’ai voulu emporter les outils. Il m’a rappelé qu’un manche se remplace. Pas ce que les gens nous ont confié. »\n\nLa page suivante décrit la remise en eau du jardin : « Toujours dans cet ordre : isoler la RÉSERVE, purger le BASSIN, alimenter le JARDIN. Les trois numéros des conduites, lus dans cet ordre, ouvrent la boîte de l’outil. La fiche des numéros est sur l’étagère, sous les flacons. »\n\nAda ajoute : « Ce n’est pas un secret de plomberie. C’est pour que la personne qui prend l’outil sache ce qu’elle s’apprête à remettre en marche. »",
      lockedMessage: "Le carnet est ouvert sur le bureau.",
      hint: "Le carnet fixe l’ordre : réserve, bassin, jardin. Cherchez sur l’étagère le numéro de chaque conduite.",
      speaker: "Ada",
    },
    {
      id: "atelier-tiroir",
      chapterId: "atelier",
      name: "Le tiroir entrouvert",
      prompt: "Lire la carte dans le tiroir du bureau",
      action: "inspect",
      region: { x: 0.1, y: 0.74, w: 0.25, h: 0.15 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Une carte postale dépasse du tiroir. Elle montre une mer pâle et porte une date de la semaine dernière.\n\n« Ada, la chambre est prête. Le soleil y entre le matin. Vous pourrez mettre vos boutures sur le rebord, mais je vous préviens : ici, c’est moi qui fais le café. Votre sœur qui vous attend, Madeleine. »\n\nAu dos, Ada a commencé une réponse sans l’envoyer : « J’arrive jeudi. J’ai demandé à quelqu’un de reprendre le fil au jardin. Je pensais qu’en rangeant tout, partir deviendrait facile. C’est faux. Mais aujourd’hui j’ai acheté une valise. C’est déjà quelque chose. »\n\nVous comprenez que sa disparition n’en est pas une. Ada n’a pas préparé une dernière énigme avant de s’évanouir : elle essaie de s’autoriser une autre vie. Cette petite carte, sans code ni instruction, rend son absence beaucoup moins inquiétante. Vous la remettez dans le tiroir, au-dessus d’un billet de train soigneusement plié.",
      lockedMessage:
        "Le tiroir est entrouvert ; la carte peut être lue sans rien déplacer d’autre.",
      hint: "Cette carte éclaire le départ d’Ada. Elle n’est pas nécessaire pour ouvrir la boîte.",
      speaker: "Madeleine et Ada",
    },
    {
      id: "atelier-flacons",
      chapterId: "atelier",
      name: "La fiche sous les flacons",
      prompt: "Dégager la fiche des conduites",
      action: "inspect",
      region: { x: 0.65, y: 0.2, w: 0.29, h: 0.17 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Les flacons sont vides et parfaitement propres. Ils maintiennent une fiche pour l’empêcher de se recourber. Vous la posez à plat :\n\n« Repères des conduites. JARDIN : numéro 5. RÉSERVE : numéro 3. BASSIN : numéro 1. Ces repères n’indiquent pas l’ordre des opérations. Pour cet ordre, consulter le carnet du bureau. »\n\nUne annotation de Jules occupe le bas de la fiche : « La vanne du passage ne doit être manipulée qu’avec la clé plate de la boîte. Quand le circuit sera prêt, un seul quart de tour suffira ; la butée vous arrêtera. Inutile de forcer. »\n\nSur le papier apparaît aussi le dessin maladroit d’une botte pleine d’eau. Ada a écrit dessous : « Souvenir de notre grande compétence pendant la crue. » Malgré le soin presque solennel des préparatifs, ils ont gardé de cette nuit le droit de rire. Vous remettez les flacons en place après avoir relevé les trois numéros.",
      lockedMessage: "La fiche est maintenue par les flacons sur l’étagère.",
      hint: "Les numéros sont jardin 5, réserve 3, bassin 1. Le carnet indique dans quel ordre les utiliser.",
    },
    {
      id: "atelier-boite",
      chapterId: "atelier",
      name: "La boîte métallique",
      prompt: "Entrer les numéros dans l’ordre du circuit",
      action: "code",
      region: { x: 0.4, y: 0.69, w: 0.21, h: 0.18 },
      requires: ["atelier-carnet", "atelier-flacons"],
      code: "315",
      itemName: "Clé plate de la vanne",
      message:
        "Le couvercle se soulève. Une clé plate repose dans un tissu huilé, accompagnée d’une petite poignée pour la porte de bois. Vous fixez la poignée dans son emplacement ; elle avait été retirée pour éviter qu’un visiteur descende avant d’avoir lu les consignes.\n\nAda a laissé un mot sous l’outil : « Le passage est sain et Jules l’a vérifié hier. N’y voyez pas un endroit interdit. Nous y avons simplement laissé trop longtemps des choses que nous n’avions plus le courage de raconter.\n\nVous trouverez la vanne au centre. L’eau a été isolée pour réparer le bassin ; le circuit attend maintenant son quart de tour. Une fois l’eau baissée dans le petit canal, la marche inférieure sera accessible. J’y ai remis le mot que ma mère m’avait appris. Il vous aidera pour le casier. »\n\nVous prenez la clé plate. Son manche est poli par plusieurs mains, et vous reconnaissez sur le tissu la même petite feuille que sur votre invitation.",
      lockedMessage:
        "La boîte demande trois chiffres : les numéros des conduites dans l’ordre donné par le carnet.",
      hint: "Isolez la réserve (3), purgez le bassin (1), alimentez le jardin (5). Le code est 315.",
      speaker: "Ada",
    },
    {
      id: "atelier-porte",
      chapterId: "atelier",
      name: "La porte de bois",
      prompt: "Descendre dans le passage",
      action: "unlock",
      region: { x: 0.18, y: 0.09, w: 0.23, h: 0.44 },
      requires: ["atelier-boite"],
      code: null,
      itemName: null,
      message:
        "Avec sa poignée retrouvée, la porte s’ouvre sans bruit. Une rampe solide longe les marches. Vous saisissez la clé plate et descendez ; à chaque pas, le parfum de l’atelier cède à celui de la pierre humide.\n\nAu revers de la porte, Jules a fixé une note : « Tout est dégagé. La lampe fonctionne. La grille du haut ouvre avec la clé de cuivre, qui est restée dans le coffre de la serre. Il faudra donc remonter chercher ce coffre après le casier. Ada a voulu conserver le trajet tel que nous l’avons fait cette nuit-là : descendre pour sauver, remonter pour comprendre, ressortir pour continuer. »\n\nPlus bas, Ada a ajouté : « Il prétend que c’est moi qui complique les choses. C’est lui qui a trouvé cette phrase. » Vous les imaginez, la veille encore, discuter du meilleur endroit où accrocher ce billet. Le souterrain paraît déjà moins solitaire.",
      lockedMessage:
        "La porte n’a plus sa poignée. Ouvrez la boîte métallique pour la retrouver et prendre l’outil.",
      hint: "La boîte centrale contient l’outil et la poignée nécessaires pour ouvrir ce passage.",
      speaker: "Jules et Ada",
    },
    {
      id: "passage-lampe",
      chapterId: "passage",
      name: "La lampe du passage",
      prompt: "Examiner la lettre près de la lampe",
      action: "inspect",
      region: { x: 0.07, y: 0.22, w: 0.2, h: 0.29 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Une lettre est maintenue derrière le pied de la lampe. L’enveloppe porte : « À Jules, quand je serai partie. » À l’intérieur, Ada a précisé que vous pouviez la lire.\n\n« Tu te souviens de ce que tu m’as dit pendant la crue ? Que nous n’allions pas finir noyés pour des haricots. Tu avais raison. Nous sommes remontés dès que l’eau a atteint la dernière marche. Mais tu es revenu le lendemain avec des bottes sèches, puis le surlendemain avec de nouvelles étiquettes. Je ne t’ai jamais remercié pour les jours d’après. C’est pourtant cela qui m’a permis de continuer.\n\nSi la personne que j’ai invitée décide de garder le jardin ouvert, aide-la. Si elle préfère confier les graines au village, aide-la aussi. Ce que je veux transmettre n’est pas ma manière de tout faire. C’est la possibilité de ne pas faire seul. »\n\nVous repliez la lettre. Au-dessus de vous, Jules toussote dans le jardin, comme s’il avait deviné ce que vous venez de découvrir.",
      lockedMessage: "La lettre est protégée près de la lampe.",
      hint: "Cette lettre éclaire la promesse de Jules. Pour poursuivre, utilisez la clé plate sur la vanne centrale.",
      speaker: "Ada",
    },
    {
      id: "passage-vanne",
      chapterId: "passage",
      name: "La vanne centrale",
      prompt: "Rétablir le circuit avec la clé plate",
      action: "unlock",
      region: { x: 0.33, y: 0.49, w: 0.08, h: 0.19 },
      requires: ["atelier-boite"],
      code: null,
      itemName: null,
      message:
        "La clé plate épouse l’écrou. Vous accompagnez la vanne jusqu’à sa butée, d’un seul quart de tour, comme Jules l’a indiqué. D’abord, il ne se passe rien. Puis un souffle traverse le tuyau et le ruissellement change de direction.\n\nL’eau quitte le petit canal qui longe les marches pour rejoindre la conduite du jardin. Sur la marche inférieure, une pochette cirée émerge peu à peu. Elle était posée assez haut pour rester au sec, mais il aurait fallu marcher dans l’eau pour l’atteindre avant la manœuvre.\n\nDepuis la grille, Jules appelle : « Je l’entends ! Là-haut, il ne restera qu’à ouvrir l’arrivée de la fontaine. Prenez votre temps pour le casier. Le vieux mécanisme aime qu’on lui donne le bon mot. »\n\nVous gardez la clé plate : elle servira encore au jardin. Le passage, privé du bruit de fuite, laisse entendre autre chose : les premiers oiseaux de la matinée.",
      lockedMessage:
        "Il vous faut la clé plate conservée dans la boîte de l’atelier.",
      hint: "La boîte de l’atelier contient le bon outil. Les consignes indiquent un simple quart de tour jusqu’à la butée.",
      speaker: "Jules",
    },
    {
      id: "passage-marche",
      chapterId: "passage",
      name: "La pochette sur la marche basse",
      prompt: "Lire les quatre lignes préservées de l’eau",
      action: "inspect",
      region: { x: 0.56, y: 0.81, w: 0.16, h: 0.1 },
      requires: ["passage-vanne"],
      code: null,
      itemName: null,
      message:
        "Vous ramassez la pochette. Elle contient une copie récente d’un papier beaucoup plus ancien. Ada a inscrit au-dessus : « Ma mère commençait chaque ligne avec une lettre de son prénom. Lisez seulement ces quatre premières lettres, de haut en bas : elles ouvrent le casier. »\n\n« Recevez ce que l’on vous confie.\nOffrez ce que vous pouvez faire pousser.\nSouvenez-vous des mains qui vous l’ont donné.\nEssayez encore après un hiver difficile. »\n\nAu-dessous, Ada raconte : « Je trouvais ces phrases bien trop sérieuses quand j’étais petite. Maman les avait écrites après la perte de sa première récolte. Elle n’avait pas besoin de sagesse : elle avait besoin de recommencer. Elle s’appelait Rose. Vous avez peut-être vu son nom dans mon carnet. »\n\nVous comprenez pourquoi ces lignes ont traversé tant d’années. Elles ne disent pas comment éviter de perdre quelque chose. Elles disent ce qu’il est encore possible de faire ensuite.",
      lockedMessage:
        "La marche basse est encore longée par l’eau. La vanne centrale permettra de dégager l’accès.",
      hint: "Lisez la première lettre de chacune des quatre lignes : R, O, S, E. Le code du casier est ROSE.",
      speaker: "Ada",
    },
    {
      id: "passage-casier",
      chapterId: "passage",
      name: "Le casier au-dessus des eaux",
      prompt: "Entrer le prénom formé par les quatre lignes",
      action: "code",
      region: { x: 0.8, y: 0.6, w: 0.15, h: 0.31 },
      requires: ["passage-marche"],
      code: "ROSE",
      itemName: "Petite clé du coffre",
      message:
        "Les lettres s’alignent et le casier s’ouvre. Une petite clé de laiton pend à un ruban bleu. Son étiquette ne laisse aucun doute : « Coffre central de la serre ». À côté, Jules a rangé deux anciennes étiquettes noircies par l’eau.\n\nSon billet les accompagne : « On a cru pendant longtemps que les graines étaient la chose fragile. En vérité, nous savions en faire pousser d’autres. Les noms, eux, s’effaçaient au premier trempage. Ada a séché ces deux étiquettes dans ses mains toute une nuit, par peur de ne plus se rappeler à qui elles appartenaient. »\n\nAda a ajouté une ligne : « Retournez au coffre. Il vous montrera ce que j’ai fini par comprendre. Vous y trouverez aussi la clé de cuivre pour la grille au sommet de cet escalier. »\n\nVous prenez la petite clé. Le chemin vous est familier maintenant : le passage, l’atelier, la porte vitrée, puis le coffre que vous avez laissé fermé au milieu de la serre.",
      lockedMessage:
        "La serrure demande un mot de quatre lettres. La pochette de la marche basse explique comment le former.",
      hint: "Les premières lettres du texte de la marche donnent ROSE. Après le casier, retournez au coffre de la serre.",
      speaker: "Jules et Ada",
    },
    {
      id: "passage-escalier",
      chapterId: "passage",
      name: "La grille en haut de l’escalier",
      prompt: "Ouvrir la grille du jardin",
      action: "unlock",
      region: { x: 0.58, y: 0.39, w: 0.14, h: 0.35 },
      requires: ["serre-coffre"],
      code: null,
      itemName: null,
      message:
        "Vous revenez au passage avec le registre sous le bras. Cette fois, vous ne cherchez plus un trésor sans nom. Vous portez les traces de personnes qui ont confié un peu de leur vie à ce jardin.\n\nLa clé de cuivre ouvre la grille du premier coup. Jules vous tend la main pour la dernière marche. « Vous avez vu les enveloppes ? Il y a les pois de ma femme. Elle jurait qu’ils étaient meilleurs que tous les autres. C’était probablement surtout la manière dont elle les cuisinait. Ada a écrit sa recette au dos. »\n\nIl laisse passer un silence avant de sourire. « Voilà pourquoi je suis encore ici. Il ne faut pas laisser les histoires devenir plus lourdes que les gens qui les portent. Venez. Le thé refroidit. »\n\nVous franchissez la grille. L’air libre paraît presque tiède après les briques humides. La fontaine est encore silencieuse, mais l’eau attend maintenant derrière son arrivée.",
      lockedMessage:
        "La grille demande la clé de cuivre. Ouvrez le coffre central de la serre avec la clé du casier, puis revenez ici.",
      hint: "Le coffre de la première scène contient la clé de cuivre. Faites cet aller-retour avant de monter au jardin.",
      speaker: "Jules",
    },
    {
      id: "jardin-banc",
      chapterId: "jardin",
      name: "La dernière enveloppe sur le banc",
      prompt: "Lire la lettre qu’Ada vous adresse",
      action: "inspect",
      region: { x: 0.06, y: 0.53, w: 0.27, h: 0.18 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "« Si vous lisez ceci dehors, le jour doit déjà se lever. J’espère que Jules n’a pas oublié le thé.\n\nJe n’ai pas caché une fortune. J’ai gardé les graines de gens qui n’avaient pas toujours de quoi laisser une grande trace. Pendant longtemps, j’ai cru que préserver leurs noms voulait dire ne rien déplacer. Alors la serre est devenue un lieu que personne n’osait plus toucher. Ce n’était pas ce que ma mère m’avait appris.\n\nDeux avenirs me semblent beaux. Vous pouvez rouvrir la serre comme jardin de mémoire : les gens y viendront semer, raconter et apprendre ensemble. Ou vous pouvez confier des lots aux jardins du village : chaque famille gardera une partie des graines et une copie des histoires. Dans les deux cas, conservez les noms. Ils sont le lien entre ce que l’on reçoit et ce que l’on offre.\n\nJe vous laisse choisir avec Jules. Mais d’abord, faites revenir l’eau à la fontaine. J’aimerais imaginer ce bruit quand je prendrai mon premier café chez ma sœur. Ada. »",
      lockedMessage: "L’enveloppe vous attend sur le banc.",
      hint: "Ada autorise deux formes de transmission. Avant de choisir, remettez l’eau à la fontaine et regardez le parterre.",
      speaker: "Ada",
    },
    {
      id: "jardin-fontaine",
      chapterId: "jardin",
      name: "L’arrivée de la fontaine",
      prompt: "Ouvrir l’arrivée avec la clé plate",
      action: "unlock",
      region: { x: 0.3, y: 0.5, w: 0.33, h: 0.22 },
      requires: ["jardin-banc", "passage-vanne"],
      code: null,
      itemName: null,
      message:
        "À la base de la fontaine, vous trouvez l’arrivée qu’Ada a désignée dans sa lettre. Avec la clé plate, vous ouvrez doucement le robinet jusqu’au repère d’arrêt. La conduite a été préparée dans le passage : l’eau monte, hésite, puis retombe dans la vasque avec un bruit clair.\n\nJules ferme les yeux un instant. « Ça faisait des semaines qu’on ne l’avait pas entendue. Ada disait que, sans elle, le jardin avait l’air de retenir sa respiration. » Il sort son téléphone, enregistre quelques secondes et le remet dans sa poche. « Je lui ferai écouter quand elle appellera. »\n\nUn petit filet d’eau rejoint les rigoles du parterre. Vous comprenez leur tracé : elles relient les plants sans effacer leurs différences. Rien n’a poussé miraculeusement pendant votre visite. Ce sont les mêmes feuilles, les mêmes tiges fragiles. Mais quelqu’un pourra désormais s’en occuper demain.",
      lockedMessage:
        "Lisez d’abord la dernière lettre d’Ada. L’eau doit aussi avoir été rétablie dans le passage.",
      hint: "La vanne du passage prépare le circuit. La lettre du banc vous demande d’ouvrir cette arrivée avec la même clé plate.",
      speaker: "Jules",
    },
    {
      id: "jardin-parterre",
      chapterId: "jardin",
      name: "Les premiers sachets du parterre",
      prompt: "Prendre les enveloppes préparées pour vous",
      action: "collect",
      region: { x: 0.7, y: 0.55, w: 0.25, h: 0.3 },
      requires: ["jardin-fontaine"],
      code: null,
      itemName: "Premiers sachets de transmission",
      message:
        "Au bord du parterre, sous une soucoupe retournée, Jules vous montre une boîte à l’abri de l’humidité. Elle contient trois enveloppes neuves : capucine, souci, bourrache. Les mêmes fleurs qui vous ont permis d’ouvrir le meuble vert.\n\n« Ada les a préparées pour la première personne qui accepterait de continuer, explique-t-il. Pas toute la réserve. Juste de quoi commencer sans avoir peur de tout abîmer. » Chaque sachet porte des conseils de semis, un nom et un espace libre : « À votre tour d’ajouter une histoire. »\n\nVous prenez les enveloppes. Sur celle du souci, Ada a noté : « Rose en mettait près de sa fenêtre parce que le matin y arrivait tard. Elle disait que ces fleurs lui avançaient un peu le soleil. »\n\nJules vous tend alors le registre ouvert. « On peut faire de la serre un lieu où les gens se retrouvent, ou faire voyager les graines de jardin en jardin. Vous savez maintenant ce que chacune de ces décisions emporte. Écrivons la première page de la suite. »",
      lockedMessage:
        "Faites d’abord revenir l’eau à la fontaine. Jules vous montrera ensuite les sachets préparés au bord du parterre.",
      hint: "Ouvrez l’arrivée de la fontaine ; les premiers sachets pourront ensuite être pris au parterre.",
      speaker: "Jules",
    },
    {
      id: "jardin-decision",
      chapterId: "jardin",
      name: "Le registre près de la fontaine",
      prompt: "Choisir comment transmettre l’héritage",
      action: "choose",
      region: { x: 0.51, y: 0.69, w: 0.11, h: 0.12 },
      requires: ["jardin-parterre"],
      code: null,
      itemName: null,
      message:
        "À la dernière page du registre, Ada a laissé assez de place pour un projet. Vous en discutez avec Jules. Garder le jardin comme lieu de rencontre donnera une maison aux récits et demandera une présence régulière. Confier des lots aux habitants fera voyager les graines et demandera de garder les liens entre les jardins.\n\nJules pose le stylo à votre portée. « Je peux vous aider pour les deux. Ce que nous écrivons aujourd’hui ne nous interdit pas de changer plus tard. Mais il faut commencer quelque part. »\n\nVous relisez les mots de Rose et choisissez ce que vous allez proposer au village. Ada vous a donné le droit d’en faire une décision vivante, avec des joies, du travail et une place pour d’autres mains.",
      lockedMessage:
        "Lisez la lettre d’Ada, rétablissez l’eau et prenez les premiers sachets avant d’écrire la suite.",
      hint: "Les deux décisions terminent l’aventure et donnent une conclusion différente. Choisissez l’avenir que vous voulez porter.",
      speaker: "Jules",
      choices: [
        {
          id: "jardin-ouvert",
          label: "Rouvrir la serre comme jardin de mémoire",
          reply:
            "Vous inscrivez : « Un jardin ouvert, un rendez-vous chaque semaine, une place pour chaque histoire. » Jules propose le samedi matin. Vous lui confiez le registre pendant que vous préparez les premiers sachets pour les futurs visiteurs. La serre aura une nouvelle manière d’être habitée.",
        },
        {
          id: "graines-voyageuses",
          label: "Confier les graines aux jardins du village",
          reply:
            "Vous inscrivez : « Des graines partagées, des histoires copiées, des jardins qui se répondent. » Jules connaît déjà trois voisins prêts à commencer. Vous préparez les premiers lots en conservant les noms sur chaque enveloppe. L’héritage aura plusieurs maisons.",
        },
      ],
    },
    {
      id: "jardin-portail",
      chapterId: "jardin",
      name: "Le portail du village",
      prompt: "Sortir avec votre promesse",
      action: "exit",
      region: { x: 0.34, y: 0.17, w: 0.29, h: 0.31 },
      requires: ["jardin-decision"],
      code: null,
      itemName: null,
      message:
        "Jules tire le verrou du portail. L’allée rejoint une rue où les premiers volets s’ouvrent. Vous êtes venu chercher ce qu’Ada avait laissé ; vous repartez avec quelque chose qui reste à faire.\n\nLa fontaine continue de couler derrière vous. Dans votre poche, les trois sachets font un léger bruit de papier. Jules prend une tasse vide, vous confie l’autre et dit : « On lui racontera ensemble. Elle voudra tous les détails. »\n\nVous franchissez le portail. Le secret de la serre a cessé d’être un secret ; il est devenu une invitation.",
      lockedMessage:
        "Le portail attend votre décision. Écrivez d’abord dans le registre comment l’héritage sera transmis.",
      hint: "Choisissez l’un des deux avenirs dans le registre sur le banc, puis franchissez le portail.",
      speaker: "Jules",
    },
  ],
  ending: {
    sourceObjectId: "jardin-decision",
    variants: [
      {
        choiceId: "jardin-ouvert",
        title: "La maison des histoires",
        text: "Le samedi suivant, Jules ouvre le portail avant vous. Il a apporté une grande cafetière et une ardoise : « Jardin de mémoire — entrez, même si vous ne savez pas jardiner. » Vous posez le registre sur la table de l’ancienne serre.\n\nLa première visiteuse est venue pour les soucis de Rose. Elle ne connaissait pas Ada, mais sa grand-mère parlait d’une voisine qui semait des fleurs jaunes devant une fenêtre sombre. Les deux histoires se rejoignent. Plus tard, un enfant demande si les plantes peuvent boire à deux. Vous lui tendez un petit arrosoir.\n\nTout ne devient pas facile. Il faut réparer une vitre, organiser les permanences, apprendre à laisser quelqu’un d’autre ranger les outils. Vous gardez les lots principaux sur place ; chacun peut venir en cultiver une part et ajouter des souvenirs au registre. Le jardin devient une responsabilité partagée, avec des rendez-vous auxquels on finit par tenir.\n\nAda vous téléphone depuis la cuisine de Madeleine. Jules lui fait écouter la fontaine, puis vous lui racontez la première matinée. Elle reste silencieuse un moment. « Alors, dit-elle enfin, je vais pouvoir rester ici encore un peu. »\n\nVous comprenez qu’en donnant une maison aux histoires, vous avez aussi permis à leur gardienne de partir. Le soir, avant de fermer la serre, vous trouvez une nouvelle enveloppe sur la table. Quelqu’un y a écrit un nom. Il reste beaucoup de place dans le registre.",
      },
      {
        choiceId: "graines-voyageuses",
        title: "Les jardins qui se répondent",
        text: "La semaine suivante, la table de la serre est couverte d’enveloppes. Avec Jules, vous copiez les noms, les conseils et les petits récits. Chaque lot part avec une page vierge : la personne qui le reçoit pourra écrire ce qui aura poussé chez elle. Une réserve et le registre original restent à l’abri dans la serre.\n\nLes premiers sachets voyagent jusqu’au potager de Lucie, au balcon de Sami et à la cour de l’école. Personne ne promet que toutes les graines prendront. Vous convenez seulement de vous donner des nouvelles et de partager les récoltes qui pourront l’être. L’héritage n’a plus un seul jardin : il tient dans les chemins que les habitants commencent à faire les uns vers les autres.\n\nAu printemps, vous recevez une lettre de Madeleine. Sur une photographie, Ada tient un petit pot de soucis devant sa nouvelle fenêtre. Au dos : « Ceux-là viennent de chez nous, maintenant. J’ai ajouté une ligne à l’histoire de Rose. »\n\nJules accroche dans l’atelier une carte du village. Des fils relient les maisons où les graines ont été confiées. Un enfant demande s’il peut y ajouter celle de sa tante, plus loin. Vous lui passez le crayon.\n\nLa serre s’est un peu vidée, mais elle n’a rien perdu de sa chaleur. Quand vous ouvrez le registre pour classer les premières réponses, les noms anciens sont toujours là. De nouvelles écritures commencent à leur répondre.",
      },
    ],
  },
};
