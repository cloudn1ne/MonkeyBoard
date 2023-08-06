import {useBetween} from "use-between";
import {useShareableBluetoothState} from "../App";

export interface KilterBoard {
    connect: () => void;
    isConnected: boolean;
    setLED_v3: (holdnum:number, r:number, g:number, b:number) => void;
    setPixel: (x:number, y:number,  r:number, g:number, b:number) => void;
    addPixel: (x:number, y:number,  r:number, g:number, b:number) => void;
    clearPixels: () => void;
    publishPixels: () => void;
    loop: () => void;
    getHoldNum:(x:number, y:number) => number;
}

// images are 27x29 pixels
const COLS = 26;
const ROWS = 28;

let PixelMapping: number[][] = []; // map x/y coordinates against kilter holdnumber
let ActivePixels: Array<{holdnum:number, r:number, g:number, b:number}> = [];   // active pixels (addPixel)

const checksum = (data:Uint8Array) => {
    let i = 0;
    let j;

    for (j=0; j<data.length; j++)
    {
        i = (i + data[j]) & 255;
    }
    return ~i & 0xFF;
};


export const useKilterBoard = (): KilterBoard => {

    const { isConnected, setIsConnected, toggleCharacteristic, setToggleCharacteristic } = useBetween(useShareableBluetoothState);

    //const [isConnected, setIsConnected] = React.useState(false);
    //const [toggleCharacteristic, setToggleCharacteristic] =
    // React.useState<BluetoothRemoteGATTCharacteristic | null>(null);

    const connect = async () => {
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                {
                    services: ["4488b571-7806-4df6-bcff-a2897e4953ff"],
                },
            ],
            // AuroraBoard KilterBoard Service
            optionalServices: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
        });
        const server = await device.gatt?.connect();

        if (server) {
            // AuroraBoard KilterBoard Control Service
            const service = await server.getPrimaryService(
                "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
            );

            const toggleChar = await service.getCharacteristic(
                "6e400002-b5a3-f393-e0a9-e50e24dcca9e" // AuroraBoard KilterBoard LED Message
            );

            setToggleCharacteristic(toggleChar);
            setIsConnected(true);
        }
    };


    // API Level 3 set LED function
    const setLED_v3 = async (holdnum: number, r: number, g: number, b: number) => {

        console.log("setLED_v3() num=%d", holdnum);
        let r_bits = r / (255 / 7);  // 3 bits Red
        let g_bits = g / (255 / 7);  // 3 bits Green
        let b_bits = b / (255 / 3);  // 2 bits Blue
        let color = (r_bits << 5) | (g_bits << 2) | b_bits;

        let payload = new Uint8Array([84, holdnum & 0xFF, holdnum >> 8, color]);
        let header = new Uint8Array([0x1, 1 + 3 * 1, checksum(payload), 2])
        let tail = new Uint8Array([3]);

        // assemble buffer
        let msg = new Uint8Array(header.length + payload.length + tail.length);
        msg.set(header, 0);
        msg.set(payload, header.length);
        msg.set(tail, header.length + payload.length);

        if (toggleCharacteristic) {
            await toggleCharacteristic.writeValue(msg).catch(err => console.log('readValue', err));
        }
        else
        {
            console.log("setLED_v3() NOT CONNECTED");
        }
    };

    // set a single pixel by x/y coordinates
    const setPixel = async (x: number, y: number, r: number, g: number, b: number) => {
        let holdnum = PixelMapping[y][x];
        console.log("setPixel() %d/%d => %d", x, y, holdnum);
        if (holdnum !== -1) {
            await setLED_v3(holdnum, r, g, b);
        }
    };

    // test if pixel is already set in ActivePixels buffer
    const testPixel = (holdnum: number): boolean => {
        for (let i=0; i<ActivePixels.length; i++)
        {
            if (ActivePixels[i].holdnum === holdnum)
                return true;
        }
        return false;
    }

    const addPixel =  (x: number, y: number, r: number, g: number, b: number) => {
        let holdnum:number = PixelMapping[y][x];
        console.log("addPixel() %d/%d => %d", x, y, holdnum);
        if ((holdnum !== -1) && !testPixel(holdnum)) {
            ActivePixels.push({holdnum, r,g,b})
        }
    };

    // flush all pixels stored in ActivePixels
    const clearPixels =  () => {
        console.log("clearPixels()");
        console.log(ActivePixels);
        ActivePixels = [];
    }

    function mergeUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
        const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
        const merged = new Uint8Array(totalSize);

        arrays.forEach((array, i, arrays) => {
            const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0);
            merged.set(array, offset);
        });

        return merged;
    }

    // activate all pixels stored in ActivePixels
    const publishPixels = async () => {
        let max_chunk_size = 80;

        if (ActivePixels.length > max_chunk_size) {
            // more than one packet is needed
            let RemainingActivePixels = ActivePixels; // working copy so we dont destory it with trimming (slice)
            console.log(RemainingActivePixels);
            await sendPacket(82, max_chunk_size, RemainingActivePixels);
            RemainingActivePixels = RemainingActivePixels.slice(max_chunk_size);

            while (RemainingActivePixels.length > max_chunk_size)
            {
                console.log(RemainingActivePixels);
                await sendPacket(81, max_chunk_size, RemainingActivePixels);
                RemainingActivePixels = RemainingActivePixels.slice(max_chunk_size);
            }
            console.log(RemainingActivePixels);
            await sendPacket(83, RemainingActivePixels.length, RemainingActivePixels);
        } else
        {
            // SINGLE PACKET
            await sendPacket(84, ActivePixels.length, ActivePixels);
        }

    }

    // assemble a packet
    // type = 82 (first packet)
    // type = 83 (last packet)
    // type = 81 (middle packet)
    // type = 84 (only packet)
    // pixel_count number of pixels from the beginning of ActivePixels
    const sendPacket = async (type:number, pixel_count: number, Pixels:{holdnum:number, r:number, g:number, b:number}[]) => {
        let payload = new Uint8Array([type]);
        for (let i:number=0; i<pixel_count; i++)
        {
            // get color of pixel
            let r_bits = Pixels[i].r / (255 / 7);  // 3 bits Red
            let g_bits = Pixels[i].g / (255 / 7);  // 3 bits Green
            let b_bits = Pixels[i].b / (255 / 3);  // 2 bits Blue
            let color = (r_bits << 5) | (g_bits << 2) | b_bits;
            let this_pixel = new Uint8Array([Pixels[i].holdnum & 0xFF, Pixels[i].holdnum >> 8, color]);
            payload = mergeUint8Arrays(payload, this_pixel);
        }
        let header = new Uint8Array([0x1, 1 + 3 * pixel_count, checksum(payload), 2])
        let tail = new Uint8Array([3]);

        // assemble buffer
        let msg = new Uint8Array(header.length + payload.length + tail.length);
        msg.set(header, 0);
        msg.set(payload, header.length);
        msg.set(tail, header.length + payload.length);

        if (toggleCharacteristic) {
            console.log("packet type: %d sending %d pixels", type, pixel_count);
            await toggleCharacteristic.writeValue(msg).catch(err => console.log('readValue', err));
        }
        else
        {
            console.log("publishPixels() NOT CONNECTED");
        }
        console.log(payload);
    }

    // get Kilterboard Hold number or -1 if no such hold exists
    const getHoldNum = (x:number, y:number): number =>
    {
        return(PixelMapping[y][x]);
    }

    const loop = async () => {
        for (let y = 0; y <= ROWS; y++) {
            for (let x = 0; x <= COLS; x++) {
                await setPixel(x, y, 0, 0, 0xff);
            }
        }
    }

    const createPixelArray = (): number[][] => {
        console.log("create_pixel_array()");
        let Pixels = [];
        for (let y: number = 0; y <= ROWS; y++) {
            let PixelRow = [];
            // console.log("------ ROW %d -----", y);
            for (let x: number = 0; x < COLS + 1; x++) {
                let v: number;

                if (y % 2 === 0) { // even row
                    if (x % 2) {
                        v = x * (ROWS / 2) + x / 2 + y / 2 - 1;
                        // console.log("EVN %d|%d = %d",x, y, v);
                    } else {
                        v = -1;
                    }

                } else    // odd row
                {
                    if (x % 2) {
                        v = -1;
                    } else {
                        v = (x + 1) * (ROWS / 2) + x / 2 - y / 2 - 1;
                        // console.log("ODD %d|%d = %d", x, y, v);
                    }
                }
                // console.log("%d|%d = %d",x, y, v);
                PixelRow.push(Math.round(v));
            }
            Pixels.push(PixelRow);
        }
        console.log(Pixels);
        return Pixels;
    }

    // init pixels array on first invoke
    if (PixelMapping.length<1) {
        PixelMapping = createPixelArray();
    }


    return { connect, setLED_v3, setPixel, addPixel, clearPixels, publishPixels, loop, isConnected, getHoldNum };
};