import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl'; // Register WebGL backend.
import '../scss/app.scss';
import { GUI } from 'dat.gui';
import { PlatformBrowser } from '@tensorflow/tfjs-core/dist/platforms/platform_browser';

const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
const { OrbitControls } = require('three/examples/jsm/controls/OrbitControls');

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
    modelType: 'lite',
    maxHands: 1,
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

  const geometry = new THREE.PlaneGeometry(0.5, 0.5);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.visible = false;
  scene.add(plane);

  const axesHelper = new THREE.AxesHelper(1);
  plane.add(axesHelper);

  const gui = new GUI();
  const watchFolder = gui.addFolder('Watch');
  let watchRotation = {
    x: 180,
    y: 90,
    z: 180,
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

      watch.scale.set(5, 5, 5);
      watch.rotation.set(180 * degree, 90 * degree, 80 * degree);

      watchFolder.add(watchRotation, 'x', 0, 360, 1);
      watchFolder.add(watchRotation, 'y', 0, 360, 1);
      watchFolder.add(watchRotation, 'z', 0, 360, 1);
      watchFolder.open();

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
      plane.add(watch);

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
      plane.visible = true;

      const keyPoint0 = hands[0].keypoints[0];
      const keyPoint9 = hands[0].keypoints[9];

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

      // for palm of the hand

      var handOrientation = calcOrientationReverse(new THREE.Vector3(hands[0].keypoints3D[0].x, hands[0].keypoints3D[0].y, hands[0].keypoints3D[0].z),
        new THREE.Vector3(hands[0].keypoints3D[5].x, hands[0].keypoints3D[5].y, hands[0].keypoints3D[5].z),
        new THREE.Vector3(hands[0].keypoints3D[17].x, hands[0].keypoints3D[17].y, hands[0].keypoints3D[17].z));


      // for back of the hand

      // let handOrientation = calcOrientationReverse(
      //   new THREE.Vector3(
      //     hands[0].keypoints3D[0].x,
      //     hands[0].keypoints3D[0].y,
      //     hands[0].keypoints3D[0].z
      //   ),
      //   new THREE.Vector3(
      //     hands[0].keypoints3D[5].x,
      //     hands[0].keypoints3D[5].y,
      //     hands[0].keypoints3D[5].z
      //   ),
      //   new THREE.Vector3(
      //     hands[0].keypoints3D[17].x,
      //     hands[0].keypoints3D[17].y,
      //     hands[0].keypoints3D[17].z
      //   )
      // );



      //Visualizing the Vector Direction
      const dir = handOrientation;
      dir.normalize();
      const origin = plane.position;
      const length = 1;
      const hex = 0xffff00;
      const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);

      //   plane.quaternion.rotateTowards(arrowHelper.quaternion,1);
      plane.setRotationFromQuaternion(arrowHelper.quaternion);

      //   plane.applyQuaternion(arrowHelper.quaternion)

      scene.add(arrowHelper);
      setTimeout(() => {
        scene.remove(arrowHelper);
      }, 500);
    } else {
      plane.visible = false;
    }

    if (watch) {
      watch.rotation.x = watchRotation.x * degree;
      watch.rotation.y = watchRotation.y * degree;
      watch.rotation.z = watchRotation.z * degree;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }

  function getHandStatus(hand) {
    const handedness = hand.handedness;
    const c0 = hand.keypoints3D[0];
    const c5 = hand.keypoints3D[5];
    const c17 = hand.keypoints3D[17];
    if (handedness === 'Right') {
      if (c5.x > c17.x) return 'right-palm';
      else return 'right-back';
    }
    else {
      if (c5.x > c17.x) return 'left-b';
      else return 'left-back';
    }

  }

  function calcPhi(Xc, Yc, Xp, Yp, Zp) {
    const r = Math.sqrt(Math.pow(Xp - Xc, 2) + Math.pow(Yp - Yc, 2));
    const R = Math.sqrt(Math.pow(Zc, 2) + Math.pow(r, 2));
    const phi = Math.acos(r / R);
    return phi;
  }

  function calcOrientation(CP0, CP5, CP17) {
    var keyPoint1 = new THREE.Vector3();
    var keyPoint2 = new THREE.Vector3();
    keyPoint1.subVectors(CP17, CP0);
    keyPoint2.subVectors(CP5, CP17);
    let normalVector = new THREE.Vector3(
      - (keyPoint1.y * keyPoint2.z) + (keyPoint1.z * keyPoint2.y),
      (Math.abs(keyPoint1.z) * keyPoint2.x) - (keyPoint1.x * keyPoint2.z),
      (keyPoint1.x * keyPoint2.y) - (keyPoint1.y * keyPoint2.x)
    );

    normalVector.normalize();
    return normalVector;
  }

  function calcOrientationReverse(CP0, CP5, CP17) {
    let keyPoint1 = new THREE.Vector3();
    let keyPoint2 = new THREE.Vector3();
    keyPoint1.subVectors(CP17, CP5);
    keyPoint2.subVectors(CP0, CP17);
    let normalVector = new THREE.Vector3(
      -(keyPoint1.y * keyPoint2.z) + keyPoint1.z * keyPoint2.y,
      Math.abs(keyPoint1.z) * keyPoint2.x - keyPoint1.x * keyPoint2.z,
      keyPoint1.x * keyPoint2.y - keyPoint1.y * keyPoint2.x
    );
    normalVector.normalize();
    return normalVector;
  }
}

Run();
