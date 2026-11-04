import type { Room } from "../game.ts";
import { artwork } from "./art.ts";

export const observatory: Room = {
  title: "La Vigie de la Lune",
  description:
    "Une astronome a quitté le village en vous confiant sa vigie. Retrouvez ses observations, remettez l’optique en état et découvrez ce qu’elle souhaite préserver sous le ciel nocturne.",
  story:
    "Depuis son départ, les habitants appellent encore cette maison « chez Aline ». Aline Perrin y a passé des années à observer le ciel et à accueillir les curieux. Puis elle a fermé ses volets, rendu ses livres et quitté le village. Dans sa dernière carte, elle vous annonce qu’elle séjourne chez son amie Salomé, dans la vallée, et qu’elle reprendra le courrier à son rythme. Elle vous confie les clés de la Vigie de la Lune.\n\n« J’ai laissé mes observations et une lettre pour vous. L’optique attend une petite remise en état ; toutes les indications sont sur place. Parcourez la maison avant de décider ce que vous souhaitez faire de mes notes. Vous comprendrez mieux ma proposition depuis la terrasse. »\n\nVous arrivez au début d’une nuit claire, après la pluie. Le village allume ses fenêtres en contrebas. Derrière le hublot, le grand télescope est resté tourné vers sa cible de réglage. Une armoire, un coffre et une horloge arrêtée vous sont familiers : vous avez aidé Aline à repeindre cette pièce un été. Cette fois, elle vous laisse le temps de regarder sans guider votre épaule.",
  theme: "mystere",
  difficulty: "intermediaire",
  duration: 30,
  ...artwork("vigie-base"),
  provenance: { method: "manual", model: null, generatedAt: null },
  chapters: [
    {
      id: "vigie",
      title: "La maison sous le ciel",
      subtitle: "Les premiers repères sont à hauteur de regard.",
      objective:
        "Retrouvez le trousseau et la bague du télescope pour accéder aux archives.",
      story:
        "L’air de la vigie garde une fraîcheur de pierre. Aline a couvert son fauteuil, rangé les câbles et laissé un carré de feutre sous chaque petit outil. Son départ a été préparé avec la patience qu’elle mettait dans ses séances d’observation.\n\nPrès du hublot, une bande de papier porte trois rubriques du journal. À l’horloge, un billet dépasse sous le cadre. Aline utilisait ce cadran pour donner rendez-vous, puis elle avait fini par y accrocher tout ce qu’elle ne voulait pas oublier. Le coffre reste fermé ; le grand télescope attend une pièce conservée dans l’armoire. Vous pouvez commencer par les deux billets, avant de toucher à l’instrument.",
      ...artwork("vigie-base"),
      requires: [],
      unlockMessage:
        "Vous entrez dans la vigie. Les notes du hublot et de l’horloge sont les premiers repères laissés par Aline.",
      ambience: "rain",
    },
    {
      id: "archives",
      title: "Les nuits conservées",
      subtitle:
        "Des observations, des brouillons et une lettre restée au bureau.",
      objective:
        "Retrouvez le carnet et utilisez ses rubriques pour ouvrir le bureau.",
      story:
        "Les archives occupent la pièce la plus étroite de la maison. Sur les étagères, les carnets ont été reliés avec des tissus différents ; un ruban marque le dernier volume. Le globe du coin a servi de support à une petite carte du jardin. Aline aimait rapprocher les choses qu’elle voyait d’un même regard, même lorsqu’elles ne tenaient pas sur la même carte.\n\nLe bureau est fermé. Une enveloppe à votre nom se voit derrière sa vitre, près de deux clés. Sur le dessus, le sous-main porte des marques laissées par les tasses de visiteurs. La maison paraît encore habitée par toutes les soirées où quelqu’un est venu poser une question.",
      ...artwork("vigie-archives"),
      requires: ["v-porte-archives"],
      unlockMessage:
        "Le trousseau ouvre les archives. Une bibliothèque, un bureau fermé et un globe vous attendent.",
      ambience: "dust",
    },
    {
      id: "atelier-optique",
      title: "Une lumière bien réglée",
      subtitle: "Aline a préparé les pièces et laissé les gestes à suivre.",
      objective:
        "Récupérez l’optique, puis retournez à la vigie pour effectuer l’essai du grand télescope.",
      story:
        "L’atelier sent le bois ciré et le linge sec. Au centre, les lentilles attendent dans leurs étuis fermés. L’armoire de gauche contient les outils ; à droite, le boîtier de cuivre protège le cadre de l’optique. Une fiche d’entretien a été fixée à l’établi. Vous n’aurez pas à inventer les réglages : Aline les a préparés pour vous.\n\nLa porte du fond rejoint la terrasse. Avant de l’ouvrir, elle vous demande de ramener l’ensemble optique dans la vigie et d’en vérifier la netteté sur la cible installée dans la cour. Le vieux télescope doit être prêt à accueillir une prochaine visite, quelle que soit la suite que vous donnerez à ses carnets.",
      ...artwork("vigie-optique"),
      requires: ["v-porte-atelier"],
      unlockMessage:
        "L’atelier s’ouvre. Les étuis et la fiche d’entretien donnent toutes les indications nécessaires.",
      ambience: "dust",
    },
    {
      id: "terrasse",
      title: "Le jardin sous les étoiles",
      subtitle: "Une dernière lettre donne leur sens aux observations.",
      objective:
        "Lisez les notes de la terrasse et choisissez comment prolonger le travail d’Aline.",
      story:
        "Le toit vous abrite du vent. Le petit télescope de terrasse est resté en place, à côté d’un pupitre et d’un coffret. Il servait aux visites, tandis que le grand instrument de la vigie était réservé aux relevés plus longs. Aline avait installé deux tabourets ici pour que personne ne se sente pressé de laisser sa place.\n\nEn contrebas, un rectangle de jardin reste sombre entre les maisons éclairées. Vous le reconnaissez sur les cartes du carnet. Une odeur de terre humide monte jusqu’à vous. La dernière lettre est dans le coffret ; Aline vous demande simplement de lire d’abord ce qu’elle a posé sur le pupitre et de regarder à travers le petit instrument.",
      ...artwork("vigie-terrasse"),
      requires: ["v-porte-terrasse"],
      unlockMessage:
        "L’essai est terminé. Vous ouvrez la terrasse sur une nuit calme et un jardin resté dans l’ombre.",
      ambience: "stars",
    },
  ],
  objects: [
    {
      id: "v-hublot",
      chapterId: "vigie",
      name: "Les rubriques du hublot",
      prompt: "Lire la bande de papier près du hublot",
      action: "inspect",
      region: { x: 0.02, y: 0.03, w: 0.24, h: 0.35 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Aline, sur une bande de papier",
      message:
        "Trois étiquettes sont recopiées sur une bande de papier : « BRUME — 4 », « LUNE — 2 », « LUCIOLE — 7 ». Un billet d’Aline précise : « Ces chiffres sont les repères de mes anciens dossiers. Ils servent aussi au cadenas du coffre. Le billet de l’horloge vous donnera l’ordre des rubriques. »\n\nSous le papier, elle a ajouté une observation ordinaire : « Ce soir-là, nous avons passé vingt minutes à parler d’un reflet sur la vitre avant de penser à l’ouvrir. J’ai aimé ces vingt minutes. »\n\nVous entrouvrez le volet pour laisser sécher l’humidité de la pluie. Une petite cible de réglage est installée dans la cour : c’est vers elle que le grand télescope devra être vérifié après la réparation.",
      lockedMessage: "Une bande de papier est fixée juste à côté du hublot.",
      hint: "Les associations sont brume 4, lune 2, luciole 7. Cherchez l’ordre à l’horloge.",
    },
    {
      id: "v-horloge",
      chapterId: "vigie",
      name: "Le billet de l’horloge",
      prompt: "Décrocher le billet sous le cadran",
      action: "inspect",
      region: { x: 0.48, y: 0.28, w: 0.1, h: 0.22 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Aline, près du cadran",
      message:
        "Aline a retiré la pile avant son départ. Le billet sous le cadran parle du coffre : « Prenez les chiffres des rubriques dans cet ordre précis : LUNE, puis BRUME, puis LUCIOLE. Les valeurs figurent sur le papier du hublot. Un chiffre par rubrique suffit. »\n\nUne autre ligne est adressée à la personne qui lui avait offert l’horloge : « Je l’emporte lors de mon prochain passage. Salomé n’en a qu’une qui avance, et nous arrivons déjà en avance à nos promenades. »\n\nVous imaginez Aline dans une cuisine inconnue, à raconter la même histoire du cadran trop bruyant. Elle a laissé des détails de sa vie à venir au milieu des consignes, comme pour vous tenir compagnie pendant la visite.",
      lockedMessage:
        "Le billet peut être lu sans remettre l’horloge en marche.",
      hint: "L’ordre est lune, brume, luciole. Remplacez ces mots par les chiffres du hublot.",
    },
    {
      id: "v-coffre",
      chapterId: "vigie",
      name: "Le coffre de la vigie",
      prompt: "Composer le code des trois rubriques",
      action: "code",
      region: { x: 0.56, y: 0.74, w: 0.14, h: 0.14 },
      requires: ["v-hublot", "v-horloge"],
      code: "247",
      itemName: "Trousseau de la vigie",
      speaker: "Aline, dans une première lettre",
      message:
        "Le coffre contient un trousseau, des enveloppes et une lettre récente.\n\n« Je suis bien arrivée chez Salomé. Sa maison donne sur des prés et elle prétend qu’il lui manque quelqu’un pour observer ses plants de haricots. Je prends cette mission au sérieux. J’ai choisi de m’éloigner du village quelques mois ; je vous raconterai la suite quand mes journées auront trouvé leur rythme.\n\nPour les carnets, commencez par les archives. Avant cela, prenez dans l’armoire la bague de centrage du grand télescope. Je l’ai retirée pendant le nettoyage. L’optique est rangée à l’atelier, et sa fiche vous guidera.\n\nMerci de remettre la maison en état d’accueillir. J’aimerais que les nuits passées ici puissent encore servir à quelqu’un. »\n\nLe trousseau porte deux étiquettes : « armoire » et « archives ».",
      lockedMessage:
        "Le cadenas attend les chiffres du hublot dans l’ordre écrit à l’horloge.",
      hint: "Lune 2, brume 4, luciole 7 : entrez 247.",
    },
    {
      id: "v-armoire",
      chapterId: "vigie",
      name: "L’armoire de l’instrument",
      prompt: "Récupérer la bague de centrage",
      action: "unlock",
      region: { x: 0.2, y: 0.36, w: 0.19, h: 0.44 },
      requires: ["v-coffre"],
      code: null,
      itemName: "Bague de centrage",
      message:
        "La clé de l’armoire ouvre une étroite porte de bois. La bague de centrage est enveloppée dans du feutre, avec une fiche : « À garder pour le retour de l’atelier. Le cadre optique se glisse dans cette bague, puis les deux molettes le maintiennent. Le repère de montage est déjà réglé. »\n\nUn petit carnet d’accueil occupe le reste de l’étagère. Des visiteurs y ont écrit leur prénom et ce qu’ils souhaitaient revoir. Une enfant demandait « la même chose, mais plus longtemps ». Un boulanger avait dessiné la lune au dos d’une liste de commandes.\n\nAline a marqué la dernière page : « J’aimerais retrouver un jour la place de la personne qui regarde pour la première fois. » Vous prenez la bague ; la clé des archives est toujours sur le trousseau.",
      lockedMessage:
        "Le trousseau rangé dans le coffre contient la clé de l’armoire.",
      hint: "Ouvrez le coffre, puis prenez la bague : vous l’utiliserez après le passage à l’atelier.",
    },
    {
      id: "v-porte-archives",
      chapterId: "vigie",
      name: "La porte des archives",
      prompt: "Entrer dans la pièce des carnets",
      action: "unlock",
      region: { x: 0.77, y: 0.15, w: 0.2, h: 0.73 },
      requires: ["v-coffre", "v-armoire"],
      code: null,
      itemName: null,
      message:
        "La seconde clé du trousseau ouvre la porte. Avant de la pousser, vous regardez le grand télescope. Il reste incomplet, mais vous avez la première pièce et les instructions pour revenir le terminer. Vous pourrez retrouver cette pièce depuis les autres lieux.\n\nDans les archives, une lampe basse éclaire le bureau. Aline a laissé un index à portée de main, sur la bibliothèque. Vous reconnaissez ses carnets reliés à la main ; elle disait qu’elle retenait mieux une nuit quand elle pouvait aussi se souvenir du tissu de sa couverture.",
      lockedMessage:
        "Récupérez le trousseau et la bague de centrage avant de passer aux archives.",
      hint: "Le coffre contient le trousseau ; l’armoire contient la bague à emporter.",
    },
    {
      id: "v-telescope",
      chapterId: "vigie",
      name: "Le grand télescope à remonter",
      prompt: "Revenir monter l’optique et faire l’essai",
      action: "unlock",
      region: { x: 0.03, y: 0.45, w: 0.15, h: 0.43 },
      requires: ["v-armoire", "v-mecanisme"],
      code: null,
      itemName: "Fiche d’essai complétée",
      message:
        "De retour à la vigie, vous posez le cadre optique dans la bague préparée par Aline. Les repères coïncident. Vous serrez les deux molettes à la main, comme l’indique la fiche, puis vous regardez la cible installée dans la cour.\n\nLe dessin devient net. Vous distinguez les trois cercles décrits sur la fiche de contrôle et cochez la case « essai terminé ». Aucun autre réglage n’est demandé. Le grand télescope est prêt pour les prochaines visites.\n\nAu bas de la feuille, Aline a écrit : « Merci d’être revenu ici. Je voulais que vous sachiez remettre l’instrument en état, avant de découvrir ce que j’ai observé ailleurs. Vous pouvez maintenant rejoindre la terrasse par l’atelier. Le petit télescope y est déjà prêt. »",
      lockedMessage:
        "Il manque l’optique. Prenez la bague dans l’armoire, puis suivez les archives jusqu’à l’atelier avant de revenir ici.",
      hint: "Ouvrez le boîtier de cuivre de l’atelier, puis revenez à ce télescope pour effectuer l’essai.",
    },
    {
      id: "v-rayon",
      chapterId: "archives",
      name: "L’index de la bibliothèque",
      prompt: "Chercher le dernier carnet dans l’index",
      action: "inspect",
      region: { x: 0.03, y: 0.06, w: 0.25, h: 0.29 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Aline, dans l’index",
      message:
        "L’index comporte une entrée soulignée : « Dernier carnet : couverture bleue, tablette basse, ruban de lin. » Une note vous demande de prendre le volume pour la suite de la visite.\n\n« J’ai commencé par consigner seulement ce que je voyais dans l’oculaire. Puis les marges ont accueilli la météo, les conversations et l’endroit où nous avions posé les chaises. Ce mélange m’a longtemps paru désordonné. En relisant, j’y retrouve les conditions de chaque observation.\n\nLe carnet bleu contient aussi trois repères pour ouvrir le bureau. Ils sont écrits en toutes lettres dans le volume, avec leur chiffre. Le petit plan fixé au globe vous donnera leur ordre. »\n\nÀ côté de l’index, une liste de prêts porte les prénoms de plusieurs voisins. Aline a laissé de quoi les poursuivre.",
      lockedMessage: "Un index est posé à mi-hauteur de la bibliothèque.",
      hint: "L’index désigne le carnet bleu sur la tablette basse de cette bibliothèque.",
    },
    {
      id: "v-carnet",
      chapterId: "archives",
      name: "Le carnet bleu",
      prompt: "Prendre le carnet marqué d’un ruban",
      action: "collect",
      region: { x: 0.04, y: 0.43, w: 0.23, h: 0.31 },
      requires: ["v-rayon"],
      code: null,
      itemName: "Carnet des observations",
      message:
        "Le ruban ouvre le carnet sur trois rubriques : « VERGER — 8 », « RUISSEAU — 3 », « HAIE — 5 ». Aline a précisé : « Pour la serrure du bureau, remplacez les noms du plan du globe par ces chiffres. »\n\nLes pages voisines sont plus inattendues. Aline y compare des soirées passées à la terrasse et dans un petit jardin du village. Elle note la qualité du regard autant que les détails du ciel : « Trois personnes. Une chaise basse. Nous avons attendu que tout le monde soit installé. Personne n’a demandé l’heure. »\n\nSur une page, une visiteuse a écrit : « J’avais regardé vos cartes sans oser demander à quoi cela ressemblait dehors. » Aline a entouré cette phrase. Vous emportez le carnet avec ses relevés et ces marges qu’elle a choisi de conserver.",
      lockedMessage:
        "Consultez d’abord l’index pour identifier le volume qu’Aline vous confie.",
      hint: "Le carnet donne verger 8, ruisseau 3, haie 5. L’ordre se trouve sur le globe.",
    },
    {
      id: "v-globe",
      chapterId: "archives",
      name: "Le plan fixé au globe",
      prompt: "Lire l’itinéraire sur le papier du globe",
      action: "inspect",
      region: { x: 0.73, y: 0.32, w: 0.23, h: 0.4 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Le globe porte un petit plan dessiné sur du papier plié. Une flèche relie trois mots, et Aline les a recopiés au-dessous pour éviter toute ambiguïté : « HAIE, puis VERGER, puis RUISSEAU ».\n\nUn encadré donne la consigne du bureau : « Gardez cet ordre et utilisez les chiffres du carnet bleu. Vous n’avez besoin d’aucune autre carte. »\n\nAu verso, elle raconte que Salomé avait offert ce globe pour ses cinquante ans. Elles avaient passé la soirée à chercher un village trop petit pour y figurer. Salomé avait fini par coller un point à son emplacement approximatif. À côté du plan, ce petit morceau de papier tient encore. Aline l’a emporté partout où elle a déménagé ses livres.",
      lockedMessage: "Le papier fixé au globe peut être lu dès votre arrivée.",
      hint: "L’ordre est haie, verger, ruisseau. Prenez leurs chiffres dans le carnet bleu.",
    },
    {
      id: "v-bureau",
      chapterId: "archives",
      name: "Le bureau des lettres",
      prompt: "Ouvrir le bureau avec le parcours du plan",
      action: "code",
      region: { x: 0.53, y: 0.6, w: 0.13, h: 0.12 },
      requires: ["v-carnet", "v-globe"],
      code: "583",
      itemName: "Clés de l’atelier et de la terrasse",
      speaker: "Aline, dans la lettre du bureau",
      message:
        "La vitre se relève. Vous prenez les clés et dépliez la lettre.\n\n« Quand les visites sont devenues nombreuses, j’ai voulu bien recevoir tout le monde. J’ai ajouté des séances, répondu au courrier le matin et préparé les cartes l’après-midi. J’aimais ce travail. Je me suis aperçue que je ne regardais presque plus le ciel pour moi.\n\nJe partais alors marcher dans le jardin derrière la maison aux volets verts. Ses propriétaires m’y prêtaient une chaise. Ils ont accepté que j’y invite parfois une ou deux personnes. C’est là que j’ai repris les notes de ce carnet.\n\nJ’aimerais leur donner une suite, et je vous laisse deux propositions dans le coffret de la terrasse. Avant de choisir, remettez le grand télescope en état. Les étuis de l’atelier et sa fiche donnent le code du boîtier optique. Merci de prendre ce temps. »",
      lockedMessage:
        "Le bureau attend les trois chiffres du carnet, dans l’ordre du plan fixé au globe.",
      hint: "Haie 5, verger 8, ruisseau 3 : entrez 583.",
    },
    {
      id: "v-porte-atelier",
      chapterId: "archives",
      name: "La porte de l’atelier",
      prompt: "Ouvrir la pièce des lentilles",
      action: "unlock",
      region: { x: 0.37, y: 0.2, w: 0.16, h: 0.39 },
      requires: ["v-bureau"],
      code: null,
      itemName: null,
      message:
        "Une des clés du bureau porte le mot « atelier ». La serrure fonctionne facilement. Vous gardez le carnet bleu avec vous ; ses pages serviront à la terrasse lorsque les deux instruments seront prêts.\n\nSur la porte intérieure, une fiche de suivi comporte deux cases : « cadre optique récupéré » et « essai effectué dans la vigie ». Aline a laissé le crayon sur sa ficelle. Vous souriez à cette façon de vous confier une tâche : les gestes sont préparés, et elle s’est retenue d’ajouter une note entre chaque ligne. La pièce suivante conserve tout ce dont vous avez besoin.",
      lockedMessage: "Les clés de l’atelier sont rangées dans le bureau fermé.",
      hint: "Ouvrez le bureau avec le code du carnet bleu et du plan du globe.",
    },
    {
      id: "v-lentilles",
      chapterId: "atelier-optique",
      name: "Les étuis de lentilles",
      prompt: "Lire les repères des trois étuis",
      action: "inspect",
      region: { x: 0.35, y: 0.67, w: 0.28, h: 0.12 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Les étuis reposent sur un tissu propre. Leurs étiquettes sont recopiées sur la fiche de l’établi : « CLAIR — 2 », « BLEU — 9 », « AMBRE — 6 ». Un mot explique que ces repères servent à ouvrir le boîtier de cuivre ; l’ordre de saisie est dans l’armoire à outils.\n\nLes lentilles elles-mêmes sont déjà nettoyées et protégées. Vous laissez leurs couvercles en place. Aline a préparé un cadre complet qui se monte sans séparer les verres ; c’est ce cadre que le boîtier conserve.\n\nSous le tissu, une vieille photographie montre la même table encombrée de tasses. Au dos : « Premier atelier. Nous avons finalement passé la soirée à réparer la lampe. Le télescope a attendu le lendemain. »",
      lockedMessage: "La fiche près des étuis est disponible dès votre entrée.",
      hint: "Notez clair 2, bleu 9, ambre 6. L’armoire à outils donne leur ordre.",
    },
    {
      id: "v-outils",
      chapterId: "atelier-optique",
      name: "L’armoire à outils",
      prompt: "Prendre la fiche de montage et le feutre",
      action: "collect",
      region: { x: 0.03, y: 0.14, w: 0.25, h: 0.55 },
      requires: [],
      code: null,
      itemName: "Fiche de montage et feutre",
      speaker: "Aline, sur la fiche de montage",
      message:
        "L’armoire n’est pas fermée. Vous y trouvez un feutre de transport et une fiche : « Code du boîtier : CLAIR, puis BLEU, puis AMBRE. Entrez le chiffre de chaque étui dans cet ordre. »\n\nLa suite décrit le montage : envelopper le cadre dans le feutre, le rapporter au grand télescope de la vigie, l’engager dans la bague de centrage, serrer les deux molettes à la main. La vérification se fait sur la cible de la cour ; une image nette des trois cercles termine l’essai.\n\nDans la marge, Aline a ajouté : « J’ai déjà réglé le cadre. Prenez seulement le temps de vérifier. Les outils les plus utiles ce soir seront vos mains et une table dégagée. » Vous repliez le feutre autour de la fiche.",
      lockedMessage:
        "L’armoire à outils est simplement poussée, prête à être ouverte.",
      hint: "La fiche donne l’ordre clair, bleu, ambre. Associez-le aux chiffres des étuis.",
    },
    {
      id: "v-mecanisme",
      chapterId: "atelier-optique",
      name: "Le boîtier de cuivre",
      prompt: "Ouvrir le boîtier et prendre le cadre optique",
      action: "code",
      region: { x: 0.72, y: 0.33, w: 0.22, h: 0.48 },
      requires: ["v-lentilles", "v-outils"],
      code: "296",
      itemName: "Cadre optique prêt à monter",
      message:
        "Le mécanisme libère le couvercle de cuivre. Le cadre optique est maintenu dans un logement de feutre ; les deux molettes sont déjà dévissées de quelques tours pour le montage. Vous le soulevez par ses poignées et l’enveloppez sans toucher aux verres.\n\nUn papier repose dans le logement vide : « Retournez maintenant à la vigie. La bague de l’armoire et ce cadre permettent de remettre le grand télescope en état. Faites l’essai sur la cible de la cour, puis revenez ouvrir la terrasse depuis l’atelier. »\n\nVous cochez la première case de la fiche de suivi. À côté de la seconde, Aline a dessiné le fauteuil de la vigie, celui qui grince quand on s’y assoit trop vite. Le chemin du retour vous est maintenant familier.",
      lockedMessage:
        "Le boîtier attend les trois repères des étuis dans l’ordre donné par la fiche de l’armoire.",
      hint: "Clair 2, bleu 9, ambre 6 : entrez 296, puis retournez au grand télescope de la vigie.",
    },
    {
      id: "v-porte-terrasse",
      chapterId: "atelier-optique",
      name: "La porte de la terrasse",
      prompt: "Ouvrir après l’essai de l’instrument",
      action: "unlock",
      region: { x: 0.44, y: 0.31, w: 0.1, h: 0.3 },
      requires: ["v-mecanisme", "v-telescope"],
      code: null,
      itemName: null,
      message:
        "La fiche porte maintenant ses deux coches. Vous avez récupéré le cadre et effectué l’essai dans la vigie. Vous rangez le feutre sur l’établi, puis prenez la seconde clé du bureau.\n\nLa porte s’ouvre sur la terrasse. Dans la nuit, le petit télescope attend près du pupitre. Un papier retient les pages pour qu’elles ne s’envolent pas : « Commencez par les notes du pupitre. Regardez ensuite dans le petit instrument. Le coffret vous donnera ma proposition quand vous aurez pris votre temps. »\n\nVous laissez la lumière de l’atelier derrière vous. La terrasse se dessine peu à peu : un tabouret, le bord du toit, puis le jardin qu’Aline a décrit dans ses marges.",
      lockedMessage:
        "Aline vous demande de terminer l’essai : prenez le cadre à l’atelier, puis revenez au grand télescope de la vigie.",
      hint: "Après le code 296, retournez résoudre le grand télescope dans la vigie, puis revenez à cette porte.",
    },
    {
      id: "v-pupitre",
      chapterId: "terrasse",
      name: "Les notes du pupitre",
      prompt: "Comparer les feuilles avec le carnet bleu",
      action: "inspect",
      region: { x: 0.19, y: 0.71, w: 0.47, h: 0.11 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Les feuilles du pupitre correspondent aux dernières pages du carnet. Aline a préparé une copie lisible de ses relevés : date de chaque séance, état du ciel, dessin et remarques. Une autre feuille conserve les récits des petites soirées au jardin.\n\n« Ces deux ensembles me plaisent, écrit-elle. Les relevés pourront rejoindre les archives de la bibliothèque. Les récits me donnent envie de laisser vivre le jardin, avec peu de lumière et des visites modestes. Je peux vous aider à commencer par l’un ou l’autre. »\n\nLe petit télescope est orienté vers le groupe d’étoiles dessiné sur la première feuille. Aline vous propose de comparer tranquillement le dessin à ce que vous voyez. Aucun nom à connaître, aucune réponse à calculer : vous avez seulement un regard à lui prêter.",
      lockedMessage:
        "Les feuilles du pupitre peuvent être lues dès votre arrivée sur la terrasse.",
      hint: "Lisez ces notes avant de regarder dans le petit télescope, puis ouvrez le coffret.",
    },
    {
      id: "v-petite-lunette",
      chapterId: "terrasse",
      name: "Le petit télescope de terrasse",
      prompt: "Regarder le ciel indiqué sur le dessin",
      action: "inspect",
      region: { x: 0.05, y: 0.39, w: 0.25, h: 0.39 },
      requires: ["v-pupitre"],
      code: null,
      itemName: null,
      message:
        "Vous rapprochez le tabouret. Le groupe d’étoiles ressemble au dessin du pupitre, avec ses points plus discrets qu’il faut attendre un peu pour distinguer. Vous comprenez pourquoi Aline prévoyait deux sièges : rester ici demande surtout de pouvoir se sentir à l’aise.\n\nUn billet est attaché au pied de l’instrument. « La première fois que je suis venue dans cette maison, j’ai dit que je reviendrais quand j’en saurais davantage. La personne qui m’accueillait m’a proposé une chaise. C’est ce geste que je voudrais garder. »\n\nVous baissez les yeux vers le jardin. Les bancs apparaissent maintenant dans l’ombre. Aline y avait retrouvé ce même temps disponible. Le coffret peut être ouvert ; sa dernière lettre vous est destinée.",
      lockedMessage:
        "Le pupitre explique ce qu’Aline vous propose de regarder et pourquoi elle a préparé cette séance.",
      hint: "Lisez les feuilles du pupitre, puis prenez un moment au petit télescope.",
    },
    {
      id: "v-coffret",
      chapterId: "terrasse",
      name: "La dernière lettre d’Aline",
      prompt: "Soulever le couvercle du coffret",
      action: "collect",
      region: { x: 0.73, y: 0.66, w: 0.21, h: 0.3 },
      requires: ["v-petite-lunette"],
      code: null,
      itemName: "Lettre et deux propositions",
      speaker: "Aline, dans la dernière lettre",
      message:
        "Le coffret s’ouvre sans clé. Deux chemises accompagnent la lettre.\n\n« Vous avez mes observations et vous connaissez maintenant le jardin. Si vous souhaitez transmettre les relevés à la bibliothèque, j’ai préparé les copies et les notices. Vous pourrez y organiser une première soirée de lecture, puis inviter les personnes intéressées à la vigie.\n\nSi vous préférez commencer par protéger la tranquillité du jardin, ses propriétaires sont d’accord pour en garder les soirées sans éclairage supplémentaire. Ils souhaitent une personne pour prendre soin des bancs et accueillir de petites visites. Les pages de cette chemise rassemblent nos idées.\n\nJe vous propose un premier pas, à la mesure du temps que vous avez. Je reviendrai quelques jours au printemps. J’espère alors m’asseoir à côté de vous et vous demander ce que vous avez vu depuis mon départ. Aline. »",
      lockedMessage:
        "Aline vous invite à lire le pupitre et à regarder dans le petit télescope avant d’ouvrir sa dernière lettre.",
      hint: "Après les notes du pupitre et l’observation au petit télescope, ouvrez le coffret.",
    },
    {
      id: "v-decision",
      chapterId: "terrasse",
      name: "La page que vous emporterez",
      prompt: "Choisir la première suite à donner aux notes",
      action: "choose",
      region: { x: 0.25, y: 0.83, w: 0.3, h: 0.07 },
      requires: ["v-pupitre", "v-petite-lunette", "v-coffret"],
      code: null,
      itemName: null,
      message:
        "Vous disposez les deux chemises sur le pupitre. Les copies des observations sont prêtes à rejoindre la bibliothèque ; les pages du jardin décrivent des rendez-vous plus discrets et le soin à donner au lieu. Vous avez remis l’instrument principal en état, retrouvé les notes et lu la lettre entière.\n\nAline vous propose de commencer par le projet auquel vous souhaitez consacrer votre temps. Vous choisirez ensuite les détails avec les personnes concernées. Sur une carte postale vierge, vous préparez les premiers mots de votre réponse.",
      lockedMessage:
        "Lisez les notes, regardez dans le petit télescope et prenez connaissance de la dernière lettre.",
      hint: "Les deux projets ouvrent le portillon. Choisissez celui que vous souhaitez commencer.",
      choices: [
        {
          id: "transmettre",
          label: "Transmettre les observations à la bibliothèque",
          reply:
            "Vous réunissez les copies et les notices pour les proposer à la bibliothèque du village.",
        },
        {
          id: "jardin",
          label: "Préserver le calme du jardin nocturne",
          reply:
            "Vous prenez la chemise du jardin pour préparer de petites soirées et conserver son obscurité.",
        },
      ],
    },
    {
      id: "v-portillon",
      chapterId: "terrasse",
      name: "Le portillon du retour",
      prompt: "Redescendre avec votre réponse pour Aline",
      action: "exit",
      region: { x: 0.4, y: 0.5, w: 0.19, h: 0.18 },
      requires: ["v-decision"],
      code: null,
      itemName: null,
      message:
        "Vous refermez le coffret et rangez les feuilles à l’abri. Sur la carte, vous écrivez que le grand télescope fonctionne à nouveau, que vous avez pris le temps de regarder et que vous avez choisi par où commencer.\n\nLe portillon s’ouvre sur l’escalier habituel, doucement éclairé par les fenêtres de la maison. Vous descendrez jusqu’au village avec une chemise sous le bras. Vous n’avez plus à imaginer les raisons du départ d’Aline : elle vous les a confiées. Il vous reste une lettre à envoyer et une première rencontre à préparer.",
      lockedMessage:
        "Choisissez d’abord sur le pupitre le projet que vous souhaitez commencer.",
      hint: "Prenez votre décision sur la page du pupitre, puis ouvrez le portillon.",
    },
  ],
  ending: {
    sourceObjectId: "v-decision",
    variants: [
      {
        choiceId: "transmettre",
        title: "Des nuits à partager",
        text: "Vous apportez les copies à la bibliothèque. La personne qui vous accueille reconnaît plusieurs prénoms dans les marges : les carnets d’Aline appartiennent déjà un peu aux souvenirs du village. Vous proposez une première soirée autour des dessins et des récits, avec quelques sièges et le temps de poser des questions.\n\nVous conservez les notices avec les relevés, ainsi que la distinction préparée par Aline entre ses observations, ses essais et ses impressions. Les prochaines pages pourront porter d’autres noms. Le grand télescope de la vigie est prêt ; vous convenez de regarder les envies de chacun avant d’ajouter des rendez-vous.\n\nQuelques jours plus tard, Aline répond à votre carte. Salomé a installé un banc près de ses haricots, écrit-elle, et elle a recommencé à dessiner le soir. Elle vous remercie d’avoir donné une place à ses notes sans lui réserver d’office le rôle de conférencière. Au printemps, elle viendra comme elle l’avait promis.\n\nVous rangez sa réponse dans le carnet bleu. Sur la page suivante, vous notez la date de la première rencontre. La Vigie de la Lune conserve son nom, avec une nouvelle personne pour ouvrir la porte et proposer une chaise.",
      },
      {
        choiceId: "jardin",
        title: "Une chaise dans la nuit",
        text: "Vous rencontrez les propriétaires du jardin avec la chemise préparée par Aline. Ensemble, vous relisez les idées de petites visites, le plan des bancs et les passages à laisser libres. Vous décidez de commencer par une seule soirée, avec quelques personnes qui connaissent déjà le lieu.\n\nLes éclairages supplémentaires restent rangés. Vous vérifiez les sièges, préparez des couvertures et laissez une place à qui voudra simplement écouter. Les observations demeurent disponibles à la vigie ; le carnet bleu pourra aussi accompagner les soirées au jardin. Vous commencez par prendre soin des conditions dans lesquelles Aline aimait regarder.\n\nDans votre réponse, vous lui racontez le bruit du portillon et le temps passé au petit télescope. Elle écrit quelques jours plus tard qu’elle aimerait apporter un gâteau à la prochaine visite. Vous lui gardez une chaise, sans lui demander de préparer une présentation.\n\nLe soir convenu, chacun arrive avec une question différente. Vous montrez où poser les affaires, puis vous vous asseyez vous aussi. Au-dessus de la haie, le ciel se découvre entre deux nuages. Quelqu’un demande si l’on peut rester un peu plus longtemps. Vous avez prévu le temps.",
      },
    ],
  },
};
