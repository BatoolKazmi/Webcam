const video = document.getElementById('video')

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