/* all user-facing texts in one place */
const strings = {
    appName: "CONNECT",
    header: {
        signOut: "Sign out"
    },
    login: {
        title: "restore your CONNECTion",
        username: "your username:",
        password: "password:",
        submit: "sign in",
        submitting: "signing in...",
        badCredentials: "Bad credentials! Try again",
        unavailable: "Could not sign in. Try again later"
    },
    footer: {
        tagline: "free text messenger",
        company: "CONNECT Inc.",
        since: 2021
    },
    chats: {
        search: "Szukaj:",
        searchPlaceholder: "Szukaj osób...",
        back: "Back to chats",
        noMessages: "Brak wiadomości",
        you: "Ty",
        photo: "Zdjęcie",
        deleted: "Message deleted"
    },
    presence: {
        online: "online",
        typing: "typing...",
        lastSeen: "last seen",
        unread: "unread messages"
    },
    messageStatus: {
        sending: "Sending...",
        failed: "Not sent",
        retry: "Retry",
        discard: "Discard",
        newMessages: "New messages"
    },
    messageInput: {
        attachImage: "Attach image",
        removeAttachment: "Remove attachment",
        messageText: "Message",
        send: "Send",
        emoji: "Emoji",
        notAnImage: "Only JPG, PNG and GIF images can be sent",
        tooLarge: "The image is too large (5 MB at most)"
    },
    message: {
        edit: "Edit",
        delete: "Delete",
        deleteConfirm: "Delete this message?",
        yes: "Yes",
        no: "No",
        save: "Save",
        cancel: "Cancel",
        edited: "edited",
        deleted: "This message was deleted",
        actions: "Options",
        reply: "Reply",
        react: "React",
        goToOriginal: "Go to the original message",
        originalUnavailable: "The original message is not available",
        replyingTo: "Replying to",
        cancelReply: "Cancel reply",
        editFailed: "Could not save the change",
        deleteFailed: "Could not delete the message"
    },
    image: {
        preview: "Image preview",
        close: "Close",
        loading: "Loading image...",
        failed: "The image could not be loaded",
        open: "Open image"
    },
    search: {
        open: "Search in this chat",
        close: "Close search",
        placeholder: "Search messages",
        noResults: "No messages found",
        failed: "Search failed",
        more: "Show more",
        notFound: "The message is too far back in the history",
        jump: "Go to message"
    },
    avatar: {
        user: "User avatar",
        seen: "seen avatar"
    }
};

export default strings;
