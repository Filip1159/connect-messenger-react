const ACCELERATION = 10000;  // px / s^2

/* animates a value from start to stop like a falling body (s = at^2 / 2).
 * returns a function cancelling the animation */
const fall = (setValue: (value: number) => void, start: number, stop: number, onDone?: () => void): (() => void) => {
    const dist = stop - start;
    if (!(dist > 0)) {
        setValue(stop);
        onDone?.();
        return () => {};
    }

    const duration = Math.sqrt(2 * dist / ACCELERATION) * 1000;
    const startTime = performance.now();
    let frame = 0;

    const step = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed >= duration) {
            setValue(stop);
            onDone?.();
            return;
        }
        const t = elapsed / 1000;
        setValue(start + ACCELERATION * t ** 2 / 2);
        frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
}

export default fall;
