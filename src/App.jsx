import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

function App() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log('Models loaded successfully');
      } catch (err) {
        console.error('Error loading models:', err);
      }
    };
    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => console.error("Webcam access error:", err));
  };

  useEffect(() => {
    if (!modelsLoaded) return;

    startVideo();

    videoRef.current.addEventListener('play', () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const colorMap = {
        happy: 'yellow',
        sad: 'blue',
        angry: 'red',
        fearful: 'purple',
        disgusted: 'gray',
        surprised: 'orange',
        neutral: 'green',
      };

      let lastTime = 0;
      const intervalTime = 50;

      const drawFrame = async (timestamp) => {
        if (timestamp - lastTime >= intervalTime) {
          lastTime = timestamp;

          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          resizedDetections.forEach(detection => {
            const expressions = detection.expressions;
            const maxExpression = Object.keys(expressions).reduce((a, b) =>
              expressions[a] > expressions[b] ? a : b
            );
            const color = colorMap[maxExpression] || 'white';

            const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
              label: `${maxExpression} (${(expressions[maxExpression] * 100).toFixed(1)}%)`,
              boxColor: color,
              lineWidth: 2,
            });
            drawBox.draw(canvas);

            faceapi.draw.drawFaceExpressions(canvas, [detection]);
          });
        }

        requestAnimationFrame(drawFrame);
      };

      requestAnimationFrame(drawFrame);
    });
  }, [modelsLoaded]);

  return (
    <div className="App">
      <div className="video-container">
        <video ref={videoRef} autoPlay muted playsInline width="720" height="560" />
        <canvas ref={canvasRef} width="720" height="560" />
      </div>
      
    </div>
  );
}

export default App;
