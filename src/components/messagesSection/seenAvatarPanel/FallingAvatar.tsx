const fall = async (setBottom, start, stop) => {
    const DT = .01;
    let x = start;
    const a = 10000;
    let t = 0;
    /* s = at^2 / 2 */
    const DIST = stop - start;
    const T = Math.sqrt(2*DIST / a);
    const LOOP_COUNTER = T / DT;

    for (let i=0; i<LOOP_COUNTER; i++) {
        x = start + a * t**2 / 2;
        t += DT;
        setBottom(x);
        await new Promise(resolve => setTimeout(resolve, DT * 1000));  // delay
    }
    setBottom(stop);
}

export default fall;