import { state } from './state.js';
import { predictWebcam } from './webcamPrediction.js';

// Check if webcam access is supported
export function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Enable the live webcam view and start classification
export async function enableCam(event, video, canvas, ctx) {
    console.log("Webcam button clicked");

    // Select the error display element
    const errorMessage = document.getElementById('webcam-error');
    errorMessage.innerText = ""; // Clear any previous errors
    
    if (!state.model) return;

    // Hide enable cam button
    event.target.classList.add('removed');

    // Request webcam stream
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            state.webcamStream = stream; // store stream to stop later

            // Event listener once video is loaded
            video.addEventListener('loadeddata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Warm up to run detect once to allocate tensors
                state.model.detect(video).then(() => {
                    console.log("Warm-up complete, starting predictions");

                    // Enable prediction loop
                    state.isPredicting = true;
                    predictWebcam(video, canvas, ctx);
                });
            }, { once: true });
        })
        .catch(err => {
            // Update the UI with red text for the user
            console.error("Error accessing webcam: " + err);
            errorMessage.innerText = "Error: Webcam access denied or not found. Please check your browser permissions.";
            
            // Show the enable button again so they can try again after fixing permissions
            event.target.classList.remove('removed');
        });
}

// Disable live webcam view
export function disableCam(video, canvas, ctx, enableWebcamButton) {

    // Stop prediction loop
    state.isPredicting = false;

    if (state.webcamStream) {
        // stop all tracks
        state.webcamStream.getTracks().forEach(track => track.stop());
        state.webcamStream = null;
    }

    // Clear video and canvas
    video.srcObject = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Show enable button again
    enableWebcamButton.classList.remove('removed');
}
