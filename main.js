var backgroundColor = {r: 50, g: 0, b: 0};
var backgroundColorCode = "#" + backgroundColor.r.toString(16).padStart(2, "0")
    + backgroundColor.g.toString(16).padStart(2, "0") + backgroundColor.b.toString(16).padStart(2, "0");

async function BlazePoseWebGL_startProcess() {
    removeEventListener("click", BlazePoseWebGL_startProcess);
    var easyInst = document.getElementById("easyInst");
    easyInst.style.display = "none";
    var elapsedTime = document.getElementById("elapsedTime");
    elapsedTime.style.display = "";
    var mediaStream;
    var videoStream;
    var audioStream;
    try {
        //Webカメラとvideoタグとの関連づけ
        //https://qiita.com/chelcat3/items/02c77b55d080d770530a
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                //intermediateCanvasSizeはblazePosePart.jsからの変数
                width: {ideal: intermediateCanvasSize[0]},
                height: {ideal: intermediateCanvasSize[1]}
            }
        });
    }
    catch (err) {
        //ユーザに拒否されたなど、カメラ、マイクを取得できなかった場合
        return;
    }

    await BlazePosePart_init(mediaStream);
    await webGLPart_init();
    BlazePosePart_main();
    webGLPart_main();
}

function BlazePoseWebGL_main() {
    document.bgColor=backgroundColorCode;
    addEventListener("click", BlazePoseWebGL_startProcess);
}
