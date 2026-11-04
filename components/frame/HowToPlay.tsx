import { MousePointer2, BookOpen, DoorOpen, Lightbulb } from "lucide-react";

export default function HowToPlay() {
  return (
    <div className="how-to-play">
      <p>
        Chaque histoire est un petit escape game dans une illustration. Votre
        objectif : découvrir comment sortir de la pièce.
      </p>
      <ol>
        <li>
          <MousePointer2 size={21} />
          <div>
            <h3>Explorez l’image</h3>
            <p>
              Cliquez ou touchez les objets repérés. Leurs découvertes
              apparaissent dans le carnet. Vous pouvez masquer les repères pour
              chercher par vous-même.
            </p>
          </div>
        </li>
        <li>
          <BookOpen size={21} />
          <div>
            <h3>Reliez les indices</h3>
            <p>
              Relisez vos découvertes et saisissez les codes demandés. Les
              objets de l’inventaire sont utilisés automatiquement au bon
              endroit.
            </p>
          </div>
        </li>
        <li>
          <DoorOpen size={21} />
          <div>
            <h3>Ouvrez la sortie</h3>
            <p>
              Certains objets restent bloqués jusqu’à une autre découverte.
              Revenez-y après avoir avancé. La partie se termine lorsque vous
              ouvrez la sortie.
            </p>
          </div>
        </li>
      </ol>
      <p className="play-help-note">
        <Lightbulb size={17} />
        Bloqué ? Choisissez un objet puis « Un petit indice ». Aucun chronomètre
        ne vous presse.
      </p>
    </div>
  );
}
