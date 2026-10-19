import strings from "../../strings";
import "./EmojiPicker.scss";

const EMOJIS = [
    "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤔", "😅", "😉", "🙂",
    "😢", "😭", "😡", "😴", "🤯", "😱", "🥳", "🙄", "😇", "🤗", "😬", "🤝",
    "👍", "👎", "👏", "🙌", "🙏", "💪", "👋", "✌️", "❤️", "💔", "🔥", "🎉",
    "✅", "❌", "⭐", "💡", "☕", "🍕", "🎂", "🚀"
];

export const EmojiPicker = ({ onPick }: { onPick: (emoji: string) => void }) => (
    <div className="emojiPicker" role="listbox" aria-label={strings.messageInput.emoji}>
        {EMOJIS.map(emoji => (
            <button key={emoji} type="button" role="option" aria-selected={false} className="emojiPicker__item" onClick={() => onPick(emoji)}>
                {emoji}
            </button>
        ))}
    </div>
);
