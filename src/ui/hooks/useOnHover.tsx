import { NS } from "/typings/Bitburner";
const React = window.React;
const { useState, useEffect } = React;

export const useOnHover = (ref: React.RefObject<HTMLElement>) => {
    const [hovered, setHovered] = useState(false);

    const mouseEntered = React.useCallback(() => {
        setHovered(true);
    }, [ref.current]);

    const mouseLeft = React.useCallback(() => {
        setHovered(false);
    }, [ref.current]);

    useEffect(() => {
        if (!ref.current) return;

        ref.current.addEventListener("mouseenter", mouseEntered);
        ref.current.addEventListener("mouseleave", mouseLeft);

        return () => {
            if (!ref.current) return;
            ref.current.removeEventListener("mouseenter", mouseEntered);
            ref.current.removeEventListener("mouseleave", mouseLeft);
        };
    }, [ref.current]);

    return hovered;
};
