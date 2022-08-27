//設定変数
var intermediateCanvasSize = {width: 480, height: 360};
var virtualBackTextureSize = 512;
var mapTextureXToCanvas = new Array(virtualBackTextureSize);
var mapTextureYToCanvas = new Array(virtualBackTextureSize);

var blazePoseNet = null;
var videoComponent = null;
var intermediateCanvas = null;
var intermediateCanvasCtx = null;
var virtualBackTextureCanvas = null;
var virtualBackTextureCanvasCtx = null;
var virtualBackOutputImageBuf = new ArrayBuffer(virtualBackTextureSize * virtualBackTextureSize * 4);
var virtualBackOutputImageBuf8 = new Uint8ClampedArray(virtualBackOutputImageBuf);
var virtualBackOutputImageData = new Uint32Array(virtualBackOutputImageBuf);
var virtualBackOutputImage = new ImageData(virtualBackTextureSize, virtualBackTextureSize);
var processedSegmentResult = null;
var blazePoseTimeSum = 0.0;
var blazePoseTimeCount = 0;
var blazePoseTimeSamples = 30;

async function BlazePosePart_drawTextureCanvas(i_ctxInputImage, i_processedSegmentResult) {
    var inputBytes = i_ctxInputImage.data;

    var outputPixIdx = 0;
    var resultColor = [0.0, 0.0, 0.0, 0.0]
    var resultColorUint32 = 0;

    if (i_processedSegmentResult.length > 0) {
        var maskImage = await i_processedSegmentResult[0].segmentation.mask.toImageData();
        for (var y = 0; y < virtualBackTextureSize; y++) {
            var yInputIdx = mapTextureYToCanvas[y] * intermediateCanvasSize.width;
            for (var x = 0; x < virtualBackTextureSize; x++) {
                var inputPixIdx = yInputIdx + mapTextureXToCanvas[x];
                var byteBaseInputIdx = 4 * inputPixIdx;
                var byteBaseOutputIdx = 4 * outputPixIdx;

                if (maskImage.data[inputPixIdx * 4 + 3] == 0) {
                    resultColorUint32 = 0x00;
                }
                else {
                    for (var colorIdx = 0; colorIdx < 3; colorIdx++) {
                        resultColor[colorIdx] = inputBytes[byteBaseInputIdx + colorIdx]
                    }
                    resultColor[3] = maskImage.data[inputPixIdx * 4 + 3];
                    resultColorUint32 = (resultColor[0] | (resultColor[1] << 8) | (resultColor[2] << 16) | (resultColor[3] << 24));
                }
                virtualBackOutputImageData[outputPixIdx] = resultColorUint32;
                outputPixIdx++;
            }
        }
    }
    else {
        for (var y = 0; y < virtualBackTextureSize; y++) {
            for (var x = 0; x < virtualBackTextureSize; x++) {
                virtualBackOutputImageData[outputPixIdx] = 0x00;
                outputPixIdx++;
            }
        }
    }
    virtualBackOutputImage.data.set(virtualBackOutputImageBuf8);
    virtualBackTextureCanvasCtx.putImageData(virtualBackOutputImage, 0, 0);
}

async function BlazePosePart_init(videoStream) {
    for (var idx = 0; idx < virtualBackTextureSize; idx++) {
        mapTextureXToCanvas[idx] = parseInt(idx * intermediateCanvasSize.width / virtualBackTextureSize + 0.5);
        mapTextureYToCanvas[idx] = parseInt(idx * intermediateCanvasSize.height / virtualBackTextureSize + 0.5);
    }

    virtualBackTextureCanvas = document.getElementById("virtualBackTexture");
    virtualBackTextureCanvas.width = virtualBackTextureSize;
    virtualBackTextureCanvas.height = virtualBackTextureSize;
    virtualBackTextureCanvasCtx = virtualBackTextureCanvas.getContext("2d");

    intermediateCanvas = document.getElementById("intermediate");
    intermediateCanvas.width = intermediateCanvasSize.width;
    intermediateCanvas.height = intermediateCanvasSize.height;
    intermediateCanvasCtx = intermediateCanvas.getContext("2d");

    const detectorConfig = {
        runtime: "mediapipe",
        enableSegmentation: true,
        modelType:"lite",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose"
    };
    blazePoseNet = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, detectorConfig);
    videoComponent = document.getElementById("video");
    videoComponent.width = intermediateCanvasSize.width;
    videoComponent.height = intermediateCanvasSize.height;
    videoComponent.autoplay = true;
    videoComponent.srcObject = videoStream;

    blazePoseTimeSum = 0.0;
    blazePoseTimeCount = 0;
}

async function BlazePosePart_main() {
    var startTime = performance.now();
    var ctxIntermediateImage = intermediateCanvasCtx.getImageData(0, 0, intermediateCanvasSize.width, intermediateCanvasSize.height);
    intermediateCanvasCtx.drawImage(videoComponent, 0, 0, intermediateCanvasSize.width, intermediateCanvasSize.height);

    var blazePosePromise = blazePoseNet.estimatePoses(intermediateCanvas);
    if (processedSegmentResult) {
        await BlazePosePart_drawTextureCanvas(ctxIntermediateImage, processedSegmentResult);
    }
    processedSegmentResult = await blazePosePromise;
    var endTime = performance.now();
    blazePoseTimeSum += (endTime - startTime);
    blazePoseTimeCount++;

    if (blazePoseTimeCount >= blazePoseTimeSamples) {
        document.getElementById("elapsedTimeBlazePose").innerHTML = (blazePoseTimeSum / blazePoseTimeSamples).toFixed(2);
        blazePoseTimeSum = 0.0;
        blazePoseTimeCount = 0;
    }

    setTimeout(arguments.callee, 1000/60);
}
