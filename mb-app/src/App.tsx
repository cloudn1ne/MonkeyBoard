/*
 * (c) CyberNet, 2023 cn@warp.at
 *
 */
import * as React from "react";
import { useKilterBoard} from "./hooks/useKilterBoard";
import DrawCanvas from "./DrawCanvas";


export const useShareableBluetoothState = () => {
    const [isConnected, setIsConnected] = React.useState(false);
    const [toggleCharacteristic, setToggleCharacteristic] =
        React.useState<BluetoothRemoteGATTCharacteristic | null>(null);

    return {
        isConnected, setIsConnected, toggleCharacteristic, setToggleCharacteristic
    }
}


export const App = () => {

    const { connect, setPixel, addPixel, clearPixels,publishPixels, loop, isConnected } = useKilterBoard();
    // const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const setTwoPixels = () => {
        clearPixels();
        if (!isConnected)
        {
            connect();
        }
        addPixel(1,0, 255,0,0);
        addPixel( 0,1 , 255, 255, 0);
        addPixel(25,0, 255,0,0);
        addPixel( 26,1 , 255, 255, 0);
        publishPixels();
    }
  return (
      <div
          style={{
              //height: "100vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
          }}
      >
        {isConnected ? (
            <p>
                <button type="button" className="btn btn-outline-primary" onClick={loop}>Loop</button>
                <button type="button" className="btn btn-outline-primary" onClick={()=>setTwoPixels()}>Set FourPixels</button>
                <button type="button" className="btn btn-outline-primary" onClick={()=>setPixel(1, 0,0,0xff,  0x0)}>Toggle Pixel 1/0</button>
                <DrawCanvas/>
            </p>
        ) : (
            <>
                <div className="container">
                    <div className="row">
                        <div className="col">
                            <img alt="Monkey Logo" src="/images/monkey1.jpeg"/>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col">
                            <button type="button" className="btn btn-danger btn-lg" onClick={connect}>Release the Monkey !</button>
                        </div>
                    </div>
                </div>
            </>
        )}
      </div>
  );
};

export default App;
