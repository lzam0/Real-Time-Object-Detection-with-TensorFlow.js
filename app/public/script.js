// Video Camera Preview
const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const disableWebcamButton = document.getElementById('disableWebcamButton');

// Confidence Slider
const confidenceSlider = document.getElementById('confidence');
const confidenceValue = document.getElementById('confidenceValue');

// Used for canvas overlay
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

// Fps Display
const fpsDisplay = document.getElementById('fps');

// Used for FPS Counter
let lastFrameTime = performance.now()
let smoothedFPS = 0;


const backendSelector = document.getElementById('backend');

// Store the resulting model in the global scope of our app
var model = undefined;

// Store the MediaStream for stopping
let webcamStream = null;

// Default confidence threshold
let confidenceThreshold = confidenceSlider.value / 100;

// Only predict what is on webcam when this variable is active
let isPredicting = false;


// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Video preview button event listeners
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
    disableWebcamButton.addEventListener('click', disableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start classification.
async function enableCam(event) {
    console.log("Webcam button clicked");

    if (!model) return;

    //  Hide enable cam button
    event.target.classList.add('removed');

    //  Request webcam stream
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            webcamStream = stream; // store stream to stop later

            // Event listener once video is loaded
            video.addEventListener('loadeddata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Warm-up: run detect once to allocate tensors
                model.detect(video).then(() => {
                    console.log("Warm-up complete, starting predictions");

                    // Enable prediction loop
                    isPredicting = true;
                    predictWebcam();
                });
            }, { once: true });
        })
        .catch(err => {
            console.error("Error accessing webcam: " + err);
        });
}

async function disableCam() {

    // Stop prediction loop
    isPredicting = false;

    if (webcamStream){
        // stop all tracks
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }

    // Clear video and canvas
    video.srcObject = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Show enable button again
    enableWebcamButton.classList.remove('removed');
};

// Load COCO Model
cocoSsd.load().then(function (loadedModel) {
    console.log("Model loaded successfully");
    model = loadedModel;

    // Show demos section now that model is ready
    demosSection.classList.remove('invisible');
    
     // Update meta info
    document.getElementById('modelName').innerText = "COCO-SSD";
    document.getElementById('modelVersion').innerText = "v2";
    document.getElementById('modelSize').innerText = "17 MB";
    // document.getElementById('modelClasses').innerText = modelLoaded.classes.length;
});

// Prediction Loop
async function predictWebcam() {
    
    // An isPredicting flag is used to prevent unnecessary inference when the webcam is disabled, 
    // avoiding redundant computation and memory usage
    if (!isPredicting) return;

    // Start TensorFlow scope (AUTO-CLEANUP)
    // Not using tf.tidy because mode.detect is async
    tf.engine().startScope();

    // predictions using await
    const predictions = await model.detect(video);

    // Remove any previous bounding borxes from the live view
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Now lets loop through predictions and draw them to the live view if they have a high confidence score.
    for (const pred of predictions) {

        // If the prediction confidence is above confidence slider %, draw it on the live view.
        if (pred.score >= confidenceThreshold) {
            const [x, y, width, height] = pred.bbox;

            // Draw bounding box
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // Draw label background
            ctx.fillStyle = '#00FFFF';
            ctx.font = '16px Arial';
            const text = `${pred.class} ${(pred.score * 100).toFixed(1)}%`;
            const textWidth = ctx.measureText(text).width;

            ctx.fillRect(x, y > 20 ? y - 20 : y + 5, textWidth + 6, 20);

            // Draw text
            ctx.fillStyle = '#000';
            ctx.fillText(text, x + 3, y > 20 ? y - 5 : y + 20);
        }
    }
    
    //  Implement FPS Calculation
    const now = performance.now();
    const delta = now - lastFrameTime;
    const fps = 1000 / delta;

    // Smooth FPS to avoid jitter
    smoothedFPS = smoothedFPS
        ? smoothedFPS * 0.9 + fps * 0.1
        : fps;

    // Display fps counter
    fpsDisplay.innerText = `FPS: ${smoothedFPS.toFixed(1)}`;

    // End TensorFlow scope (dispose tensors)
    tf.engine().endScope();

    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
};

// Confidence Slider event listener
confidenceSlider.addEventListener('input', () => {
    confidenceThreshold = confidenceSlider.value / 100;
    confidenceValue.innerText = `${confidenceSlider.value}%`;
});

// Backend Option Selector evnet listener
backendSelector.addEventListener('change', async () => {
    const backend = backendSelector.value;
    
    // Check if backend is supported
    if (!tf.findBackend(backend)) {
        console.warn(`Backend ${backend} not supported, reverting to default`);
        await tf.setBackend('webgl'); // fallback to WebGL
        return; // stop further execution
    }

    // pause prediciton whilst switching backend
    isPredicting = false;

    try {
        await tf.setBackend(backend);
        await tf.ready();
        console.log(`Backend switched to: ${backend}`);
    } catch (err) {
        console.error(`Failed to switch backend: ${err}`);
    }
    isPredicting = true;      // restart prediction
    predictWebcam();          // resume
});