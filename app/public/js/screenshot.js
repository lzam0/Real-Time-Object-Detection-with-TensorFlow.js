export function takeScreenshot(video, canvas) {
    
    // Create temp canvas that draws on the live video feed
    // Whilst also overlaying the detection on top
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    // obtain canvas width x height
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Draw the current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw overlay (bounding boxes)
    ctx.drawImage(canvas, 0, 0);

    // Convert to PNG using toDataURL
    const imageURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageURL;

    // Use the curr time + date as a unique name
    link.download = `screenshot_${Date.now()}.png`;
    link.click();
}
