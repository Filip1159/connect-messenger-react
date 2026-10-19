export const notificationsSupported = (): boolean => typeof Notification !== "undefined";

export const notificationsGranted = (): boolean => notificationsSupported() && Notification.permission === "granted";

/* asks the browser (once; a refused answer is remembered by the browser) and reports whether we may notify */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!notificationsSupported()) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
};

/* one notification per chat: a newer message replaces the one still on the screen */
export const showNotification = (title: string, body: string, tag: string, onClick: () => void) => {
    try {
        const notification = new Notification(title, { body, tag });
        notification.onclick = () => {
            window.focus();
            onClick();
            notification.close();
        };
    } catch (e) {
        console.error("Could not show a notification:", e);  // some mobile browsers only allow them from a service worker
    }
};

let audio: AudioContext | null = null;

/* a short soft beep, made on the spot (no sound file) */
export const playBeep = () => {
    try {
        const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Context) return;
        audio ??= new Context();
        const now = audio.currentTime;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.26);
    } catch {
        // no audio (blocked until the page was used, or unsupported): the notification is enough
    }
};
