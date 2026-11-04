"use client";
import { ArrowRight, BookOpen } from "lucide-react";
import { Modal, type PublicRoom } from "./shared";
export default function StoryArrival({
  room,
  onContinue,
}: {
  room: PublicRoom;
  onContinue: () => void;
}) {
  const chapter = room.chapters?.find((c) => c.id === room.chapterId);
  if (!chapter) return null;
  const number =
    (room.chapters?.findIndex((c) => c.id === chapter.id) ?? 0) + 1;
  return (
    <Modal title={chapter.title} onClose={onContinue}>
      <div className="arrival-illustration">
        <img src={room.image} alt={`The place: ${chapter.title}`} />
        <span>
          Chapter {number} · {room.chapters?.length}
        </span>
      </div>
      <p className="arrival-subtitle">{chapter.subtitle}</p>
      {number === 1 && room.introduction !== room.story && (
        <div className="arrival-prologue">
          <span className="section-kicker">Before entering</span>
          {room.introduction.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <hr />
        </div>
      )}
      <div className="arrival-prose">
        {room.story.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="arrival-objective">
        <BookOpen size={18} />
        <div>
          <span>Your objective</span>
          <p>{room.objective}</p>
        </div>
      </div>
      <button className="button primary full" onClick={onContinue}>
        Explore this place <ArrowRight size={17} />
      </button>
    </Modal>
  );
}
