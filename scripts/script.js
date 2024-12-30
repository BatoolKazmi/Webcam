const video = document.getElementById('video')
const snap = document.getElementById('snap');
const canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
const resultsDiv = document.getElementById('results');
const capturedImage = document.getElementById('captured-image');  // Reference to the image container

let countdownInterval;
let countdownTime = 5;
let allChecksPassed = false;
let photoTaken = false;

/// Adding the Webcam and adding the face detection model

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models') // to check for glasses
]).then(startVideo)

function startVideo(){
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

video.addEventListener('play', () => { 

    const canvas = faceapi.createCanvasFromMedia(video)
    const videoContainer = document.querySelector('.video-container');
    
    videoContainer.appendChild(canvas)

    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        context.clearRect(0, 0, canvas.width, canvas.height);

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
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetections)

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

                    // Face Orientation Check
                    const nose = landmarks.getNose();
                    const leftEye = landmarks.getLeftEye();
                    const rightEye = landmarks.getRightEye();
                    const orientation = getFaceOrientation(nose, leftEye, rightEye);

                    if (orientation !== 'straight') {
                        displayResults("Please look straight into the camera.");
                    } else {

                        // Face Position Check
                        if (!isFaceInOval(box)) {
                            displayResults("Align your face within the oval.");
                        } else {
                            allChecksPassed = true;
                        }
                        

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

// Adding Picture taking feature in the webcam
function displayResults(message) {
    resultsDiv.innerHTML = `<p>${message}</p>`;
}

// Function to start the countdown
function startCountdown() {
    if (countdownInterval) return;

    countdownInterval = setInterval(() => {
        countdownTime--;
        resultsDiv.innerHTML = `<p>Countdown: ${countdownTime}</p>`;
        
        if (countdownTime <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null; // Reset the interval reference
            takePicture();
        }
    }, 1000);
}

// Function to take a picture
function takePicture() {
    if (photoTaken) return; 

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

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

function getAverageBrightness(data) {
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
        total += data[i] + data[i + 1] + data[i + 2];
    }
    return total / (data.length / 4);
}

function getFaceOrientation(nose, leftEye, rightEye) {
    const eyeLineSlope = (rightEye[0].y - leftEye[0].y) / (rightEye[0].x - leftEye[0].x);
    if (Math.abs(eyeLineSlope) < 0.1) {
        return 'straight';
    }
    return 'tilted';
}

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

function appendResult(message){
    resultsDiv.innerHTML += `<p>${message}</p>`;
}


snap.addEventListener('click', async() => { 

    const detections = await faceapi.detectAllFaces(video, new 
        faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
        .withFaceExpressions();
    
    const faceCount = detections.length;
    resultsDiv.innerHTML = '';

    // Reference to the image container
    const capturedImage = document.getElementById('captured-image');

    // First checks if there is exaclty one face in the image
    if(faceCount == 0){
        alert("No face detected in the image");
        capturedImage.style.display = 'none';
    }else if(faceCount > 1){ 
        alert("Multiple faces detected in the image");
    } else {
   
        displayResults(`Number of faces detected: ${faceCount}`);
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image data URL
        const imageDataURL = canvas.toDataURL("image/png");
        capturedImage.src = imageDataURL;
        capturedImage.style.display = 'block'; // Show the image
    }
           
        
});

