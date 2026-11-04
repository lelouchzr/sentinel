import { MousePointer2, BookOpen, DoorOpen, Lightbulb } from "lucide-react";

export default function HowToPlay() {
  return (
    <div className="how-to-play">
      <p>
        Explore the illustrations and move the story forward through your discoveries. Long stories take place in several places, leading to an ending that depends on your choice.
      </p>
      <ol>
        <li>
          <MousePointer2 size={21} />
          <div>
            <h3>Explore the image</h3>
            <p>
              Click or tap the objects you spot. Their discoveries appear in the notebook. You can hide the markers to search on your own.
            </p>
          </div>
        </li>
        <li>
          <BookOpen size={21} />
          <div>
            <h3>Connect the clues</h3>
            <p>
              Re-read your discoveries and enter the requested codes. Some objects are manipulated in close-up: move their elements or put them back in order. For a lock, choose the key from your inventory when the game asks you to.
            </p>
          </div>
        </li>
        <li>
          <DoorOpen size={21} />
          <div>
            <h3>Move forward in the story</h3>
            <p>
              A discovery can open a new place: choose it in the map below the image. You can return to rooms already visited; some clues are useful elsewhere. Your inventory follows you. The final choice determines the ending, then a final object ends the story.
            </p>
          </div>
        </li>
      </ol>
      <p className="play-help-note">
        <Lightbulb size={17} />
        Stuck? Select an object then “A little hint”. No timer is rushing you.
      </p>
    </div>
  );
}
