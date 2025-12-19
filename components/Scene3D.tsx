
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GameState } from '../types';

interface Scene3DProps {
    gameState: React.MutableRefObject<GameState>;
    cutaway: boolean;
}

const Scene3D: React.FC<Scene3DProps> = ({ gameState, cutaway }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const meshesRef = useRef<THREE.InstancedMesh[]>([]);
    const powerLinesRef = useRef<THREE.InstancedMesh | null>(null);
    const currentCityLevel = useRef<number>(-1);
    
    // --- MEMOIZED ASSETS ---
    const materials = useMemo(() => ({
        concrete: new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.8 }), // Darker industrial concrete
        steel: new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.3 }),
        glass: new THREE.MeshStandardMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.4, metalness: 0.9, roughness: 0.1, emissive: 0x01579b, emissiveIntensity: 0.2 }),
        wood: new THREE.MeshStandardMaterial({ color: 0x4e342e }),
        leaves: new THREE.MeshStandardMaterial({ color: 0x2e7d32 }),
        grass: new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 1.0 }),
        water: new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.8 }),
        coreBlue: new THREE.MeshStandardMaterial({ color: 0x00b0ff, emissive: 0x0091ea, emissiveIntensity: 10.0, toneMapped: false }),
        glow: new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 2.0, transparent: true, opacity: 0.6 }),
        hazard: new THREE.MeshStandardMaterial({ color: 0xffea00, emissive: 0xffea00, emissiveIntensity: 0.5 }),
        powerLineOn: new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Will be used for dynamic color
    }), []);

    const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
    const lineGeometry = useMemo(() => new THREE.CylinderGeometry(0.1, 0.1, 1), []);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Renderer
        const renderer = new THREE.WebGLRenderer({ 
            powerPreference: 'high-performance', 
            antialias: false,
            stencil: false,
            depth: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 2. Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.FogExp2(0x050510, 0.015);

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 600);
        camera.position.set(50, 45, 50);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.maxDistance = 150;
        controls.target.set(0, 5, 0);

        // 3. Post-Processing
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        composer.addPass(bloomPass);
        
        const filmPass = new FilmPass(0.2, 0.05, 648, 0);
        composer.addPass(filmPass);

        // 4. Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.4);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
        dirLight.position.set(80, 100, 40);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 300;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        scene.add(dirLight);

        // 5. Environment
        const setupEnvironment = () => {
            const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), materials.grass);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.5;
            ground.receiveShadow = true;
            scene.add(ground);
            
            // Ocean
            const ocean = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), materials.water);
            ocean.rotation.x = -Math.PI / 2;
            ocean.position.y = -1.2;
            scene.add(ocean);
        };
        setupEnvironment();

        // 6. Power Lines Init
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        // We will create 200 segments
        const powerMesh = new THREE.InstancedMesh(lineGeometry, lineMat, 200);
        powerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(powerMesh);
        powerLinesRef.current = powerMesh;

        // 7. Loop
        let frameId = 0;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            const state = gameState.current;
            
            // Dynamic Sun
            const time = state.dayTime;
            const timeRad = ((time - 6) / 24) * Math.PI * 2;
            dirLight.position.x = Math.cos(timeRad) * 120;
            dirLight.position.y = Math.sin(timeRad) * 100;
            dirLight.intensity = Math.max(0, Math.sin(timeRad) * 1.5);

            // Sky Color
            let skyHex = 0x050510;
            if (time > 6 && time < 18) skyHex = 0x64b5f6; // Lighter blue day
            else if (time >= 18 && time < 20) skyHex = 0xff7043; // Sunset orange
            
            if (state.weather === 'thunderstorm') skyHex = 0x263238;

            scene.background = new THREE.Color(skyHex).lerp(new THREE.Color(0x050510), 1 - Math.sin(timeRad));
            scene.fog?.color.set(scene.background);

            // Power Line Pulsing
            if (powerLinesRef.current) {
                const load = state.power / 1500; // 0 to 1
                const pulse = (Math.sin(Date.now() * 0.01 * (1 + load * 5)) + 1) / 2; // Speed increases with load
                const col = new THREE.Color().setHSL(0.3 - (load * 0.3), 1.0, 0.5 + pulse * 0.5); // Green -> Red, Pulse brightness
                (powerLinesRef.current.material as THREE.MeshBasicMaterial).color = col;
                
                // Visible lines scaling based on power flow
                if (state.power < 10) powerLinesRef.current.visible = false;
                else powerLinesRef.current.visible = true;
            }

            // Core Glow Intensity based on Power & Temp
            let coreIntensity = 2 + (state.power / 80);

            if (state.temp > 2000) {
                const overheatRatio = Math.max(0, (state.temp - 2000) / 1000); // 0 to 1
                // Add massive bloom intensity
                coreIntensity += overheatRatio * 50; 
                // Rapid unstable flickering
                coreIntensity += (Math.random() - 0.5) * (overheatRatio * 30);
            }

            materials.coreBlue.emissiveIntensity = Math.max(0, coreIntensity);
            
            // Meltdown Shake
            if (state.meltdownProgress > 0) {
                const shake = (state.meltdownProgress / 100) * 0.5;
                camera.position.x += (Math.random() - 0.5) * shake;
                camera.position.y += (Math.random() - 0.5) * shake;
                camera.position.z += (Math.random() - 0.5) * shake;
            }

            controls.update();
            composer.render();
        };
        animate();

        // 8. Cleanup
        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            composer.dispose();
            containerRef.current?.removeChild(renderer.domElement);
            // Dispose meshes
            meshesRef.current.forEach(m => m.dispose());
        };
    }, [materials, geometry, lineGeometry]);

    // --- GEOMETRY BUILDER ---
    useEffect(() => {
        const score = gameState.current.score;
        let newLevel = 0;
        if (score > 60) newLevel = 1;
        if (score > 120) newLevel = 2;
        if (score > 250) newLevel = 3;

        // Force update on level change or cutaway toggle
        if (newLevel === currentCityLevel.current && !meshesRef.current.length) return; 

        if (sceneRef.current) {
            // Cleanup
            meshesRef.current.forEach(m => sceneRef.current?.remove(m));
            meshesRef.current = [];

            const voxelData: {type: string, x: number, y: number, z: number}[] = [];
            const addV = (t: string, x: number, y: number, z: number) => voxelData.push({type: t, x, y, z});

            // 1. REACTOR COMPLEX
            // Base
            for(let x=-10; x<=10; x++) for(let z=-10; z<=10; z++) addV('concrete', x, 0, z);
            
            // Containment Dome (Cylinder approximation)
            for(let y=1; y<14; y++) {
                for(let x=-6; x<=6; x++) {
                    for(let z=-6; z<=6; z++) {
                        if (cutaway && z > 0) continue;
                        const d = Math.sqrt(x*x + z*z);
                        if (d < 6.5 && d > 5) addV('concrete', x, y, z); // Walls
                        if (y < 8 && d < 2.5) addV(d < 1.5 ? 'coreBlue' : 'glow', x, y, z); // Core
                    }
                }
            }
            // Cooling Tower
            const cx = -15, cz = -15;
            for(let y=0; y<20; y++) {
                const radius = 6 - (y*0.15) + (y>15 ? (y-15)*0.3 : 0);
                for(let x=-8; x<=8; x++) {
                    for(let z=-8; z<=8; z++) {
                         const d = Math.sqrt(x*x + z*z);
                         if (Math.abs(d - radius) < 1) addV('concrete', cx+x, y, cz+z);
                    }
                }
            }

            // 2. CITY GENERATION
            const buildBuilding = (bx: number, bz: number, h: number, w: number, style: 'modern' | 'brick' | 'steel' | 'glass') => {
                 for(let y=0; y<h; y++) {
                     for(let x=0; x<w; x++) {
                         for(let z=0; z<w; z++) {
                             // Hollow inside
                             if (x>0 && x<w-1 && z>0 && z<w-1 && y < h-1) continue; 
                             const isWin = (x+z+y)%2 === 0 && y > 0;
                             
                             let wallMat = 'concrete';
                             if (style === 'modern' || style === 'steel') wallMat = 'steel';
                             else if (style === 'glass') wallMat = 'glass';
                             
                             addV(isWin ? 'glass' : wallMat, bx+x, y, bz+z);
                         }
                     }
                 }
            };

            // Initial City
            buildBuilding(30, 20, 15, 6, 'modern');
            buildBuilding(40, 30, 10, 5, 'brick');
            
            if (newLevel >= 1) {
                buildBuilding(-30, 30, 20, 5, 'modern');
                buildBuilding(-40, 20, 25, 6, 'modern');
            }
            if (newLevel >= 2) {
                buildBuilding(20, -40, 35, 8, 'steel'); // Enron HQ style
                buildBuilding(50, -20, 18, 5, 'brick');
            }
            if (newLevel >= 3) {
                buildBuilding(-50, -50, 45, 10, 'glass'); // Mega tower
                buildBuilding(0, -60, 30, 6, 'modern');
            }

            // 3. POWER LINES (Static geometry for poles, dynamic for wires)
            const poles = [[10,10], [20,15], [30,20]];
            poles.forEach(([px, pz]) => {
                for(let y=0; y<8; y++) addV('steel', px, y, pz);
                addV('hazard', px, 8, pz);
            });

            // 4. INSTANCING
            const groups: Record<string, typeof voxelData> = {};
            voxelData.forEach(v => {
                if (!groups[v.type]) groups[v.type] = [];
                groups[v.type].push(v);
            });

            Object.entries(groups).forEach(([type, voxels]) => {
                const mat = (materials as any)[type];
                if (!mat) return;
                const mesh = new THREE.InstancedMesh(geometry, mat, voxels.length);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                const dummy = new THREE.Object3D();
                voxels.forEach((v, i) => {
                    dummy.position.set(v.x, v.y, v.z);
                    dummy.updateMatrix();
                    mesh.setMatrixAt(i, dummy.matrix);
                });
                
                sceneRef.current?.add(mesh);
                meshesRef.current.push(mesh);
            });
            
            // Re-generate Power Line Connections
            if (powerLinesRef.current) {
                const lineDummy = new THREE.Object3D();
                let idx = 0;
                const path = [new THREE.Vector3(0, 10, 0), new THREE.Vector3(10, 8, 10), new THREE.Vector3(20, 8, 15), new THREE.Vector3(30, 8, 20), new THREE.Vector3(33, 15, 23)];
                
                for(let i=0; i<path.length-1; i++) {
                    const start = path[i];
                    const end = path[i+1];
                    const dist = start.distanceTo(end);
                    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                    
                    lineDummy.position.copy(mid);
                    lineDummy.lookAt(end);
                    lineDummy.rotateX(Math.PI / 2);
                    lineDummy.scale.set(1, dist, 1);
                    lineDummy.updateMatrix();
                    powerLinesRef.current.setMatrixAt(idx++, lineDummy.matrix);
                }
                powerLinesRef.current.count = idx;
                powerLinesRef.current.instanceMatrix.needsUpdate = true;
            }

            currentCityLevel.current = newLevel;
        }
    }, [cutaway, gameState.current.score, materials, geometry]);

    return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

export default React.memo(Scene3D);
