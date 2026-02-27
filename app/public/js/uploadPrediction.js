import { state } from './state.js';
import { updateFilterUI, updateObjectCounts } from './ui.js';

const imgElement = document.getElementById('target-img');

export async function warmUpModel() {
    if (!state.model) return;

    try{
        console.log("Starting model warmup...");

        await tf.ready();
        
        // Utilise tf.engine().startScope()
        // since awaiting functions are used
        tf.engine().startScope();

        // Create a dummy tensor in the shape of [height, width, 3]
        const dummyTensor = tf.zeros([300, 300, 3], 'int32');

        // Perform tensor warmup
        await state.model.detect(dummyTensor);

        console.log("Upload model warmup complete");
    } catch (err) {
            console.error("Warmup Error:", err);
        } finally {
            // Cleanup tensors
            tf.engine().endScope();
        }
    }

// Handle image preview
export function handleImagePreview(event, canvas, ctx) {
    // Read the uploaded image file
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        imgElement.src = e.target.result;
        imgElement.style.display = 'block';

        // Warm up the model before image is picked
        warmUpModel();

        // Clear old detections when new image is picked
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Read file as Data URL
    reader.readAsDataURL(file);
}

// Run image detection
export async function runStaticDetection(canvas, ctx) {
    if (!imgElement.src || !state.model) return;

    // Start TensorFlow scope (AUTO-CLEANUP)
    // Not using tf.tidy because model.detect is async
    tf.engine().startScope();

    try{    
        // Set canvas dimensions to match the displayed image size
        canvas.width = imgElement.clientWidth;
        canvas.height = imgElement.clientHeight;

        // Use the global model from state.js
        const predictions = await state.model.detect(imgElement);
        
        // call updateObjectCounts and UI filter update
        updateFilterUI(predictions);
        updateObjectCounts(predictions, state.confidenceThreshold);

        //  Remove any previous bounding boxes from the view
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Similar prediction loop obtained from prediction.js
        predictions.forEach(pred => {
            // If confidence threshold met AND class filter enabled
            const isConfident = pred.score >= state.confidenceThreshold;
            const isClassEnabled = state.enabledClasses.has(pred.class);

            if (isConfident && isClassEnabled) {
                const [x, y, width, height] = pred.bbox;
                const assignedColor = state.colorMap[pred.class]

                // Draw bounding box with assigned class color
                ctx.strokeStyle = assignedColor;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);
                
                // Draw label background
                ctx.fillStyle = assignedColor;
                ctx.font = 'bold 14px Arial';
                ctx.fillText(
                    `${pred.class} ${(pred.score * 100).toFixed(0)}%`, 
                    x, 
                    y > 10 ? y - 5 : 10
                );
            }
        });
    }catch(err){
        console.error('Error during static image detection:', err);
    }finally{
        // Clear all temporary tensors from memory
        tf.engine().endScope();
    }
}

export async function runBatchStaticDetection(files) {
    const gallery = document.getElementById('upload-gallery');
    gallery.innerHTML = ''; // Clear previous results
    state.batchResults = []; // Reset CSV data

    for (const file of files) {
        const img = await loadImage(file);

        // Create canvas for this image
        const container = document.createElement('div');
        container.className = 'gallery-item';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d'); 

        // Set canvas dimensions to match original image resolution
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Inference with tensor scoping (cleanup)
        tf.engine().startScope();

        try {
            const predictions = await state.model.detect(img);
            
            // UI updates (filters/counts) for the overall dashboard
            updateFilterUI(predictions);
            updateObjectCounts(predictions, state.confidenceThreshold);

            const totalInFrame = predictions.length;

            predictions.forEach(pred => {
                // Apply the exact same filtering logic as single detection
                const isConfident = pred.score >= state.confidenceThreshold;
                const isClassEnabled = state.enabledClasses.has(pred.class);

                // Check if confidence score and enabled class viable
                if (isConfident && isClassEnabled) {
                    const [x, y, width, height] = pred.bbox;
                    const assignedColor = state.colorMap[pred.class];

                    // Store result from the processed content into a CSV
                    state.batchResults.push({
                        filename: file.name,
                        class: pred.class,
                        confidence: (pred.score * 100).toFixed(2) + '%',
                        x: Math.round(x),
                        y: Math.round(y),
                        width: Math.round(width),
                        height: Math.round(height),
                        totalObjectsInImage: totalInFrame
                    });

                    // Draw bounding box
                    ctx.strokeStyle = assignedColor;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x, y, width, height);
                    
                    // Draw label background and text
                    ctx.fillStyle = assignedColor;
                    ctx.font = 'bold 14px Arial';
                    const labelText = `${pred.class} ${(pred.score * 100).toFixed(0)}%`;
                    
                    // Simple text positioning logic
                    ctx.fillText(
                        labelText, 
                        x, 
                        y > 10 ? y - 5 : 10
                    );
                }
            });
        } catch (err) {
            console.error(`Error processing batch image ${file.name}:`, err);
        } finally {
            // Ensure tensors are disposed for every single image processed
            tf.engine().endScope();
        }

        // Append to gallery
        container.appendChild(canvas);
        gallery.appendChild(container);
    }
    document.getElementById('export-csv').style.display = 'block';
}

// Helper to load File object into Image element
function loadImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}