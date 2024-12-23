
const video = document.getElementById('video')
const snap = document.getElementById('snap');
const canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
const resultsDiv = document.getElementById('results');

/// Adding the Webcam and adding the face detection model

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
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
        const detections = await faceapi.detectAllFaces(video, new 
            faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
            .withFaceExpressions()
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetections)
        
        //Remove unwanted features
        // Can detected landmarks of face and the emotions of the face
        
        //faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        //faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    }, 100)
})

// Adding Picture taking feature in the webcam
function displayResults(message) {
    resultsDiv.innerHTML = `<p>${message}</p>`;
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

    // First checks if there is exaclty one face in the image
    if(faceCount == 0){
        alert("No face detected in the image");
    }else if(faceCount > 1){ 
        alert("Multiple faces detected in the image");
    } else{

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        displayResults(`Number of faces detected: ${faceCount}`);

        detections.forEach((det, index) => {
            const confidence = (det.detection.score * 100).toFixed(2);
            appendResult(`Face ${index + 1}: Confidence is ${confidence}%`);
        });
    }
        
});