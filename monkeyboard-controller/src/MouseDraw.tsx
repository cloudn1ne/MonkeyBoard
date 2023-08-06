import { useEffect, useRef } from "react";
import useMousePosition from "./hooks/useMousePosition";
import {useKilterBoard} from "./hooks/useKilterBoard";

export default function HighlightSquare()
{
    const { setPixel, addPixel, clearPixels, publishPixels, getHoldNum } = useKilterBoard();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [coords, handleCoords] = useMousePosition(true);

return (
    <>
        <h1>Etch a KilterBoard</h1>
        <canvas
            ref={canvasRef}
            width="540"
            height="580"
            style={{ border: "2px solid black" }}

            onMouseMove={ // while moving
                (e) => {
                    if (e.buttons === 1) {  // while mousedown and moving
                        handleCoords((e as unknown) as MouseEvent);
                        if (canvasRef.current) {
                            const ctx = canvasRef.current.getContext("2d");
                            let x = Math.round(coords.x / 20);
                            let y = Math.round(coords.y / 20);
                            if (x > 26) x = 26;
                            if (y > 28) y = 28;

                            if (getHoldNum(x,y) !== -1) {
                                ctx?.beginPath();
                                ctx?.roundRect(x * 20, y * 20, 20, 20,  [5,5,5,5]);
                                ctx?.stroke();
                                ctx?.fill();
                                console.log(x, y);
                                // setPixel(x, y, 0xff, 0x00, 0x0)
                                addPixel(x, y, 0xff, 0x00, 0x0);
                            }
                        }
                    }
                }
            }
        ></canvas>
        <button
            onClick={() => {
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext("2d");
                    ctx?.clearRect(0, 0, 540, 580);
                    clearPixels();
                }
            }}
        >
            CLEAR
        </button>
        <button
            onClick={() => {
                publishPixels();
            }}
        >
            PUBLISH
        </button>
    </>
);
}