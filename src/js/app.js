import '../scss/app.scss';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs-core';
// Register WebGL backend.
import '@tensorflow/tfjs-backend-webgl';
import './demo.js';
import { BasicShadowMap, Quaternion, Vector3 } from 'three';

const THREE = require('three');
const quaternionFromNormal = require('three-quaternion-from-normal');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
const { OrbitControls } = require('three/examples/jsm/controls/OrbitControls');


async function Run() {


    const ANCHOR_POINTS = [[0, 0, 0], [0, 0.1, 0], [-0.1, 0, 0], [-0.1, -0.1, 0]];
    // setting up the TF model
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'lite',
        maxHands: 1
    };

    const detector = await handPoseDetection.createDetector(model, detectorConfig);

    // Setting up the stream
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user'
            // Only setting the video to a specified size in order to accommodate a
            // point cloud, so on mobile devices accept the default size.
        },
    });
    const video = document.getElementById('videoInput')
    video.srcObject = stream;
    video.addEventListener('loadeddata', videoLoaded)

    async function videoLoaded() {
        console.log('vide has been loaded');
        requestAnimationFrame(update);
    }

    // Setting up the Threejs scene: 
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, video.width / video.height, 0.001, 1000);
    camera.position.z = 2;
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0); // the default
    console.log(renderer);
    renderer.setSize(video.clientWidth, video.clientHeight);
    // renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    // const light = new THREE.AmbientLight(0x404040); // soft white light
    // scene.add(light);
    const controls = new OrbitControls(camera, renderer.domElement);


    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true});
    const box = new THREE.Mesh(geometry, material);
    scene.add(box);


    // let box = new THREE.Object3D()

    const loader = new GLTFLoader();

    // Load a glTF resource
    loader.load(
        // resource URL
        'https://firebasestorage.googleapis.com/v0/b/tripleearplatform.appspot.com/o/TestGLB%2Fapplewatch.glb?alt=media&token=40454859-2a33-46e5-9bf2-7bfd728f5a71',
        // 'https://firebasestorage.googleapis.com/v0/b/tripleearplatform.appspot.com/o/TestGLB%2Fwatch%2Fscene.gltf?alt=media&token=cbd75ea2-9525-47bc-981c-8e3f5d4a2af6',
        // called when the resource is loaded
        function (gltf) {
            const watch = gltf.scene

            watch.scale.set(5, 5, 5)
            watch.rotation.set(5, 5, 5)


            let ambientLight = new THREE.AmbientLight(new THREE.Color('hsl(0, 0%, 100%)'), 0.75);
            gltf.scene.add(ambientLight);

            let directionalLightBack = new THREE.DirectionalLight(new THREE.Color('hsl(0, 0%, 100%)'), 0.25);
            directionalLightBack.position.set(30, 100, 100);
            gltf.scene.add(directionalLightBack);

            let directionalLightFront = new THREE.DirectionalLight(new THREE.Color('hsl(0, 0%, 100%)'), 0.25);
            directionalLightFront.position.set(-30, 100, -100);
            gltf.scene.add(directionalLightFront);

            console.log(watch);
            // scene.add( gltf.scene );
            box.add(watch);

            gltf.animations; // Array<THREE.AnimationClip>
            gltf.scene; // THREE.Group
            gltf.scenes; // Array<THREE.Group>
            gltf.cameras; // Array<THREE.Camera>
            gltf.asset; // Object

        },
        // called while loading is progressing
        function (xhr) {

            console.log((xhr.loaded / xhr.total * 100) + '% loaded');

        },
        // called when loading has errors
        function (error) {

            console.log('An error happened');

        }
    );

    async function update() {
        // console.log('this is the update function');

        const estimationConfig = { flipHorizontal: false };
        const hands = await detector.estimateHands(video, estimationConfig);
        if (hands[0]) {

            const { x, y } = hands[0].keypoints[0];

            var wristVec = new THREE.Vector3(-hands[0].keypoints[0].x, hands[0].keypoints[0].y, 0.5);
            var MiddleRootVec = new THREE.Vector3(-hands[0].keypoints[9].x, hands[0].keypoints[9].y, 0.5);

            var vecDistance = wristVec.distanceTo(MiddleRootVec);
            let vec = new THREE.Vector3();
            let pos = new THREE.Vector3();

            vec.set(
                (x / video.width) * 2 - 1,
                - (y / video.height) * 2 + 1,
                0.5);
            vec.unproject(camera);
            vec.sub(camera.position).normalize();
            var distance = - camera.position.z / vec.z;
            pos.copy(camera.position).add(vec.multiplyScalar(distance));
            box.position.x = pos.x;
            box.position.y = pos.y;


            var screenRatio = null;
            var newScale = null;
            if (video.width > video.height) { // landscape
                screenRatio = video.width / video.height;
            } else {
                screenRatio = video.height / video.width;
            }

            newScale = vecDistance * screenRatio * 0.005;
            box.scale.set(newScale, newScale, newScale);

            // for back of the hand

            // var handOrientation = calcOrientation(new THREE.Vector3(hands[0].keypoints3D[0].x, hands[0].keypoints3D[0].y, hands[0].keypoints3D[0].z),
            //     new THREE.Vector3(hands[0].keypoints3D[5].x, hands[0].keypoints3D[5].y, hands[0].keypoints3D[5].z),
            //     new THREE.Vector3(hands[0].keypoints3D[17].x, hands[0].keypoints3D[17].y, hands[0].keypoints3D[17].z));

            // for front of the hand
                
            var handOrientation = calcOrientationReverse(new THREE.Vector3(hands[0].keypoints3D[0].x, hands[0].keypoints3D[0].y, hands[0].keypoints3D[0].z),
            new THREE.Vector3(hands[0].keypoints3D[5].x, hands[0].keypoints3D[5].y, hands[0].keypoints3D[5].z),
            new THREE.Vector3(hands[0].keypoints3D[17].x, hands[0].keypoints3D[17].y, hands[0].keypoints3D[17].z));

            console.log(handOrientation.z);

            box.lookAt(handOrientation);


            //Visializing the Vector Direction
            const dir = handOrientation;
            dir.normalize();
            const origin = box.position;
            const length = 1;
            const hex = 0xffff00;
            const arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
            
            scene.add( arrowHelper );   
            setTimeout(()=>{
                scene.remove(arrowHelper);
            }, 1000)

        } else {

        }

        renderer.render(scene, camera);
        requestAnimationFrame(update);
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
        var keyPoint1 = new THREE.Vector3();
        var keyPoint2 = new THREE.Vector3();
        keyPoint1.subVectors(CP17, CP5);
        keyPoint2.subVectors(CP0, CP17);
        let normalVector = new THREE.Vector3(
            - (keyPoint1.y * keyPoint2.z) + (keyPoint1.z * keyPoint2.y),
            (Math.abs(keyPoint1.z) * keyPoint2.x) - (keyPoint1.x * keyPoint2.z),
            (keyPoint1.x * keyPoint2.y) - (keyPoint1.y * keyPoint2.x)
        );
        normalVector.normalize();
        return normalVector;
    }
}

Run();