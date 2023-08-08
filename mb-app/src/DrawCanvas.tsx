import {ChangeEvent, useRef, useState} from "react";
import useMousePosition from "./hooks/useMousePosition";
import {useKilterBoard} from "./hooks/useKilterBoard";
import * as React from "react";
import 'toolcool-color-picker';
import ColorPicker from "./ColorPicker";

export default function DrawCanvas()
{
    const { isConnected, connect, addPixel, deletePixel, clearPixels, publishPixels, getHoldNum } = useKilterBoard();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [coords, handleCoords] = useMousePosition(true);
    const [drawingColor, setDrawingColor] = React.useState("rgb(255,0,0)"); // Default color is #ff0000
    const [drawing, setDrawing] = useState<boolean>(false);
    const [gridCoords, setGridCoords] = useState<{
        x: number;
        y: number;
    }>({
        x: 0,
        y: 0
    });

    // Draw empty grid
    const initGrid = () => {
        const ctx = canvasRef?.current?.getContext("2d");
        if (ctx) {
            for (let x=0;x<27;x++)
            {
                for (let y=0;y<29;y++)
                {
                    if (getHoldNum(x, y) !== -1) {
                        ctx.beginPath();
                        ctx.roundRect(x * 20+2, y * 20+2, 16, 16,  [5,5,5,5]);
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        }
    }

    async function toBase64(file:any) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    function timeout(delay: number) {
        return new Promise( res => setTimeout(res, delay) );
    }

    const savePixels = () => {
        if (canvasRef.current) {
            let canvasUrl = canvasRef.current?.toDataURL();
            const createEl = document.createElement('a');
            createEl.href = canvasUrl;

            // This is the name of our downloaded file
            createEl.download = "saved-canvas";

            // Click the download button, causing a download, and then remove it
            createEl.click();
            createEl.remove();
        }
    }

    const handleLoadImage = (event: ChangeEvent<HTMLInputElement>) =>
    {
        const { files } = event.target;

        // Or if you don't prefer Object destructuring assignment...
        // const files = event.target.files;

        // Rest of the logic here
        if (files && files[0]) {
            if (canvasRef.current) {
                const ctx = canvasRef.current?.getContext("2d");
                ctx?.clearRect(0, 0, 540, 580);
                const previewCtx = previewCanvasRef?.current?.getContext("2d");
                previewCtx?.clearRect(0, 0, 540, 580);
                clearPixels();
            }

            console.log("converting upload to base64");
            toBase64(files[0]).then( value => {
                    console.log(value)
                    let img = new Image();
                    if (typeof value === "string") {
                        img.src = value;
                        console.log("img src set");
                    }
                    img.onload = async () => {
                        console.log("data loaded");
                        clearPixels();
                        await timeout(500);
                        const previewCtx = previewCanvasRef?.current?.getContext("2d");
                        const ctx = canvasRef?.current?.getContext("2d");
                        let pc = 0;
                        if (previewCtx && ctx) {
                            previewCtx.drawImage(img, 0, 0, 27, 29);
                            for (let x = 0; x < 26; x++) {
                                for (let y = 0; y < 28; y++) {
                                    let data = previewCtx.getImageData(x, y, 1, 1).data;
                                    if  ((data[0] !== 0xff || data[1] !== 0xff || data[2] !== 0xff) &&
                                         (data[0] !== 0x0 || data[1] !== 0x0 || data[2] !== 0x0) &&
                                         (getHoldNum(x, y) !== -1)) {
                                        // add pixel to Bluetooth Pixel Buffer
                                        addPixel(x, y, data[0], data[1], data[2]);
                                        console.log(pc++);
                                        // draw pixel in our Preview canvas
                                        ctx.beginPath();
                                        ctx.roundRect(x * 20+2, y * 20+2, 16, 16,  [5,5,5,5]);
                                        ctx.stroke();
                                        ctx.fillStyle="rgb("+data[0]+","+data[1]+","+data[2]+")";
                                        ctx.fill();
                                    }
                                }
                            }
                        }
                    }
                }
            )
        }
    }

    initGrid();

return (
    <>
        <p></p>
        <h1>Etch a KilterBoard <small>v0.1</small></h1>
        <canvas
            ref={canvasRef}
            width="540"
            height="580"
            style={{ border: "2px solid black", touchAction: "none" }}


            // remove pixel (right click)
            onContextMenu={
                (e) => {
                    e.preventDefault();
                    if (canvasRef.current) {
                        const ctx = canvasRef.current?.getContext("2d");
                        if (ctx) {
                            let x = Math.round((coords.x-10) / 20);
                            let y = Math.round((coords.y-10) / 20);
                            if (x > 26) x = 26;
                            if (y > 28) y = 28;

                            if (!isNaN(x) && !isNaN(y) && getHoldNum(x, y) !== -1) {
                                ctx.beginPath();
                                ctx.clearRect(x * 20-1, y * 20-1, 22, 22);
                                deletePixel(x, y);
                            }
                        }
                    }
                }

            }
            onPointerDown={
                (e) => {
                    e.preventDefault();
                    setDrawing(true);
                }
            }
            onPointerUp={
                (e) => {
                    e.preventDefault();
                    setDrawing(false);
                }
            }
            onPointerMove={
                (e) => {
                        handleCoords((e as unknown) as any);
                        if (canvasRef.current && drawing) {
                            const ctx = canvasRef.current?.getContext("2d");
                            if (ctx) {
                                let x = Math.round((coords.x-10) / 20);
                                let y = Math.round((coords.y-10) / 20);
                                console.log("TOUCH CANVAS",x,y);
                                if (x > 26) x = 26;
                                if (y > 28) y = 28;

                                setGridCoords({x,y});

                                if (!isNaN(x) && !isNaN(y) && getHoldNum(x, y) !== -1) {
                                    ctx.beginPath();
                                    ctx.roundRect(x * 20+2, y * 20+2, 16, 16,  [5,5,5,5]);
                                    ctx.stroke();
                                    ctx.fillStyle = drawingColor;
                                    ctx.fill();
                                    console.log(x, y);

                                    let rgb = drawingColor.replace(/[^\d,]/g, '').split(',');
                                    //  console.log(rgb);
                                    addPixel(x, y, Number(rgb[0]), Number(rgb[1]), Number(rgb[2]));
                                }
                            }
                        }
                }
            }
            /*
            onMouseMove={ // while moving
                (e) => {
                        handleCoords((e as unknown) as MouseEvent);
                        if (canvasRef.current) {
                            const ctx = canvasRef.current?.getContext("2d");
                            if (ctx) {
                                let x = Math.round((coords.x-10) / 20);
                                let y = Math.round((coords.y-10) / 20);
                                if (x > 26) x = 26;
                                if (y > 28) y = 28;

                                setGridCoords({x,y});

                                if (!isNaN(x) && !isNaN(y) && getHoldNum(x, y) !== -1) {
                                    if (e.buttons === 1) {  // while LEFT mousedown and moving
                                        ctx.beginPath();
                                        ctx.roundRect(x * 20+2, y * 20+2, 16, 16,  [5,5,5,5]);
                                        ctx.stroke();
                                        ctx.fillStyle = drawingColor;
                                        ctx.fill();
                                        let rgb = drawingColor.replace(/[^\d,]/g, '').split(',');
                                        addPixel(x, y, Number(rgb[0]), Number(rgb[1]), Number(rgb[2]));
                                    }
                            }
                        }
                    }
                }
            }
             */
        ></canvas>
        <p></p>
        <ColorPicker onChangeColor={setDrawingColor}/>
        <span> </span>
        <button type="button" className="btn btn-warning"
            onClick={() => {
                if (canvasRef.current) {
                    const ctx = canvasRef.current?.getContext("2d");
                    ctx?.clearRect(0, 0, 540, 580);
                    initGrid();
                    clearPixels();
                }
            }}
        >
            CLEAR
        </button>
        <span> </span>
        <button type="button" className="btn btn-success"
            onClick={() => {
                if (!isConnected)
                {
                    connect();
                }
                publishPixels();
            }}
        >
            PUBLISH
        </button>
        <span> </span>
        <button type="button" className="btn btn-success"
                onClick={() => {
                    savePixels();
                }}
        >
            SAVE
        </button>
        <span> </span>
        <input type="file" className="btn btn-outline-primary"  name="image" placeholder='Image' accept="image/*" onChange={e => handleLoadImage(e)}/>
        <canvas
            ref={previewCanvasRef}
            width="26"
            height="28"
            style={{visibility: 'hidden'}}
        />
        <p><>Draw: {drawing?"yes":"no"}</></p>
        <p><>X: {coords.x}  Y: {coords.y}</></p>
        <p><>Col: {gridCoords.x}  Row: {gridCoords.y}</></p>

    </>
);
}