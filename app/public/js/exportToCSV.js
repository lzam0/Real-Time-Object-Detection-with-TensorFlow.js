import { state } from './state.js';

export function exportToCSV() {
    if (!state.batchResults || state.batchResults.length === 0) return;

    // Create headers for the csv file
    const headers = [
        "Filename", 
        "Detected Object", 
        "Confidence", 
        "X-Coord", 
        "Y-Coord", 
        "Width", 
        "Height", 
        "Total Objects in Image"
    ];

    //  Map the results to match the headers created
    const rows = state.batchResults.map(r => [
        r.filename,
        r.class,
        r.confidence,
        r.x,
        r.y,
        r.width,
        r.height,
        r.totalObjectsInImage
    ].join(","));

    // Create the csv file and allow download (similar to screenshot)
    const csvContent = [headers.join(","), ...rows].join("\n");
    // Use Blob object to create a virtual file in the brower's memory
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `detailed_detection_results_${Date.now()}.csv`;
    link.click();
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
}