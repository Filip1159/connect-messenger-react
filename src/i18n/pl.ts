import type { Strings } from "./en";

const pl: Strings = {
    appName: "CONNECT",
    header: {
        signOut: "Wyloguj"
    },
    login: {
        title: "przywróć swoje CONNECTion",
        username: "nazwa użytkownika:",
        password: "hasło:",
        submit: "zaloguj",
        submitting: "logowanie...",
        badCredentials: "Błędne dane logowania! Spróbuj ponownie",
        unavailable: "Nie udało się zalogować. Spróbuj później"
    },
    footer: {
        tagline: "darmowy komunikator tekstowy",
        company: "CONNECT Inc.",
        since: 2021
    },
    chats: {
        search: "Szukaj osób",
        searchPlaceholder: "Szukaj osób...",
        back: "Wróć do czatów",
        noMessages: "Brak wiadomości",
        you: "Ty",
        photo: "Zdjęcie",
        deleted: "Wiadomość usunięta"
    },
    presence: {
        online: "online",
        typing: "pisze...",
        lastSeen: "ostatnio aktywny",
        unread: "nieprzeczytanych wiadomości"
    },
    messageStatus: {
        sending: "Wysyłanie...",
        failed: "Nie wysłano",
        retry: "Ponów",
        discard: "Odrzuć",
        newMessages: "Nowe wiadomości"
    },
    messageInput: {
        attachImage: "Dołącz obraz",
        removeAttachment: "Usuń załącznik",
        messageText: "Wiadomość",
        send: "Wyślij",
        emoji: "Emoji",
        notAnImage: "Można wysyłać tylko obrazy JPG, PNG i GIF",
        tooLarge: "Obraz jest za duży (maksymalnie 5 MB)"
    },
    message: {
        edit: "Edytuj",
        delete: "Usuń",
        deleteConfirm: "Usunąć tę wiadomość?",
        yes: "Tak",
        no: "Nie",
        save: "Zapisz",
        cancel: "Anuluj",
        edited: "edytowano",
        deleted: "Ta wiadomość została usunięta",
        actions: "Opcje",
        reply: "Odpowiedz",
        react: "Zareaguj",
        goToOriginal: "Przejdź do oryginalnej wiadomości",
        originalUnavailable: "Oryginalna wiadomość jest niedostępna",
        replyingTo: "Odpowiedź dla",
        cancelReply: "Anuluj odpowiedź",
        editFailed: "Nie udało się zapisać zmiany",
        deleteFailed: "Nie udało się usunąć wiadomości"
    },
    image: {
        preview: "Podgląd obrazu",
        close: "Zamknij",
        loading: "Wczytywanie obrazu...",
        failed: "Nie udało się wczytać obrazu",
        open: "Otwórz obraz"
    },
    search: {
        open: "Szukaj w tym czacie",
        close: "Zamknij wyszukiwanie",
        placeholder: "Szukaj wiadomości",
        noResults: "Nie znaleziono wiadomości",
        failed: "Wyszukiwanie nie powiodło się",
        more: "Pokaż więcej",
        notFound: "Ta wiadomość jest zbyt daleko w historii",
        jump: "Przejdź do wiadomości"
    },
    avatar: {
        user: "Awatar użytkownika",
        seen: "awatar odczytu"
    },
    register: {
        title: "stwórz swoje CONNECTion",
        link: "Załóż konto",
        haveAccount: "Mam już konto",
        username: "nazwa użytkownika:",
        name: "imię:",
        surname: "nazwisko:",
        password: "hasło:",
        repeatPassword: "powtórz hasło:",
        submit: "zarejestruj",
        submitting: "rejestrowanie...",
        usernameRule: "3-30 znaków: litery, cyfry, kropka, myślnik lub podkreślenie",
        passwordRule: "8-72 znaki, z literą i cyfrą",
        nameRule: "1-50 znaków",
        passwordsDiffer: "Hasła nie są takie same",
        taken: "Ta nazwa użytkownika jest zajęta",
        failed: "Nie udało się założyć konta. Spróbuj później",
        noAccount: "Nie masz konta?"
    },
    profile: {
        open: "Mój profil",
        title: "Mój profil",
        edit: "Edytuj profil",
        photo: "Zdjęcie",
        changePhoto: "Zmień zdjęcie",
        removePhoto: "Usuń zdjęcie",
        photoRule: "JPG, PNG lub GIF, do 2 MB",
        photoTooLarge: "Zdjęcie jest za duże (maksymalnie 2 MB)",
        name: "Imię",
        surname: "Nazwisko",
        save: "Zapisz",
        saved: "Zapisano",
        saveFailed: "Nie udało się zapisać zmian",
        password: "Hasło",
        currentPassword: "Obecne hasło",
        newPassword: "Nowe hasło",
        repeatPassword: "Powtórz nowe hasło",
        changePassword: "Zmień hasło",
        passwordChanged: "Hasło zmienione",
        wrongPassword: "Obecne hasło jest błędne",
        blocked: "Zablokowane osoby",
        noBlocked: "Nie zablokowano nikogo",
        unblock: "Odblokuj",
        close: "Zamknij"
    },
    group: {
        newGroup: "Nowa grupa",
        name: "Nazwa grupy",
        namePlaceholder: "Nazwa grupy (opcjonalnie)",
        members: "Członkowie",
        addPeople: "Dodaj osoby",
        searchPeople: "Szukaj osób",
        noPeople: "Nie znaleziono osób",
        create: "Utwórz grupę",
        creating: "Tworzenie...",
        createFailed: "Nie udało się utworzyć grupy",
        selected: "Wybrane",
        remove: "Usuń",
        needOne: "Wybierz dwie osoby albo jedną i nadaj grupie nazwę",
        memberCount: "członków",
        you: "ty",
        formerMember: "Były członek",
        admin: "admin",
        makeAdmin: "Nadaj uprawnienia admina",
        removeAdmin: "Odbierz uprawnienia admina",
        removeMember: "Usuń z grupy",
        leave: "Opuść grupę",
        leaveConfirm: "Opuścić tę grupę?",
        rename: "Zmień nazwę",
        renameFailed: "Nie udało się zmienić nazwy",
        add: "Dodaj",
        addFailed: "Nie udało się dodać osób",
        actionFailed: "To się nie udało",
        isTyping: "pisze...",
        areTyping: "piszą..."
    },
    chatOptions: {
        open: "Opcje czatu",
        title: "Szczegóły czatu",
        mute: "Wycisz",
        unmute: "Włącz powiadomienia",
        archive: "Archiwizuj",
        unarchive: "Przywróć z archiwum",
        block: "Zablokuj",
        unblock: "Odblokuj",
        blockConfirm: "Zablokować tę osobę? Nie dostaniesz jej wiadomości i nie znajdziecie się w wyszukiwarce.",
        blockedNotice: "Ta osoba jest zablokowana.",
        blockedInput: "Zablokowano tę osobę, więc nie możesz do niej pisać.",
        failed: "To się nie udało",
        archived: "Archiwum",
        muted: "Wyciszony",
        close: "Zamknij"
    },
    settings: {
        open: "Ustawienia",
        title: "Ustawienia",
        appearance: "Wygląd",
        theme: "Motyw",
        themeSystem: "Jak urządzenie",
        themeLight: "Jasny",
        themeDark: "Ciemny",
        language: "Język",
        notificationsSection: "Powiadomienia",
        notifications: "Powiadomienia na pulpicie",
        notificationsHint: "Dostawaj powiadomienie o nowej wiadomości, gdy jej czat nie jest otwarty albo karta jest w tle.",
        notificationsDenied: "Powiadomienia są zablokowane w ustawieniach przeglądarki.",
        notificationsUnsupported: "Ta przeglądarka nie obsługuje powiadomień.",
        sound: "Dźwięk powiadomienia"
    },
    connection: {
        reconnecting: "Utracono połączenie. Łączenie ponowne...",
        connecting: "Łączenie...",
        offline: "Brak połączenia z internetem"
    },
    a11y: {
        skipToInput: "Przejdź do pola wiadomości",
        chats: "Czaty",
        messages: "Wiadomości",
        newMessageFrom: "Nowa wiadomość od",
        inChat: "w"
    },
    states: {
        loadingChats: "Wczytywanie czatów...",
        chatsFailed: "Nie udało się wczytać czatów",
        retry: "Spróbuj ponownie",
        noChats: "Nie ma jeszcze czatów. Znajdź kogoś wyszukiwarką powyżej albo załóż grupę.",
        pickChat: "Wybierz czat albo znajdź kogoś do rozmowy",
        searching: "Szukanie...",
        noPeople: "Nikogo nie znaleziono",
        typeMore: "Wpisz co najmniej 2 znaki",
        historyFailed: "Nie udało się wczytać wiadomości",
        loadingOlder: "Wczytywanie starszych wiadomości..."
    },
    time: {
        justNow: "przed chwilą",
        minAgo: "min temu",
        hAgo: "godz. temu"
    }
};

export default pl;
