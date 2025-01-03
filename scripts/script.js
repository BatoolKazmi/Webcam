const video = document.getElementById('video')
const snap = document.getElementById('snap');
const canvas = document.getElementById('canvas');
var context = canvas.getContext('2d', { willReadFrequently: true });
const resultsDiv = document.getElementById('results');
const capturedImage = document.getElementById('captured-image');  // Reference to the image container

let countdownInterval;
let countdownTime = 5;
let allChecksPassed = false;
let photoTaken = false;

/// Adding the Webcam and adding the face detection model ///
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo)


async function startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
}      

  
// Attach event listener to start face detection and validation
video.addEventListener('play', () => { 
    const canvas = faceapi.createCanvasFromMedia(video)
    const videoContainer = document.querySelector('.video-container');
    videoContainer.appendChild(canvas)

    // Ensure consistent `willReadFrequently` usage for additional contexts
    const faceApiContext = canvas.getContext('2d', { willReadFrequently: true });

    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

        // Clear previous frames
        context.clearRect(0, 0, canvas.width, canvas.height);
        faceApiContext.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Oval Guide
        context.beginPath();
        context.ellipse(
            canvas.width / 2, // x
            canvas.height / 2, // y
            150, // radiusX
            200, // radiusY
            0, // rotation
            0, // startAngle
            2 * Math.PI // endAngle
        );
        context.lineWidth = 2;
        context.strokeStyle = 'blue';
        context.stroke();


        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)

        let allChecksPassed = false;
        
        // If detected 1 face, start the checks
        if (detections.length === 1) {
            const landmarks = detections[0].landmarks;
            const box = detections[0].detection.box;

            // Estimate distance
            const distance = getDistanceEstimation(box);
            if (distance < 30) {
                displayResults("Too close to the camera. Please move your face back.");
            } else if (distance > 100) {
                displayResults("Too far from the camera. Please move your face closer.");
            } else {

                // Lighting Check
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const averageBrightness = getAverageBrightness(imageData.data);
                if (averageBrightness < 0.5) {
                    displayResults("Lighting is too dark. Please improve lighting.");
                } else {

                    

                    // Face Position Check
                    if (!isFaceInOval(box)) {
                        displayResults("Align your face within the oval.");
                    } else {
                        allChecksPassed = true;
                    }
                        

                }

            }

        } else if (detections.length === 0) {
            displayResults("No face detected.");
        } else {
            displayResults("Multiple faces detected. Ensure only one face is visible.");
        }

        if (allChecksPassed && !photoTaken) {
            if (!countdownInterval) {
                displayResults("All checks passed! Starting countdown...");
                startCountdown();
            }
        } else {
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                countdownTime = 5; // Reset countdown
                displayResults("Countdown stopped due to failed checks.");
            }
        }

    }, 100)
})

/// FUNCTIONS ///

// Function to display a message in the results div
function displayResults(message) {
    resultsDiv.innerHTML = `<p>${message}</p>`;
}

// Function to append a message to the results div
function appendResult(message){
    resultsDiv.innerHTML += `<p>${message}</p>`;
}

// Function to start the countdown
function startCountdown() {
    if (countdownInterval) return;

    countdownInterval = setInterval(() => {
        countdownTime--;
        resultsDiv.innerHTML = `<p>Countdown: ${countdownTime}</p>`;
        
        if (countdownTime <= 0) {
            clearInterval(countdownInterval);
            takePicture();
        }
    }, 1000);
}

// Function to draw a circle on the canvas
function drawCircle(context, x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fillStyle = "white"; // Set the circle color
    context.fill();
    context.stroke();
}

async function takePicture() {
    if (photoTaken) return; 

    // Detect landmarks for the current frame
    const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

    const landmarks = detections.landmarks;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Get regions from landmarks
    const regions = getRegionsFromLandmarks(detections.landmarks);
    console.log(regions);

    // Scale the new regions to match the canvas
    const scaledRegions = {
        middleForehead: scaleCoordinates(regions.middleForehead, videoWidth, videoHeight, canvasWidth, canvasHeight),
        leftUndereye: scaleCoordinates(regions.leftUndereye, videoWidth, videoHeight, canvasWidth, canvasHeight),
        rightUndereye: scaleCoordinates(regions.rightUndereye, videoWidth, videoHeight, canvasWidth, canvasHeight),
        leftCheek: scaleCoordinates(regions.leftCheek, videoWidth, videoHeight, canvasWidth, canvasHeight),
        rightCheek: scaleCoordinates(regions.rightCheek, videoWidth, videoHeight, canvasWidth, canvasHeight),
    };

    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw circles for the new regions
    drawCircle(context, scaledRegions.middleForehead.x, scaledRegions.middleForehead.y, 5); // Middle Forehead
    drawCircle(context, scaledRegions.leftUndereye.x, scaledRegions.leftUndereye.y, 5); // Left Undereye
    drawCircle(context, scaledRegions.rightUndereye.x, scaledRegions.rightUndereye.y, 5); // Right Undereye
    drawCircle(context, scaledRegions.leftCheek.x, scaledRegions.leftCheek.y, 5); // Left Cheek
    drawCircle(context, scaledRegions.rightCheek.x, scaledRegions.rightCheek.y, 5); // Right Cheek

    // Convert canvas to image data URL
    const imageDataURL = canvas.toDataURL("image/png");
    capturedImage.src = imageDataURL;
    capturedImage.style.display = 'block';  // Show the image

    photoTaken = true; // Mark the photo as taken

    setTimeout(() => {
        photoTaken = false; // Allow checks to restart after a delay
        countdownTime = 5; // Reset countdown
    }, 3000); // Adjust delay as needed
    
}

