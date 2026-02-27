
# Real-Time Object Detection with TensorFlow.js
This browser-based application utilizes the COCO-SSD pre-trained model to perform real-time object detection. The project supports live webcam streaming, batch image processing, and data export functionalities, all processed locally within the client's browser using TensorFlow.js.

## Prerequisites
Ensure you have the following installed on your machine:
- Node.js (v14.x or later)
- npm (Node Package Manager)
- A modern web browser (Chrome, Edge, or Firefox recommended)

## Setup & Run Instructions

1. Clone the Repository 
Open your terminal and clone the repository from the Stugit environment:
```
git clone https://github.com/lzam0/Real-Time-Object-Detection-with-TensorFlow.js
```

2. Install Dependencies
This project uses Express.js to serve static files. Install the necessary Node modules by running:
```
cd app
npm install
```

3. Start the Server
Run the local development server:
```
node app.js
```

4. Access the Application
Once the server is running, open your browser and navigate to: *http://localhost:3000*

## Usage Guide
Warm-up: Upon loading, the model undergoes a "warm-up" phase to allocate tensors.

ROI Interaction: Toggle "Enable ROI" to display the interaction box. Drag from the centre to move it, or use the bottom-right handle to resize.

Batch Upload: Switch to "Batch Mode" to upload multiple files. After processing, use the Export Results (CSV) button to save the data.