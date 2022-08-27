var webGLPart_loadedTextureNum = 0;
var gl;
var texture_max;

var m= new matIV();
var mMatrix = m.identity(m.create());
var vMatrix = m.identity(m.create());
var pMatrix = m.identity(m.create());
var vpMatrix = m.identity(m.create());
var mvpMatrix = m.identity(m.create());

var attLocation = new Array();
var attStride = new Array();
var uniLocation = new Array();
var index = [
	0, 2, 1,
	1, 2, 3
];
var texture;
var position_vbo;
var color_vbo;
var texture_vbo;
var index_ibo;
var globalColor;
var textureProcess = new Array();

var outputCanvasSize = {width: 1280, height: 720};
var captureWidth = 6.66;

var webGLTimeSum = 0.0;
var webGLTimeCount = 0;
var webGLTimeSamples = 30;

function create_vbo(data) {
	var vbo=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	return vbo;
}

function create_ibo(data) {
	var ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	return ibo;
}

function create_texture_from_canvas(canvasId, number) {
	if (number >= texture_max) {
		return;
	}
	var sourceCanvas = document.getElementById(canvasId);
	var tex = gl.createTexture();
	dynamicTextureSetting();
	texture[number] = tex;
	textureProcess.push(dynamicTextureSetting);
	webGLPart_loadedTextureNum++;

	function dynamicTextureSetting() {
		gl.activeTexture(gl["TEXTURE" + number.toString()]);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
	}
}

function create_shader(id) {
	var shader;
	var scriptElement=document.getElementById(id);
	if (!scriptElement){return;}
	switch(scriptElement.type) {
		case 'x-shader/x-vertex':
			shader=gl.createShader(gl.VERTEX_SHADER);
			break;
		case 'x-shader/x-fragment':
			shader=gl.createShader(gl.FRAGMENT_SHADER);
			break;
		default:
			return;
	}
	gl.shaderSource(shader, scriptElement.text);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		return shader;
	} else {
		alert(gl.getShaderInfoLog(shader));
	}
}

function create_program(vs, fs) {
	var program=gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.useProgram(program);
		return program;
	} else {
		alert(gl.getProgramInfoLog(program));
	}
}

function webGLPart_createPlaneBuffer() {
	var vertex_position = [
		-1.0, 1.0, 0.0,
		1.0, 1.0, 0.0,
		-1.0, -1.0, 0.0,
		1.0,-1.0,0.0

	];
	var vertex_color = [
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0
	];
	var texture_coord=[
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0
	];
	globalColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	position_vbo = create_vbo(vertex_position);
	color_vbo = create_vbo(vertex_color);
	texture_vbo = create_vbo(texture_coord);
	index_ibo = create_ibo(index);
}

async function webGLPart_init(micStream) {
	var c = document.getElementById('output');
	if (!c || !(c.getContext)) {
		return;
	}
	c.width = outputCanvasSize.width;
	c.height = outputCanvasSize.height;
	gl=c.getContext('webgl')||c.getContext('experimental-webgl');

	var v_shader=create_shader('vshader');
	var f_shader=create_shader('fshader');

	var prg=create_program(v_shader, f_shader);
	texture_max = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
	texture = new Array(texture_max);

	attLocation[0]=gl.getAttribLocation(prg, 'position');
	attLocation[1]=gl.getAttribLocation(prg, 'color');
	attLocation[2]=gl.getAttribLocation(prg, 'textureCoord');
	attStride[0]=3;
	attStride[1]=4;
	attStride[2]=2;

	webGLPart_createPlaneBuffer();

	gl.enable(gl.BLEND);
	gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[1] = gl.getUniformLocation(prg, 'pointSize');
	uniLocation[2] = gl.getUniformLocation(prg, 'enableTexture');
	uniLocation[3] = gl.getUniformLocation(prg, 'texture');
	uniLocation[4] = gl.getUniformLocation(prg, 'globalColor');

	create_texture_from_canvas("virtualBackTexture", 0);

	m.lookAt([0.0, 0.0, -18.0], [0.0, 0.0, 0.0], [0, 1, 0], vMatrix);
	m.perspective(60.0, c.width/c.height, 1.0, 100, pMatrix);
	m.multiply(pMatrix, vMatrix, vpMatrix);

	webGLTimeSum = 0.0;
	webGLTimeCount = 0;
}

function webGLPart_drawCapture() {
	gl.bindBuffer(gl.ARRAY_BUFFER, position_vbo);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, color_vbo);
	gl.enableVertexAttribArray(attLocation[1]);
	gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, texture_vbo);
	gl.enableVertexAttribArray(attLocation[2]);
	gl.vertexAttribPointer(attLocation[2], attStride[2], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_ibo);

	//intermediateCanvasSizeはblazePosePart.js内の変数
	var aspect = intermediateCanvasSize.height / intermediateCanvasSize.width;
	m.identity(mMatrix);
	m.translate(mMatrix, [0.0, 0.0, -6.0], mMatrix);
	m.rotate(mMatrix, 5.0 * Math.PI / 6.0, [0.0, 1.0, 0.0], mMatrix);
	m.scale(mMatrix, [captureWidth, captureWidth * aspect, 1.0], mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
	gl.uniform1f(uniLocation[1], 1.0);
	gl.uniform1i(uniLocation[2], 1);
	gl.uniform1i(uniLocation[3], 0);
	gl.uniform4fv(uniLocation[4], globalColor);
	gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
}

function webGLPart_main(){
	if (webGLPart_loadedTextureNum >= 1) {
		var startTime = performance.now();
		for (var idx = 0; idx < textureProcess.length; idx++) {
			textureProcess[idx]();
		}

		gl.clearColor(0.0,0.0,0.0,0.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		webGLPart_drawCapture();
		gl.flush();
		var endTime = performance.now();

		webGLTimeSum += (endTime - startTime);
		webGLTimeCount++;

	    if (webGLTimeCount >= webGLTimeSamples) {
	        document.getElementById("elapsedTimeWebGL").innerHTML = (webGLTimeSum / webGLTimeSamples).toFixed(2);
	        webGLTimeSum = 0.0;
			webGLTimeCount = 0;
	    }
	}
	requestAnimationFrame(webGLPart_main);
}
