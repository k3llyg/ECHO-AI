class CircleAnimator {
  constructor() {
    this.time = 0;
    this.noiseOffset = 0;
    this.currentRadius = 150;
    this.targetRadius = 150;
    this.easing = 0.05;
    this.animate = false;
  }

  drawCircle(mic) {
    stroke(255);
    strokeWeight(5);
    noFill();
    translate(width / 2, height / 2); // Center the circle

    let micLevel = mic.getLevel() * 15; // Get microphone input level
    let volumeRadiusAdjustment = map(micLevel, 0, 1, 0, 400);

    if (this.animate) {
      this.targetRadius = map(
        sin(this.time),
        -1,
        1,
        100 + volumeRadiusAdjustment,
        200 + volumeRadiusAdjustment
      );
    }

    let noiseFactorAmplitude = map(micLevel, 0, 1, 60, 200);

    beginShape();
    let numPoints = 30;
    for (let i = 0; i < TWO_PI; i += TWO_PI / numPoints) {
      let noiseFactor = noise(i * 2 + this.noiseOffset, this.time * 0.9) * noiseFactorAmplitude;
      let radius = this.currentRadius + noiseFactor;
      let x = radius * cos(i);
      let y = radius * sin(i);
      vertex(x, y);
    }
    endShape(CLOSE);

    this.time += 0.03;
    this.noiseOffset += 0.05;
  }

  updateRadius() {
    this.currentRadius = lerp(this.currentRadius, this.targetRadius, this.easing);
  }

  toggleAnimation() {
    this.animate = !this.animate;
  }

  resetRadius() {
    this.targetRadius = 150;
  }
}

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.audioChunks = [];
    this.sampleRate = 16000;
    this.silenceTimeout = null;
    this.SILENCE_THRESHOLD = 0.01;
    this.SILENCE_DELAY = 3000;
    this.aiAudioUrl = '';
    this.conversationActive = false;
  }

  async startConversation() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.sampleRate = this.audioContext.sampleRate;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.audioChunks = []; // Reset chunks

      processor.onaudioprocess = (event) => this.processAudioChunk(event);
      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.conversationActive = true;
      console.log("Conversation started...");
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  }

  stopConversation() {
    console.log("Stopping conversation...");
    this.conversationActive = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
  }

  processAudioChunk(event) {
    const inputData = event.inputBuffer.getChannelData(0);
    const maxVolume = Math.max(...inputData);

    if (maxVolume > this.SILENCE_THRESHOLD) {
      this.resetSilenceTimeout();
      const buffer = new Float32Array(inputData.length);
      buffer.set(inputData);
      this.audioChunks.push(buffer);
    }
  }

  resetSilenceTimeout() {
    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);

    this.silenceTimeout = setTimeout(async () => {
      console.log("Silence detected. Processing audio...");
      await this.processAudio();
    }, this.SILENCE_DELAY);
  }

  async processAudio() {
    console.log("Processing audio...");

    const flatBuffer = this.flattenArray(this.audioChunks);
    const wavData = this.createWavFile(flatBuffer, this.sampleRate);

    const wavBlob = new Blob([wavData], { type: 'audio/wav' });
    this.audioChunks = []; // Reset for next recording

    try {
      const transcription = await this.uploadAudio(wavBlob);
      console.log("Transcription:", transcription);

      await this.playAIAudio(); // Play AI-generated response
    } catch (error) {
      console.error("Error processing audio:", error);
    }
  }

  flattenArray(chunks) {
    const length = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    chunks.forEach((chunk) => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  createWavFile(buffer, sampleRate) {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * 2, true);

    const wavBuffer = new Uint8Array(header.byteLength + buffer.length * 2);
    wavBuffer.set(new Uint8Array(header), 0);

    let offset = header.byteLength;
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      wavBuffer[offset++] = intSample & 0xff;
      wavBuffer[offset++] = (intSample >> 8) & 0xff;
    }

    return wavBuffer;
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  async uploadAudio(wavBlob) {
    const formData = new FormData();
    formData.append('audio', wavBlob, 'audio.wav');

    try {
      const response = await fetch('/uploads', { method: 'POST', body: formData });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const result = await response.json();
      this.aiAudioUrl = result.aiAudio;
      return result.transcription;
    } catch (error) {
      console.error("Error uploading audio:", error);
    }
  }

  async playAIAudio() {
    try {
      if (!this.aiAudioUrl) {
        console.error("AI audio URL is not available");
        return;
      }

      const audio = new Audio(this.aiAudioUrl);
      await audio.play();
      console.log("Playing AI audio:", this.aiAudioUrl);
    } catch (error) {
      console.error("Error playing AI audio:", error);
    }
  }
}

// Main Sketch Setup
let circleAnimator;
let audioProcessor;
let mic;

function setup() {
  createCanvas(windowWidth, windowHeight);
  circleAnimator = new CircleAnimator();
  audioProcessor = new AudioProcessor();

  // Initialize microphone input
  mic = new p5.AudioIn();
  mic.start();

  // Unlock AudioContext on interaction (for Chrome)
  getAudioContext().resume().then(() => console.log("Audio Context resumed"));
}

function draw() {
  background(0, 20); // Light fade effect

  circleAnimator.updateRadius();
  circleAnimator.drawCircle(mic);

  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  text(
    audioProcessor.conversationActive ? "Click to Stop Conversation" : "Click to Start Conversation",
    width / 2,
    height - 50
  );
}

function mousePressed() {
  let distanceFromCenter = dist(mouseX, mouseY, width / 2, height / 2);

  if (distanceFromCenter < circleAnimator.currentRadius) {
    circleAnimator.toggleAnimation();

    if (circleAnimator.animate) {
      audioProcessor.startConversation();
    } else {
      audioProcessor.stopConversation();
      circleAnimator.resetRadius();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

