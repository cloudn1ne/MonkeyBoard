import * as React from "react";
import { useKilterBoard} from "./hooks/useKilterBoard";
import {ChangeEvent, useEffect, useRef, useState} from "react";
import HighlightSquare from "./MouseDraw";

export const useShareableBluetoothState = () => {
    const [isConnected, setIsConnected] = React.useState(false);
    const [toggleCharacteristic, setToggleCharacteristic] =
        React.useState<BluetoothRemoteGATTCharacteristic | null>(null);

    return {
        isConnected, setIsConnected, toggleCharacteristic, setToggleCharacteristic
    }
}

function timeout(delay: number) {
    return new Promise( res => setTimeout(res, delay) );
}

export const App = () => {

    const { connect, setLED_v3, setPixel, addPixel, clearPixels, loop, isConnected } = useKilterBoard();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    async function toBase64(file:any) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

  const handleSetImage = (event: ChangeEvent<HTMLInputElement>) =>
  {
        const { files } = event.target;

        // Or if you don't prefer Object destructuring assignment...
        // const files = event.target.files;

        // Rest of the logic here
        console.log(files);
        if (files && files[0]) {
            console.log("converting upload to base64");
            const base64 = toBase64(files[0]).then( value => {
                    console.log(value)
                    let img = new Image();
                    if (typeof value === "string") {
                        img.src = value;
                        console.log("img src set");
                    }
                    img.onload = async () => {
                        console.log("data loaded");
                        clearPixels();
                        timeout(500);
                        const ctx = canvasRef?.current?.getContext("2d");
                        let pc = 0;
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, 27, 29);
                            for (let x = 0; x < 26; x++) {
                                for (let y = 0; y < 28; y++) {
                                    let data = ctx.getImageData(x, y, 1, 1).data;
                                    if  (data[0] !== 0xff || data[1] !== 0xff || data[2] !== 0xff) {
                                        addPixel(x, y, data[0], data[1], data[2]);
                                        console.log(pc++);
                                    }
                                }
                            }
                        }
                    }
                }
            )
        }
  }

  return (
      <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
      >
        {isConnected ? (
            <p>
                <button onClick={loop}>Loop</button>
                <button onClick={()=>setLED_v3(181, 0xff,0,0)}>Toggle Red 181</button>
                <button onClick={()=>setLED_v3(210, 0,0xff,0)}>Toggle Green 210</button>
                <button onClick={()=>setLED_v3(239, 0,0,0xff)}>Toggle Blue 239</button>
                <button onClick={()=>setPixel(1, 0,0,0xff,  0x0)}>Toggle Pixel</button>
                <input type="file" name="image" placeholder='Image' accept="image/*" onChange={e => handleSetImage(e)}/>
                <canvas
                    ref={canvasRef}
                    width="26"
                    height="28"
                />
                <HighlightSquare/>
            </p>
        ) : (
            <button onClick={connect}>Connect</button>
        )}
      </div>
  );
};

export default App;
