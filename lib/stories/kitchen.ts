import type { Room } from "../game.ts";
import { artwork } from "./art.ts";

export const kitchenStory: Room = {
  title: "Le dernier service",
  description:
    "La dernière soirée du bistrot familial vous ramène de la cuisine à la cour. Retrouvez la recette d’Élise, découvrez qui attend à la dernière table et choisissez ce que vous souhaitez transmettre.",
  story:
    "Le bistrot des Tilleuls ferme ce soir sous le nom de votre tante Élise. Après trente années derrière les fourneaux, elle part vivre près de sa sœur, au bord de la mer. Vous êtes revenu pour ranger avec elle. Elle vous a laissé les clés, un tablier propre et une consigne : « Avant de décider ce que devient cette maison, faites le tour. J’ai mis ce que je voulais vous dire aux endroits où nous travaillions. »\n\nVous n’avez encore rien promis. Reprendre le bistrot vous attire autant que cela vous intimide. Dans la cuisine, le four est froid, les torchons sèchent et une odeur d’orange reste dans l’air. Le carnet de recettes manque à sa place habituelle. Sur le tableau des réservations, une seule ligne demeure : « Dernier service — L. Marceau — une place à garder. » Élise n’a jamais parlé de cette personne.\n\nElle vous attendra dans la cour à l’aube. Vous avez la soirée pour retrouver le carnet, comprendre cette invitation et regarder la maison avec vos propres yeux. La vaisselle peut attendre un peu.",
  theme: "cosy",
  difficulty: "intermediaire",
  duration: 30,
  ...artwork("kitchen-base"),
  provenance: { method: "manual", model: null, generatedAt: null },
  chapters: [
    {
      id: "cuisine",
      title: "La cuisine après le bruit",
      subtitle: "Un tablier, une recette incomplète et une réservation.",
      objective:
        "Retrouvez la clé de la réserve et la première page du carnet.",
      story:
        "Vous connaissez le bruit que fait cette cuisine quand elle travaille : les assiettes qu’on empile, la porte du four, la cuillère qu’Élise frappe contre son poignet avant de goûter. Ce soir, le silence laisse entendre le réfrigérateur et la pluie fine contre la vitre.\n\nTout a été nettoyé, mais rien n’a été emballé. Au-dessus des assiettes, une enveloppe porte votre prénom. Élise a même redressé le petit tiroir qui ferme mal depuis votre enfance. Sur le plan de travail, une coupe de fruits voisine avec un torchon plié. La recette du dimanche semble vous attendre, répartie dans les gestes ordinaires de la pièce. Vous pouvez commencer sans vous dépêcher.",
      ...artwork("kitchen-base"),
      requires: [],
      unlockMessage:
        "La cuisine vous appartient pour cette dernière soirée. Commencez par le mot près des assiettes.",
      ambience: "steam",
    },
    {
      id: "reserve",
      title: "Ce que l’on garde",
      subtitle: "Les bocaux ont des étiquettes ; les souvenirs aussi.",
      objective:
        "Ouvrez le coffre, consultez le dossier de transmission et retrouvez une carte restée en cuisine.",
      story:
        "La réserve sent le bois sec et les herbes. Élise a passé plus de temps ici à chercher un couvercle qu’à tenir ses comptes, mais ses bocaux forment toujours des rangées impeccables. Le coffre du milieu porte les traces des déménagements de la famille. Vous le croyiez plein de nappes.\n\nUne armoire attend, fermée, près de la porte de la salle. Sur son battant, Élise a collé un papier : « Les clés ouvrent les meubles. Les lettres expliquent pourquoi nous les avons remplis. » Vous venez chercher une recette ; vous commencez à comprendre qu’elle vous a aussi laissé les moyens de choisir votre place dans cette maison.",
      ...artwork("kitchen-reserve"),
      requires: ["k-porte-reserve"],
      unlockMessage:
        "La clé tourne dans la porte du fond. La réserve conserve les provisions et une partie de l’histoire du bistrot.",
      ambience: "dust",
    },
    {
      id: "salle",
      title: "La dernière table",
      subtitle: "Un couvert porte un nom que vous connaissez autrement.",
      objective:
        "Rapprochez l’addition et le mot du comptoir pour ouvrir le banc du piano et identifier L. Marceau.",
      story:
        "Les chaises sont encore au sol. Élise n’a dressé qu’une table, près de la baie vitrée qui donne sur la cour. Trois verres y prennent la lumière du réverbère. Vous en attendiez deux.\n\nLe vieux comptoir conserve sa marque ronde, à l’endroit où chacun posait sa tasse. À droite, le piano fermé n’a plus servi depuis le dernier repas de quartier. Quelqu’un a essuyé ses touches et redressé le banc. Le couvert supplémentaire cesse de ressembler à une formalité : une personne a préparé sa venue avec soin. Vous avez maintenant de quoi lui rendre son nom entier.",
      ...artwork("kitchen-salle"),
      requires: ["k-porte-salle"],
      unlockMessage:
        "La salle s’ouvre. Une table à trois places est dressée devant la porte vitrée.",
      ambience: "rain",
    },
    {
      id: "cour",
      title: "La cour au petit jour",
      subtitle: "Il reste une page à écrire de votre main.",
      objective:
        "Lisez les derniers mots d’Élise, récupérez le carnet et décidez de son avenir.",
      story:
        "La pluie a cessé. Vous entrez dans la cour au moment où les pavés perdent leur couleur de nuit. La valise d’Élise attend sur le banc. Sur la table, le carnet est posé sous une tasse vide ; une branche du vieux tilleul l’empêche de prendre toute la lumière.\n\nDeux voix vous parviennent depuis le petit passage, derrière le portail. Élise et Lou vous laissent finir la visite. Elles ont préparé du café pour trois, mais aucune réponse à votre place. Vous pouvez encore relire ce que vous avez trouvé, retourner dans les pièces et mesurer ce que chacune vous donne envie de faire. Quand vous serez prêt, la place libre à la table vous attendra.",
      ...artwork("kitchen-cour"),
      requires: ["k-porte-cour"],
      unlockMessage:
        "La porte vitrée cède doucement. Dans la cour, le carnet vous attend enfin.",
      ambience: "leaves",
    },
  ],
  objects: [
    {
      id: "k-assiettes",
      chapterId: "cuisine",
      name: "Le mot des assiettes",
      prompt: "Lire l’enveloppe sur l’étagère",
      action: "inspect",
      region: { x: 0.09, y: 0.06, w: 0.26, h: 0.28 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Élise, sur une enveloppe",
      message:
        "« Vous rangiez les assiettes pendant que je préparais le dimanche. Je vous trouvais trop petit pour porter les grandes ; vous les portiez quand même. J’ai gardé notre première fiche de service dans le tiroir.\n\nLe cadenas reprend les quantités de ce premier repas : quatre entrées, deux plats, six desserts. Entrez un chiffre par quantité, dans cet ordre précis : entrées, plats, desserts. Tout est écrit ici ; inutile de recompter la vaisselle.\n\nLa clé de la réserve est dedans. Prenez aussi le temps de regarder ce que nous avions écrit au dos de la fiche. Je voulais vous le dire de vive voix, puis j’ai eu peur de parler à votre place. »",
      lockedMessage: "Une enveloppe à votre nom repose contre les assiettes.",
      hint: "Le mot donne quatre entrées, deux plats et six desserts, dans cet ordre.",
    },
    {
      id: "k-tiroir",
      chapterId: "cuisine",
      name: "Le tiroir du premier dimanche",
      prompt: "Ouvrir le tiroir à trois chiffres",
      action: "code",
      region: { x: 0.07, y: 0.68, w: 0.3, h: 0.1 },
      requires: ["k-assiettes"],
      code: "426",
      itemName: "Clé de la réserve",
      message:
        "Le tiroir s’ouvre. Une petite clé de cuivre est attachée à la fiche par de la ficelle. Au recto, les quantités sont couvertes de corrections ; au dos, vous reconnaissez votre écriture d’enfant : « Quand je serai grand, je ferai la tarte. »\n\nÉlise a ajouté tout récemment : « Vous aviez aussi promis d’être marin, de dessiner des maisons et d’habiter dans un arbre. Je n’ai conservé aucune de ces phrases comme une dette. Celle-ci non plus. »\n\nUne flèche au crayon désigne les fruits : « Pour le carnet, repartez du parfum. L’orange nous a toujours remis sur le bon chemin. » Vous glissez la clé dans votre poche.",
      lockedMessage:
        "Le cadenas attend trois chiffres. Le mot sur l’étagère donne les quantités et leur ordre.",
      hint: "Saisissez 426 : quatre entrées, deux plats, six desserts.",
    },
    {
      id: "k-fruits",
      chapterId: "cuisine",
      name: "Les fruits du plan de travail",
      prompt: "Soulever le papier sous les oranges",
      action: "collect",
      region: { x: 0.32, y: 0.41, w: 0.15, h: 0.14 },
      requires: ["k-tiroir"],
      code: null,
      itemName: "Première page de recette",
      speaker: "Élise, dans la marge",
      message:
        "Sous les oranges, une page décrit la pâte de la tarte du dimanche. Les instructions sont simples, pleines de petites remarques : garder les mains fraîches, laisser reposer, ouvrir la fenêtre quand la cuisine devient trop chaude. Un coin de papier a été ajouté après coup.\n\n« Lou râpait toujours trop d’écorce. Je lui disais d’en garder pour la suivante ; elle répondait que la suivante aurait bien le temps d’arriver. J’ai fini par lui donner raison. Nous mangions cette tarte au comptoir, entre deux services. »\n\nLe bas de la page a été découpé. Une phrase demeure : « La garniture est sous le plat couvert du four, maintenant tout à fait froid. » Vous recueillez la page sans déranger davantage les fruits.",
      lockedMessage:
        "Le tiroir contient un mot qui explique ce que vous devez chercher parmi les fruits.",
      hint: "Suivez la flèche notée sur la fiche du tiroir, puis soulevez le papier sous les oranges.",
    },
    {
      id: "k-four",
      chapterId: "cuisine",
      name: "Le plat dans le four froid",
      prompt: "Découvrir la seconde page sous le plat",
      action: "inspect",
      region: { x: 0.54, y: 0.43, w: 0.25, h: 0.49 },
      requires: ["k-fruits"],
      code: null,
      itemName: null,
      message:
        "Le four est froid depuis des heures. Sous le couvercle du plat, vous trouvez la page de garniture : fruits, miel, une pointe de thym. À côté des mesures, deux écritures se répondent. « Trop sucré », avait noté Élise. « Alors partageons-la en davantage de parts », avait répondu Lou.\n\nUne feuille plus récente dépasse : « Le reste du carnet est prêt. Je l’ai laissé là où l’on peut voir le jour arriver. Avant de le prendre, ouvrez la réserve. Les étiquettes des bocaux et le registre vous permettront d’ouvrir le coffre ; vous y trouverez ce que je n’ai jamais pris le temps de raconter. »\n\nLa clé de cuivre convient à la porte du fond. Une autre fiche semble glissée sous la tablette du four, mais rien ne vous indique encore laquelle chercher.",
      lockedMessage: "La page près des fruits vous guidera vers ce plat.",
      hint: "Lisez la page cachée sous les oranges avant d’examiner le plat couvert.",
    },
    {
      id: "k-porte-reserve",
      chapterId: "cuisine",
      name: "La porte de la réserve",
      prompt: "Tourner la clé de cuivre",
      action: "unlock",
      region: { x: 0.79, y: 0.12, w: 0.15, h: 0.45 },
      requires: ["k-tiroir", "k-four"],
      code: null,
      itemName: null,
      message:
        "La clé tourne sans résistance. Élise a huilé la serrure avant de partir, comme elle préparait les couteaux avant votre arrivée. Sur le chambranle, une marque au crayon mesure encore votre taille à dix ans.\n\nLa réserve s’ouvre sur des étagères de bocaux et un coffre de bois. Vous emportez les deux pages de recette. Elles parlent du même dessert, mais elles vous rappellent surtout des personnes : votre tante penchée sur la pâte, Lou au comptoir, vous sur un tabouret pour atteindre le plan de travail. Il reste à comprendre pourquoi ces souvenirs ont été réunis ce soir.",
      lockedMessage:
        "Prenez la clé du tiroir et retrouvez la seconde page dans le four froid.",
      hint: "Le tiroir donne la clé ; le plat du four explique pourquoi entrer dans la réserve.",
    },
    {
      id: "k-fiche-oubliee",
      chapterId: "cuisine",
      name: "La carte sous la tablette",
      prompt: "Revenir chercher la carte du premier dimanche",
      action: "collect",
      region: { x: 0.16, y: 0.55, w: 0.18, h: 0.08 },
      requires: ["k-armoire"],
      code: null,
      itemName: "Carte du premier dimanche",
      message:
        "De retour en cuisine, vous glissez la main sous la tablette indiquée dans le dossier. La carte est maintenue par une pince, à l’abri des éclaboussures. Vous ne l’aviez jamais vue entière.\n\n« Les Tilleuls — dimanche d’ouverture. Élise : cuisine. Lou Marceau : salle et desserts. » Au-dessous, une photographie montre Lou à peine plus âgée que vous à l’époque. Vous la reconnaissez : c’est la jeune femme qui vous apprenait à plier les serviettes en bateaux. Vous n’aviez retenu que son prénom.\n\nAu dos, Élise a écrit : « Elle est partie apprendre la menuiserie. Sa place est restée dans mes recettes. Gardez cette carte : Lou aura plaisir à la revoir à table. Vous pouvez maintenant ouvrir la salle avec la clé du dossier. »",
      lockedMessage:
        "Vous apercevez plusieurs papiers sous la tablette. Le dossier de l’armoire vous dira lequel récupérer.",
      hint: "Ouvrez l’armoire de la réserve, puis revenez ici chercher la carte pincée sous la tablette du four.",
    },
    {
      id: "k-bocaux",
      chapterId: "reserve",
      name: "Les étiquettes des bocaux",
      prompt: "Lire les trois étiquettes de rangement",
      action: "inspect",
      region: { x: 0.04, y: 0.06, w: 0.25, h: 0.54 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Trois étiquettes neuves se distinguent parmi les anciennes : « THYM — 1 », « CITRON — 6 », « ORANGE — 4 ». Élise a dessiné une petite clé à côté de chacune. Un mot précise : « Ce sont les chiffres du coffre. Leur place sur l’étagère ne donne pas leur ordre. Le registre conserve celui de notre première livraison. »\n\nDans le fond d’un bocal vide, vous trouvez aussi un bouton de veste. Le papier qui l’accompagne dit : « À recoudre depuis quinze ans. » Vous souriez. Élise sait organiser des provisions pour quarante personnes ; certaines petites tâches lui ressemblent moins. Vous laissez le bouton à l’endroit où elle saura le retrouver.",
      lockedMessage:
        "Les étiquettes peuvent être lues dès votre arrivée dans la réserve.",
      hint: "Notez les associations : thym 1, citron 6, orange 4. Le registre donnera l’ordre.",
    },
    {
      id: "k-registre",
      chapterId: "reserve",
      name: "Le registre des livraisons",
      prompt: "Ouvrir le registre au ruban rouge",
      action: "inspect",
      region: { x: 0.34, y: 0.26, w: 0.14, h: 0.18 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Élise, dans le registre",
      message:
        "Un ruban rouge marque la toute première livraison. Trois lignes sont recopiées en grandes lettres : « ORANGE, puis THYM, puis CITRON ». Une annotation récente indique : « Pour le coffre, gardez exactement cet ordre. Remplacez chaque ingrédient par le chiffre de son étiquette. »\n\nPlus bas, une note ancienne raconte la journée : « Lou est arrivée avant le livreur. Elle avait promis une heure et elle est restée toute la semaine. Son train du vendredi était pourtant réservé. Nous avons ouvert le dimanche suivant. »\n\nVous tournez la page. Les comptes ordinaires reprennent : farine, savon, nappes. Le commencement du bistrot tient entre ces achats et cette personne qui avait choisi de rester quelques jours.",
      lockedMessage: "Un registre est posé sur la tablette basse de l’étagère.",
      hint: "L’ordre est orange, thym, citron. Associez-le aux chiffres des bocaux.",
    },
    {
      id: "k-coffre",
      chapterId: "reserve",
      name: "Le coffre des nappes",
      prompt: "Composer le code des livraisons",
      action: "code",
      region: { x: 0.28, y: 0.73, w: 0.34, h: 0.24 },
      requires: ["k-bocaux", "k-registre"],
      code: "416",
      itemName: "Clé de l’armoire",
      speaker: "Lou, dans une lettre",
      message:
        "Le coffre contient des nappes, une clé et une lettre envoyée quelques semaines plus tôt.\n\n« Chère Élise, vos tables ont encore besoin de moi, je le sais : vous m’envoyez une photo de leurs pieds chaque printemps. Je viendrai pour le dernier service. Je peux aussi remettre le piano d’aplomb ; son banc grinçait déjà quand nous faisions les additions à deux.\n\nVous me demandez si je reprendrais le carnet. Oui, avec joie, si c’est ce que votre famille souhaite. Mais je ne veux pas que mon retour décide pour quelqu’un d’autre. Préparons une vraie rencontre. Je garde ma place du dimanche, près de la vitre. Lou. »\n\nLa clé porte une étiquette « ARMOIRE ». Vous comprenez qu’Élise a préparé plusieurs suites possibles avec la même attention.",
      lockedMessage:
        "Le coffre attend trois chiffres : consultez les bocaux et le registre.",
      hint: "Orange vaut 4, thym vaut 1, citron vaut 6 : entrez 416.",
    },
    {
      id: "k-armoire",
      chapterId: "reserve",
      name: "L’armoire de la transmission",
      prompt: "Ouvrir l’armoire avec la clé du coffre",
      action: "unlock",
      region: { x: 0.75, y: 0.33, w: 0.21, h: 0.59 },
      requires: ["k-coffre"],
      code: null,
      itemName: "Dossier et clé de la salle",
      speaker: "Élise, dans le dossier",
      message:
        "Deux chemises vous attendent, à côté de la clé de la salle. L’une réunit les fournisseurs et les charges du bistrot ; l’autre décrit l’atelier de cuisine partagé que Lou ouvre dans son quartier. Le carnet trouverait une place dans les deux projets.\n\n« Si vous continuez ici, nous commencerons par quelques services par semaine. Lou a proposé de réparer les tables. Si vous lui confiez le carnet, elle en fera des recettes à cuisiner ensemble, et je garderai un double pour vous. Vous pourrez lire ces dossiers tranquillement après ce soir.\n\nAvant d’entrer en salle, retournez en cuisine. Sous la tablette du four froid, une pince tient la carte du premier dimanche. Elle vous rendra un nom entier. Je veux que vous rencontriez la personne derrière ses initiales. »",
      lockedMessage: "La clé de cette armoire est rangée dans le coffre.",
      hint: "Ouvrez le coffre. Le dossier de l’armoire vous enverra ensuite chercher une carte en cuisine.",
    },
    {
      id: "k-porte-salle",
      chapterId: "reserve",
      name: "La porte de la salle",
      prompt: "Entrer avec la carte du premier dimanche",
      action: "unlock",
      region: { x: 0.52, y: 0.16, w: 0.18, h: 0.53 },
      requires: ["k-armoire", "k-fiche-oubliee"],
      code: null,
      itemName: null,
      message:
        "La clé du dossier ouvre la salle. Vous tenez la carte entre vos doigts, avec ses deux noms alignés. Lou n’était pas simplement de passage dans votre enfance : elle a aidé à ouvrir le lieu que vous avez toujours connu comme celui d’Élise.\n\nLa dernière réservation prend une autre couleur. Vous avez encore besoin de lire l’invitation récente, de savoir ce que Lou a accepté et ce qu’elle vient chercher. Sur le comptoir, une enveloppe blanche dépasse d’un carnet d’additions. Le piano, lui, porte un cadenas discret sur son banc.",
      lockedMessage:
        "La clé est dans l’armoire. Avant d’entrer, retrouvez en cuisine la carte qu’Élise vous demande d’apporter.",
      hint: "Après l’armoire, revenez à la carte sous la tablette du four, puis ouvrez cette porte.",
    },
    {
      id: "k-table",
      chapterId: "salle",
      name: "La table réservée",
      prompt: "Lire le couvert et l’ancienne addition",
      action: "inspect",
      region: { x: 0.34, y: 0.64, w: 0.38, h: 0.29 },
      requires: [],
      code: null,
      itemName: null,
      message:
        "Le carton du premier couvert dit « Élise », le deuxième porte votre prénom, et le troisième « L. Marceau ». Au centre, une ancienne addition a été glissée sous une soucoupe. Trois quantités ont été recopiées lisiblement : « TARTES : 5 ; CAFÉS : 1 ; CARAFES : 2 ».\n\nUn mot au bas de la feuille explique : « Le banc du piano garde la lettre d’invitation. Pour son code, prenez un chiffre par quantité. Le mot du comptoir donne l’ordre des trois produits. »\n\nSur le dossier de votre chaise, Élise a posé votre ancien tablier. La poche a été recousue avec un tissu différent. Vous n’avez rien à revêtir pour prendre place : elle a seulement conservé ce qui pouvait encore servir.",
      lockedMessage: "La table est prête à être examinée.",
      hint: "L’addition donne tartes 5, cafés 1 et carafes 2. Cherchez leur ordre au comptoir.",
    },
    {
      id: "k-comptoir",
      chapterId: "salle",
      name: "Le carnet du comptoir",
      prompt: "Lire le mot dans le carnet d’additions",
      action: "inspect",
      region: { x: 0.04, y: 0.51, w: 0.25, h: 0.4 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Élise, au comptoir",
      message:
        "La dernière page du carnet est récente. « Pour le cadenas du banc, l’ordre est celui de nos préparatifs : CARAFES, puis TARTES, puis CAFÉS. Les quantités sont écrites sur l’addition à table. »\n\nPlus bas, Élise a laissé une phrase pour vous : « J’ai longtemps raconté que j’avais ouvert seule. C’était plus rapide à expliquer. À force, j’ai presque oublié de rendre à Lou sa part des commencements. Ce soir, j’aimerais que vous lui posiez vos questions vous-même. Elle a changé de métier, de ville, de coupe de cheveux. Elle replie toujours les serviettes en bateaux. »\n\nVous regardez les verres suspendus au-dessus du bois. Certains endroits vous paraissent familiers jusqu’au moment où quelqu’un vous les raconte autrement.",
      lockedMessage: "Le carnet est resté ouvert sur le vieux comptoir.",
      hint: "Prenez les quantités de la table dans l’ordre carafes, tartes, cafés.",
    },
    {
      id: "k-piano",
      chapterId: "salle",
      name: "Le banc du piano",
      prompt: "Ouvrir le banc avec les trois quantités",
      action: "code",
      region: { x: 0.74, y: 0.34, w: 0.23, h: 0.48 },
      requires: ["k-table", "k-comptoir"],
      code: "251",
      itemName: "Invitation de Lou et clé de la cour",
      speaker: "Lou Marceau, sur son invitation",
      message:
        "Le banc s’ouvre sur une clé et la copie de l’invitation, signée en entier : « Lou Marceau, menuisière, ancienne complice des desserts. » Lou a écrit sa réponse au dos.\n\n« J’arriverai par la cour, avec une planche pour le banc. Ne préparez pas un repas d’adieu impossible à finir. Une tarte et trois chaises me suffisent. Je voudrais rencontrer la personne que je connaissais enfant et entendre ce qu’elle souhaite faire aujourd’hui.\n\nÉlise, vous m’avez demandé d’être votre dernière invitée. J’accepte, à condition de pouvoir revenir comme amie. Que le bistrot continue ici ou que les recettes voyagent, je peux donner un coup de main. Le carnet était déjà un ouvrage à plusieurs mains. »\n\nLa place mystérieuse est celle de Lou. Son cadeau attend dehors : elle a réparé le vieux banc avant même de s’asseoir à table.",
      lockedMessage:
        "Le cadenas du banc utilise les quantités de la table dans l’ordre indiqué au comptoir.",
      hint: "Deux carafes, cinq tartes, un café : le code est 251.",
    },
    {
      id: "k-porte-cour",
      chapterId: "salle",
      name: "La porte vitrée",
      prompt: "Rejoindre la cour avec la clé du piano",
      action: "unlock",
      region: { x: 0.3, y: 0.16, w: 0.39, h: 0.44 },
      requires: ["k-piano"],
      code: null,
      itemName: null,
      message:
        "Vous déverrouillez la porte vitrée. Dans le reflet, la salle garde encore ses trois couverts. L’invitation n’attend plus d’être déchiffrée ; elle attend votre arrivée.\n\nUn ruban est noué à la poignée extérieure. Le papier attaché vous demande simplement : « Regardez la valise avant d’ouvrir le carnet. Après cela, asseyez-vous où vous voulez. Nous sommes dans le passage avec la cafetière. »\n\nL’air de la cour est frais. Vous entendez Lou rire de quelque chose qu’Élise vient de dire. Elles ont l’air moins solennelles que les lettres qu’elles vous ont laissées.",
      lockedMessage:
        "La clé de la cour accompagne l’invitation rangée dans le banc du piano.",
      hint: "Ouvrez d’abord le banc du piano et lisez l’invitation.",
    },
    {
      id: "k-valise",
      chapterId: "cour",
      name: "La valise sur le banc",
      prompt: "Lire la lettre glissée dans la poignée",
      action: "inspect",
      region: { x: 0.12, y: 0.54, w: 0.19, h: 0.17 },
      requires: [],
      code: null,
      itemName: null,
      speaker: "Élise, au départ",
      message:
        "Vous n’ouvrez pas la valise : la lettre vous attend dans sa poignée.\n\n« Mon billet est pris. Votre tante va apprendre à passer une matinée sans regarder une pendule de cuisine. Ma sœur m’a préparé une chambre et je crois qu’elle a déjà prévu trop de promenades. Je pars avec joie, même si ce banc et cette cour vont me manquer.\n\nJ’ai laissé les comptes et les contacts pour que vous puissiez réfléchir à un projet réel. Si vous souhaitez continuer, nous prendrons le temps de le préparer ensemble. Si vous préférez confier les recettes à Lou, j’irai manger à son atelier dès que je reviendrai. Dans les deux cas, je garderai ma place dans votre vie.\n\nLe carnet est à vous pour cette décision. Ouvrez-le. J’y ai laissé du papier blanc. »",
      lockedMessage: "Une lettre est glissée dans la poignée de la valise.",
      hint: "Le mot de la porte vous invitait à commencer par cette lettre.",
    },
    {
      id: "k-carnet",
      chapterId: "cour",
      name: "Le carnet retrouvé",
      prompt: "Rassembler les pages de la recette",
      action: "collect",
      region: { x: 0.39, y: 0.64, w: 0.15, h: 0.1 },
      requires: ["k-valise"],
      code: null,
      itemName: "Carnet des Tilleuls",
      message:
        "Vous replacez les pages de pâte et de garniture dans le carnet. La recette est complète. Dans sa dernière ligne, Élise a ajouté : « Servez tiède, puis demandez à la personne assise en face ce qu’elle en pense. »\n\nLes pages suivantes portent des écritures différentes : la soupe d’un voisin, les biscuits d’une employée, une sauce rapportée par Lou. Certains essais ont été barrés, d’autres corrigés. Le carnet n’a jamais attendu d’être parfait pour passer d’une main à une autre.\n\nUne feuille libre vous propose deux commencements : remettre les Tilleuls en activité avec une carte plus courte, ou confier le carnet à l’atelier de Lou pour qu’il serve à de nouveaux repas. Avant de choisir, un mot d’Élise vous invite à regarder la lettre accrochée au tilleul.",
      lockedMessage:
        "Lisez d’abord la lettre de la valise : Élise voulait vous parler avant de vous remettre le carnet.",
      hint: "Lisez la lettre sur le banc, puis rassemblez les pages dans le carnet.",
    },
    {
      id: "k-arbre",
      chapterId: "cour",
      name: "La lettre du tilleul",
      prompt: "Dénouer la lettre à la branche basse",
      action: "inspect",
      region: { x: 0.72, y: 0.07, w: 0.22, h: 0.53 },
      requires: ["k-carnet"],
      code: null,
      itemName: null,
      speaker: "Élise, sous le tilleul",
      message:
        "Une enveloppe est nouée à une branche basse, assez doucement pour ne pas marquer l’écorce.\n\n« Quand nous avons planté cet arbre, on nous a dit qu’il ferait trop d’ombre sur les tables. Nous avons déplacé les tables. J’y pense souvent depuis que vous me demandez comment on sait qu’un lieu est à soi.\n\nVous pouvez changer les horaires, le menu, la peinture, même le nom. Vous pouvez aussi aimer cette maison sans y travailler. Ce que j’ai envie de vous transmettre tient dans le soin que vous prendrez des gens, ici ou ailleurs.\n\nLou arrive avec du pain. Je vais finir le café. Si vous avez choisi, dites-le-nous à table. Si vous avez encore besoin d’un instant, nous avons tout le matin. »\n\nLe portail n’a plus rien d’une sortie à conquérir. Il ouvre sur une conversation que vous pouvez désormais commencer.",
      lockedMessage:
        "Le carnet vous expliquera pourquoi Élise a laissé une dernière lettre dans l’arbre.",
      hint: "Récupérez le carnet sur la table, puis lisez cette lettre avant de choisir.",
    },
    {
      id: "k-avenir",
      chapterId: "cour",
      name: "Votre place à la table",
      prompt: "Choisir ce que devient le carnet",
      action: "choose",
      region: { x: 0.39, y: 0.75, w: 0.17, h: 0.07 },
      requires: ["k-valise", "k-carnet", "k-arbre"],
      code: null,
      itemName: null,
      message:
        "Vous posez le carnet devant la place libre. Les deux projets d’Élise sont là, concrets, avec leurs envies et leurs limites. Vous connaissez maintenant Lou et sa proposition ; vous savez aussi que votre tante prépare son départ sans vous confier une obligation.\n\nVous choisissez ce que vous souhaitez leur dire en les rejoignant. Cette décision donne une direction au prochain repas. Elle laissera encore de la place aux détails, aux essais et aux personnes qui viendront vous aider.",
      lockedMessage:
        "Prenez connaissance de la valise, du carnet et de la lettre du tilleul avant de vous asseoir.",
      hint: "Les deux propositions conduisent au même portail. Choisissez celle que vous souhaitez porter.",
      choices: [
        {
          id: "continuer",
          label: "Préparer la réouverture du bistrot",
          reply:
            "Vous gardez le carnet sur la table : les Tilleuls auront une suite que vous prendrez le temps de préparer.",
        },
        {
          id: "transmettre",
          label: "Confier le carnet à l’atelier de Lou",
          reply:
            "Vous glissez la carte du premier dimanche dans le carnet, prêt à le remettre à Lou.",
        },
      ],
    },
    {
      id: "k-portail",
      chapterId: "cour",
      name: "Le portail du matin",
      prompt: "Rejoindre Élise et Lou pour le café",
      action: "exit",
      region: { x: 0.45, y: 0.37, w: 0.25, h: 0.28 },
      requires: ["k-avenir"],
      code: null,
      itemName: null,
      message:
        "Vous poussez le portail. Élise tient la cafetière ; Lou porte un sac de pain et un petit pot de confiture. Elle reconnaît immédiatement la carte du premier dimanche que vous avez apportée. « Vous avez donc trouvé ma vieille addition », dit-elle.\n\nVous revenez tous les trois vers la table. Pour la première fois depuis votre arrivée, personne ne vous laisse un mot à déchiffrer. Vous pouvez parler de ce que vous souhaitez faire, et commencer par servir le café.",
      lockedMessage:
        "Avant de rejoindre les deux femmes, prenez place à la table pour choisir l’avenir du carnet.",
      hint: "Exprimez votre choix à la place libre, puis rejoignez Élise et Lou au portail.",
    },
  ],
  ending: {
    sourceObjectId: "k-avenir",
    variants: [
      {
        choiceId: "continuer",
        title: "Un nouveau dimanche aux Tilleuls",
        text: "Vous annoncez que vous souhaitez préparer la réouverture du bistrot. Élise serre sa tasse dans ses deux mains, puis vous demande quels jours vous aimeriez travailler. La question vous soulage : la conversation commence par votre vie à venir.\n\nVous proposez une carte courte et quelques services par semaine. Lou ouvre son carnet de mesures : elle peut consolider les tables avant de repartir, et revenir cuisiner un dimanche de temps en temps. Vous examinerez les comptes, les démarches et les travaux ensemble, avant de fixer la première date.\n\nSur la dernière page de la recette, vous inscrivez votre nom et une idée de dessert. Élise lit par-dessus votre épaule. Elle suggère un peu moins de miel ; vous lui promettez de lui faire goûter les deux versions. Lou rit et réclame une part de chacune.\n\nLe dernier service d’Élise s’achève autour d’un petit déjeuner trop long. Quand elle prendra son train, le carnet restera aux Tilleuls. Vous l’ouvrirez avec vos propres questions, auprès de personnes qui connaissent déjà le chemin de la cour.",
      },
      {
        choiceId: "transmettre",
        title: "Les recettes prennent la route",
        text: "Vous présentez le carnet à Lou, avec la carte du premier dimanche glissée à l’intérieur. Vous aimeriez que les recettes servent à son atelier. Elle prend le temps de feuilleter quelques pages avant de répondre : « Je peux vous envoyer les nouvelles marges ? Nous allons sûrement en remplir. »\n\nÉlise vous montre le double qu’elle a préparé. Vous garderez les recettes et les lettres, assez pour faire la tarte dans une autre cuisine. Vous convenez d’un premier repas à l’atelier de Lou, après le retour d’Élise de son séjour au bord de la mer.\n\nVous parlerez plus tard de ce que deviendront les locaux. Pour le moment, la cour peut encore accueillir la famille et les voisins. Lou propose d’y laisser le banc qu’elle a réparé ; Élise réclame la place à l’ombre pour ses prochaines visites.\n\nQuand le soleil atteint la table, vous commencez une liste de personnes à inviter au premier repas de l’atelier. Le carnet quitte les Tilleuls avec ses taches, ses corrections et plusieurs pages blanches. Vous savez à présent à quelle table vous pourrez le retrouver.",
      },
    ],
  },
};
