import { MousePointer2, BookOpen, DoorOpen, Lightbulb } from "lucide-react";

export default function HowToPlay() {
  return (
    <div className="how-to-play">
      <p>
        Explorez les illustrations et faites avancer le récit grâce à vos
        découvertes. Les histoires longues se déroulent dans plusieurs lieux,
        jusqu’à une conclusion qui dépend de votre choix.
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
              Relisez vos découvertes et saisissez les codes demandés. Certains
              objets se manipulent en gros plan : déplacez leurs éléments ou
              remettez-les dans l’ordre. Pour une serrure, choisissez la clé
              dans votre inventaire lorsque le jeu vous le demande.
            </p>
          </div>
        </li>
        <li>
          <DoorOpen size={21} />
          <div>
            <h3>Avancez dans l’histoire</h3>
            <p>
              Une découverte peut ouvrir un nouveau lieu : choisissez-le dans la
              carte sous l’image. Vous pouvez revenir dans les pièces déjà
              visitées ; certains indices servent ailleurs. Votre inventaire
              vous suit. Le dernier choix détermine la conclusion, puis un
              dernier objet termine le récit.
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
