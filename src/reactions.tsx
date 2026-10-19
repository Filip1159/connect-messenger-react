import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceLaughSquint, faFaceSadTear, faFaceSurprise, faHandsPraying, faHeart, faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

/* the reactions the backend accepts; `emoji` is only the value sent over the wire, the UI shows the icon */
export const REACTIONS: { emoji: string; icon: IconDefinition; label: string }[] = [
    { emoji: "👍", icon: faThumbsUp, label: "Like" },
    { emoji: "❤️", icon: faHeart, label: "Love" },
    { emoji: "😂", icon: faFaceLaughSquint, label: "Haha" },
    { emoji: "😮", icon: faFaceSurprise, label: "Wow" },
    { emoji: "😢", icon: faFaceSadTear, label: "Sad" },
    { emoji: "🙏", icon: faHandsPraying, label: "Thanks" }
];

const find = (emoji: string) => REACTIONS.find(r => r.emoji === emoji);

export const reactionLabel = (emoji: string): string => find(emoji)?.label ?? emoji;

export const ReactionIcon = ({ emoji }: { emoji: string }) => {
    const reaction = find(emoji);
    return reaction ? <FontAwesomeIcon icon={reaction.icon} /> : <span>{emoji}</span>;
};