function scaleCoordinates(landmarkPoint, videoWidth, videoHeight, canvasWidth, canvasHeight) {
    return {
        x: (landmarkPoint.x / videoWidth) * canvasWidth,
        y: (landmarkPoint.y / videoHeight) * canvasHeight
    };
}

function getRegionsFromLandmarks(landmarks) {

    if (!landmarks) throw new Error("Landmarks are not defined");


    // Middle forehead: Use an approximate position between the eyebrows
    const middleForehead = {
        x: (landmarks.getLeftEyeBrow()[2].x + landmarks.getRightEyeBrow()[2].x) / 2,
        y: (landmarks.getLeftEyeBrow()[2].y + landmarks.getRightEyeBrow()[2].y) / 2 - 20, // Offset slightly upwards
    };

    // Left undereye: Use a landmark below the left eye
    const leftUndereye = {
        x: landmarks.getLeftEye()[4].x, // Lower edge of the left eye
        y: landmarks.getLeftEye()[4].y + 13, // Lower edge of the left eye
    };  
    // Right undereye: Use a landmark below the right eye
    const rightUndereye = {
        x: landmarks.getRightEye()[4].x, // Lower edge of the right eye
        y: landmarks.getRightEye()[4].y + 13, // Lower edge of the right eye
    };

    // Left cheek: Approximate position near the left cheekbone
    const leftCheek = {
        x: landmarks.getJawOutline()[3].x + 20, // Near the jaw but closer to the cheekbone
        y: landmarks.getJawOutline()[3].y, // Near the jaw but closer to the cheekbone
    }

    // Right cheek: Approximate position near the right cheekbone
    const rightCheek = {
        x: landmarks.getJawOutline()[13].x - 20, // Near the jaw but closer to the cheekbone
        y: landmarks.getJawOutline()[13].y, // Near the jaw but closer to the cheekbone
    }

    return {
        middleForehead,
        leftUndereye,
        rightUndereye,
        leftCheek,
        rightCheek,
    };

    // const nose = landmarks.getNose(); 
    // const leftJaw = landmarks.getJawOutline()[0]; 
    // const rightJaw = landmarks.getJawOutline()[16];
    // const leftEye = landmarks.getLeftEye(); 
    // const rightEye = landmarks.getRightEye(); 

    // console.log(nose);
    // console.log(landmarks.getJawOutline());
    // console.log(leftEye);
    // console.log(rightEye);

    // return regions = {
    //     "nose": nose, 
    //     "leftJaw": leftJaw, 
    //     "rightJaw": rightJaw, 
    //     "leftEye": leftEye, 
    //     "rightEye": rightEye
    // };
}

// Function to get the average RGB color of a region
function getRegionColor(imageData, region) {
    if (!region) {
        console.error("Region is undefined or invalid");
        return 'rgb(0, 0, 0)';
    }

    const { left, top, right, bottom } = region;
    // Ensure left, top, right, and bottom are valid numbers
    if (left === undefined || top === undefined || right === undefined || bottom === undefined) {
        console.error("Invalid region coordinates", region);
        return 'rgb(0, 0, 0)';
    }

    // Get the pixel data of the region and calculate average color
    const regionPixels = imageData.data;
    let r = 0, g = 0, b = 0;
    let pixelCount = 0;

    for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
            const pixelIndex = (y * canvas.width + x) * 4; // 4 for RGBA
            r += regionPixels[pixelIndex];
            g += regionPixels[pixelIndex + 1];
            b += regionPixels[pixelIndex + 2];
            pixelCount++;
        }
    }

    r = Math.floor(r / pixelCount);
    g = Math.floor(g / pixelCount);
    b = Math.floor(b / pixelCount);

    return `rgb(${r}, ${g}, ${b})`;
}



// FUNCTIONS USED IN THE CHECKS //
// Function to calculate the average brightness of an image
function getAverageBrightness(data) {
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
        total += data[i] + data[i + 1] + data[i + 2];
    }
    return total / (data.length / 4);
}

// Function to check if the face is within the oval
function isFaceInOval(box) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const xDist = (box.x + box.width / 2 - centerX) / 150; // Normalize to oval width
    const yDist = (box.y + box.height / 2 - centerY) / 200; // Normalize to oval height
    return xDist ** 2 + yDist ** 2 <= 1; // Inside ellipse formula
}

// Adding Distance Detection
function getDistanceEstimation(box) {
    const referenceWidth = 150; // Estimated width of the face at a reference distance
    const referenceDistance = 150; // Reference distance in cm
    const distance = (referenceWidth / box.width) * referenceDistance;
    return distance;
}

