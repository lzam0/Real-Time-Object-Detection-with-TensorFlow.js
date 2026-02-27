import { state } from './state.js';
import { updateFilterUI, updateObjectCounts } from './ui.js';

const liveFPSDisplay = document.getElementById('live-fps');
const frameTimeDisplay = document.getElementById('frame-time');
const modelFPSDisplay = document.getElementById('model-fps');
const inferenceTimeDisplay = document.getElementById('inference-time');

// Prediction Loop
export async function predictWebcam(video, canvas, ctx) {

    // An isPredicting flag is used to prevent unnecessary inference when the webcam is disabled,
    // avoiding redundant computation and memory usage
    if (!state.isPredicting) return;

    // Start TensorFlow scope (AUTO-CLEANUP)
    // Not using tf.tidy because model.detect is async
    tf.engine().startScope();

    try{
        // Inference timing
        const inferenceStart = performance.now();
        const predictions = await state.model.detect(video);
        const inferenceTime = performance.now() - inferenceStart; // measure time taken to process one frame and return predictions
        const modelFPS = 1000 / inferenceTime; // measure how fast a model inference is performed

        // Calculate the scale difference between the display (CSS) and the actual video (Model)
        const scaleX = video.videoWidth / video.clientWidth;
        const scaleY = video.videoHeight / video.clientHeight;

        // Filter predictions based on SCALED ROI
        const filteredPredictions = predictions.filter(prediction => {
            if (!state.roi.enabled) return true;

            const [x, y, width, height] = prediction.bbox;
            
            // Check if the center of the detected object is inside the ROI
            const centerX = x + width / 2;
            const centerY = y + height / 2;

            // Apply the scale to the ROI state values
            return (
                centerX >= (state.roi.x * scaleX) &&
                centerX <= ((state.roi.x + state.roi.width) * scaleX) &&
                centerY >= (state.roi.y * scaleY) &&
                centerY <= ((state.roi.y + state.roi.height) * scaleY)
            );
        });

        // call updateObjectCounts and UI filter update
        updateObjectCounts(filteredPredictions, state.confidenceThreshold);
        updateFilterUI(filteredPredictions);

        // Remove any previous bounding boxes from the live view
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Now lets loop through predictions and draw them to the live view if they have a high confidence score.
        filteredPredictions.forEach(pred => {

            // If confidence threshold met AND class filter enabled
            const isConfident = pred.score >= state.confidenceThreshold;
            const isClassEnabled = state.enabledClasses.has(pred.class);

            if (isConfident && isClassEnabled) {
                const [x, y, width, height] = pred.bbox;
                const assignedColor = state.colorMap[pred.class]; // get color from state

                // Draw bounding box with assigned class color
                ctx.strokeStyle = assignedColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);

                // Draw label background
                ctx.fillStyle = assignedColor
                ctx.font = '16px Arial';
                const text = `${pred.class} ${(pred.score * 100).toFixed(1)}%`;
                const textWidth = ctx.measureText(text).width;

                // Draw rectangle behind text for better visibility
                ctx.fillRect(x, y > 20 ? y - 20 : y + 5, textWidth + 6, 20);

                // Draw text
                ctx.fillStyle = '#000';
                ctx.fillText(
                    text,
                    x + 3,
                    y > 20 ? y - 5 : y + 20
                );
            }
        });

        // Calculate live/render FPS
        const now = performance.now();

        const delta = now - state.lastFrameTime;
        state.lastFrameTime = now;

        const liveFPS = 1000 / delta; 
        const frameTime = delta;

        /*
        - Live FPS: The actual, real-world frequency of frames delivered to the user's screen.
        - Frame Time: Total time (ms) for the entire loop, 
        including TS model, camera input, and UI rendering.
        - Model FPS: The theoretical maximum frames per second the model can achieve.
        - Inference Time: The raw latency (ms) for the TFJS model to process one frame.
        */

        // Display fps counter
        liveFPSDisplay.innerText = `Live FPS: ${liveFPS.toFixed(1)}`;
        frameTimeDisplay.innerText = `Frame Time: ${frameTime.toFixed(1)} ms`;
        modelFPSDisplay.innerText = `Model FPS: ${modelFPS.toFixed(1)}`;
        inferenceTimeDisplay.innerText = `Inference Time: ${inferenceTime.toFixed(0)} ms`;
        
        // Call this function again to keep predicting when the browser is ready.
        requestAnimationFrame(() => predictWebcam(video, canvas, ctx));
    }catch(err){
        console.error('Webcam prediction error:', err);
    }finally{
        // Clear all temporary tensors from memory
        tf.engine().endScope();   
    }
}
