import '../scss/app.scss';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs-core';
// Register WebGL backend.
import '@tensorflow/tfjs-backend-webgl';
import './demo.js';
import { Vector3 } from 'three';

const THREE = require('three');
const {Projector} = require('three/examples/jsm/renderers/Projector.js');


async function Run(){


    const ANCHOR_POINTS = [[0, 0, 0], [0, 0.1, 0], [-0.1, 0, 0], [-0.1, -0.1, 0]];
    // setting up the TF model
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'tfjs',
        // solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4',
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
    
    async function videoLoaded(){
        console.log('vide has been loaded');
        requestAnimationFrame(update);
    }

    // Setting up the Threejs scene: 
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, video.width / video.height, 0.001, 1000);
    // const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1000);
    camera.position.z = 2;
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0); // the default
    console.log(renderer );
    renderer.setSize(video.clientWidth, video.clientHeight);
    // renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true});
    const box = new THREE.Mesh(geometry, material);
    scene.add(box);

    const geometry1 = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material1 = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const box1 = new THREE.Mesh(geometry1, material1);
    scene.add(box1);
    box.add(box1);

    


    async function update(){
        // console.log('this is the update function');
        
        const estimationConfig = {flipHorizontal: false};
        const hands = await detector.estimateHands(video, estimationConfig);
        if(hands[0]){
            
            const {x,y} = hands[0].keypoints[0];

            // var wristVec = new THREE.Vector3(hands[0].keypoints3D[0].x, hands[0].keypoints3D[0].y, hands[0].keypoints3D[0].z);
            // var indexRootVec = new THREE.Vector3(hands[0].keypoints3D[4].x, hands[0].keypoints3D[4].y, hands[0].keypoints3D[4].z);
            
            // var qt = new THREE.Quaternion();
            // qt.setFromUnitVectors(wristVec,indexRootVec);

            // var rotationMatrix = new THREE.Matrix4();
            // rotationMatrix.makeRotationFromQuaternion(qt);

            // console.log(x,y,z);
            let vec = new THREE.Vector3();
            let pos = new THREE.Vector3();

            // console.log(getSceneToWorld(x,y));

            var mx = new THREE.Matrix4().lookAt(hands[0].keypoints3D[0],hands[0].keypoints3D[4],new THREE.Vector3(1,1,1));
            var qt = new THREE.Quaternion().setFromRotationMatrix(mx);

            vec.set(
                ( x / video.width ) * 2 - 1,
                - ( y / video.height ) * 2 + 1,
                0.5 );
            vec.unproject( camera );
            vec.sub( camera.position ).normalize();
            var distance = - camera.position.z / vec.z;
            pos.copy( camera.position ).add( vec.multiplyScalar( distance ) );
            box.position.x = pos.x;
            box.position.y = pos.y;
            // box1.position.z = hands[0].keypoints3D[0].z;
            box1.position.x = -(hands[0].keypoints3D[0].x * (video.width/ video.height)) * 2.0;
            box1.position.y = -(hands[0].keypoints3D[0].y * (video.width/ video.height)) * 2.0;
            box1.position.z = -(hands[0].keypoints3D[0].z * (video.width/ video.height)) * 2.0;
            box1.quaternion.copy(qt);
            // box1.quaternion.setFromUnitVectors(wristVec, indexRootVec);


        }

        renderer.render(scene, camera);
        requestAnimationFrame(update);
    }



    var getSceneToWorld = function(dx, dy) {
        var mouse3D = new THREE.Vector3(dx / video.width - 1, -dy / video.height + 1, 0.5);
        mouse3D.unproject(camera);
        mouse3D.sub(camera.position);
        mouse3D.normalize(); 
        var rayCaster = new THREE.Raycaster(camera.position, mouse3D); 
        var scale = video.width; 
        var rayDir = new THREE.Vector3(rayCaster.ray.direction.x * scale, rayCaster.ray.direction.y * scale, rayCaster.ray.direction.z * scale);
        var rayVector = new THREE.Vector3(camera.position.x + rayDir.x, camera.position.y + rayDir.y, camera.position.z + rayDir.z); 
        return rayVector; 
    } 

}


Run();