import type { Room } from "../game.ts";
import { artwork } from "./art.ts";

export const lighthouse: Room = {
  title: "Le Phare des marées",
  description:
    "Votre première relève commence par un signal en panne et un bateau sans lumière. Des cartes à la grotte de marée, suivez les lettres de trois générations, réparez la lanterne et décidez à qui confier le registre d’une ancienne disparition.",
  story: `La dernière navette a emporté Abel avec ses deux valises, son manteau de travail et une caisse de boutures. Après trente-deux années au phare, il vous laisse les clés. Il n’a pas voulu de cérémonie : seulement une poignée de main et cette recommandation, prononcée quand le moteur du bateau couvrait déjà sa voix : « Lisez les dates avant de croire les histoires. »

Vous avez signé pour entretenir une lumière, accueillir les rares visiteurs et tenir un registre. La première nuit devait être consacrée à l’inventaire. Pourtant, au-delà de la vitre, une barque demeure immobile dans l’anse. Aucun feu à son bord. À chaque rotation du mécanisme, la grande lanterne devrait balayer l’eau ; ce soir, elle reste noire.

Sur le bureau, une lettre d’Abel vous attend sous une boussole. Une seconde enveloppe porte un prénom inconnu : Nora. Entre elles se trouve une photographie ancienne dont la légende a été soigneusement décollée. Au verso, quelqu’un a écrit : « Jeanne Arven, avant le départ. » Vous avez entendu ce nom au village. On parle de la jeune apprentie du phare comme d’une personne disparue en mer, une nuit de grandes marées, trente ans plus tôt.

Une conduite cogne derrière le mur. L’eau monte dans le passage inférieur ; le mécanisme ne repartira pas sans intervention. Vous disposez des outils du gardien et de ses consignes, mais il faudra aussi reprendre une transmission laissée inachevée depuis longtemps. Le bateau attendra le signal convenu jusqu’à l’aube. Vous avez toute une nuit pour rendre au phare sa lumière, puis rendre à cette histoire ses mots exacts.`,
  theme: "aventure",
  difficulty: "intermediaire",
  duration: 30,
  ...artwork("phare-base"),
  provenance: { method: "manual", model: null, generatedAt: null },
  chapters: [
    {
      id: "cartes",
      title: "I. Les consignes d’Abel",
      subtitle: "La salle des cartes · première veille",
      objective:
        "Ouvrez la malle d’entretien et préparez votre descente dans la salle mécanique.",
      story: `Le bureau porte encore les marques laissées par les coudes d’Abel. La carte est protégée par une plaque de verre, la boussole retenue par une ficelle : ici, chaque objet a appris à résister aux vibrations du vent. Une malle repose au milieu du plancher. Au-dessus, la roue rouge de l’ancienne conduite a été immobilisée par un collier à quatre chiffres.

Vous posez votre sac. Sur l’enveloppe principale, Abel a inscrit « À lire avant toute manipulation ». Son écriture penche vers la droite, sauf sur les derniers mots, resserrés comme s’il avait manqué de place : « Ne forcez jamais une pièce dont vous ne connaissez pas encore l’usage. »

La petite lanterne, sur le meuble près de la porte, garde une odeur de métal chaud. Elle doit permettre de gagner les étages sans électricité. Derrière le hublot, le balancier de la salle mécanique est arrêté à mi-course. Vous entendez l’eau y frapper le soubassement.

Un coin de la seconde enveloppe dépasse sous la carte. Nora remercie Abel de lui avoir ouvert les archives lors de sa visite, deux jours auparavant. Elle annonce son retour par la mer pour récupérer un document qu’il n’a pas encore retrouvé. Le papier est récent ; le nom de Jeanne, lui, appartient à des pages que personne ne semble avoir relues ensemble.

Vous commencez par l’inventaire. Les anciennes habitudes du phare sont précises : les serrures portent des chiffres, mais leurs combinaisons figurent dans les consignes de travail. Abel vous a donné une méthode avec ses clés. Il reste à l’appliquer.`,
      ...artwork("phare-base"),
      requires: [],
      unlockMessage:
        "La salle des cartes est ouverte. La relève commence au bureau.",
      ambience: "rain",
    },
    {
      id: "mecanisme",
      title: "II. Le mouvement arrêté",
      subtitle: "La salle mécanique · au-dessous du balancier",
      objective:
        "Isolez les circuits, actionnez la pompe et dégagez le passage vers la grotte.",
      story: `La lumière de votre petite lanterne se découpe dans les dents d’un engrenage plus haut que vous. Un filet d’eau a tracé une ligne brillante le long du mur. Rien n’est brisé dans la grande roue : elle s’est arrêtée lorsque le dispositif de protection a séparé la pompe de l’entraînement principal.

Sur le tableau central, trois cadrans attendent leur réglage. À droite, l’établi rassemble les outils en silhouettes propres, avec des étiquettes ajoutées à plusieurs époques. Une fiche récente d’Abel recouvre à moitié une feuille beaucoup plus ancienne. Les deux utilisent le même dessin pour représenter la conduite inférieure.

Vous remarquez alors une inscription au crayon sur la porte du fond : « Cale sèche après vidange seulement. » À côté du mot « cale », quelqu’un a dessiné une petite enveloppe. La marque paraît absurde dans une salle de machines, jusqu’à ce que vous relisiez la phrase d’Abel sur les dates.

Le vieux registre situe la disparition de Jeanne au soir d’une panne semblable. Ce rapprochement ne prouve rien. Une panne peut arrêter une lumière sans raconter ce qu’ont fait les personnes qui attendaient dans l’obscurité. Vous prenez soin de distinguer ce qui se voit, ce qui est écrit et ce qui a seulement été répété.

La conduite donne encore un coup sourd. Il faut commencer par lui rendre son écoulement. Le passage vers la grotte ne sera accessible qu’une fois la pompe en service ; la remise en route de la grande lanterne viendra ensuite.`,
      ...artwork("phare-mecanisme"),
      requires: ["phare-hublot"],
      unlockMessage:
        "Le hublot s’ouvre sur la salle mécanique. Examinez l’engrenage avant de régler les circuits.",
      ambience: "steam",
    },
    {
      id: "grotte",
      title: "III. Ce que la marée a gardé",
      subtitle: "La grotte de marée · l’ancien débarcadère",
      objective:
        "Retrouvez les documents de Jeanne et les consignes du collier de la roue rouge.",
      story: `Les marches descendent vers un ancien débarcadère creusé sous le phare. La pompe a libéré le seuil ; plus loin, l’eau reste basse entre les pierres. Une ligne de dépôts clairs indique la limite que les gardiens utilisaient autrefois pour ranger leur matériel à l’abri.

À gauche, un coffre est fixé au sol par deux pattes de fer. Une bouée rouge pend au centre, assez haute pour avoir échappé à l’humidité. Dans une niche à droite, la tranche d’un carnet dépasse d’une boîte fermée. Le jour commence à poindre au sommet d’un second escalier.

Abel a laissé une enveloppe récente dans un tube transparent attaché à la bouée. Il précise que les objets sont restés ici depuis le dégagement de la conduite, la semaine précédente. Il a comparé les premières dates, reconnu l’écriture de Jeanne, puis attendu la visite de Nora avant d’ouvrir les pièces personnelles. La réparation de ce soir vous mène au même endroit par un chemin qu’il connaissait déjà.

Dans l’anse, la barque est toujours là. Vous apercevez un mouvement, puis un carré de tissu clair, levé une seule fois. Quelqu’un vous a vu. Le geste ne vous demande pas de courir : la personne attend que vous rétablissiez le signal.

Le mot « disparue » vous revient. Il occupait toute l’histoire au village, comme une porte définitivement fermée. Ici, les choses portent des noms moins vastes : une heure d’arrivée, un départ, un coffre oublié, une lettre qui n’a pas rejoint son destinataire. Vous pouvez enfin commencer à les remettre dans leur ordre.`,
      ...artwork("phare-grotte"),
      requires: ["phare-porte-cale"],
      unlockMessage:
        "La cale est vidangée. La grotte s’ouvre avec sa bouée rouge et ses archives de passage.",
      ambience: "rain",
    },
    {
      id: "lanterne",
      title: "IV. La lumière rendue",
      subtitle: "La chambre de la lanterne · premières lueurs",
      objective:
        "Récupérez le pont conducteur dans la roue rouge, rétablissez le signal et décidez du sort du registre.",
      story: `L’escalier rejoint la chambre de la lanterne par une trappe intérieure. La grande lentille occupe presque toute la pièce. À travers ses anneaux, l’horizon se décompose en bandes pâles : le jour approche, mais la mer demeure grise.

Sur le pupitre de gauche, Abel a préparé les dernières opérations de relève. À droite, le coffre bas porte une enveloppe à votre nom et un registre neuf. La porte de la terrasse s’ouvre sur le même bateau que vous observiez depuis le bureau. De cette hauteur, vous distinguez enfin son nom : La Traverse.

Les documents de la grotte ont déplacé la question. Vous n’avez plus à chercher ce qui aurait englouti Jeanne ; vous devez établir comment son départ est devenu une disparition dans les souvenirs du phare. Il reste des blancs, et il faudra les conserver comme tels. Une page réparée n’autorise pas à raconter toute une vie à la place de celle qui l’a vécue.

Un petit logement reste vide à la base de la lentille. La fiche du pupitre le désigne sans ambiguïté : pont conducteur de secours. Les notes de Jeanne vous ont appris où il est rangé et comment ouvrir son collier. Si vous ne l’avez pas encore récupéré, la salle des cartes reste accessible : la vieille roue rouge y attend votre retour.

Le signal sera votre premier acte de gardien. Le second sera un choix de transmission. Un registre peut rester au phare pour que chacun sache où le consulter ; il peut aussi voyager avec celle dont la famille attend encore une réponse. Dans les deux cas, il faudra écrire ce que les pièces établissent et laisser visibles les questions qui demeurent.`,
      ...artwork("phare-lanterne"),
      requires: ["phare-escalier"],
      unlockMessage:
        "Vous atteignez la lanterne. Le pupitre indique comment achever la réparation et appeler La Traverse.",
      ambience: "stars",
    },
  ],
  objects: [
    {
      id: "phare-carte",
      chapterId: "cartes",
      name: "La carte et les lettres de relève",
      prompt: "Lire les lettres sur le bureau",
      action: "inspect",
      region: { x: 0.05, y: 0.49, w: 0.35, h: 0.27 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Abel, ancien gardien",
      message: `« La conduite basse s’est remise à vibrer. Commencez par la malle, puis prenez la lanterne de service. La clé du hublot est dans son socle. Vous trouverez les réglages de pompe à l’établi.

Pour la malle, utilisez les quantités du stock de ce matin, dans l’ordre gravé sur la serrure : VERRE, CUIVRE, MÈCHE. J’ai compté huit mèches sèches, six bagues de cuivre et deux verres de rechange. Trois cadrans, un chiffre par catégorie. Ne cherchez pas de date.

Ne forcez pas le collier de la roue rouge : son aide-mémoire se trouve dans le carnet de Jeanne, en bas. Il conserve une pièce de secours dont vous aurez besoin à la lanterne. »

Sous cette lettre, une carte de Nora : « Merci pour la consultation d’avant-hier. Je reviendrai au matin avec La Traverse. Ma mère s’appelle Jeanne Arven. Chez vous, ce nom termine une histoire. Dans ma famille, il en commence une autre. J’aimerais comparer les deux sans effacer ce qui reste incertain. »`,
      lockedMessage: "Les lettres sont accessibles sous la boussole.",
      hint: "La malle demande les quantités dans l’ordre VERRE, CUIVRE, MÈCHE. Les trois quantités figurent dans la lettre.",
    },
    {
      id: "phare-roue",
      chapterId: "cartes",
      name: "La roue rouge et son collier",
      prompt: "Ouvrir le collier de la roue rouge",
      action: "code",
      region: { x: 0.27, y: 0.16, w: 0.18, h: 0.25 },
      requires: ["phare-carnet"],
      code: "3142",
      itemName: "Pont conducteur de secours",
      speaker: "Abel, annotation dans le logement",
      message: `Le collier s’ouvre sans entraîner la roue. Dans le logement sec, vous trouvez le pont conducteur enveloppé de toile et une feuille détachée du registre ancien.

« J’ai retrouvé cette page derrière le collier pendant l’entretien de septembre. Elle portait seulement : “22 h 05, départ du Passage, une passagère, J. A.” Le folio suivant manque. Je n’avais pas de quoi identifier la passagère ni expliquer l’absence de lettre. C’est cette ligne qui m’a fait écrire à Nora.

J’étais de veille trente ans plus tôt. J’ai vu un bateau quitter l’anse ; j’ai accepté la phrase de mon prédécesseur : “Aucune arrivée confirmée.” À force de la recopier, nous avons laissé croire qu’aucun départ n’était possible. J’aurais dû noter ce que j’avais réellement vu.

Si les pièces de la cale confirment ce nom, ajoutez-les à cette page. Je vous laisse la garde du registre, pas le devoir de défendre mon silence. »

Le pont est intact. Vous pouvez désormais l’installer dans le logement de la lentille, au sommet du phare.`,
      lockedMessage:
        "Le collier demande quatre chiffres. Abel renvoie au carnet de Jeanne, dans la grotte de marée. Vous reviendrez ici après l’avoir retrouvé.",
      hint: "Dans le carnet, relevez les chiffres dans l’ordre ÉCUME, VEILLE, AUBE, RETOUR. Le retour à cette roue est indispensable pour réparer la lentille.",
    },
    {
      id: "phare-malle",
      animation: "lid",
      chapterId: "cartes",
      name: "La malle d’entretien",
      prompt: "Déverrouiller la malle",
      action: "code",
      region: { x: 0.36, y: 0.7, w: 0.22, h: 0.25 },
      requires: ["phare-carte"],
      code: "268",
      itemName: "Trousse d’entretien",
      speaker: "Abel, fiche de matériel",
      message: `Les trois cadrans s’alignent. Sous le couvercle, les outils ont chacun leur passant de cuir : une clé à six pans, un petit tournevis, un chiffon et une pince aux mâchoires protégées.

Une fiche est cousue dans la doublure : « La clé à six pans ouvre le socle de la lanterne de service. Le logement contient la clé du hublot. Le tournevis servira plus tard au pont conducteur de la grande lentille. N’utilisez aucune pièce qui montre une fente ou du vert-de-gris ; le pont de secours est conservé au sec derrière la roue rouge. »

Au fond se trouve une étiquette plus ancienne : « J. Arven, apprentie — matériel rendu complet ». La date est celle du lendemain de sa disparition supposée. C’est une trace de rangement, pas encore une preuve de présence : une autre personne a pu compléter l’inventaire. Vous gardez pourtant la date en mémoire. Quelqu’un a travaillé ici après la nuit dont on vous a parlé.`,
      lockedMessage:
        "La serrure possède trois cadrans. La lettre sous la boussole indique l’ordre et les quantités à employer.",
      hint: "Deux verres, six bagues de cuivre, huit mèches : entrez les quantités dans l’ordre demandé sur la carte de relève.",
    },
    {
      id: "phare-lampe",
      animation: "light",
      chapterId: "cartes",
      name: "La lanterne de service",
      prompt: "Préparer la lanterne et prendre la clé",
      action: "collect",
      region: { x: 0.63, y: 0.41, w: 0.08, h: 0.19 },
      requires: ["phare-malle"],
      code: null,
      itemName: "Lanterne de service et clé du hublot",
      speaker: "Abel, consigne de veille",
      message: `Vous dévissez le socle avec l’outil de la malle. La clé du hublot est retenue à l’intérieur par un cordon. La lanterne s’allume dès que vous actionnez son interrupteur ; son faisceau suffit à éclairer un escalier entier.

Un papier roulé accompagne la clé : « La Traverse attendra dans l’anse jusqu’à l’aube. Nora sait que la grande lanterne est en entretien. Elle ne s’approchera qu’après le signal d’accueil : trois longues lueurs, séparées chacune par une pause. La commande du pupitre exécute cette séquence toute seule après réparation. Vous n’avez pas à en calculer le rythme.

Si vous voyez un tissu clair se lever depuis la barque, la personne à bord a repéré votre lampe. Ce geste confirme qu’elle peut attendre. Réparez d’abord, appelez ensuite. »

Le bateau a donc un nom et une consigne. Son obscurité reste une question, mais vous savez désormais qu’il ne vous demande pas de quitter le phare à la hâte.`,
      lockedMessage:
        "Le socle est fermé par une vis à six pans. La trousse de la malle contient l’outil nécessaire.",
      hint: "Ouvrez la malle, puis utilisez sa clé à six pans sur le socle de cette lanterne.",
    },
    {
      id: "phare-hublot",
      chapterId: "cartes",
      name: "La porte au hublot",
      prompt: "Déverrouiller la salle mécanique",
      action: "unlock",
      region: { x: 0.81, y: 0.19, w: 0.17, h: 0.64 },
      requires: ["phare-lampe"],
      code: null,
      itemName: null,
      message: `La clé glisse dans la serrure. Vous soutenez la porte avant de la tirer, comme le montre une petite flèche dessinée près de la poignée. Le joint se décolle avec un soupir ; l’air de la salle mécanique sent la pierre mouillée.

Une dernière note d’Abel est fixée sur la face intérieure : « La protection a arrêté le mécanisme avant que l’eau gagne les paliers. Observez d’abord le grand engrenage. Réglez ensuite les circuits à partir de la fiche de l’établi. La manivelle de pompe ne doit être engagée qu’une fois les cadrans correctement placés. »

Vous calez le battant. Le passage restera ouvert pour vos allers et retours. Sur le seuil, votre lampe révèle trois dates superposées à la craie : celle de la dernière inspection, celle de l’inventaire ancien et celle d’aujourd’hui, laissée vide. Vous inscrivez votre première veille. Le phare commence à porter votre écriture.`,
      lockedMessage:
        "La clé du hublot est rangée dans le socle de la lanterne de service.",
      hint: "Préparez la lanterne de service avec les outils de la malle pour récupérer cette clé.",
    },
    {
      id: "phare-engrenage",
      chapterId: "mecanisme",
      name: "Le grand engrenage",
      prompt: "Examiner la roue et le diagnostic",
      action: "inspect",
      region: { x: 0.06, y: 0.2, w: 0.22, h: 0.15 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Abel, diagnostic de maintenance",
      message: `Vous approchez la lampe des dents. Aucune ne manque. Le frein de protection retient l’ensemble et une marque blanche montre la position d’arrêt attendue. La fiche de diagnostic confirme : « Arrêt de sécurité correct. Ne pas dégager le frein à la main. »

Deux opérations sont nécessaires. La pompe doit d’abord évacuer l’eau de la cale pour rouvrir le passage inférieur. La lanterne principale, elle, attend le remplacement de son pont conducteur. Les deux problèmes ont été isolés : la vidange n’allumera pas le phare, et l’installation du pont ne videra pas la cale.

Une phrase est ajoutée en marge : « La réserve sèche derrière la roue rouge a tenu lors de la grande marée d’il y a trente ans. Le carnet de Jeanne décrit le collier. »

Vous repérez la manivelle de pompe sur l’établi, à droite. Son profil correspond au carré d’entraînement placé sous l’engrenage. Avant de l’engager, il faudra régler les trois circuits du tableau central.`,
      lockedMessage: "La fiche de diagnostic est fixée au bâti de l’engrenage.",
      hint: "Examinez ce diagnostic, puis cherchez la manivelle et la fiche des trois circuits sur l’établi.",
    },
    {
      id: "phare-etabli",
      chapterId: "mecanisme",
      name: "L’établi et la manivelle",
      prompt: "Prendre la manivelle et lire les réglages",
      action: "collect",
      region: { x: 0.65, y: 0.57, w: 0.31, h: 0.21 },
      requires: ["phare-engrenage"],
      code: null,
      itemName: "Manivelle de vidange",
      speaker: "Jeanne Arven, fiche d’atelier",
      message: `La manivelle tient dans votre main avec le poids rassurant d’un outil souvent utilisé. Sous son crochet, une fiche explique les trois cadrans : « Saisir les positions dans l’ordre POMPE, FREIN, SIGNAL. Le frein doit être au cran 4. La pompe prend la moitié de la valeur du frein. Le signal reste au cran 1. » Chaque cadran reçoit un seul chiffre.

Au dos, Jeanne a écrit : « Émile dit que mon départ attendra la fin de saison. Mon stage à la verrerie commence lundi. J’ai réservé ma place sur Le Passage ; je ferai la relève avant de partir, et je laisserai mes lettres dans le coffre de la cale. Personne ne pourra dire que j’ai abandonné les outils au milieu du travail. »

Plus bas, dans une autre encre : « Inventaire reçu complet. A. » Abel avait donc vu l’étiquette trouvée dans la malle, et peut-être cette fiche aussi. Vous connaissez désormais un projet de départ ; vous ne savez pas encore s’il a pu avoir lieu. Pour descendre jusqu’au coffre, commencez par la pompe.`,
      lockedMessage:
        "Examinez d’abord le diagnostic du grand engrenage pour identifier l’usage de cet outil.",
      hint: "La fiche donne FREIN = 4, POMPE = la moitié du frein et SIGNAL = 1. Respectez l’ordre POMPE, FREIN, SIGNAL.",
    },
    {
      id: "phare-leviers",
      chapterId: "mecanisme",
      name: "Le tableau des trois circuits",
      prompt: "Régler pompe, frein et signal",
      action: "code",
      region: { x: 0.35, y: 0.27, w: 0.14, h: 0.41 },
      requires: ["phare-etabli"],
      code: "241",
      itemName: null,
      message: `Vous placez la pompe au cran 2, le frein au cran 4 et le signal au cran 1. La poignée de protection descend d’elle-même dans son encoche. Un indicateur mécanique passe du rouge au blanc : la pompe peut être actionnée sans entraîner la grande lentille.

Le tableau libère un petit volet. À l’intérieur, Abel a inscrit : « Si cette combinaison est validée, engagez la manivelle dans l’axe carré sous l’engrenage. Tournez jusqu’à ce que la jauge reste sous le trait blanc. Le frein protège le reste du mécanisme ; ne changez plus les cadrans pendant la vidange. »

Un second message est plus ancien : « J’ai laissé le signal isolé à mon départ. Le prochain gardien trouvera tout en position sûre. J. A. » Ce n’est pas un récit de voyage, mais une passation de travail écrite avec soin. Les objets du phare parlent de Jeanne comme d’une collègue qui a préparé sa relève. Le registre du village n’a retenu que son absence.`,
      lockedMessage:
        "La fiche de l’établi donne les positions et l’ordre des trois cadrans.",
      hint: "Le frein vaut 4 ; sa moitié vaut 2 ; le signal vaut 1. Le tableau attend POMPE, FREIN, SIGNAL.",
    },
    {
      id: "phare-vidange",
      chapterId: "mecanisme",
      name: "L’axe carré de la pompe",
      prompt: "Engager la manivelle et vidanger la cale",
      action: "unlock",
      region: { x: 0.15, y: 0.38, w: 0.07, h: 0.15 },
      requires: ["phare-leviers", "phare-etabli"],
      code: null,
      itemName: null,
      message: `La manivelle s’emboîte dans l’axe carré. Les premiers tours résistent ; ensuite, la pompe prend son mouvement. Vous gardez les yeux sur la jauge, conformément à la fiche. L’aiguille descend et s’immobilise sous le trait blanc.

L’eau cesse de frapper la porte du fond. À travers sa grille inférieure, vous voyez réapparaître la première marche de pierre, puis la suivante. Une chaînette tire le verrou de sécurité vers le haut. Le passage peut maintenant être ouvert.

Sous la jauge, un ancien tampon mentionne « Débarcadère auxiliaire — courrier et approvisionnements ». Le trait de la carte n’indiquait donc pas seulement un conduit : des bateaux venaient autrefois jusque sous le phare. Le Passage aurait pu accoster ici sans être visible depuis la fenêtre du bureau.

Vous laissez la manivelle dans son support et notez la vidange sur la fiche du jour. La réparation est simple à décrire. L’histoire de cette nuit ancienne demandera des pièces plus précises encore.`,
      lockedMessage:
        "Il faut la manivelle de l’établi et le réglage validé des trois circuits avant d’actionner cet axe.",
      hint: "Prenez la manivelle, réglez le tableau selon la fiche de Jeanne, puis revenez à l’axe sous l’engrenage.",
    },
    {
      id: "phare-porte-cale",
      chapterId: "mecanisme",
      name: "La porte étroite de la cale",
      prompt: "Ouvrir le passage inférieur",
      action: "unlock",
      region: { x: 0.5, y: 0.23, w: 0.17, h: 0.55 },
      requires: ["phare-vidange"],
      code: null,
      itemName: null,
      speaker: "Abel, note sur le seuil",
      message: `Le verrou est libéré. Vous tirez la porte, puis éclairez les marches une à une. Une ligne de carreaux clairs mène jusqu’au sol sec de la grotte.

Abel a attaché une note à la main courante : « Le coffre et le carnet sont restés à leur place depuis le dégagement de la semaine dernière. Nora m’a demandé de conserver leur ordre jusqu’à sa venue. Elle a fourni une enveloppe pour la relève, rangée dans le coffre du sommet. Ce que vous trouverez en bas doit pouvoir être comparé aux dates du registre.

À la bouée rouge, j’ai placé la fiche de passage retrouvée dans le tube de courrier. Elle contient la consigne d’ouverture du coffre. La boîte du carnet s’ouvre avec la petite clé rangée dans ce coffre. Les papiers ont séché à plat ; prenez-les par leurs protections. »

Le chemin est désormais clair : la bouée, puis le coffre, puis le carnet. Au-delà, un escalier rejoint directement la chambre de la lanterne.`,
      lockedMessage:
        "Le verrou reste retenu par la sécurité de niveau. Actionnez la pompe jusqu’à la fin de la vidange.",
      hint: "La pompe libère cette porte après le réglage du tableau et l’usage de la manivelle.",
    },
    {
      id: "phare-bouee",
      chapterId: "grotte",
      name: "La bouée rouge et le tube de courrier",
      prompt: "Lire la fiche de passage",
      action: "inspect",
      region: { x: 0.37, y: 0.59, w: 0.19, h: 0.14 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Marin du Passage, fiche de tournée",
      message: `Le tube abrite une feuille de tournée datée de la nuit de grandes marées. Le bateau indiqué est Le Passage. Trois horaires figurent sous des rubriques distinctes : ARRIVÉE, 21 h 32 ; ATTENTE, 21 h 41 ; DÉPART, 22 h 05.

Au-dessous, une consigne destinée aux gardiens : « Le coffre de courrier possède trois cadrans. Prenez uniquement le dernier chiffre de chaque horaire, dans l’ordre ARRIVÉE, ATTENTE, DÉPART. Les chiffres des heures et les autres chiffres des minutes ne servent pas. »

La dernière ligne retient votre attention : « Une place demandée pour la verrerie du continent. Mer agitée à l’entrée ; passagère embarquée depuis la cale abritée. Voir le bordereau nominatif dans le coffre. »

Le nom manque sur cette fiche. Elle confirme pourtant qu’une personne a quitté l’île cette nuit-là depuis ce débarcadère. La date correspond à celle de l’inventaire retrouvé dans la malle. Ouvrez le coffre pour vérifier s’il s’agit bien de Jeanne, sans transformer encore la concordance en certitude.`,
      lockedMessage: "La fiche est protégée dans le tube fixé à la bouée.",
      hint: "Prenez le dernier chiffre de 21 h 32, puis de 21 h 41, puis de 22 h 05. La fiche donne cet ordre explicitement.",
    },
    {
      id: "phare-coffre",
      animation: "lid",
      chapterId: "grotte",
      name: "Le coffre du débarcadère",
      prompt: "Ouvrir le coffre de courrier",
      action: "code",
      region: { x: 0.04, y: 0.63, w: 0.26, h: 0.25 },
      requires: ["phare-bouee"],
      code: "215",
      itemName: "Bordereau nominatif et clé du carnet",
      speaker: "Capitaine du Passage, bordereau signé",
      message: `Le coffre contient les doubles du courrier, une petite clé et un bordereau protégé par une toile cirée.

« Passagère : Jeanne Arven. Destination : atelier de verre, quai des Verriers. Embarquement à la cale du phare, 21 h 54. Départ à 22 h 05. Bagages : un coffre à croquis et un sac. Passage soldé. » La signature de Jeanne est suivie de celle du capitaine. Une mention ajoutée le lendemain confirme le débarquement au quai indiqué.

Vous relisez la ligne. Jeanne a quitté l’île, puis atteint sa destination. Cette preuve établit son trajet ; elle ne dit pas pourquoi les nouvelles n’ont pas circulé ensuite. Le mot « disparue » ne peut plus rester seul dans le registre.

La petite clé porte une étiquette : « Boîte du carnet, niche droite ». Sous le plateau du coffre, une languette de tissu dépasse d’un compartiment de courrier. Abel l’a signalée par une bande de papier : « Lettre personnelle, à rapprocher du carnet. » Vous pouvez examiner cette lettre et ouvrir la boîte dans la niche.`,
      lockedMessage:
        "La fiche dans le tube de la bouée donne les trois horaires et la règle de la serrure.",
      hint: "Les derniers chiffres des horaires ARRIVÉE, ATTENTE, DÉPART sont 2, 1 et 5.",
    },
    {
      id: "phare-carnet",
      chapterId: "grotte",
      name: "Le carnet dans la niche",
      prompt: "Ouvrir la boîte et recueillir le carnet",
      action: "collect",
      region: { x: 0.75, y: 0.51, w: 0.13, h: 0.1 },
      requires: ["phare-coffre"],
      code: null,
      itemName: "Carnet de Jeanne Arven",
      speaker: "Jeanne Arven, carnet de relève",
      message: `La clé du coffre ouvre la boîte de la niche. Jeanne a rempli son carnet de plans, de gestes d’entretien et de listes de fournitures. La dernière page technique décrit le collier de la roue rouge, dans la salle des cartes.

« Pour ouvrir le logement sec, lisez la table dans l’ordre des quatre mots du collier : ÉCUME, VEILLE, AUBE, RETOUR. Table des chiffres : AUBE = 4 ; RETOUR = 2 ; ÉCUME = 3 ; VEILLE = 1. Le collier protège le pont conducteur de secours. Ne faites pas tourner la roue : ouvrez seulement son logement. »

Une page personnelle suit : « Je rends mes outils ce soir et je pars apprendre à tailler des lentilles. J’ai demandé au capitaine de porter ma lettre par sa prochaine tournée. Si elle arrive avant moi, dites à Émile que je ne lui prends rien : il aura un autre apprenti, et j’aurai enfin un autre horizon. Je laisse ce carnet ici pour celui ou celle qui prendra ma place. »

Vous emportez le carnet. Ses consignes rendent possible un retour utile à la salle des cartes : le pont conducteur attend toujours derrière la roue rouge.`,
      lockedMessage:
        "La boîte de la niche est fermée. La petite clé se trouve dans le coffre du débarcadère.",
      hint: "Ouvrez le coffre, prenez sa clé, puis revenez à la niche. Le carnet contient la combinaison de la roue rouge et l’emplacement de la pièce de secours.",
    },
    {
      id: "phare-lettre",
      chapterId: "grotte",
      name: "La lettre sous le plateau du coffre",
      prompt: "Lire la lettre de départ",
      action: "inspect",
      region: { x: 0.09, y: 0.89, w: 0.18, h: 0.05 },
      requires: ["phare-coffre"],
      code: null,
      itemName: null,
      speaker: "Jeanne Arven, lettre à Émile",
      message: `« Émile,

Je pars ce soir avec Le Passage. J’ai fait la relève et rendu les outils. J’ai peur de vous décevoir, mais je ne veux plus que cette peur décide à ma place. Vous m’avez appris à tenir une lumière. À la verrerie, j’apprendrai à la construire.

Le capitaine portera cette lettre au prochain passage, quand les tournées auront repris. Mon adresse est au dos. Vous pourrez m’écrire ; je répondrai. Je souhaite revenir un jour avec quelque chose que j’aurai fait de mes mains.

Jeanne. »

L’enveloppe porte la marque d’un courrier reporté, puis un tampon : « Tournée suspendue — voie basse condamnée ». Elle est restée dans le compartiment quand la cale a été fermée après la grande marée. La lettre annonçait un départ volontaire ; son absence a laissé se former un autre récit.

Un dernier billet d’Abel précise : « Je ne peux pas dire quelles lettres Jeanne a envoyées ensuite ni lesquelles ont été reçues ailleurs. Cette enveloppe prouve seulement que celle-ci n’est jamais partie. Gardez cette limite avec la preuve. »`,
      lockedMessage:
        "Le compartiment sous le plateau devient accessible une fois le coffre ouvert.",
      hint: "Déverrouillez le coffre avec la fiche de la bouée, puis examinez la languette sous son plateau.",
    },
    {
      id: "phare-escalier",
      chapterId: "grotte",
      name: "L’escalier vers le jour",
      prompt: "Remonter vers la grande lanterne",
      action: "unlock",
      region: { x: 0.22, y: 0.09, w: 0.25, h: 0.35 },
      requires: ["phare-carnet", "phare-lettre"],
      code: null,
      itemName: null,
      speaker: "Nora, carte confiée à Abel",
      message: `Vous rangez le carnet et les protections de la lettre avant d’ouvrir la grille de l’escalier. Sur le montant, Abel a fixé une carte de Nora pour la relève.

« Mon bateau s’appelle La Traverse. Je vous attendrai dans l’anse jusqu’à l’aube. Abel m’a expliqué le signal d’accueil. Si le phare reste éteint, je reviendrai au port ; personne n’a besoin de se mettre en difficulté pour un registre.

Ma mère m’a demandé de récupérer son carnet si vous le retrouviez. Elle se souvient de l’avoir laissé dans la niche pour son successeur. Elle garde moins de certitudes sur les lettres, les dates, les silences qui ont suivi. J’apporte ce qu’elle a écrit aujourd’hui ; Abel l’a déposé dans le coffre de la chambre haute lors de ma visite.

Je ne cherche pas un coupable à ramener sur le continent. Je voudrais qu’en prononçant son nom ici, on cesse de l’arrêter à cette seule nuit. »

Jeanne est donc vivante. Le bordereau établissait une arrivée ancienne ; cette carte annonce une voix présente. Vous gagnez la lanterne avec les deux.`,
      lockedMessage:
        "Rassemblez le carnet de la niche et lisez la lettre sous le plateau du coffre avant de quitter les archives.",
      hint: "Le coffre donne accès à deux documents utiles : le carnet dans la niche et la lettre sous son plateau. Lisez les deux, puis ouvrez la grille.",
    },
    {
      id: "phare-pupitre",
      chapterId: "lanterne",
      name: "Le pupitre de mise en lumière",
      prompt: "Lire la procédure du signal d’accueil",
      action: "inspect",
      region: { x: 0.02, y: 0.18, w: 0.21, h: 0.43 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Abel, procédure de relève",
      message: `« Réparation : ouvrez le petit logement à la base de la lentille avec le tournevis de la trousse. Retirez le pont fendu, puis installez le pont conducteur de secours rangé derrière le collier de la roue rouge, dans la salle des cartes. Le carnet de Jeanne explique l’ouverture du collier. Refermez avant de lancer l’essai.

Levier d’accueil : lorsque le mécanisme est rétabli, abaissez-le une seule fois. Il produit automatiquement trois longues lueurs, chacune séparée par une pause. C’est le signal convenu avec Nora. »

Abel a ajouté une note moins technique : « J’avais prévu de faire cette réparation avant mon départ. La conduite s’est remplie pendant la dernière vérification et j’ai isolé l’ensemble. Les pièces sont contrôlées ; vous avez maintenant la marche à suivre. Inscrivez l’intervention à votre nom.

Pour le registre ancien, Nora et moi avons préparé deux possibilités : conservation ici avec copie pour elle, ou transmission de l’original avec copie conservée au phare. Les pièces et leurs limites doivent accompagner l’une comme l’autre. Ce choix revient à la personne qui assure désormais la garde des archives. »`,
      lockedMessage:
        "La procédure est posée sur le pupitre, à gauche de la lentille.",
      hint: "Il faut le pont conducteur de la roue rouge. Si vous ne l’avez pas, retournez à la salle des cartes avec la combinaison donnée par le carnet.",
    },
    {
      id: "phare-lentille",
      animation: "light",
      chapterId: "lanterne",
      name: "La lentille et son logement conducteur",
      prompt: "Réparer la lumière et lancer le signal",
      action: "unlock",
      region: { x: 0.27, y: 0.1, w: 0.32, h: 0.67 },
      requires: ["phare-pupitre", "phare-roue"],
      code: null,
      itemName: null,
      message: `Vous ouvrez le logement avec le tournevis de la trousse. Une fente traverse le vieux pont. Vous posez à sa place la pièce récupérée derrière la roue rouge, contrôlez sa tenue puis refermez le capot, dans l’ordre indiqué par Abel.

La lentille prend une lumière dorée. Le mécanisme libéré accompagne sa rotation sans secousse. Au pupitre, vous abaissez le levier d’accueil : une longue lueur, une pause ; une deuxième, une pause ; une troisième. Vous laissez la commande revenir seule au repos.

Dans l’anse, le carré de tissu clair se lève. La Traverse se détache de son point d’attente et gagne le petit quai maintenant visible au pied du phare. Ce mouvement répond exactement à la consigne de Nora. Le bateau ne vous poursuivait pas dans la nuit : il attendait une invitation lisible.

Vous inscrivez la réparation sur la fiche, avec les pièces remplacées. Le phare fonctionne. Il reste à ouvrir le coffre de relève et à décider comment la mémoire de Jeanne quittera, ou habitera, cette pièce.`,
      lockedMessage:
        "Lisez la procédure du pupitre et récupérez le pont conducteur derrière la roue rouge, dans la salle des cartes.",
      hint: "Le carnet de la grotte donne le code de la roue rouge. Revenez à cette roue au premier chapitre, prenez le pont, puis appliquez la fiche du pupitre.",
    },
    {
      id: "phare-coffret",
      animation: "lid",
      chapterId: "lanterne",
      name: "Le coffre bas de la relève",
      prompt: "Recueillir la lettre de Jeanne et le dossier",
      action: "collect",
      region: { x: 0.64, y: 0.74, w: 0.32, h: 0.23 },
      requires: ["phare-lentille"],
      code: null,
      itemName: "Dossier de transmission de Jeanne",
      speaker: "Jeanne Arven, lettre présente",
      message: `Le coffre abrite un dossier, des feuilles de copie et la lettre confiée par Nora à Abel deux jours plus tôt.

« À la personne qui gardera la lumière,

Je suis Jeanne Arven. J’ai bien quitté le phare avec Le Passage, puis travaillé à la verrerie. Nora est ma fille. Je ne savais pas que mon nom était resté ici au milieu d’une disparition. Je croyais ma première lettre portée ; je ne sais toujours pas reconstituer tous les silences qui ont suivi.

Si mon carnet existe encore, qu’il serve. J’y avais mis ce qu’on m’avait appris et ce que j’avais compris seule. Vous pouvez garder le registre au phare et nous en envoyer une copie, ou remettre l’original à Nora en conservant une copie sur place. J’accepte les deux voies. Je demande seulement que les blancs restent visibles et que mon départ soit nommé comme tel.

La lanterne de La Traverse a perdu son verre lors de notre dernière traversée. Nora attendra à l’abri, sans repartir de nuit ; votre signal lui indiquera quand approcher. Son bateau sans feu n’apporte aucun présage. Il apporte cette lettre. »

Vous posez le dossier près du registre. La réponse ancienne et la voix présente peuvent enfin être lues ensemble.`,
      lockedMessage:
        "Le signal d’accueil doit d’abord être envoyé : la réparation et la sécurité du passage passent avant l’ouverture du dossier de relève.",
      hint: "Réparez la lentille avec le pont conducteur de la roue rouge et lancez le signal ; vous pourrez ensuite recueillir ce dossier.",
    },
    {
      id: "phare-registre",
      chapterId: "lanterne",
      name: "Le registre ouvert sur le pupitre",
      prompt: "Choisir comment transmettre le registre",
      action: "choose",
      region: { x: 0.08, y: 0.74, w: 0.2, h: 0.11 },
      requires: ["phare-coffret", "phare-lettre", "phare-roue"],
      code: null,
      itemName: null,
      message: `Vous réunissez le bordereau signé, la lettre restée dans le coffre, la page sauvée derrière la roue et le témoignage actuel de Jeanne. Vous écrivez : « Départ volontaire confirmé, arrivée au continent attestée. Première lettre non acheminée. Circulation des correspondances ultérieures non établie. »

Vous ajoutez la date de votre relève et décrivez l’emplacement de chaque pièce. La formule ancienne reste lisible sous la nouvelle annotation ; elle fait partie de l’histoire de l’erreur. Le dossier contient assez de papier pour conserver une copie complète de ce qui sera transmis.

Deux accords ont été proposés et acceptés par Jeanne. Vous pouvez laisser l’original au phare, avec un accès clairement indiqué et une copie pour Nora. Vous pouvez aussi lui remettre l’original, accompagné des pièces, et conserver ici les copies datées. Les recherches futures resteront possibles dans les deux cas. Choisissez le lieu où l’original poursuivra son histoire.`,
      lockedMessage:
        "Rassemblez le dossier du coffre, la lettre de départ et la page conservée derrière la roue rouge avant de décider.",
      hint: "Le dossier précise que Jeanne accepte les deux possibilités. Votre décision change le destin du registre et la conclusion, sans autre énigme à résoudre.",
      choices: [
        {
          id: "laisser",
          label: "Laisser le registre au phare, donner une copie à Nora",
          reply:
            "Vous inscrivez le lieu de conservation sur le dossier de Nora et préparez sa copie complète. L’original rejoint une étagère accessible, avec un avis de consultation. Le nom de Jeanne fait désormais partie d’une mémoire que le prochain gardien pourra vérifier.",
        },
        {
          id: "transmettre",
          label: "Transmettre le registre à Nora, garder une copie au phare",
          reply:
            "Vous datez la copie qui restera au phare et enveloppez l’original avec ses pièces. Une feuille précise qu’il est confié à Jeanne par l’intermédiaire de Nora. Vous laissez leurs coordonnées de consultation avec leur accord : la trace demeure, et l’objet peut rentrer chez elle.",
        },
      ],
    },
    {
      id: "phare-terrasse",
      chapterId: "lanterne",
      name: "La porte de la terrasse",
      prompt: "Sortir accueillir Nora à l’aube",
      action: "exit",
      region: { x: 0.67, y: 0.12, w: 0.27, h: 0.56 },
      requires: ["phare-registre"],
      code: null,
      itemName: null,
      message: `Vous poussez la porte de la terrasse. L’air du matin soulève le bord de la fiche que vous tenez encore. En bas, La Traverse touche le quai et Nora lève la tête vers le phare. Vous lui répondez de la main.

Le grand faisceau poursuit sa rotation derrière vous. Sur le pupitre, votre écriture rejoint celle d’Abel et les croquis de Jeanne, avec une intervention datée, des pièces nommées et un emplacement pour les questions à venir.

Vous prenez le dossier préparé selon votre décision et descendez accueillir Nora. Pour la première fois depuis votre arrivée, vous n’écoutez plus le bâtiment pour y chercher une panne. Vous en reconnaissez le fonctionnement : les pas dans l’escalier, le mouvement de la lentille, une porte qu’on ouvre à la personne attendue. Votre première relève est accomplie.`,
      lockedMessage:
        "La lumière fonctionne. Décidez maintenant où conserver le registre avant de rejoindre Nora.",
      hint: "Ouvrez le dossier du coffre bas, puis choisissez la transmission sur le registre du pupitre. La terrasse sera alors accessible.",
    },
  ],
  ending: {
    sourceObjectId: "phare-registre",
    variants: [
      {
        choiceId: "laisser",
        title: "Une place dans la lumière",
        text: `Nora vous rejoint à l’entrée, les cheveux encore mouillés d’embruns. Vous lui remettez le carnet de sa mère et la copie du dossier, puis vous lui montrez l’emplacement du registre original. Elle passe un doigt au-dessus de la nouvelle annotation, sans toucher le papier.

« Elle pourra venir le lire elle-même », écrit-elle au bas de l’accusé de réception. Vous ajoutez les horaires de consultation et votre adresse de gardien. Vous n’avez pas demandé à Jeanne de revenir pour rendre votre conclusion valable ; vous lui avez ouvert un lieu où elle pourra, si elle le souhaite, reprendre la parole.

L’original reste au phare. Sur l’étagère, il n’est plus isolé sous une date de disparition : un renvoi conduit au bordereau du Passage, à la lettre non acheminée, aux consignes du carnet et à la lettre présente. Une page indique aussi ce que vous ignorez encore. Les prochains lecteurs pourront distinguer un départ établi d’une histoire de correspondances qui demeure incomplète.

Avant de repartir, Nora vous tend une petite pièce de verre poli que Jeanne avait glissée dans son sac. La lumière la traverse et dessine une tache ronde sur votre manche. Vous la posez près du registre, avec son nom et sa date, sans en faire une preuve supplémentaire. C’est un cadeau.

La Traverse quitte le quai dans le jour. Vous revenez au bureau pour préparer la relève suivante. Sous la rubrique « Observations », vous écrivez que le mécanisme fonctionne, que le signal a été reçu et que les archives sont consultables. Puis vous laissez de la place sur la page. La mémoire du phare n’est plus fermée par un seul mot.`,
      },
      {
        choiceId: "transmettre",
        title: "Le registre prend la mer",
        text: `Nora attend au bas de l’escalier. Vous lui remettez le carnet, la lettre qui n’avait jamais quitté le coffre et le registre enveloppé dans une toile sèche. Elle vérifie les dates avec vous, puis signe le reçu préparé pour Jeanne. Sur la ligne suivante, elle inscrit l’adresse où l’original pourra être consulté avec leur accord.

Une copie complète reste au phare, accompagnée des références des pièces et de la date de transmission. À l’endroit du registre, vous placez une fiche : « Original confié à Jeanne Arven par Nora. Départ volontaire et arrivée au continent établis. Acheminement des lettres ultérieures non établi. » Une personne venue chercher une réponse saura donc où poursuivre, et quelles questions restent ouvertes.

Nora serre le paquet contre elle. « Je crois qu’elle voudra d’abord regarder son écriture », note-t-elle sur le reçu avant de vous le rendre. Vous comprenez alors que l’objet gardait autre chose qu’une preuve : les lignes d’une jeune femme qui avait rangé ses outils avant de choisir une autre vie. Ces lignes vont enfin rejoindre celle qui les a tracées.

Avant de partir, Nora vous confie une petite pièce de verre poli faite par Jeanne. Vous la suspendez près du pupitre avec son nom et sa date. La copie du registre conserve les faits ; ce cadeau marque la rencontre de ce matin. Vous veillez à leur donner chacun leur place.

La Traverse s’éloigne, chargée d’un peu plus de papier qu’à son arrivée. Derrière vous, la lentille tourne régulièrement. Vous inscrivez votre première relève dans le registre neuf : réparation accomplie, signal reçu, documents transmis. Puis vous ouvrez la page suivante. Vous garderez la lumière ; d’autres personnes emporteront ce qu’elle aura permis de retrouver.`,
      },
    ],
  },
};
