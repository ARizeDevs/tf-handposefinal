import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import {handLandmarksToRect} from '@tensorflow-models/hand-pose-detection/dist/tfjs/calculators/hand_landmarks_to_rect';
import '@tensorflow/tfjs-backend-webgl'; // Register WebGL backend.
import '../scss/app.scss';
import { GUI } from 'dat.gui';
import { PlatformBrowser } from '@tensorflow/tfjs-core/dist/platforms/platform_browser';
import { math } from '@tensorflow/tfjs-core';

const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
const { OrbitControls } = require('three/examples/jsm/controls/OrbitControls');

const initVector = new THREE.Vector3();
const currentVector = new THREE.Vector3();

const degree = Math.PI / 180;

async function Run() {
  // Media variables
  const video = document.createElement('video');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: 1920,
      height: 1080,
    },
  });

  // TF
  // setting up the TF model
  const detectorConfig = {
    runtime: 'mediapipe',
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
    modelType: 'full',
    maxHands: 1,
    staticImageMode: true
  };
  const model = handPoseDetection.SupportedModels.MediaPipeHands;
  const detector = await handPoseDetection.createDetector(
    model,
    detectorConfig
  );

    

  // Setting up the stream
  const streamSettings = stream.getVideoTracks()[0].getSettings();
  // actual width & height of the camera video
  const streamWidth = streamSettings.width;
  const streamHeight = streamSettings.height;
  video.srcObject = stream;
  video.autoplay = true;
  video.controls = false;
  video.muted = true;
  video.height = streamHeight; // 👈️ in px
  video.width = streamWidth; // 👈️ in px
  video.addEventListener('loadeddata', () => requestAnimationFrame(update));
  document.body.appendChild(video);

  // THREE js variables
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  const camera = new THREE.PerspectiveCamera(
    75,
    streamWidth / streamHeight,
    0.001,
    1000
  );
  //   const light = new THREE.AmbientLight(0xffffff, 1); // soft white light
  //   scene.add(light);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xefefff, 1.5);
  dirLight.position.set(10, 10, 10);
  scene.add(dirLight);

  // Setting up the Three js scene:
  camera.position.z = 2;
  renderer.setClearColor(0x000000, 0); // the default
  renderer.setSize(streamWidth, streamHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);
  // const controls = new OrbitControls(camera, renderer.domElement);

  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.visible = true;
  scene.add(plane);

  const axesHelper = new THREE.AxesHelper(1);
  plane.add(axesHelper);

  const gui = new GUI();
  const watchFolder = gui.addFolder('Watch');
  let watchRotation = {
    x: 0,
    y: 0,
    z: 0,
  };

  let watch = null;
  // let box = new THREE.Object3D()
  const loader = new GLTFLoader();
  // Load a glTF resource
  loader.load(
    // resource URL
    '/models/watchmodel/scene.gltf',
    // 'https://firebasestorage.googleapis.com/v0/b/tripleearplatform.appspot.com/o/TestGLB%2Fwatch%2Fscene.gltf?alt=media&token=cbd75ea2-9525-47bc-981c-8e3f5d4a2af6',
    // called when the resource is loaded
    function (gltf) {
      watch = gltf.scene;

      watch.scale.set(10, 10, 10);
    //   watch.rotation.set(180 * degree, 90 * degree, 80 * degree);

      watchFolder.add(watchRotation, 'x', 0, 360, 1);
      watchFolder.add(watchRotation, 'y', 0, 360, 1);
      watchFolder.add(watchRotation, 'z', 0, 360, 1);
      watchFolder.open();

    watch.visible = false;

      // let ambientLight = new THREE.AmbientLight(
      //   new THREE.Color('hsl(0, 0%, 100%)'),
      //   0.75
      // );
      // gltf.scene.add(ambientLight);

      // let directionalLightBack = new THREE.DirectionalLight(
      //   new THREE.Color('hsl(0, 0%, 100%)'),
      //   0.25
      // );
      // directionalLightBack.position.set(30, 100, 100);
      // gltf.scene.add(directionalLightBack);

      // let directionalLightFront = new THREE.DirectionalLight(
      //   new THREE.Color('hsl(0, 0%, 100%)'),
      //   0.25
      // );
      // directionalLightFront.position.set(-30, 100, -100);
      // gltf.scene.add(directionalLightFront);

      // scene.add( gltf.scene );
    //   plane.add(watch);
        scene.add(watch);

      gltf.animations; // Array<THREE.AnimationClip>
      gltf.scene; // THREE.Group
      gltf.scenes; // Array<THREE.Group>
      gltf.cameras; // Array<THREE.Camera>
      gltf.asset; // Object
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    // called when loading has errors
    function (error) {
      console.log('An error happened');
    }
  );

  async function update() {
    const estimationConfig = { flipHorizontal: false };
    const hands = await detector.estimateHands(video, estimationConfig);

    
    // console.log('hands -----> ', hands)

    if (hands[0]) {

        const keyPoint0 = hands[0].keypoints[0];
        const keyPoint9 = hands[0].keypoints[9];


        const keyPoint3D0 = hands[0].keypoints3D[0];

        // let rect = handLandmarksToRect(hands[0].keypoints, video);
        // console.log(rect);


        let wristVec = new THREE.Vector3(-keyPoint0.x, keyPoint0.y, 0.5);
        let MiddleRootVec = new THREE.Vector3(-keyPoint9.x, keyPoint9.y, 0.5);

        let vecDistance = wristVec.distanceTo(MiddleRootVec);
        let vec = new THREE.Vector3();
        let pos = new THREE.Vector3();

        vec.set(
            (keyPoint0.x / streamWidth) * 2 - 1,
            -(keyPoint0.y / streamHeight) * 2 + 1,
            0.5
        );
        vec.unproject(camera);
        vec.sub(camera.position).normalize();
        const distance = -camera.position.z / vec.z;
        pos.copy(camera.position).add(vec.multiplyScalar(distance));
        plane.position.x = pos.x;
        plane.position.y = pos.y;




      let screenRatio = null;
      if (streamWidth > streamHeight) {
        // landscape
        screenRatio = streamWidth / streamHeight;
      } else {
        screenRatio = streamHeight / streamWidth;
      }

      const newScale = vecDistance * screenRatio * 0.005;
      plane.scale.set(newScale, newScale, newScale);

      // console.log(newScale);

      if(initVector === null){
        const writstPoint = new THREE.Vector3(hands[0].keypoints3D[17].x,hands[0].keypoints3D[17].y, hands[0].keypoints3D[17].z);
        const IndexPoint = new THREE.Vector3(hands[0].keypoints3D[5].x,hands[0].keypoints3D[5].y, hands[0].keypoints3D[5].z);

        initVector.subVectors(IndexPoint, writstPoint);
      }

      const writstPoint = new THREE.Vector3(hands[0].keypoints3D[17].x,hands[0].keypoints3D[17].y, hands[0].keypoints3D[17].z);
      const IndexPoint = new THREE.Vector3(hands[0].keypoints3D[5].x,hands[0].keypoints3D[5].y, hands[0].keypoints3D[5].z);

      currentVector.subVectors(IndexPoint, writstPoint);

      currentVector.angleTo(initVector);

      console.log(currentVector.y);
      
   
      // plane.rotation.set(currentVector.x,currentVector.y,currentVector.z);
      // plane.rotation.x = THREE.MathUtils.radToDeg(-currentVector.x);
      // plane.rotation.y = THREE.MathUtils.radToDeg(-currentVector.y);
      // plane.rotation.z = THREE.MathUtils.radToDeg(-currentVector.z);

      // plane.rotateX(currentVector.x);
      // plane.rotateY(currentVector.y);
      // plane.rotateZ(currentVector.Z);

      // plane.setRotationFromAxisAngle(plane.position, rect.rotation);

      // for palm of the hand
      const handStatus = getHandStatus(hands[0]);
      if((handStatus === "left-back") || (handStatus === "right-palm")){
        var handOrientation = calcOrientation(hands[0].keypoints3D[0], hands[0].keypoints3D[5], hands[0].keypoints3D[17]);
      } else {
        var handOrientation = calcOrientationReverse(hands[0].keypoints3D[0], hands[0].keypoints3D[5], hands[0].keypoints3D[17]);
        
      }

      // visVecDir(handOrientation, scene, 0xffff00);

    } else {
      // plane.visible = false;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }

  function visVecDir(handOrientation, scene, color=0xffff00) {
    const dir = handOrientation;
    // dir.normalize();
    // const origin = plane.position;
    // const length = 1;
    // const arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);
    // scene.add(arrowHelper);

        
    // plane.lookAt(arrowHelper.position);
    
    setTimeout(() => {
      scene.remove(arrowHelper);
    }, 500);
  }

  function getHandStatus(hand) {
    const handedness = hand.handedness;
    const c0 = hand.keypoints3D[0];
    const c5 = hand.keypoints3D[5];
    const c17 = hand.keypoints3D[17];
    if (handedness === 'Left') {
      if (c5.x > c17.x) return 'right-palm';
      else return 'right-back';
    }
    else {
      if (c5.x > c17.x) return 'left-back';
      else return 'left-palm';
    }

  }

  function calcPhi(Xc, Yc, Xp, Yp, Zp) {
    const r = Math.sqrt(Math.pow(Xp - Xc, 2) + Math.pow(Yp - Yc, 2));
    const R = Math.sqrt(Math.pow(Zc, 2) + Math.pow(r, 2));
    const phi = Math.acos(r / R);
    return phi;
  }

  function calcOrientation(p1, p2, p3) {
    var keyPoint1 = new THREE.Vector3();
    var keyPoint2 = new THREE.Vector3();
    keyPoint1.subVectors(p1, p3);
    keyPoint2.subVectors(p1, p2);
    let normalVector = new THREE.Vector3(
      - keyPoint1.y * keyPoint2.z + keyPoint1.z * keyPoint2.y,
      keyPoint1.z * keyPoint2.x - keyPoint1.x * keyPoint2.z,
      keyPoint1.x * keyPoint2.y - keyPoint1.y * keyPoint2.x
    );

    // normalVector.normalize();
    return normalVector;
  }


  function calcOrientationReverse(p1, p2, p3) {
    let keyPoint1 = new THREE.Vector3();
    let keyPoint2 = new THREE.Vector3();
    keyPoint1.subVectors(p1, p3);
    keyPoint2.subVectors(p1, p2);
    let normalVector = new THREE.Vector3(
      - keyPoint1.y * keyPoint2.z + keyPoint1.z * keyPoint2.y,
      keyPoint1.z * keyPoint2.x - keyPoint1.x * keyPoint2.z,
      keyPoint1.x * keyPoint2.y - keyPoint1.y * keyPoint2.x
    );
    normalVector.normalize();
    return normalVector;
  }
}

Run();
