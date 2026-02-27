import { state } from './state.js';

// Load COCO Model
export async function loadModel() {
    console.log("Loading Model...");
    state.model = await cocoSsd.load();
    console.log("Model loaded successfully");

    // Update meta info
    document.getElementById('model-name').innerText = "COCO-SSD";
    document.getElementById('model-version').innerText = "v2";
    document.getElementById('model-size').innerText = "17 MB";
}

// Backend Option Selector event listener logic
export async function switchBackend(backend) {

    // Check if backend is supported
    if (!tf.findBackend(backend)) {
        console.warn(`Backend ${backend} not supported, reverting to default`);
        await tf.setBackend('webgl'); // fallback to WebGL
        return; // stop further execution
    }

    // pause prediction whilst switching backend
    state.isPredicting = false;

    try {
        await tf.setBackend(backend);
        await tf.ready();
        console.log(`Backend switched to: ${backend}`);
    } catch (err) {
        console.error(`Failed to switch backend: ${err}`);
    }

    state.isPredicting = true; // restart prediction
}