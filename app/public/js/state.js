// Shared application state
export const state = {

    // Store the resulting model in the global scope of our app
    model: undefined,

    // Store the MediaStream for stopping
    webcamStream: null,

    // Default confidence threshold
    confidenceThreshold: 0.5,

    // Only predict what is on webcam when this variable is active
    isPredicting: false,

    // Used for FPS Counter
    lastFrameTime: performance.now(),
    smoothedFPS: 0,
    
     // Stores classes the user wants to see
    enabledClasses: new Set(),

    // colorMap for different classes
    colorMap: {},

    // Batch Result List
    batchResults: [],

    // Region of interest
    roi: {
        enabled: true,
        x: 50,
        y: 50,
        width: 200,
        height: 200
    }
};
