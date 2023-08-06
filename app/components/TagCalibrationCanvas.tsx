import React from "react";

// create class component
class TagCalibrationCanvas extends React.Component {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    constructor(props: any) {
        super(props);
        this.canvasRef = React.createRef();
    }
    
    componentDidMount() {
        console.log("mounted?")
        const img = new Image();
        img.src = 'qr.png';
        const canvas = this.canvasRef.current;
        canvas!.width = window.innerWidth;
        canvas!.height = window.innerHeight;
        img.onload = () => {
            
            if (canvas != null) {
                const ctx = canvas.getContext('2d');
                // scale image 20x, but only the image, not the canvas
                // use nearest neighbour interpolation
                ctx!.imageSmoothingEnabled = false;
                const scaleFactor = 1; // Adjust this value to your needs
        
                ctx!.drawImage(img, 0, 0, img.width, img.height, 500, 0, img.width * scaleFactor, img.height * scaleFactor);
                // get width and height of canvas
                const width = canvas.width;
                const height = canvas.height;
                // draw the width and height, red color
                ctx!.font = '20px serif';
                ctx!.fillStyle = 'red';
                ctx!.fillText(`width: ${width}, height: ${height}`, 10, 50);

            }
        };
    }
    render() {
        return (
            <div>
                <canvas ref={this.canvasRef} id="game-canvas" ></canvas>
            </div>
        );
    }
}


export default TagCalibrationCanvas;