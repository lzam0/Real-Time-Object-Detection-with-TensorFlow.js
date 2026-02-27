import { state } from './state.js';
import { switchBackend } from './model.js';

// ---------------------------------------------------------------------------
// Setup UI elements and event listeners
export function setupUI(confidenceSlider, confidenceValue, backendSelector) {

    // Initialise slider UI from state
    confidenceSlider.value = state.confidenceThreshold * 100;
    confidenceValue.innerText = `${confidenceSlider.value}%`;

    // Confidence score event listener
    confidenceSlider.addEventListener('input', () => {
        state.confidenceThreshold = confidenceSlider.value / 100;
        confidenceValue.innerText = `${confidenceSlider.value}%`;
    });

    // Backend Option Selector event listener
    backendSelector.addEventListener('change', async () => {
        await switchBackend(backendSelector.value);
    });
}

export function resetDetectionUI() {
    // Reset the global variable states
    state.enabledClasses.clear(); 
    state.batchResults = [];
    
    // Clear the Object Counts List
    const countsList = document.getElementById('object-counts-list');
    if (countsList) countsList.innerHTML = '';

    // Clear the Class Filters checkboxes
    const filtersDiv = document.getElementById('class-filters');
    if (filtersDiv) filtersDiv.innerHTML = '';

    // Hide the Export Button
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) exportBtn.style.display = 'none';

    console.log("Detection UI and State cleared.");
}

// ---------------------------------------------------------------------------
// Update class filter UI
export function updateFilterUI(predictions) {
    const container = document.getElementById('class-filters');
    if (!container) return;

    // Iterate through predictions to find unique classes
    predictions.forEach(pred => {
        // Give a class a consistent color if its the first time identifying it
        if (!state.colorMap[pred.class]) {
            // Generate a random hue for Hue Saturation and Lightness (HSL) color
            const hue = Math.floor(Math.random() * 360);

            // Use colorMap to store the color for this class inside of state.js
            state.colorMap[pred.class] = `hsl(${hue}, 100%, 50%)`;
        }

        const classColor = state.colorMap[pred.class];

        // Only create a checkbox if we haven't seen this class before
        if (!document.getElementById(`filter-${pred.class}`)) {

            // Grab the wrapper div element and create checkbox + label
            const wrapper = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-${pred.class}`;
            checkbox.checked = true; // Default to show this class
            
            // Add to the state by default
            state.enabledClasses.add(pred.class);
            
            // Style the checkbox with the class color
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    state.enabledClasses.add(pred.class);
                } else {
                    state.enabledClasses.delete(pred.class);
                }
            });

            // Legend Color Switch
            const colorSwatch = document.createElement('span');
            colorSwatch.style.width = '12px';
            colorSwatch.style.height = '12px';
            colorSwatch.style.backgroundColor = classColor;
            colorSwatch.style.display = 'inline-block';
            colorSwatch.style.margin = '0 8px';
            colorSwatch.style.borderRadius = '2px';
            colorSwatch.style.border = '1px solid #333';

            // Style the checkbox with the class color
            const label = document.createElement('label');
            label.setAttribute('for', checkbox.id);
            label.innerText = ` ${pred.class}`;

            wrapper.appendChild(checkbox);
            wrapper.appendChild(colorSwatch);
            wrapper.appendChild(label);
            container.appendChild(wrapper);
        }
    });
}

// ---------------------------------------------------------------------------
// Object counter
export function updateObjectCounts(predictions, confidenceThreshold) {
    const countMap = {};

    //  Clear object counts
    const list = document.getElementById('object-counts-list');
    list.innerHTML = '';

    // Count objects above confidence threshold
    predictions.forEach(pred => {
        //  Confidence score slider and check if the object class is enabled
        const isConfident = pred.score >= confidenceThreshold;
        const isClassEnabled = state.enabledClasses.has(pred.class);
        
        // Check if the conditions are met
        if (isConfident && isClassEnabled) {
            countMap[pred.class] = (countMap[pred.class] || 0) + 1;
        }
    });

    // Populate list with counts
    Object.entries(countMap).forEach(([cls, count]) => {
        const li = document.createElement('li');
        li.textContent = `${cls}: ${count}`;
        list.appendChild(li);
    });
}

// ---------------------------------------------------------------------------
// Region of interest
export function setupROI(){
    /*  Coordinate mapping system to translate pixel dimensions
        into the detection loop
    */

    // Get all the element IDs
    const roiBox = document.getElementById('roi-box');
    const roiToggle = document.getElementById('enable-roi');
    const videoContainer = document.getElementById('live-view');
    const resizer = roiBox.querySelector('.resizer');
    
    if (!roiBox || !roiToggle) return;

    // Toggle Visibility event listener
    roiToggle.addEventListener('change', (e) => {
        state.roi.enabled = e.target.checked;
        roiBox.style.display = e.target.checked ? 'block' : 'none';
    });

    // Mouse down click to resize
    resizer.onmousedown = function(e) {
        e.preventDefault();
        e.stopPropagation(); // CRITICAL: Stops the 'drag' logic from firing

        // Get the curr dimensions of ROI before resize 
        const startWidth = roiBox.offsetWidth;
        const startHeight = roiBox.offsetHeight;
        // Store the mouse coords at the moment it drags on screen
        // Anchor points to calculate the change in movement
        const startX = e.clientX;
        const startY = e.clientY;

        function doResize(event) {
            const containerRect = videoContainer.getBoundingClientRect();
            
            // Calculate new size relative to starting point
            // Start W/H + event X/Y - original pos
            const newWidth = startWidth + (event.clientX - startX);
            const newHeight = startHeight + (event.clientY - startY);

            // Boundary checks: Min 50px, Max must stay inside container
            const maxWidth = containerRect.width - state.roi.x;
            const maxHeight = containerRect.height - state.roi.y;

            if (newWidth > 50 && newWidth <= maxWidth) {
                roiBox.style.width = newWidth + 'px';
                state.roi.width = newWidth;
            }
            if (newHeight > 50 && newHeight <= maxHeight) {
                roiBox.style.height = newHeight + 'px';
                state.roi.height = newHeight;
            }
        }
        
        // Stop resize through mouse click event listner
        function stopResize() {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        }

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    };

    // Mouse down click to move ROI box 
    roiBox.onmousedown = function(event) {
        // Only trigger drag if we DID NOT click the resizer
        if (event.target === resizer) return;
        
        event.preventDefault();

        // Calculate offset of mouse from the top-left of the ROI box
        const rect = roiBox.getBoundingClientRect();
        let shiftX = event.clientX - rect.left;
        let shiftY = event.clientY - rect.top;

        function moveAt(pageX, pageY) {
            let containerRect = videoContainer.getBoundingClientRect();
            
            // Calculate position relative to container
            let newX = pageX - shiftX - containerRect.left;
            let newY = pageY - shiftY - containerRect.top;

            // Strict boundary checks for X and Y
            newX = Math.max(0, Math.min(newX, containerRect.width - roiBox.offsetWidth));
            newY = Math.max(0, Math.min(newY, containerRect.height - roiBox.offsetHeight));

            roiBox.style.left = newX + 'px';
            roiBox.style.top = newY + 'px';

            // Sync with Global State for the filter logic
            state.roi.x = newX;
            state.roi.y = newY;
        }

        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
        }

        // Global listeners allow the drag to continue even if the mouse leaves the box area
        document.addEventListener('mousemove', onMouseMove);

        document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
        };
    };
}