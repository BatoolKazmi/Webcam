
const video = document.getElementById('video')
const snap = document.getElementById('snap');
const canvas = document.getElementById('canvas');

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
        
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    }, 100)
})

// Adding Picture taking feature in the webcam

const constraints = {
    Audio: false,
    video: {
        width: 720, height: 560
    }
}

async function init(){
    try{
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        handleSuccess(stream);
    } catch(e){
        console.log(e);
    }
}

function handleSuccess(stream){
    window.stream = stream;
    video.srcObject = stream;
}

init();
var context = canvas.getContext('2d');
snap.addEventListener('click', function(){ 
    context.drawImage(video, 0, 0, 720, 560);
});