import { state } from './state.js';
import { getUserMediaSupported, enableCam, disableCam } from './webcam.js';
import { loadModel } from './model.js';
import { setupUI, resetDetectionUI, setupROI } from './ui.js';
import { takeScreenshot } from './screenshot.js';

import { handleImagePreview, runStaticDetection, runBatchStaticDetection, warmUpModel } from './uploadPrediction.js';
import { exportToCSV } from './exportToCSV.js';

// ---------------------------------------------------------------------------
// DOM Elements

// Webcam elements
const video = document.getElementById('webcam');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcam-btn');
const disableWebcamButton = document.getElementById('disable-webcam-btn');

// Canvas overlay (webcam)
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

// Upload image elements
const imageUpload = document.getElementById('image-upload');
const runDetectionBtn = document.getElementById('run-detection');
const uploadCanvas = document.getElementById('upload-overlay');
const uploadCtx = uploadCanvas.getContext('2d');
const uploadArea = document.getElementById('upload-area');
const galleryArea = document.getElementById('gallery-area');
const batchBtn = document.getElementById('run-batch-detection');

// Confidence slider
const confidenceSlider = document.getElementById('confidence');
const confidenceValue = document.getElementById('confidence-value');

// Backend selector
const backendSelector = document.getElementById('backend');

// Screenshot
const screenshotButton = document.getElementById('screenshot-btn');

// Mode toggle buttons
const webcamModeBtn = document.getElementById('mode-webcam');
const uploadModeBtn = document.getElementById('mode-upload');

// Loading overlay
const loadingOverlay = document.getElementById('loading-overlay');

// ---------------------------------------------------------------------------
// Mode Handler

// Mode constants
const MODES = {
    WEBCAM: 'webcam',
    UPLOAD: 'upload'
};

let currentMode = null;


function setMode(mode) {
    if (currentMode === mode) return;
    currentMode = mode;

    // Call the reusable reset component
    resetDetectionUI();

    // Reset everything first (important)
    demosSection.classList.add('hidden');
    uploadArea.classList.add('hidden');
    galleryArea.classList.add('hidden');

    webcamModeBtn.classList.remove('active');
    uploadModeBtn.classList.remove('active');

    if (mode === MODES.WEBCAM) {
        webcamModeBtn.classList.add('active');
        demosSection.classList.remove('hidden');
        demosSection.classList.remove('invisible');

        // Clear the gallery so old images don't sit at the bottom hidden
        const gallery = document.getElementById('upload-gallery');
        gallery.innerHTML = ''; 
        state.batchResults = [];
        document.getElementById('export-csv').style.display = 'none';
    }

    if (mode === MODES.UPLOAD) {
        uploadModeBtn.classList.add('active');

        // Show upload section
        uploadArea.classList.remove('hidden');
        uploadArea.classList.remove('invisible');

        // Show gallery
        galleryArea.classList.remove('hidden');
        galleryArea.classList.remove('invisible');

        // Stop webcam when switching away to upload section
        disableCam(video, canvas, ctx, enableWebcamButton);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}


webcamModeBtn.addEventListener('click', () => {
    setMode(MODES.WEBCAM);
});

uploadModeBtn.addEventListener('click', () => {
    setMode(MODES.UPLOAD);
});

// ---------------------------------------------------------------------------
// Webcam Setup

if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', (e) =>
        enableCam(e, video, canvas, ctx)
    );

    disableWebcamButton.addEventListener('click', () => {
        disableCam(video, canvas, ctx, enableWebcamButton)
        resetDetectionUI(); // Clear the lists and filters immediately
    });
} else {
    console.warn('getUserMedia() is not supported by your browser');
    document.getElementById('webcam-error').innerText =
        'Webcam access is not supported in this browser.';
}

// ---------------------------------------------------------------------------
// Model Loading

loadModel()
    .then(() => {
        // Hide loading overlay
        loadingOverlay.style.display = 'none';

        // Default mode: webcam
        setMode(MODES.WEBCAM);
    })
    .catch(err => {
        console.error('Model load error:', err);

        document.getElementById('model-name').innerText = 'Error Loading Model';
        loadingOverlay.innerHTML = `
            <div class="loading-card">
                <h2>Model Failed to Load</h2>
                <p>Please check your internet connection and refresh.</p>
            </div>
        `;
    });


// ---------------------------------------------------------------------------
// Image Upload

// Single Image Upload
/*
imageUpload.addEventListener('change', (e) => {
    handleImagePreview(e, uploadCanvas, uploadCtx);
});

runDetectionBtn.addEventListener('click', () => {
    runStaticDetection(uploadCanvas, uploadCtx);
});*/

// Event listener if batch run detection is activated
if (batchBtn) {
    batchBtn.onclick = async () => {
       
        const batchImg = document.getElementById('img-upload');
        console.log("Files selected:", batchImg.files.length);

        if (batchImg.files && batchImg.files.length > 0) {
            // Warm up the tensors FIRST so the user doesn't wait during the actual loop
            await warmUpModel();

            // Transform the FileList into an Array and pass it
            const filesArray = Array.from(batchImg.files);
            await runBatchStaticDetection(filesArray);
        } else {
            alert("Please select images first!");
        }
    };
}

// CSV Export Button
const exportBtn = document.getElementById('export-csv');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        exportToCSV();
    });
}

// ---------------------------------------------------------------------------
// Image Screenshot 

screenshotButton.addEventListener('click', () => {
    takeScreenshot(video, canvas);
});

// ---------------------------------------------------------------------------
// UI Setup

setupUI(confidenceSlider, confidenceValue, backendSelector);
setupROI(); // Initialize the ROI dragging and toggle logic
// ---------------------------------------------------------------------------